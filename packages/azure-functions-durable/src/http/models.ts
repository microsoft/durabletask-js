// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Durable HTTP request/response models (durable-functions v3 compatible).
 *
 * @remarks
 * In v3 the Durable Functions host extension executed `context.df.callHttp` natively (including
 * `202 Accepted` polling and Managed Identity token acquisition). The durabletask gRPC engine this
 * provider is built on has no native durable-HTTP action, so the feature is reconstructed from core
 * primitives (a built-in activity + a built-in polling sub-orchestration — see `./builtin`). These
 * types mirror the v3 public shapes and double as the JSON wire payload exchanged with the built-in
 * activity. Ported from the durabletask-python design (Andy Staples, durabletask-python#155).
 */

/**
 * The source of an OAuth token to attach to a durable HTTP request.
 *
 * @remarks
 * Mirrors the classic durable-functions v3 `TokenSource` union, which currently has a single
 * implementation, {@link ManagedIdentityTokenSource}.
 */
export type TokenSource = ManagedIdentityTokenSource;

/**
 * Token source backed by an [Azure Managed Identity](https://learn.microsoft.com/azure/active-directory/managed-identities-azure-resources/overview).
 *
 * @remarks
 * v3-compatible: exposes the target `resource` and a `kind` discriminator. When a request carrying
 * this token source reaches the built-in HTTP activity, a bearer token is acquired for `resource`
 * via the optional `@azure/identity` package and added as an `Authorization: Bearer <token>` header.
 */
export class ManagedIdentityTokenSource {
  /** @hidden Discriminator matching the classic durable-functions v3 token-source shape. */
  readonly kind: string = "AzureManagedIdentity";

  /**
   * @param resource The Azure Active Directory resource identifier of the web API being invoked,
   *   e.g. `https://management.core.windows.net/` or `https://graph.microsoft.com/`.
   */
  constructor(public readonly resource: string) {}
}

/**
 * Options accepted by `context.df.callHttp` (classic durable-functions v3 shape).
 */
export interface CallHttpOptions {
  /** The HTTP request method. */
  method: string;
  /** The HTTP request URL. */
  url: string;
  /** The HTTP request body. An `object` is JSON-serialized; a `string` is sent as-is. */
  body?: string | object;
  /** The HTTP request headers. */
  headers?: { [key: string]: string };
  /** The source of the OAuth token to add to the request. */
  tokenSource?: TokenSource;
  /**
   * Whether to keep polling the request after receiving a `202 Accepted` response. Replaces the
   * deprecated `asynchronousPatternEnabled`; if both are specified, `enablePolling` takes precedence.
   *
   * @default true
   */
  enablePolling?: boolean;
  /**
   * @deprecated Use `enablePolling` instead. If both are specified, `enablePolling` takes precedence.
   */
  asynchronousPatternEnabled?: boolean;
}

/**
 * The response returned by `context.df.callHttp` (classic durable-functions v3 shape).
 *
 * @remarks
 * The value crosses the sub-orchestration boundary as JSON, so `callHttp` resolves to a plain object
 * of this shape. Consumers read `response.statusCode` / `response.content` / `response.headers`.
 */
export interface DurableHttpResponse {
  /** The HTTP response status code. */
  statusCode: number;
  /** The HTTP response headers (keys are lower-cased by the underlying `fetch` implementation). */
  headers: { [key: string]: string };
  /** The HTTP response body. */
  content?: string;
}

/**
 * Data structure representing a durable HTTP request (classic durable-functions v3 shape).
 *
 * @remarks
 * Exported for import compatibility with durable-functions v3. `callHttp` builds the internal
 * {@link DurableHttpRequestPayload} wire form directly rather than constructing this class.
 */
export class DurableHttpRequest {
  /**
   * @param method The HTTP request method.
   * @param uri The HTTP request URL.
   * @param content The HTTP request content.
   * @param headers The HTTP request headers.
   * @param tokenSource The source of the OAuth token to add to the request.
   * @param asynchronousPatternEnabled Whether the request should handle the asynchronous (202) pattern.
   */
  constructor(
    public readonly method: string,
    public readonly uri: string,
    public readonly content?: string,
    public readonly headers?: { [key: string]: string },
    public readonly tokenSource?: TokenSource,
    public readonly asynchronousPatternEnabled: boolean = true,
  ) {}
}

/**
 * @hidden
 * Internal JSON wire payload exchanged between `callHttp`, the built-in poll orchestrator, and the
 * built-in HTTP activity. Uses `uri` (not `url`) and pre-serialized `content` (not `body`), matching
 * the v3 `DurableHttpRequest` wire shape, plus an `enablePolling` flag so the poll orchestrator can
 * honor the v3 opt-out of `202` polling.
 */
export interface DurableHttpRequestPayload {
  /** The HTTP request method. */
  method: string;
  /** The absolute http(s) request URI. */
  uri: string;
  /** The pre-serialized HTTP request body. */
  content?: string;
  /** The HTTP request headers. */
  headers?: { [key: string]: string };
  /** The OAuth token source (JSON form); only `resource` is required by the activity. */
  tokenSource?: { kind?: string; resource: string };
  /** Whether to keep polling on `202 Accepted`. Defaults to `true` when absent. */
  enablePolling?: boolean;
}
