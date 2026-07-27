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
 * Security: the `Location` returned with a `202` is callee-controlled data. When it points to a
 * different origin the poll drops the caller's credentials (`Authorization`/`Cookie`/`tokenSource`),
 * and the `x-functions-key` is always dropped, so a malicious or compromised endpoint cannot harvest
 * credentials by redirecting the poll to a host it controls. This mirrors the .NET extension's policy
 * (Azure/azure-functions-durable-extension#3443). The poll orchestrator also rejects being started as
 * a top-level orchestration (it is only ever a sub-orchestration of `callHttp`).
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

/**
 * Fallback interval (seconds) between polls when a `202` response carries no usable `Retry-After`.
 * Matches the classic Durable Functions host default (`HttpOptions.DefaultAsyncRequestSleepTime`,
 * 30000 ms) rather than hammering the status endpoint once per second.
 */
const DEFAULT_POLL_INTERVAL_SECONDS = 30;

/**
 * @internal
 * Result of the built-in HTTP activity: the public {@link DurableHttpResponse} plus the effective
 * (post-redirect) request URI. `fetch` follows redirects by default, so a relative `Location` must be
 * resolved against the URI that actually produced the response (RFC 9110 §7.1.2 / §10.2.2), not the
 * URI originally requested. `effectiveUri` is kept off the public {@link DurableHttpResponse} shape;
 * the poll orchestrator strips it before returning to `callHttp`, so v3 consumers see exactly
 * `{ statusCode, headers, content }`.
 */
interface BuiltinHttpActivityResult extends DurableHttpResponse {
  effectiveUri?: string;
}

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

/** Case-insensitively delete every variant of `name` from `headers` (mutates in place). */
function deleteHeader(headers: { [key: string]: string }, name: string): void {
  const lowered = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lowered) {
      delete headers[key];
    }
  }
}

/**
 * Whether `a` and `b` share an origin (scheme + host + port, case-insensitive, with default ports
 * normalized). An unparseable or non-absolute URI is treated as **cross-origin** (conservative),
 * matching the .NET `IsSameOrigin` policy (Azure/azure-functions-durable-extension#3443).
 *
 * @remarks
 * `URL.origin` already lower-cases the scheme/host and drops default ports (`:80` for http, `:443`
 * for https), so a plain string comparison of the two origins is exactly the scheme+host+port check.
 *
 * @internal Exported for unit testing.
 */
export function isSameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

/**
 * Parse the `Retry-After` header into a delay in seconds.
 *
 * @remarks
 * Supports both the delta-seconds and HTTP-date forms; falls back to
 * {@link DEFAULT_POLL_INTERVAL_SECONDS} when absent or unparseable. For the HTTP-date form the delay
 * is computed against `now` — which the caller supplies as the orchestration's replay-safe
 * `currentUtcDateTime` — so the resulting timer fire time is deterministic across replays, and is
 * rounded **up** so the poll never fires before the server-specified instant.
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
  return Math.max(Math.ceil((retryAtMs - now.getTime()) / 1000), 0);
}

/**
 * Build an AAD `.../.default` scope from a `resource` identifier.
 *
 * @remarks
 * Idempotent: a resource already expressed as a scope (ending in `/.default`) is returned unchanged,
 * so both the bare form (`https://management.core.windows.net/`) and the already-scoped form
 * (`https://management.core.windows.net/.default`) work — matching the v3 host, which accepts either.
 */
function toDefaultScope(resource: string): string {
  const trimmed = resource.replace(/\/+$/, "");
  return /\/\.default$/i.test(trimmed) ? trimmed : `${trimmed}/.default`;
}

/** A credential able to mint bearer tokens — the subset of `@azure/identity`'s `TokenCredential` used here. */
type BearerCredential = { getToken(scope: string): Promise<{ token: string } | null> };

/** Lazily constructed credential, cached at module scope and shared across every token acquisition. */
let cachedCredential: BearerCredential | undefined;

/**
 * Resolve the shared bearer credential, loading `@azure/identity` and constructing it on first use.
 *
 * @remarks
 * Loaded lazily with `require` (mirroring the core SDK's optional-peer-dependency pattern) so the
 * dependency is only touched when a token source is actually used; `require` also keeps the module out
 * of the compiled type graph, so an app that never uses a token source needs no `@azure/identity`
 * install. The credential is cached to reuse a single instance across invocations — the documented
 * Azure Identity best practice ("Reuse credential instances"): reuse lets the underlying MSAL
 * dependency serve tokens from its in-memory cache, whereas constructing a fresh
 * `DefaultAzureCredential` per activity invocation discards that per-instance cache and issues a new
 * token request on every 202 poll hop. Aggregated across the many concurrent orchestrations one worker
 * serves, that token traffic risks HTTP 429 throttling from Microsoft Entra ID (and, secondarily, the
 * per-VM IMDS limits of 20 req/s and 5 concurrent under Managed Identity); a single 30s-interval poll
 * loop cannot itself throttle. `resource` is passed per call to `getToken`, not to the constructor, so
 * one instance correctly serves every resource; `DefaultAzureCredential` is kept deliberately (not
 * narrowed to `ManagedIdentityCredential`) to preserve the local-development fallback chain. Only a
 * *successful* construction is cached: if `require` or the constructor throws, nothing is cached, so
 * the next call retries and still produces the correct actionable error when the package is missing
 * but a token source was used.
 */
function getCredential(): BearerCredential {
  if (cachedCredential) {
    return cachedCredential;
  }
  let identity: { DefaultAzureCredential: new () => BearerCredential };
  try {
    identity = require("@azure/identity");
  } catch (e) {
    // Only a genuinely missing module warrants the install hint. Any other failure — the package IS
    // installed but throws while initializing, a broken transitive dependency, an ESM/CJS interop
    // problem — must surface unchanged: telling the user to install a package they already have would
    // destroy the real diagnostic on the hardest path to debug (Managed-Identity token acquisition).
    if ((e as { code?: unknown }).code !== "MODULE_NOT_FOUND") {
      throw e;
    }
    throw new Error(
      "callHttp with a tokenSource requires the optional '@azure/identity' package. " +
        "Install it with `npm install @azure/identity`.",
    );
  }
  // Assigned only after a successful construction (a throwing constructor never reaches this
  // assignment), so a failed attempt leaves the cache empty for the next call to retry.
  cachedCredential = new identity.DefaultAzureCredential();
  return cachedCredential;
}

/**
 * Test-only hook: drop the cached credential so a re-swapped virtual `@azure/identity` mock (or a
 * fresh-construction assertion) is honored rather than served from a prior test's cache.
 * @internal
 */
export function __resetCredentialCacheForTests(): void {
  cachedCredential = undefined;
}

/** Acquire an AAD bearer token for `resource` from the shared, lazily constructed credential. */
async function acquireBearerToken(resource: string): Promise<string> {
  const credential = getCredential();
  const result = await credential.getToken(toDefaultScope(resource));
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
 *
 * When a `tokenSource` is present, the acquired bearer token **overwrites** any caller-supplied
 * `Authorization` header (matching v3, which applies the caller's headers first and then the token),
 * removing every case variant so `fetch` cannot merge a lowercase `authorization` and the bearer into
 * one malformed comma-joined header. A body on a `GET`/`HEAD` request is rejected: the Fetch standard
 * forbids it, and silently dropping it (as a naive port would) would change the request.
 */
export async function builtinHttpActivity(input: DurableHttpRequestPayload): Promise<BuiltinHttpActivityResult> {
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

  // The Fetch standard forbids a request body on GET/HEAD. v3 (the host extension) attached content
  // regardless of method; rather than silently drop it and change the request, fail loudly.
  if (request.content !== undefined && (method === "GET" || method === "HEAD")) {
    throw new Error(
      `callHttp: an HTTP ${method} request cannot carry a body; remove 'body' or use POST/PUT/PATCH.`,
    );
  }

  const headers: { [key: string]: string } = { ...(request.headers ?? {}) };
  const resource = request.tokenSource?.resource;
  if (resource) {
    const token = await acquireBearerToken(resource);
    // The token source overwrites any caller-supplied Authorization (v3 semantics). Strip every case
    // variant first so a lowercase `authorization` is not merged with ours into one bad header.
    deleteHeader(headers, "Authorization");
    headers["Authorization"] = `Bearer ${token}`;
  }

  // `content` was already serialized to a string by `callHttp`, and GET/HEAD bodies were rejected
  // above, so a body is attached only when present.
  const includeBody = typeof request.content === "string";
  // `redirect: "follow"` (the default): `fetch`/undici transparently follows 3xx redirects and, per the
  // Fetch Standard, drops `Authorization` (and `Cookie`) when a redirect crosses origins — but it does
  // NOT drop custom credential headers such as `x-functions-key`. Switching to `redirect: "manual"` and
  // re-applying our cross-origin policy per hop would close that residual gap, but it would change
  // observable single-request semantics (hop count, effective URL, cookie handling) in ways the
  // hermetic loopback e2e cannot faithfully cover, so it is intentionally deferred. The higher-severity
  // path — the 202 `Location` poll loop, which re-mints Managed-Identity tokens — is fully guarded in
  // `buildPollRequest` regardless of this choice.
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

  const result: BuiltinHttpActivityResult = { statusCode: response.status, headers: responseHeaders, content };
  // Record the post-redirect URL so a relative `Location` is resolved against the URI that actually
  // produced this response (fetch follows redirects by default).
  if (response.url) {
    result.effectiveUri = response.url;
  }
  return result;
}

/**
 * Build the next poll request for a `202` `Location`, applying the cross-origin credential policy.
 *
 * @param trustAnchorUri The credential trust anchor: the **originally-requested** URI, never the
 * previous hop's effective/post-redirect URI. Same-origin is judged against this, so a
 * callee-controlled `Location` or a followed redirect cannot move the origin we send credentials to.
 * @param resolved The absolute URI of the next poll (a `Location` already resolved against the
 * effective request URI).
 *
 * @remarks
 * `Location` is callee-controlled, so credentials are handled per
 * Azure/azure-functions-durable-extension#3443 (`CreateLocationPollRequest`), whose poll loop passes
 * the ORIGINAL request on every hop (its `req` is never reassigned):
 * - `x-functions-key` is **always** dropped (a function-level key won't open the master-key-protected
 *   status endpoint, and it must never leak to another origin);
 * - on a **cross-origin** `Location` the `Authorization`/`Cookie` headers and the `tokenSource` are
 *   dropped, so an attacker-controlled hop cannot harvest credentials or force a fresh Managed-Identity
 *   token to be minted for the original resource and exfiltrated;
 * - on a **same-origin** `Location` headers and the `tokenSource` are forwarded — the async polling
 *   pattern legitimately re-authenticates back to the same service.
 *
 * The header object is copied fresh from the **original** request on every iteration, so stripping on
 * one hop never corrupts a later (same-origin) hop.
 */
function buildPollRequest(
  request: DurableHttpRequestPayload,
  trustAnchorUri: string,
  resolved: string,
  enablePolling: boolean,
): DurableHttpRequestPayload {
  const sameOrigin = isSameOrigin(trustAnchorUri, resolved);
  const pollRequest: DurableHttpRequestPayload = { method: "GET", uri: resolved, enablePolling };

  if (request.headers !== undefined) {
    const headers = { ...request.headers };
    deleteHeader(headers, "x-functions-key");
    if (!sameOrigin) {
      deleteHeader(headers, "Authorization");
      deleteHeader(headers, "Cookie");
    }
    pollRequest.headers = headers;
  }
  if (sameOrigin && request.tokenSource !== undefined) {
    pollRequest.tokenSource = request.tokenSource;
  }
  return pollRequest;
}

/**
 * Built-in poll orchestrator: issue a durable HTTP request and poll while it returns `202`.
 *
 * @remarks
 * Written as a core-native async generator so the durabletask engine drives it directly (the
 * orchestration input arrives as the second argument). It calls the built-in HTTP activity and,
 * while the response is `202 Accepted` with a `Location` header (and polling is enabled), waits on a
 * durable timer (honoring `Retry-After`) before re-polling the `Location` URL, resolving a relative
 * `Location` against the effective request URI. Returns the final response. All time math uses the
 * replay-safe `currentUtcDateTime`, never `Date.now()`, so replays are deterministic.
 *
 * It rejects being started as a **top-level** orchestration: `callHttp` always schedules it as a
 * sub-orchestration, so a legitimate invocation always has a parent. A top-level start (e.g. via a
 * dynamic `orchestrators/{name}` starter) would let an attacker point the built-in at an arbitrary
 * URI with a token source — SSRF plus Managed-Identity token minting — so it is refused.
 */
export async function* builtinHttpPollOrchestrator(
  ctx: OrchestrationContext,
  input: DurableHttpRequestPayload,
): AsyncGenerator<Task<unknown>, DurableHttpResponse, unknown> {
  if (!ctx.parent) {
    throw new Error(
      `${BUILTIN_HTTP_POLL_ORCHESTRATOR_NAME} is an internal built-in and cannot be started as a ` +
        `top-level orchestration; use context.df.callHttp instead.`,
    );
  }

  const request = input ?? ({} as DurableHttpRequestPayload);
  // v3 opt-out: when polling is disabled the first response is returned as-is (no 202 loop).
  const enablePolling = request.enablePolling !== false;

  let response = (yield ctx.callActivity(BUILTIN_HTTP_ACTIVITY_NAME, request)) as BuiltinHttpActivityResult;
  // Two DISTINCT URIs, deliberately NOT merged into one variable:
  //   - `originalUri` is the credential TRUST ANCHOR: the URI the app author declared. It is captured
  //     once and NEVER reassigned, so a callee-controlled `Location` (or a redirect `fetch` followed)
  //     can never move the origin we are willing to send Authorization/Cookie/tokenSource to. Mirrors
  //     .NET `DurableOrchestrationContext.CallHttpAsync`, whose `req` is never reassigned across hops.
  //   - `currentUri` is ONLY the base for resolving a RELATIVE `Location` (RFC 9110 §10.2.2): the
  //     effective (post-redirect) URI of the latest hop. It legitimately moves each hop.
  // Merging them (using the moving effective URI as the trust anchor) is a token-exfiltration bypass:
  // once one hop lands on an attacker origin, a second attacker->attacker 202 would be judged
  // "same-origin" and re-mint the original credentials to the attacker.
  const originalUri = String(request.uri ?? "");
  let currentUri = response.effectiveUri ?? originalUri;

  while (enablePolling && response.statusCode === 202) {
    const headers = response.headers ?? {};
    const location = getHeader(headers, "Location");
    if (!location) {
      // Cannot poll without a Location; return the 202 as-is.
      break;
    }

    // A `Location` may be relative (e.g. `/operations/42`); resolve it against the effective request
    // URI so the next poll targets an absolute http(s) URL (the activity rejects non-absolute URIs).
    //
    // `Location` is remote-controlled: an absent one already means "cannot poll, return the 202 as-is"
    // (see the `if (!location) break` above), and both an UNPARSEABLE and a parseable-but-non-http(s)
    // one are the same situation. `new URL` throws `TypeError [ERR_INVALID_URL]` on input like `http://`
    // or `///`; and it PARSES a `file://`/`ftp://` Location cleanly, yet the activity's scheme guard
    // then rejects it — either way, continuing would fail the whole orchestration with an opaque error
    // instead of surfacing the 202 the caller can inspect. So a non-http(s) scheme stops polling too.
    // Determinism holds: `new URL` and the protocol check are pure computation over history-derived
    // values, so replay re-takes the identical branch.
    let resolved: string;
    try {
      const url = new URL(location, currentUri);
      // `URL.protocol` is WHATWG-normalized to lowercase, so `FILE://`/`Ftp://` are covered too.
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        break;
      }
      resolved = url.toString();
    } catch {
      break;
    }

    const now = ctx.currentUtcDateTime;
    const delaySeconds = retryAfterSeconds(headers, now);
    const fireAt = new Date(now.getTime() + delaySeconds * 1000);
    yield ctx.createTimer(fireAt);

    // Trust anchor is the ORIGINAL request URI, never `currentUri` (see the note above).
    const pollRequest = buildPollRequest(request, originalUri, resolved, enablePolling);
    response = (yield ctx.callActivity(BUILTIN_HTTP_ACTIVITY_NAME, pollRequest)) as BuiltinHttpActivityResult;
    currentUri = response.effectiveUri ?? resolved;
  }

  // Strip the internal `effectiveUri` so `callHttp` resolves to exactly the v3
  // `{ statusCode, headers, content }` shape.
  //
  // Known v3 gap: v3's `DurableHttpResponse` was a class exposing a case-insensitive `getHeader()`.
  // The response here crosses this sub-orchestration's JSON boundary back to `callHttp`, so it can only
  // be a plain object; and core `Task<T>` is a plain data holder whose `_result` the executor reads
  // directly (bypassing any accessor), so neither subclassing `Task` nor reviving a class instance in
  // the caller survives serialization. Restoring `getHeader()` would require replacing
  // `wrapOrchestrator`'s `yield*` delegation with a manual drive loop that still preserves `.throw()`
  // and `.return()` for every classic orchestrator — too broad a blast radius to justify here.
  // Migrating consumers read headers by lower-cased key (`response.headers["location"]`), since `fetch`
  // lower-cases response header names. Tracked for a follow-up issue.
  return { statusCode: response.statusCode, headers: response.headers, content: response.content };
}
