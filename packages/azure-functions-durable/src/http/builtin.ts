// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Built-in durable HTTP support for the Azure Functions compatibility layer.
 *
 * @remarks
 * The v3 `context.df.callHttp` API relied on the Durable Functions host extension to execute the
 * HTTP request (including automatic `202 Accepted` polling and Managed Identity token acquisition).
 * The durabletask gRPC engine this provider is built on has no native durable-HTTP action, so the
 * feature is reconstructed here from core primitives:
 *
 * - a built-in **activity** ({@link builtinHttpActivity}) performs a single HTTP request — acquiring
 *   a bearer token via the optional `@azure/identity` package when a token source is supplied — and
 *   returns the response, and
 * - a built-in **poll orchestrator** ({@link builtinHttpPollOrchestrator}) issues the request and,
 *   while the endpoint returns `202` with a `Location` header, waits on a durable timer (honoring
 *   `Retry-After`) and re-polls until the operation completes.
 *
 * `DurableOrchestrationContext.callHttp` schedules the poll orchestrator as a sub-orchestration,
 * preserving the single-`yield` v3 ergonomics while keeping the 202 polling loop durable
 * (checkpointed across restarts).
 *
 * Both functions are auto-registered under reserved names when this package is imported (see
 * `../app.ts`) so existing apps that call `callHttp` work with no changes. Ported from the
 * durabletask-python design (Andy Staples, durabletask-python#155).
 */

import { OrchestrationContext, Task } from "@microsoft/durabletask-js";
import { DurableHttpRequestPayload, DurableHttpResponse } from "./models";

/**
 * Reserved built-in function names. The v3 host used `BuiltIn::HttpActivity`; `::` is not a valid
 * Azure Functions function name, so `__` is used here. The reserved names are unlikely to collide
 * with user-defined functions.
 */
export const BUILTIN_HTTP_ACTIVITY_NAME = "BuiltIn__HttpActivity";
export const BUILTIN_HTTP_POLL_ORCHESTRATOR_NAME = "BuiltIn__HttpPollOrchestrator";

/** Fallback interval (seconds) between polls when a `202` response carries no usable `Retry-After`. */
const DEFAULT_POLL_INTERVAL_SECONDS = 1;

/** Case-insensitively look up `name` in `headers`. */
function getHeader(headers: { [key: string]: string }, name: string): string | undefined {
  const lowered = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lowered) {
      return headers[key];
    }
  }
  return undefined;
}

/**
 * Parse the `Retry-After` header into a delay in seconds.
 *
 * @remarks
 * Supports both the delta-seconds and HTTP-date forms; falls back to
 * {@link DEFAULT_POLL_INTERVAL_SECONDS} when absent or unparseable. For the HTTP-date form the delay
 * is computed against `now` — which the caller supplies as the orchestration's replay-safe
 * `currentUtcDateTime` — so the resulting timer fire time is deterministic across replays.
 *
 * @internal Exported for unit testing.
 */
export function retryAfterSeconds(headers: { [key: string]: string }, now: Date): number {
  const raw = getHeader(headers, "Retry-After");
  if (raw === undefined || raw === null) {
    return DEFAULT_POLL_INTERVAL_SECONDS;
  }
  const trimmed = raw.trim();
  if (/^\d+$/.test(trimmed)) {
    return Math.max(parseInt(trimmed, 10), 0);
  }
  const retryAtMs = Date.parse(trimmed);
  if (Number.isNaN(retryAtMs)) {
    return DEFAULT_POLL_INTERVAL_SECONDS;
  }
  return Math.max(Math.floor((retryAtMs - now.getTime()) / 1000), 0);
}

/**
 * Acquire an AAD bearer token for `resource` via the optional `@azure/identity` package.
 *
 * @remarks
 * Loaded lazily with `require` (mirroring the core SDK's optional-peer-dependency pattern) so the
 * dependency is only touched when a token source is actually used; `require` also keeps the module
 * out of the compiled type graph, so an app that never uses a token source needs no `@azure/identity`
 * install. Throws a clear, actionable error when the package is missing but a token source was used.
 */
async function acquireBearerToken(resource: string): Promise<string> {
  let identity: {
    DefaultAzureCredential: new () => { getToken(scope: string): Promise<{ token: string } | null> };
  };
  try {
    identity = require("@azure/identity");
  } catch {
    throw new Error(
      "callHttp with a tokenSource requires the optional '@azure/identity' package. " +
        "Install it with `npm install @azure/identity`.",
    );
  }
  const credential = new identity.DefaultAzureCredential();
  const scope = resource.replace(/\/+$/, "") + "/.default";
  const result = await credential.getToken(scope);
  const token = result?.token;
  if (!token) {
    throw new Error(`Failed to acquire a bearer token for resource '${resource}'.`);
  }
  return token;
}

/**
 * Built-in activity: execute a single HTTP request and return the response.
 *
 * @remarks
 * `input` is the JSON form of a durable HTTP request (`method`, `uri`, `content`, `headers`,
 * `tokenSource`). Non-2xx responses (including `202`) are captured rather than thrown — the global
 * `fetch` only rejects on network errors, not on HTTP status — so the poll orchestrator can inspect
 * the status code and headers. Only http/https URIs are permitted (an SSRF guard that closes off
 * `file://`, `ftp://`, ... schemes from orchestration-supplied URLs).
 */
export async function builtinHttpActivity(input: DurableHttpRequestPayload): Promise<DurableHttpResponse> {
  const request = input ?? ({} as DurableHttpRequestPayload);
  const method = String(request.method ?? "GET").toUpperCase();
  const uri = request.uri;
  if (!uri) {
    throw new Error("A non-empty 'uri' is required for a durable HTTP call.");
  }
  // Durable HTTP only ever means http(s); reject other schemes (file://, ftp://, ...) that fetch
  // (or a redirect) might otherwise honor, closing off local-file reads / SSRF to non-HTTP endpoints.
  let scheme: string;
  try {
    scheme = new URL(uri).protocol.replace(/:$/, "").toLowerCase();
  } catch {
    throw new Error(`callHttp only supports http/https URLs; got ${JSON.stringify(uri)}.`);
  }
  if (scheme !== "http" && scheme !== "https") {
    throw new Error(`callHttp only supports http/https URLs; got ${JSON.stringify(uri)}.`);
  }

  const headers: { [key: string]: string } = { ...(request.headers ?? {}) };
  const resource = request.tokenSource?.resource;
  if (resource) {
    const token = await acquireBearerToken(resource);
    if (headers["Authorization"] === undefined) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  // `content` was already serialized to a string by `callHttp`, so it is sent as-is. GET/HEAD
  // requests cannot carry a body under the fetch spec, so a body is only attached for other methods.
  const includeBody = typeof request.content === "string" && method !== "GET" && method !== "HEAD";
  const response = await fetch(uri, {
    method,
    headers,
    body: includeBody ? request.content : undefined,
  });

  const responseHeaders: { [key: string]: string } = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });
  const content = await response.text();

  return { statusCode: response.status, headers: responseHeaders, content };
}

/**
 * Built-in poll orchestrator: issue a durable HTTP request and poll while it returns `202`.
 *
 * @remarks
 * Written as a core-native async generator so the durabletask engine drives it directly (the
 * orchestration input arrives as the second argument). It calls the built-in HTTP activity and,
 * while the response is `202 Accepted` with a `Location` header (and polling is enabled), waits on a
 * durable timer (honoring `Retry-After`) before re-polling the `Location` URL, resolving a relative
 * `Location` against the current request URI. Returns the final response. All time math uses the
 * replay-safe `currentUtcDateTime`, never `Date.now()`, so replays are deterministic.
 */
export async function* builtinHttpPollOrchestrator(
  ctx: OrchestrationContext,
  input: DurableHttpRequestPayload,
): AsyncGenerator<Task<unknown>, DurableHttpResponse, unknown> {
  const request = input ?? ({} as DurableHttpRequestPayload);
  // v3 opt-out: when polling is disabled the first response is returned as-is (no 202 loop).
  const enablePolling = request.enablePolling !== false;

  let response = (yield ctx.callActivity(BUILTIN_HTTP_ACTIVITY_NAME, request)) as DurableHttpResponse;
  // Track the URI of the most recent request so a relative `Location` can be resolved against it.
  let currentUri = String(request.uri ?? "");

  while (enablePolling && response.statusCode === 202) {
    const headers = response.headers ?? {};
    const location = getHeader(headers, "Location");
    if (!location) {
      // Cannot poll without a Location; return the 202 as-is.
      break;
    }

    // A `Location` may be relative (e.g. `/operations/42`); resolve it against the current request
    // URI so the next poll targets an absolute http(s) URL (the activity rejects non-absolute URIs).
    const resolved = new URL(location, currentUri).toString();

    const now = ctx.currentUtcDateTime;
    const delaySeconds = retryAfterSeconds(headers, now);
    const fireAt = new Date(now.getTime() + delaySeconds * 1000);
    yield ctx.createTimer(fireAt);

    const pollRequest: DurableHttpRequestPayload = { method: "GET", uri: resolved, enablePolling };
    // Preserve auth for the polling requests.
    if (request.headers !== undefined) {
      pollRequest.headers = request.headers;
    }
    if (request.tokenSource !== undefined) {
      pollRequest.tokenSource = request.tokenSource;
    }

    currentUri = resolved;
    response = (yield ctx.callActivity(BUILTIN_HTTP_ACTIVITY_NAME, pollRequest)) as DurableHttpResponse;
  }

  return response;
}
