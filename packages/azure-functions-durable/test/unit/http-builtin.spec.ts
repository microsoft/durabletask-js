// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { OrchestrationContext, Task } from "@microsoft/durabletask-js";
import {
  BUILTIN_HTTP_ACTIVITY_NAME,
  builtinHttpActivity,
  builtinHttpPollOrchestrator,
  isSameOrigin,
  retryAfterSeconds,
  __resetCredentialCacheForTests,
} from "../../src/http/builtin";
import { DurableHttpRequestPayload, DurableHttpResponse } from "../../src/http/models";

// `@azure/identity` is an OPTIONAL peer dependency loaded lazily via `require` inside the activity.
// A `{ virtual: true }` mock stands in so the token-acquisition path can be exercised and the REAL
// (mocked) token asserted on the outgoing request — independent of whether the real package happens
// to be resolvable in the workspace (it is today, only because the sibling azuremanaged package
// depends on it; a standalone consumer of this compat package would not have it installed).
const mockGetToken = jest.fn(async (_scope: string) => ({ token: "REAL_TOKEN_123" }));
// The virtual mock delegates to a swappable factory so an individual test can make
// `require("@azure/identity")` succeed (the default) OR fail with a specific error, reusing the same
// virtual-mock mechanism rather than a bespoke harness. `mock`-prefixed so the hoisted `jest.mock`
// factory may legally close over it.
const mockIdentityModuleDefault = () => ({
  DefaultAzureCredential: jest.fn().mockImplementation(() => ({ getToken: mockGetToken })),
});
let mockRequireIdentity: () => unknown = mockIdentityModuleDefault;
jest.mock("@azure/identity", () => mockRequireIdentity(), { virtual: true });

/** A minimal fetch Response stand-in (avoids depending on the global `Response` constructor). */
function fakeResponse(status: number, headers: { [key: string]: string }, body: string, url = "") {
  return {
    status,
    url,
    headers: {
      forEach: (cb: (value: string, key: string) => void) =>
        Object.entries(headers).forEach(([key, value]) => cb(value, key)),
    },
    text: async () => body,
  };
}

/**
 * Builds a `fetch` mock with a typed `(input, init)` signature so `mock.calls[i][1]` is a
 * `RequestInit` (a bare `jest.fn(async () => ...)` types its calls as an empty tuple).
 */
function makeFetchMock(response: ReturnType<typeof fakeResponse>) {
  return jest.fn((_input: string, _init?: RequestInit) => Promise.resolve(response));
}

describe("retryAfterSeconds", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");

  it("parses the delta-seconds form", () => {
    expect(retryAfterSeconds({ "Retry-After": "5" }, now)).toBe(5);
  });

  it("parses the HTTP-date form relative to the replay-safe clock", () => {
    expect(retryAfterSeconds({ "Retry-After": "Thu, 01 Jan 2026 00:00:10 GMT" }, now)).toBe(10);
  });

  it("is case-insensitive on the header name", () => {
    expect(retryAfterSeconds({ "retry-after": "7" }, now)).toBe(7);
  });

  it("falls back to the 30s host default when the header is missing or unparseable", () => {
    // v3's host default is 30s (HttpOptions.DefaultAsyncRequestSleepTime); polling once per second
    // would be up to 30x more activity + timer executions.
    expect(retryAfterSeconds({}, now)).toBe(30);
    expect(retryAfterSeconds({ "Retry-After": "not-a-date" }, now)).toBe(30);
  });

  it("rounds an HTTP-date delay UP so the poll never fires early", () => {
    // now = 08.800, retry-at = 10.000 -> 1.2s remaining. Math.ceil => 2; Math.floor/round would
    // give 1 and poll up to ~1.2s early.
    expect(
      retryAfterSeconds(
        { "Retry-After": "Thu, 01 Jan 2026 00:00:10 GMT" },
        new Date("2026-01-01T00:00:08.800Z"),
      ),
    ).toBe(2);
  });

  it("never returns a negative delay for a past HTTP-date", () => {
    expect(
      retryAfterSeconds({ "Retry-After": "Thu, 01 Jan 2026 00:00:00 GMT" }, new Date("2026-01-01T00:01:00.000Z")),
    ).toBe(0);
  });
});

describe("isSameOrigin", () => {
  it("treats identical scheme/host/port (differing path) as same-origin", () => {
    expect(isSameOrigin("https://svc.test/api/start", "https://svc.test/api/status/1")).toBe(true);
  });

  it("normalizes default ports and is case-insensitive on scheme/host", () => {
    expect(isSameOrigin("https://svc.test:443/a", "https://SVC.TEST/b")).toBe(true);
    expect(isSameOrigin("http://svc.test:80/a", "http://svc.test/b")).toBe(true);
  });

  it("treats a differing scheme, host, or explicit port as cross-origin", () => {
    expect(isSameOrigin("http://svc.test/a", "https://svc.test/a")).toBe(false);
    expect(isSameOrigin("https://svc.test/a", "https://attacker.test/a")).toBe(false);
    expect(isSameOrigin("http://svc.test:8080/a", "http://svc.test/a")).toBe(false);
    // 127.0.0.1 and localhost are different origin strings even though both are loopback.
    expect(isSameOrigin("http://127.0.0.1:7071/a", "http://localhost:7071/a")).toBe(false);
  });

  it("treats a non-absolute or unparseable URI as cross-origin (conservative)", () => {
    expect(isSameOrigin("/relative/path", "https://svc.test/a")).toBe(false);
    expect(isSameOrigin("https://svc.test/a", "not a url")).toBe(false);
  });
});

describe("builtinHttpActivity", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  // The credential is cached at module scope; clear it between tests so a swapped virtual mock (or a
  // construction-count assertion) is never served a prior test's cached instance.
  beforeEach(() => {
    __resetCredentialCacheForTests();
  });

  it("performs the request and passes the 200 response through", async () => {
    const fetchMock = makeFetchMock(fakeResponse(200, { "content-type": "text/plain" }, "hello"));
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await builtinHttpActivity({ method: "GET", uri: "https://example.test/data" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUri, calledInit] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(calledUri).toBe("https://example.test/data");
    expect(calledInit.method).toBe("GET");
    expect(calledInit.body).toBeUndefined();
    // No redirect (response.url === "") -> no internal effectiveUri leaks into the v3 shape.
    expect(response).toEqual({
      statusCode: 200,
      headers: { "content-type": "text/plain" },
      content: "hello",
    });
  });

  it("sends a body for non-GET/HEAD methods", async () => {
    const fetchMock = makeFetchMock(fakeResponse(200, {}, ""));
    global.fetch = fetchMock as unknown as typeof fetch;

    await builtinHttpActivity({ method: "POST", uri: "https://example.test/", content: '{"a":1}' });
    expect((fetchMock.mock.calls[0][1] as RequestInit).body).toBe('{"a":1}');
  });

  it("throws when a GET or HEAD request carries a body (fetch forbids it; v3 silently sent it)", async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    await expect(
      builtinHttpActivity({ method: "GET", uri: "https://example.test/", content: "x" }),
    ).rejects.toThrow(/cannot carry a body/i);
    await expect(
      builtinHttpActivity({ method: "HEAD", uri: "https://example.test/", content: "x" }),
    ).rejects.toThrow(/cannot carry a body/i);
  });

  it("throws when the uri is missing", async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    await expect(builtinHttpActivity({ method: "GET" } as DurableHttpRequestPayload)).rejects.toThrow(/uri/i);
  });

  it("rejects non-http/https schemes (SSRF guard)", async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    await expect(builtinHttpActivity({ method: "GET", uri: "file:///etc/passwd" })).rejects.toThrow(/http\/https/);
    await expect(builtinHttpActivity({ method: "GET", uri: "ftp://host/f" })).rejects.toThrow(/http\/https/);
  });

  it("captures a 202 response instead of throwing", async () => {
    const fetchMock = makeFetchMock(fakeResponse(202, { location: "https://example.test/op/1" }, ""));
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await builtinHttpActivity({ method: "POST", uri: "https://example.test/start" });

    expect(response.statusCode).toBe(202);
    expect(response.headers.location).toBe("https://example.test/op/1");
  });

  it("returns the post-redirect effective URI when fetch followed a redirect", async () => {
    const fetchMock = makeFetchMock(fakeResponse(200, {}, "ok", "https://example.test/v2/final"));
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await builtinHttpActivity({ method: "GET", uri: "https://example.test/v1/start" });

    expect((response as { effectiveUri?: string }).effectiveUri).toBe("https://example.test/v2/final");
  });

  it("acquires a real bearer token via @azure/identity when a tokenSource is present", async () => {
    const fetchMock = makeFetchMock(fakeResponse(200, {}, "ok"));
    global.fetch = fetchMock as unknown as typeof fetch;

    await builtinHttpActivity({
      method: "GET",
      uri: "https://example.test/secure",
      tokenSource: { kind: "AzureManagedIdentity", resource: "https://management.core.windows.net/" },
    });

    // The scope is the resource with any trailing slashes stripped, plus `/.default`.
    expect(mockGetToken).toHaveBeenCalledWith("https://management.core.windows.net/.default");
    const sentHeaders = (fetchMock.mock.calls[0][1] as RequestInit).headers as { [key: string]: string };
    // The REAL token is forwarded — never a masked placeholder.
    expect(sentHeaders["Authorization"]).toBe("Bearer REAL_TOKEN_123");
  });

  it("builds the .default scope idempotently for bare and already-scoped resources", async () => {
    const fetchMock = makeFetchMock(fakeResponse(200, {}, "ok"));
    global.fetch = fetchMock as unknown as typeof fetch;

    await builtinHttpActivity({
      method: "GET",
      uri: "https://x.test/",
      tokenSource: { resource: "https://graph.microsoft.com/" },
    });
    expect(mockGetToken).toHaveBeenLastCalledWith("https://graph.microsoft.com/.default");

    // Already-scoped resource must NOT become `.../.default/.default`.
    await builtinHttpActivity({
      method: "GET",
      uri: "https://x.test/",
      tokenSource: { resource: "https://graph.microsoft.com/.default" },
    });
    expect(mockGetToken).toHaveBeenLastCalledWith("https://graph.microsoft.com/.default");
  });

  it("overwrites any caller-supplied Authorization with the token (case-insensitive)", async () => {
    const fetchMock = makeFetchMock(fakeResponse(200, {}, "ok"));
    global.fetch = fetchMock as unknown as typeof fetch;

    await builtinHttpActivity({
      method: "GET",
      uri: "https://example.test/secure",
      headers: { authorization: "Bearer caller-supplied" }, // lowercase variant
      tokenSource: { resource: "https://graph.microsoft.com/" },
    });

    const sentHeaders = (fetchMock.mock.calls[0][1] as RequestInit).headers as { [key: string]: string };
    // Token wins over the caller value (v3 semantics), and the lowercase variant is removed so fetch
    // cannot merge two Authorization headers into one malformed comma-joined value.
    expect(sentHeaders["Authorization"]).toBe("Bearer REAL_TOKEN_123");
    expect(sentHeaders["authorization"]).toBeUndefined();
  });

  describe("@azure/identity lazy loading and caching", () => {
    afterEach(() => {
      // Restore the default (successful) require so later suites are unaffected.
      mockRequireIdentity = mockIdentityModuleDefault;
    });

    // Freshly load the activity so its lazy `require("@azure/identity")` re-invokes the swapped mock
    // (Jest caches a module after the first successful require; resetModules busts that cache).
    function loadActivityFresh(): typeof builtinHttpActivity {
      jest.resetModules();
      return require("../../src/http/builtin").builtinHttpActivity;
    }

    const tokenRequest: DurableHttpRequestPayload = {
      method: "GET",
      uri: "https://example.test/secure",
      tokenSource: { resource: "https://graph.microsoft.com/" },
    };

    it("throws actionable install guidance when @azure/identity is not installed (MODULE_NOT_FOUND)", async () => {
      mockRequireIdentity = () => {
        const err = new Error("Cannot find module '@azure/identity'") as Error & { code?: string };
        err.code = "MODULE_NOT_FOUND";
        throw err;
      };

      await expect(loadActivityFresh()(tokenRequest)).rejects.toThrow(
        "callHttp with a tokenSource requires the optional '@azure/identity' package.",
      );
    });

    it("propagates a non-MODULE_NOT_FOUND require failure unchanged instead of mislabeling it as missing", async () => {
      const initFailure = new Error("boom while initializing @azure/identity");
      mockRequireIdentity = () => {
        throw initFailure;
      };

      // The ORIGINAL error surfaces (same instance) — NOT the install-guidance message, which would
      // wrongly tell the user to install a package they already have.
      await expect(loadActivityFresh()(tokenRequest)).rejects.toBe(initFailure);
    });

    it("constructs DefaultAzureCredential once and reuses it across token acquisitions", async () => {
      const credentialCtor = jest.fn().mockImplementation(() => ({ getToken: mockGetToken }));
      mockRequireIdentity = () => ({ DefaultAzureCredential: credentialCtor });
      const fetchMock = makeFetchMock(fakeResponse(200, {}, "ok"));
      global.fetch = fetchMock as unknown as typeof fetch;

      const activity = loadActivityFresh();
      await activity(tokenRequest);
      await activity(tokenRequest);

      // The credential is cached at module scope, so the environment-probing constructor runs once
      // even though two hops acquired a token — a long 202 poll loop cannot re-probe (rate-limited)
      // IMDS on every hop.
      expect(credentialCtor).toHaveBeenCalledTimes(1);
    });
  });
});

/** Drives the poll orchestrator generator with a fake core context, feeding activity/timer results. */
function createPollContext(
  now: Date,
  parent: unknown = { name: "root", instanceId: "root-id", taskScheduledId: 0 },
) {
  const ctx = {
    parent,
    currentUtcDateTime: now,
    callActivity: jest.fn((name: string, input: unknown) => ({ kind: "activity", name, input }) as unknown as Task<unknown>),
    createTimer: jest.fn((fireAt: Date | number) => ({ kind: "timer", fireAt }) as unknown as Task<unknown>),
  };
  return { ctx: ctx as unknown as OrchestrationContext, raw: ctx };
}

describe("builtinHttpPollOrchestrator", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");

  it("throws when started as a top-level orchestration (no parent)", async () => {
    // Refuses direct top-level invocation: callHttp always schedules it as a sub-orchestration, so a
    // parentless start is an attacker pointing the built-in at an arbitrary URI + token source. `null`
    // stands in for the core's top-level `parent: undefined` (both are falsy).
    const { ctx } = createPollContext(now, null);
    const gen = builtinHttpPollOrchestrator(ctx, { method: "GET", uri: "https://host/api" });
    await expect(gen.next()).rejects.toThrow(/top-level/i);
  });

  it("returns the first response immediately when it is not a 202 (no timer)", async () => {
    const { ctx, raw } = createPollContext(now);
    const gen = builtinHttpPollOrchestrator(ctx, { method: "GET", uri: "https://host/api", enablePolling: true });

    const firstYield = await gen.next();
    expect(raw.callActivity).toHaveBeenCalledWith(
      BUILTIN_HTTP_ACTIVITY_NAME,
      expect.objectContaining({ method: "GET", uri: "https://host/api" }),
    );
    expect(firstYield.done).toBe(false);

    const ok: DurableHttpResponse = { statusCode: 200, headers: {}, content: "done" };
    const result = await gen.next(ok);
    expect(result.done).toBe(true);
    expect(result.value).toEqual(ok);
    expect(raw.createTimer).not.toHaveBeenCalled();
  });

  it("polls on 202+Location: activity, then durable timer, then re-polls Location by GET", async () => {
    const { ctx, raw } = createPollContext(now);
    const request: DurableHttpRequestPayload = {
      method: "POST",
      uri: "https://host/api/start",
      enablePolling: true,
      headers: { "x-custom": "1" },
      tokenSource: { resource: "https://management.core.windows.net/" },
    };
    const gen = builtinHttpPollOrchestrator(ctx, request);

    // 1) initial activity
    await gen.next();
    expect(raw.callActivity).toHaveBeenNthCalledWith(1, BUILTIN_HTTP_ACTIVITY_NAME, request);

    // 2) 202 -> a durable timer honoring Retry-After (5s) is created
    const afterFirst = await gen.next({
      statusCode: 202,
      headers: { Location: "https://host/api/status/1", "Retry-After": "5" },
    });
    expect(afterFirst.done).toBe(false);
    expect(raw.createTimer).toHaveBeenCalledTimes(1);
    expect(raw.createTimer).toHaveBeenCalledWith(new Date("2026-01-01T00:00:05.000Z"));

    // 3) after the timer, re-poll the Location with GET, carrying same-origin headers + tokenSource
    const afterTimer = await gen.next();
    expect(afterTimer.done).toBe(false);
    expect(raw.callActivity).toHaveBeenNthCalledWith(2, BUILTIN_HTTP_ACTIVITY_NAME, {
      method: "GET",
      uri: "https://host/api/status/1",
      enablePolling: true,
      headers: { "x-custom": "1" },
      tokenSource: { resource: "https://management.core.windows.net/" },
    });

    // 4) final 200 completes the orchestration
    const done = await gen.next({ statusCode: 200, headers: {}, content: "final" });
    expect(done.done).toBe(true);
    expect(done.value).toEqual({ statusCode: 200, headers: {}, content: "final" });
  });

  it("honors an HTTP-date Retry-After when scheduling the poll timer", async () => {
    const { ctx, raw } = createPollContext(now);
    const gen = builtinHttpPollOrchestrator(ctx, { method: "GET", uri: "https://host/api", enablePolling: true });

    await gen.next();
    await gen.next({
      statusCode: 202,
      headers: { Location: "https://host/api/status", "Retry-After": "Thu, 01 Jan 2026 00:00:30 GMT" },
    });
    expect(raw.createTimer).toHaveBeenCalledWith(new Date("2026-01-01T00:00:30.000Z"));
  });

  it("resolves a relative Location against the current request URI", async () => {
    const { ctx, raw } = createPollContext(now);
    const gen = builtinHttpPollOrchestrator(ctx, { method: "POST", uri: "https://host/api/op", enablePolling: true });

    await gen.next();
    await gen.next({ statusCode: 202, headers: { Location: "/status/42", "Retry-After": "1" } });
    await gen.next(); // advance past the timer to the second poll

    expect(raw.callActivity).toHaveBeenNthCalledWith(
      2,
      BUILTIN_HTTP_ACTIVITY_NAME,
      expect.objectContaining({ method: "GET", uri: "https://host/status/42" }),
    );
  });

  it("resolves a relative Location against the effective (post-redirect) URI, not the requested URI", async () => {
    const { ctx, raw } = createPollContext(now);
    const gen = builtinHttpPollOrchestrator(ctx, { method: "GET", uri: "https://host/v1/start", enablePolling: true });

    await gen.next();
    // The activity followed a redirect to /v2/start; the relative Location must resolve against it.
    await gen.next({
      statusCode: 202,
      headers: { Location: "status/1", "Retry-After": "1" },
      effectiveUri: "https://host/v2/start",
    });
    await gen.next();

    const pollReq = raw.callActivity.mock.calls[1][1] as DurableHttpRequestPayload;
    expect(pollReq.uri).toBe("https://host/v2/status/1");
  });

  it("drops Authorization/Cookie/tokenSource and x-functions-key when the Location is cross-origin", async () => {
    const { ctx, raw } = createPollContext(now);
    const request: DurableHttpRequestPayload = {
      method: "GET",
      uri: "https://original.test/api/start",
      enablePolling: true,
      headers: { Authorization: "Bearer caller", Cookie: "sid=1", "x-functions-key": "fkey", "x-keep": "yes" },
      tokenSource: { resource: "https://management.core.windows.net/" },
    };
    const gen = builtinHttpPollOrchestrator(ctx, request);

    await gen.next();
    await gen.next({ statusCode: 202, headers: { Location: "https://attacker.test/harvest", "Retry-After": "1" } });
    await gen.next(); // past timer -> second poll to the cross-origin Location

    const pollReq = raw.callActivity.mock.calls[1][1] as DurableHttpRequestPayload;
    expect(pollReq.uri).toBe("https://attacker.test/harvest");
    // Only the neutral header survives; credentials are stripped.
    expect(pollReq.headers).toEqual({ "x-keep": "yes" });
    expect(pollReq.tokenSource).toBeUndefined();
    // The ORIGINAL request object must be untouched (defensive per-iteration copy).
    expect(request.headers).toEqual({
      Authorization: "Bearer caller",
      Cookie: "sid=1",
      "x-functions-key": "fkey",
      "x-keep": "yes",
    });
  });

  it("forwards headers + tokenSource on a same-origin Location but always drops x-functions-key", async () => {
    const { ctx, raw } = createPollContext(now);
    const request: DurableHttpRequestPayload = {
      method: "GET",
      uri: "https://svc.test/api/start",
      enablePolling: true,
      headers: { Authorization: "Bearer caller", "x-functions-key": "fkey", "x-keep": "yes" },
      tokenSource: { resource: "https://management.core.windows.net/" },
    };
    const gen = builtinHttpPollOrchestrator(ctx, request);

    await gen.next();
    await gen.next({ statusCode: 202, headers: { Location: "https://svc.test/api/status/1", "Retry-After": "1" } });
    await gen.next();

    const pollReq = raw.callActivity.mock.calls[1][1] as DurableHttpRequestPayload;
    // x-functions-key is dropped even same-origin; Authorization + tokenSource are forwarded.
    expect(pollReq.headers).toEqual({ Authorization: "Bearer caller", "x-keep": "yes" });
    expect(pollReq.tokenSource).toEqual({ resource: "https://management.core.windows.net/" });
  });

  it("re-forwards same-origin credentials across multiple hops without corrupting later iterations", async () => {
    const { ctx, raw } = createPollContext(now);
    const request: DurableHttpRequestPayload = {
      method: "GET",
      uri: "https://svc.test/api/start",
      enablePolling: true,
      headers: { Authorization: "Bearer caller", "x-functions-key": "fkey" },
      tokenSource: { resource: "https://management.core.windows.net/" },
    };
    const gen = builtinHttpPollOrchestrator(ctx, request);

    await gen.next();
    await gen.next({ statusCode: 202, headers: { Location: "https://svc.test/api/status/1", "Retry-After": "1" } });
    await gen.next(); // second poll (call index 1)
    await gen.next({ statusCode: 202, headers: { Location: "https://svc.test/api/status/2", "Retry-After": "1" } });
    await gen.next(); // third poll (call index 2)

    const poll1 = raw.callActivity.mock.calls[1][1] as DurableHttpRequestPayload;
    const poll2 = raw.callActivity.mock.calls[2][1] as DurableHttpRequestPayload;
    // Iteration 2 must still carry the (same-origin) credentials — proof the header stripping on each
    // hop copies from the original request and never mutates it in place.
    expect(poll1.headers).toEqual({ Authorization: "Bearer caller" });
    expect(poll1.tokenSource).toEqual({ resource: "https://management.core.windows.net/" });
    expect(poll2.headers).toEqual({ Authorization: "Bearer caller" });
    expect(poll2.tokenSource).toEqual({ resource: "https://management.core.windows.net/" });
    expect(request.headers).toEqual({ Authorization: "Bearer caller", "x-functions-key": "fkey" });
  });

  it("does NOT restore credentials when a cross-origin hop later polls its own same-origin Location", async () => {
    // Anchor-drift bypass: once a hop lands on an attacker origin, the same-origin trust anchor must
    // NOT move to that origin. Otherwise the attacker returns a second 202 whose Location is on its own
    // origin, that hop is judged "same-origin", and the pristine Authorization/Cookie/tokenSource are
    // re-derived and sent to the attacker (a fresh Managed-Identity token is minted for the ORIGINAL
    // resource and exfiltrated). The trust anchor must stay the originally-requested URI — mirrors .NET
    // DurableOrchestrationContext.CallHttpAsync, whose `req` is never reassigned across hops.
    const { ctx, raw } = createPollContext(now);
    const request: DurableHttpRequestPayload = {
      method: "GET",
      uri: "https://victim.test/op",
      enablePolling: true,
      headers: { Authorization: "auth-original", Cookie: "sid=1", "x-functions-key": "fkey", "x-keep": "yes" },
      tokenSource: { resource: "https://management.core.windows.net/" },
    };
    const gen = builtinHttpPollOrchestrator(ctx, request);

    await gen.next(); // initial request (call 0)
    // Hop 1 lands cross-origin: Location on the attacker origin -> creds stripped (already correct today).
    await gen.next({
      statusCode: 202,
      headers: { Location: "https://attacker.test/a", "Retry-After": "1" },
      effectiveUri: "https://victim.test/op",
    });
    await gen.next(); // second poll to attacker/a (call 1)
    // The attacker now 202s to a Location on ITS OWN origin (attacker -> attacker == "same origin").
    await gen.next({
      statusCode: 202,
      headers: { Location: "https://attacker.test/b", "Retry-After": "1" },
      effectiveUri: "https://attacker.test/a",
    });
    await gen.next(); // third poll to attacker/b (call 2) -- must remain credential-free

    const firstPoll = raw.callActivity.mock.calls[1][1] as DurableHttpRequestPayload;
    expect(firstPoll.uri).toBe("https://attacker.test/a");
    expect(firstPoll.headers).toEqual({ "x-keep": "yes" });
    expect(firstPoll.tokenSource).toBeUndefined();

    const secondPoll = raw.callActivity.mock.calls[2][1] as DurableHttpRequestPayload;
    expect(secondPoll.uri).toBe("https://attacker.test/b");
    // Cross-origin relative to the ORIGINAL victim URI, so credentials must stay stripped.
    expect(secondPoll.headers).toEqual({ "x-keep": "yes" });
    expect(secondPoll.tokenSource).toBeUndefined();
  });

  it("keeps credentials stripped when the first hop's effective URI is a cross-origin redirect target", async () => {
    // A single cross-origin 3xx on the first hop is enough: `fetch` follows it, so `effectiveUri` is
    // already the attacker origin. The poll must be judged against the originally-requested URI, not the
    // redirected-to effective URI, or the very first poll leaks credentials.
    const { ctx, raw } = createPollContext(now);
    const request: DurableHttpRequestPayload = {
      method: "GET",
      uri: "https://victim.test/op",
      enablePolling: true,
      headers: { Authorization: "auth-original", Cookie: "sid=1", "x-keep": "yes" },
      tokenSource: { resource: "https://management.core.windows.net/" },
    };
    const gen = builtinHttpPollOrchestrator(ctx, request);

    await gen.next(); // initial request (call 0)
    // fetch followed victim -> attacker (3xx); the 202 body's Location is on the attacker origin too.
    await gen.next({
      statusCode: 202,
      headers: { Location: "https://attacker.test/poll", "Retry-After": "1" },
      effectiveUri: "https://attacker.test/landing",
    });
    await gen.next(); // first poll (call 1) -- must be credential-free

    const poll = raw.callActivity.mock.calls[1][1] as DurableHttpRequestPayload;
    expect(poll.uri).toBe("https://attacker.test/poll");
    expect(poll.headers).toEqual({ "x-keep": "yes" });
    expect(poll.tokenSource).toBeUndefined();
  });

  it("returns the first 202 without looping when polling is disabled", async () => {
    const { ctx, raw } = createPollContext(now);
    const gen = builtinHttpPollOrchestrator(ctx, { method: "GET", uri: "https://host/api", enablePolling: false });

    await gen.next();
    const result = await gen.next({
      statusCode: 202,
      headers: { Location: "https://host/api/status", "Retry-After": "5" },
    });

    expect(result.done).toBe(true);
    expect((result.value as DurableHttpResponse).statusCode).toBe(202);
    expect(raw.createTimer).not.toHaveBeenCalled();
    expect(raw.callActivity).toHaveBeenCalledTimes(1);
  });

  it("stops polling when a 202 has no Location header", async () => {
    const { ctx, raw } = createPollContext(now);
    const gen = builtinHttpPollOrchestrator(ctx, { method: "GET", uri: "https://host/api", enablePolling: true });

    await gen.next();
    const result = await gen.next({ statusCode: 202, headers: {} });

    expect(result.done).toBe(true);
    expect((result.value as DurableHttpResponse).statusCode).toBe(202);
    expect(raw.createTimer).not.toHaveBeenCalled();
  });

  // A malformed, remote-controlled `Location` (e.g. `http://` or `///`) makes `new URL` throw
  // `TypeError [ERR_INVALID_URL]`. That must be treated exactly like a missing `Location`: return the
  // 202 for the caller to inspect, never fail the orchestration with an opaque error.
  it.each(["http://", "///"])(
    "stops polling and returns the 202 as-is when the Location %j is unparseable",
    async (badLocation) => {
      const { ctx, raw } = createPollContext(now);
      const gen = builtinHttpPollOrchestrator(ctx, { method: "GET", uri: "https://host/api", enablePolling: true });

      await gen.next();
      const response = { statusCode: 202, headers: { Location: badLocation }, content: "pending" };
      const result = await gen.next(response);

      // (a) does NOT throw, (b) returns the 202 unchanged, (c) schedules NO further timer/activity.
      expect(result.done).toBe(true);
      expect(result.value).toEqual({ statusCode: 202, headers: { Location: badLocation }, content: "pending" });
      expect(raw.createTimer).not.toHaveBeenCalled();
      expect(raw.callActivity).toHaveBeenCalledTimes(1);
    },
  );
});
