// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { OrchestrationContext, Task } from "@microsoft/durabletask-js";
import {
  BUILTIN_HTTP_ACTIVITY_NAME,
  builtinHttpActivity,
  builtinHttpPollOrchestrator,
  retryAfterSeconds,
} from "../../src/http/builtin";
import { DurableHttpRequestPayload, DurableHttpResponse } from "../../src/http/models";

// `@azure/identity` is an OPTIONAL dependency loaded lazily via `require` inside the activity, and is
// not installed in this workspace — a virtual mock stands in so the token-acquisition path can be
// exercised and the REAL (mocked) token asserted on the outgoing request.
const mockGetToken = jest.fn(async (_scope: string) => ({ token: "REAL_TOKEN_123" }));
jest.mock(
  "@azure/identity",
  () => ({
    DefaultAzureCredential: jest.fn().mockImplementation(() => ({ getToken: mockGetToken })),
  }),
  { virtual: true },
);

/** A minimal fetch Response stand-in (avoids depending on the global `Response` constructor). */
function fakeResponse(status: number, headers: { [key: string]: string }, body: string) {
  return {
    status,
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

  it("falls back to 1s when the header is missing or unparseable", () => {
    expect(retryAfterSeconds({}, now)).toBe(1);
    expect(retryAfterSeconds({ "Retry-After": "not-a-date" }, now)).toBe(1);
  });

  it("never returns a negative delay for a past HTTP-date", () => {
    expect(retryAfterSeconds({ "Retry-After": "Thu, 01 Jan 2026 00:00:00 GMT" }, new Date("2026-01-01T00:01:00.000Z"))).toBe(
      0,
    );
  });
});

describe("builtinHttpActivity", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
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
    expect(response).toEqual({
      statusCode: 200,
      headers: { "content-type": "text/plain" },
      content: "hello",
    });
  });

  it("sends a body for non-GET/HEAD methods but omits it for GET", async () => {
    const fetchMock = makeFetchMock(fakeResponse(200, {}, ""));
    global.fetch = fetchMock as unknown as typeof fetch;

    await builtinHttpActivity({ method: "POST", uri: "https://example.test/", content: '{"a":1}' });
    expect((fetchMock.mock.calls[0][1] as RequestInit).body).toBe('{"a":1}');

    await builtinHttpActivity({ method: "GET", uri: "https://example.test/", content: '{"a":1}' });
    expect((fetchMock.mock.calls[1][1] as RequestInit).body).toBeUndefined();
  });

  it("throws when the uri is missing", async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    await expect(builtinHttpActivity({ method: "GET" } as DurableHttpRequestPayload)).rejects.toThrow(/uri/i);
  });

  it("rejects non-http/https schemes (SSRF guard)", async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    await expect(
      builtinHttpActivity({ method: "GET", uri: "file:///etc/passwd" }),
    ).rejects.toThrow(/http\/https/);
    await expect(builtinHttpActivity({ method: "GET", uri: "ftp://host/f" })).rejects.toThrow(/http\/https/);
  });

  it("captures a 202 response instead of throwing", async () => {
    const fetchMock = makeFetchMock(fakeResponse(202, { location: "https://example.test/op/1" }, ""));
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await builtinHttpActivity({ method: "POST", uri: "https://example.test/start" });

    expect(response.statusCode).toBe(202);
    expect(response.headers.location).toBe("https://example.test/op/1");
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

  it("does not overwrite an explicit Authorization header", async () => {
    const fetchMock = makeFetchMock(fakeResponse(200, {}, "ok"));
    global.fetch = fetchMock as unknown as typeof fetch;

    await builtinHttpActivity({
      method: "GET",
      uri: "https://example.test/secure",
      headers: { Authorization: "Bearer caller-supplied" },
      tokenSource: { resource: "https://graph.microsoft.com/" },
    });

    const sentHeaders = (fetchMock.mock.calls[0][1] as RequestInit).headers as { [key: string]: string };
    expect(sentHeaders["Authorization"]).toBe("Bearer caller-supplied");
  });
});

/** Drives the poll orchestrator generator with a fake core context, feeding activity/timer results. */
function createPollContext(now: Date) {
  const ctx = {
    currentUtcDateTime: now,
    callActivity: jest.fn((name: string, input: unknown) => ({ kind: "activity", name, input }) as unknown as Task<unknown>),
    createTimer: jest.fn((fireAt: Date | number) => ({ kind: "timer", fireAt }) as unknown as Task<unknown>),
  };
  return { ctx: ctx as unknown as OrchestrationContext, raw: ctx };
}

describe("builtinHttpPollOrchestrator", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");

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

    // 3) after the timer, re-poll the Location with GET, carrying headers + tokenSource
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
});
