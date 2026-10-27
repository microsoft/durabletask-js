// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Readable } from "stream";
import { getEventListeners } from "events";
import { gunzipSync, gzipSync } from "zlib";
import {
  IHttpClient,
  HttpOperationResponse,
  WebResource,
  RestError,
  StorageRetryOptions,
  StorageRetryPolicyType,
} from "@azure/storage-blob";
import { PayloadDeleteOutcome, PayloadStorageException } from "@microsoft/durabletask-js";
import { BlobPayloadStore } from "../src";
import fixtures from "./dotnet-payload-fixtures.json";

const accountKey = Buffer.alloc(64).toString("base64");
const connectionString = `DefaultEndpointsProtocol=https;AccountName=account;AccountKey=${accountKey};BlobEndpoint=https://account.invalid`;

class RecordingClient implements IHttpClient {
  requests: WebResource[] = [];
  times: number[] = [];
  failures: (Error | { status: number; code: string; headers?: Record<string, string> } | undefined)[] = [];
  bodies: Buffer[] = [];
  content = Buffer.from("payload");
  encoding = "";
  metadata: Record<string, string> = { managed_by: "dts" };
  error: { status: number; code: string } | undefined;
  failFirstUpload = false;
  async sendRequest(request: WebResource): Promise<HttpOperationResponse> {
    this.requests.push(request);
    this.times.push(Date.now());
    const headers = request.headers.clone();
    for (const header of headers.headersArray()) headers.remove(header.name);
    headers.set("x-ms-request-id", "offline");
    headers.set("etag", '"owned-etag"');
    headers.set("last-modified", new Date(0).toUTCString());
    headers.set("x-ms-blob-type", "BlockBlob");
    for (const [key, value] of Object.entries(this.metadata)) headers.set(`x-ms-meta-${key}`, value);
    if (this.encoding) headers.set("content-encoding", this.encoding);
    const container = new URL(request.url).searchParams.get("restype") === "container";
    const injected = this.failures.shift();
    if (injected instanceof Error) throw injected;
    const error: { status: number; code: string; headers?: Record<string, string> } | undefined =
      injected ??
      (this.failFirstUpload && request.method === "PUT" && !container
        ? { status: 404, code: "ContainerNotFound" }
        : this.error);
    if (error) {
      this.failFirstUpload = false;
      headers.set("x-ms-error-code", error.code);
      headers.set("content-type", "application/xml");
      for (const [name, value] of Object.entries(error.headers ?? {})) headers.set(name, value);
      return {
        request,
        status: error.status,
        headers,
        bodyAsText:
          request.method === "HEAD" ? "" : `<Error><Code>${error.code}</Code><Message>offline</Message></Error>`,
      };
    }
    if (request.method === "PUT" && !container) {
      const body = typeof request.body === "function" ? request.body() : request.body;
      if (!Buffer.isBuffer(body)) throw new Error("Expected a buffered upload");
      this.bodies.push(body);
    }
    headers.set("content-length", String(this.content.length));
    return {
      request,
      status: request.method === "PUT" ? 201 : request.method === "DELETE" ? 202 : 200,
      headers,
      readableStreamBody: Readable.from([this.content]),
      bodyAsText: "",
    };
  }
}

describe("BlobPayloadStore", () => {
  let http: RecordingClient;
  beforeEach(() => {
    http = new RecordingClient();
  });

  describe("BlobPayloadStore shared HTTP resilience", () => {
    let http: RecordingClient;
    const token = "blob:v2:https://account.invalid/durabletask-payloads/blob";
    const make = (http: RecordingClient, retryOptions?: StorageRetryOptions) =>
      new BlobPayloadStore({
        connectionString,
        compressionEnabled: false,
        clientOptions: { httpClient: http, retryOptions },
      });

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2030-01-01T00:00:00Z"));
      jest.spyOn(Math, "random").mockReturnValue(0.5);
      http = new RecordingClient();
    });

    afterEach(() => {
      jest.restoreAllMocks();
      jest.useRealTimers();
    });

    it.each([408, 429, 500, 502, 503, 504])(
      "recovers from ordinary HTTP %s through the real SDK pipeline",
      async (status) => {
        http.failures.push({ status, code: "Transient" });
        const pending = make(http).download(token);
        const assertion = expect(pending).resolves.toBe("payload");
        await jest.advanceTimersByTimeAsync(249);
        expect(http.requests).toHaveLength(1);
        await jest.advanceTimersByTimeAsync(1);
        await assertion;
        expect(http.requests).toHaveLength(2);
        expect(http.times[1] - http.times[0]).toBe(250);
        expect(jest.getTimerCount()).toBe(0);
      },
    );

    it.each(["InternalError", "OperationTimedOut", "ServerBusy"])(
      "retries service/copy-source code %s",
      async (code) => {
        for (const name of ["x-ms-error-code", "x-ms-copy-source-error-code"]) {
          http.failures.push({
            status: 400,
            code: name === "x-ms-error-code" ? code : "Other",
            headers: { [name]: code },
          });
          const pending = make(http).download(token);
          const assertion = expect(pending).resolves.toBe("payload");
          await jest.runAllTimersAsync();
          await assertion;
        }
        expect(http.requests).toHaveLength(4);
      },
    );

    it("uses eight retries with jittered exponential delay capped at ten seconds", async () => {
      http.error = { status: 503, code: "ServerBusy" };
      const pending = make(http).download(token);
      const assertion = expect(pending).rejects.toMatchObject({ statusCode: 503 });
      await jest.runAllTimersAsync();
      await assertion;
      expect(http.requests).toHaveLength(9);
      expect(http.times.slice(1).map((time, index) => time - http.times[index])).toEqual([
        250, 500, 1000, 2000, 4000, 8000, 10000, 10000,
      ]);
      expect(jest.getTimerCount()).toBe(0);
    });

    it.each([400, 401, 403, 404, 409, 412])("does not retry ordinary HTTP %s", async (status) => {
      http.error = { status, code: "Permanent" };
      const pending = make(http).download(token);
      const assertion = expect(pending).rejects.toThrow();
      await jest.runAllTimersAsync();
      await assertion;
      expect(http.requests).toHaveLength(1);
      expect(jest.getTimerCount()).toBe(0);
    });

    it("retries recognized network failures without repeating the upload invocation or changing its GUID/content", async () => {
      http.failures.push(undefined, new RestError("socket disconnected", { code: "ECONNRESET" }));
      const pending = make(http).upload("same payload");
      const assertion = expect(pending).resolves.toMatch(/^blob:v2:/);
      await jest.runAllTimersAsync();
      await assertion;
      const uploads = http.requests.filter((request) => !request.url.includes("restype=container"));
      expect(uploads).toHaveLength(2);
      expect(uploads[0].url).toBe(uploads[1].url);
      expect(http.bodies.map((body) => body.toString())).toEqual(["same payload"]);
    });

    it.each(["initialize", "upload", "download", "ownership", "delete"] as const)(
      "applies one HTTP retry policy to %s",
      async (operation) => {
        if (operation === "upload" || operation === "delete") http.failures.push(undefined);
        http.failures.push({ status: 429, code: "Throttled" });
        const store = make(http);
        const pending =
          operation === "initialize" || operation === "upload"
            ? store.upload("payload")
            : operation === "download"
              ? store.download(token)
              : store.delete(token);
        const assertion = expect(pending).resolves.toBeDefined();
        await jest.runAllTimersAsync();
        await assertion;
        expect(http.requests).toHaveLength(operation === "download" ? 2 : 3);
      },
    );

    it.each([
      [{ "retry-after-ms": "1300", "x-ms-retry-after-ms": "2200", "Retry-After": "3" }, 1300],
      [{ "x-ms-retry-after-ms": "1700", "Retry-After": "3" }, 1700],
      [{ "retry-after-ms": "invalid", "x-ms-retry-after-ms": "1000", "Retry-After": "2" }, 2000],
      [{ "Retry-After": "Tue, 01 Jan 2030 00:00:03 GMT" }, 3000],
      [{ "Retry-After": "20" }, 20000],
      [{ "Retry-After": "0" }, 250],
      [{ "retry-after-ms": "1.5", "Retry-After": "invalid" }, 250],
    ] as const)("honors .NET Retry-After precedence/default lower bound (%#)", async (headers, delay) => {
      http.failures.push({ status: 503, code: "ServerBusy", headers });
      const pending = make(http).download(token);
      const assertion = expect(pending).resolves.toBe("payload");
      await jest.advanceTimersByTimeAsync(delay - 1);
      expect(http.requests).toHaveLength(1);
      await jest.advanceTimersByTimeAsync(1);
      await assertion;
      expect(http.times[1] - http.times[0]).toBe(delay);
    });

    it("keeps a server delay above Node's timer limit delayed and cancellable", async () => {
      http.failures.push({ status: 503, code: "ServerBusy", headers: { "Retry-After": "2147484" } });
      const controller = new AbortController();
      const reason = Object.freeze(new Error("cancel long retry-after"));
      const pending = make(http).download(token, controller.signal);
      const rejected = pending.catch((error: unknown) => error);
      await jest.advanceTimersByTimeAsync(1000);
      expect(http.requests).toHaveLength(1);
      controller.abort(reason);
      await jest.advanceTimersByTimeAsync(0);
      expect(await rejected).toBe(reason);
      expect(jest.getTimerCount()).toBe(0);
    });

    it.each([0, 0.999])("jitter stays in the .NET 0.8..1.2 range (random=%s)", async (random) => {
      jest.mocked(Math.random).mockReturnValue(random);
      http.failures.push({ status: 503, code: "ServerBusy" });
      const pending = make(http).download(token);
      const assertion = expect(pending).resolves.toBe("payload");
      await jest.runAllTimersAsync();
      await assertion;
      expect(http.times[1] - http.times[0]).toBe(Math.floor(250 * (0.8 + random * 0.4)));
    });

    it.each([
      { maximum: 5, random: 0.5, expected: 30 },
      { maximum: 100, random: 0.999, expected: 30 },
      { maximum: 100, random: 0, expected: 24 },
    ])(
      "caps FIXED jitter at Delay independently of MaxDelay ($maximum/$random)",
      async ({ maximum, random, expected }) => {
        jest.mocked(Math.random).mockReturnValue(random);
        http.failures.push({ status: 503, code: "ServerBusy" });
        const pending = make(http, {
          maxTries: 2,
          retryDelayInMs: 30,
          maxRetryDelayInMs: maximum,
          retryPolicyType: StorageRetryPolicyType.FIXED,
        }).download(token);
        const assertion = expect(pending).resolves.toBe("payload");
        await jest.runAllTimersAsync();
        await assertion;
        expect(http.requests).toHaveLength(2);
        expect(http.times[1] - http.times[0]).toBe(expected);
      },
    );

    it("preserves explicit retry count, delay, cap, and fixed-policy overrides", async () => {
      http.error = { status: 503, code: "ServerBusy" };
      const pending = make(http, {
        maxTries: 3,
        retryDelayInMs: 30,
        maxRetryDelayInMs: 30,
        retryPolicyType: StorageRetryPolicyType.FIXED,
      }).download(token);
      const assertion = expect(pending).rejects.toMatchObject({ statusCode: 503 });
      await jest.runAllTimersAsync();
      await assertion;
      expect(http.requests).toHaveLength(3);
      expect(http.times.slice(1).map((time, index) => time - http.times[index])).toEqual([30, 30]);
    });

    it("preserves caller abort identity while canceling retry backoff", async () => {
      http.error = { status: 503, code: "ServerBusy" };
      const controller = new AbortController();
      const reason = Object.freeze(new Error("caller canceled storage"));
      const pending = make(http).download(token, controller.signal);
      const rejected = pending.catch((error: unknown) => error);
      await jest.advanceTimersByTimeAsync(0);
      controller.abort(reason);
      await jest.runAllTimersAsync();
      expect(await rejected).toBe(reason);
      expect(http.requests).toHaveLength(1);
      expect(jest.getTimerCount()).toBe(0);
    });

    it.each([
      new RestError("network status zero", { statusCode: 0 }),
      Object.assign(new Error("socket reset"), { code: "ECONNRESET" }),
    ])("recovers from a transient I/O failure %#", async (failure) => {
      http.failures.push(failure);
      const pending = make(http).download(token);
      const assertion = expect(pending).resolves.toBe("payload");
      void assertion.catch(() => {});
      await jest.runAllTimersAsync();
      await assertion;
      expect(http.requests).toHaveLength(2);
    });

    it("preserves configured read failover and stops using a secondary after its 404", async () => {
      const hosts: string[] = [];
      const send = http.sendRequest.bind(http);
      http.sendRequest = async (request) => {
        hosts.push(new URL(request.url).host);
        return send(request);
      };
      http.failures.push({ status: 503, code: "ServerBusy" }, { status: 404, code: "BlobNotFound" });
      const pending = make(http, { secondaryHost: "secondary.invalid" }).download(token);
      const assertion = expect(pending).resolves.toBe("payload");
      await jest.runAllTimersAsync();
      await assertion;
      expect(hosts).toEqual(["account.invalid", "secondary.invalid", "account.invalid"]);
    });

    it("does not redirect a cross-account identity retry to the configured account's secondary", async () => {
      const hosts: string[] = [];
      const send = http.sendRequest.bind(http);
      http.sendRequest = async (request) => {
        hosts.push(new URL(request.url).host);
        return send(request);
      };
      http.failures.push({ status: 503, code: "ServerBusy" });
      const store = new BlobPayloadStore({
        connectionString,
        credential: { getToken: async () => ({ token: "synthetic-token", expiresOnTimestamp: Date.now() + 3600000 }) },
        clientOptions: { httpClient: http, retryOptions: { maxTries: 2, secondaryHost: "account-secondary.invalid" } },
      });
      const pending = store.download("blob:v2:https://other.invalid/durabletask-payloads/blob");
      const assertion = expect(pending).resolves.toBe("payload");
      await jest.runAllTimersAsync();
      await assertion;
      expect(hosts).toEqual(["other.invalid", "other.invalid"]);
    });

    it.each(["download", "delete"] as const)(
      "preserves a primary transient when secondary absence exhausts the %s budget",
      async (operation) => {
        const hosts: string[] = [];
        const send = http.sendRequest.bind(http);
        http.sendRequest = async (request) => {
          hosts.push(new URL(request.url).host);
          return send(request);
        };
        http.failures.push({ status: 503, code: "ServerBusy" }, { status: 404, code: "BlobNotFound" });
        const pending = make(http, { maxTries: 2, secondaryHost: "secondary.invalid" })[operation](token);
        const assertion = expect(pending).rejects.toMatchObject({ statusCode: 503 });
        void assertion.catch(() => {});
        await jest.runAllTimersAsync();
        await assertion;
        expect(hosts).toEqual(["account.invalid", "secondary.invalid"]);
        expect(http.requests).toHaveLength(2);
        expect(http.requests.some((request) => request.method === "DELETE")).toBe(false);
      },
    );

    it.each(["download", "delete"] as const)(
      "keeps a successful same-account secondary usable with maxTries2 for %s",
      async (operation) => {
        const hosts: string[] = [];
        const send = http.sendRequest.bind(http);
        http.sendRequest = async (request) => {
          hosts.push(new URL(request.url).host);
          return send(request);
        };
        http.failures.push({ status: 503, code: "ServerBusy" });
        const pending = make(http, { maxTries: 2, secondaryHost: "secondary.invalid" })[operation](token);
        const assertion = expect(pending).resolves.toBe(
          operation === "download" ? "payload" : PayloadDeleteOutcome.Deleted,
        );
        await jest.runAllTimersAsync();
        await assertion;
        expect(hosts).toEqual(
          operation === "download"
            ? ["account.invalid", "secondary.invalid"]
            : ["account.invalid", "secondary.invalid", "account.invalid"],
        );
      },
    );

    it.each(["download", "delete"] as const)(
      "preserves the original primary transport error when secondary 404 exhausts %s",
      async (operation) => {
        const failure = Object.freeze(new RestError("primary socket failure", { code: "ECONNRESET" }));
        http.failures.push(failure, { status: 404, code: "BlobNotFound" });
        const pending = make(http, { maxTries: 2, secondaryHost: "secondary.invalid" })[operation](token);
        const assertion = expect(pending).rejects.toBe(failure);
        await jest.runAllTimersAsync();
        await assertion;
        expect(http.requests).toHaveLength(2);
      },
    );

    it("still confirms a primary BlobNotFound without a secondary read", async () => {
      http.error = { status: 404, code: "BlobNotFound" };
      const pending = make(http, { maxTries: 2, secondaryHost: "secondary.invalid" }).delete(token);
      const assertion = expect(pending).resolves.toBe(PayloadDeleteOutcome.AlreadyAbsent);
      await jest.runAllTimersAsync();
      await assertion;
      expect(http.requests).toHaveLength(1);
    });

    it("uses the same retry boundary for credentialed cross-account and same-account reads", async () => {
      const store = new BlobPayloadStore({
        connectionString,
        credential: { getToken: async () => ({ token: "synthetic-token", expiresOnTimestamp: Date.now() + 3600000 }) },
        clientOptions: {
          httpClient: http,
          userAgentOptions: { userAgentPrefix: "payload-resilience-test" },
          retryOptions: { maxTries: 2 },
        },
      });
      for (const endpoint of ["account.invalid/other/blob", "other.invalid/other/blob"]) {
        http.failures.push({ status: 429, code: "Throttled" });
        const assertion = expect(store.download(`blob:v2:https://${endpoint}`)).resolves.toBe("payload");
        await jest.runAllTimersAsync();
        await assertion;
      }
      expect(http.requests).toHaveLength(4);
      for (const request of http.requests)
        expect(request.headers.get("user-agent")).toContain("payload-resilience-test");
    });

    it("enforces the actual two-minute default without waiting two minutes in the test", async () => {
      let actualSignal: WebResource["abortSignal"];
      http.sendRequest = async (request) => {
        http.requests.push(request);
        actualSignal = request.abortSignal;
        return new Promise((_resolve, reject) => {
          actualSignal!.addEventListener("abort", () =>
            reject(Object.assign(new Error("transport aborted"), { name: "AbortError" })),
          );
        });
      };
      const controller = new AbortController();
      const pending = make(http, { maxTries: 1 }).download(token, controller.signal);
      const assertion = expect(pending).rejects.toMatchObject({ code: "ETIMEDOUT" });
      void assertion.catch(() => {});
      await jest.advanceTimersByTimeAsync(119999);
      expect(actualSignal!.aborted).toBe(false);
      await jest.advanceTimersByTimeAsync(1);
      await assertion;
      expect(actualSignal!.aborted).toBe(true);
      expect(controller.signal.aborted).toBe(false);
      expect(getEventListeners(controller.signal, "abort")).toHaveLength(0);
      expect(jest.getTimerCount()).toBe(0);
    });

    it("removes timers and caller abort listeners after successful I/O", async () => {
      const controller = new AbortController();
      const store = make(http);
      const download = store.download(token, controller.signal);
      await jest.runAllTimersAsync();
      await expect(download).resolves.toBe("payload");
      await expect(store.delete(token, controller.signal)).resolves.toBe(PayloadDeleteOutcome.Deleted);
      expect(getEventListeners(controller.signal, "abort")).toHaveLength(0);
      expect(jest.getTimerCount()).toBe(0);
    });

    it("does not turn custom non-network failures into retries", async () => {
      const failure = Object.freeze(new TypeError("invalid custom transport configuration"));
      http.failures.push(failure);
      await expect(make(http).download(token)).rejects.toBe(failure);
      expect(http.requests).toHaveLength(1);
      expect(jest.getTimerCount()).toBe(0);
    });

    it("does not overflow a long network timeout into an immediate abort", async () => {
      let actualSignal: WebResource["abortSignal"];
      http.sendRequest = async (request) => {
        http.requests.push(request);
        actualSignal = request.abortSignal;
        return new Promise((_resolve, reject) => {
          actualSignal!.addEventListener("abort", () =>
            reject(Object.assign(new Error("transport aborted"), { name: "AbortError" })),
          );
        });
      };
      const controller = new AbortController();
      const reason = new Error("cancel long network timeout");
      const pending = make(http, { maxTries: 1, tryTimeoutInMs: 2147484000 }).download(token, controller.signal);
      const rejected = pending.catch((error: unknown) => error);
      await jest.advanceTimersByTimeAsync(1000);
      expect(actualSignal!.aborted).toBe(false);
      expect(http.requests).toHaveLength(1);
      controller.abort(reason);
      await jest.advanceTimersByTimeAsync(0);
      expect(await rejected).toBe(reason);
      expect(jest.getTimerCount()).toBe(0);
    });

    it("preserves finite fractional-millisecond retry and timeout options", async () => {
      http.failures.push({ status: 503, code: "ServerBusy" });
      const pending = make(http, {
        maxTries: 2,
        retryDelayInMs: 10.5,
        maxRetryDelayInMs: 20.5,
        tryTimeoutInMs: 100.5,
      }).download(token);
      const assertion = expect(pending).resolves.toBe("payload");
      await jest.runAllTimersAsync();
      await assertion;
      expect(http.requests).toHaveLength(2);
      expect(http.times[1] - http.times[0]).toBe(10);
    });

    it.each([
      "maxTries",
      "retryDelayInMs",
      "maxRetryDelayInMs",
      "tryTimeoutInMs",
      "retryPolicyType",
      "secondaryHost",
    ] as const)("accepts explicit undefined for optional %s", async (option) => {
      const pending = make(http, { [option]: undefined }).download(token);
      await jest.runAllTimersAsync();
      await expect(pending).resolves.toBe("payload");
      expect(jest.getTimerCount()).toBe(0);
    });

    it("retries a transport-internal AbortError while the caller remains live", async () => {
      const failure = Object.freeze(
        Object.assign(new Error("internal transport cancellation"), { name: "AbortError" }),
      );
      http.failures.push(failure);
      const controller = new AbortController();
      const pending = make(http).download(token, controller.signal);
      const assertion = expect(pending).resolves.toBe("payload");
      void assertion.catch(() => {});
      await jest.runAllTimersAsync();
      await assertion;
      expect(http.requests).toHaveLength(2);
      expect(controller.signal.aborted).toBe(false);
    });

    it("allows the SDK to resume a body-internal AbortError without treating it as caller cancellation", async () => {
      const failure = Object.freeze(Object.assign(new Error("internal body cancellation"), { name: "AbortError" }));
      const send = http.sendRequest.bind(http);
      http.sendRequest = async (request) => {
        const response = await send(request);
        if (http.requests.length === 1) {
          response.readableStreamBody = new Readable({
            read() {
              this.destroy(failure);
            },
          });
        }
        return response;
      };
      const pending = make(http).download(token);
      const assertion = expect(pending).resolves.toBe("payload");
      void assertion.catch(() => {});
      await jest.runAllTimersAsync();
      await assertion;
      expect(http.requests).toHaveLength(2);
      expect(http.requests[1].headers.get("if-match")).toBe('"owned-etag"');
      expect(http.requests[1].headers.get("range") ?? http.requests[1].headers.get("x-ms-range")).toBe("bytes=0-6");
    });

    it.each(["AbortError", "ETIMEDOUT"])("never retries a caller's retryable-looking %s abort reason", async (kind) => {
      const controller = new AbortController();
      const reason = Object.freeze(Object.assign(new Error("caller cancellation"), { name: kind, code: "ETIMEDOUT" }));
      http.sendRequest = async (request) => {
        http.requests.push(request);
        controller.abort(reason);
        throw reason;
      };
      await expect(make(http).download(token, controller.signal)).rejects.toBe(reason);
      expect(http.requests).toHaveLength(1);
      expect(jest.getTimerCount()).toBe(0);
    });

    it.each(["BlobNotFound", "ContainerNotFound"])(
      "does not convert a caller abort shaped like %s into deletion success",
      async (code) => {
        const controller = new AbortController();
        const reason = Object.freeze(
          Object.assign(new Error("caller abort with a storage-shaped reason"), { code, statusCode: 404 }),
        );
        http.sendRequest = async (request) => {
          http.requests.push(request);
          controller.abort(reason);
          throw reason;
        };
        await expect(make(http).delete(token, controller.signal)).rejects.toBe(reason);
        expect(http.requests).toHaveLength(1);
      },
    );

    it("does not invalidate a healthy container generation for a storage-shaped caller abort", async () => {
      const store = make(http);
      await store.upload("warm container");
      const controller = new AbortController();
      const reason = Object.freeze(
        Object.assign(new Error("caller abort"), { code: "ContainerNotFound", statusCode: 404 }),
      );
      const send = http.sendRequest.bind(http);
      let abortNext = true;
      http.sendRequest = async (request) => {
        if (abortNext && !request.url.includes("restype=container")) {
          abortNext = false;
          http.requests.push(request);
          controller.abort(reason);
          throw reason;
        }
        return send(request);
      };
      await expect(store.upload("canceled", controller.signal)).rejects.toBe(reason);
      await store.upload("after cancellation");
      expect(http.requests.filter((request) => request.url.includes("restype=container"))).toHaveLength(1);
    });
  });
  const make = (http: RecordingClient, options: Partial<ConstructorParameters<typeof BlobPayloadStore>[0]> = {}) =>
    new BlobPayloadStore({
      connectionString,
      clientOptions: { httpClient: http, retryOptions: { maxTries: 1 } },
      ...options,
    });

  it.each([true, false])(
    "writes credential-free v2 GUID tokens and ownership metadata (gzip=%s)",
    async (compressionEnabled) => {
      const store = make(http, { compressionEnabled });
      const token = await store.upload("\u00e9\ud83d\ude80");
      expect(token).toMatch(/^blob:v2:https:\/\/account\.invalid\/durabletask-payloads\/[a-f0-9]{32}$/);
      const upload = http.requests.find((request) => request.method === "PUT" && !request.url.includes("restype="))!;
      expect(upload.headers.get("x-ms-meta-managed_by")).toBe("dts");
      expect(upload.headers.get("x-ms-blob-content-encoding") ?? "").toBe(compressionEnabled ? "gzip" : "");
      expect((compressionEnabled ? gunzipSync(http.bodies[0]) : http.bodies[0]).toString("utf8")).toBe(
        "\u00e9\ud83d\ude80",
      );
      expect(http.requests[0].headers.get("x-ms-blob-public-access")).toBeUndefined();
    },
  );

  it("single-flights container initialization and recovers one deleted-container generation", async () => {
    const store = make(http);
    await Promise.all(Array.from({ length: 12 }, () => store.upload("data")));
    expect(http.requests.filter((r) => r.url.includes("restype=container"))).toHaveLength(1);
    http.failFirstUpload = true;
    await store.upload("recovered");
    expect(http.requests.filter((r) => r.url.includes("restype=container"))).toHaveLength(2);
    expect(http.bodies).toHaveLength(13);
  });

  it("cancels a waiting initializer promptly without canceling or replacing the leader", async () => {
    let release!: () => void;
    let entered!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const send = http.sendRequest.bind(http);
    http.sendRequest = async (request) => {
      if (request.url.includes("restype=container")) {
        entered();
        await blocked;
      }
      return send(request);
    };
    const store = make(http, { compressionEnabled: false });
    const leader = new AbortController();
    const waiter = new AbortController();
    const removed = jest.spyOn(waiter.signal, "removeEventListener");
    const first = store.upload("first", leader.signal);
    await started;
    const reason = new Error("Only cancel the waiter");
    let observed: unknown;
    const second = store.upload("second", waiter.signal).catch((error) => {
      observed = error;
    });
    try {
      waiter.abort(reason);
      await new Promise((resolve) => setImmediate(resolve));
      expect(observed).toBe(reason);
      expect(leader.signal.aborted).toBe(false);
      expect(removed).toHaveBeenCalledWith("abort", expect.any(Function));
      release();
      await first;
      await store.upload("third");
      expect(http.requests.filter((r) => r.url.includes("restype=container"))).toHaveLength(1);
      expect(http.bodies.map((body) => body.toString())).toEqual(["first", "third"]);
    } finally {
      release();
      await Promise.allSettled([first, second]);
    }
  });

  it("lets a surviving waiter initialize after the previous owner is canceled", async () => {
    let entered!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const send = http.sendRequest.bind(http);
    let firstContainerRequest = true;
    http.sendRequest = async (request) => {
      if (request.url.includes("restype=container") && firstContainerRequest) {
        firstContainerRequest = false;
        if (!request.abortSignal) throw new Error("The owner must propagate cancellation.");
        const signal = request.abortSignal;
        await new Promise<void>((_resolve, reject) => {
          signal.addEventListener("abort", () =>
            reject(Object.assign(new Error("Owner canceled"), { name: "AbortError" })),
          );
          entered();
        });
      }
      return send(request);
    };
    const owner = new AbortController();
    const store = make(http, { compressionEnabled: false });
    const first = store.upload("owner", owner.signal);
    const failedOwner = expect(first).rejects.toThrow();
    await started;
    const survivor = store.upload("survivor");
    owner.abort();
    await failedOwner;
    await expect(survivor).resolves.toMatch(/^blob:v2:/);
    expect(http.bodies.map((body) => body.toString())).toEqual(["survivor"]);
  });

  it.each(["gzip", "GZip", ""])("reads UTF-8 storage representation with encoding %s", async (encoding) => {
    http.content = encoding ? gzipSync(Buffer.from("\u00e9\ud83d\ude80")) : Buffer.from("\u00e9\ud83d\ude80");
    http.encoding = encoding;
    expect(await make(http).download("blob:v1:durabletask-payloads:folder/a b%2Fc")).toBe("\u00e9\ud83d\ude80");
    expect(new URL(http.requests[0].url).pathname).toBe("/durabletask-payloads/folder/a%20b%252Fc");
  });

  it.each(fixtures.vectors)("reads actual .NET 10 GZipStream fixture $id", async (fixture) => {
    http.encoding = "gzip";
    http.content = Buffer.from(fixture.gzipBase64, "base64");
    const expected = fixture.seed.repeat(fixture.repeat) + fixture.suffix;
    const actual = await make(http).download("blob:v2:https://account.invalid/durabletask-payloads/dotnet");
    expect(actual).toBe(expected);
    expect(Buffer.byteLength(actual, "utf8")).toBe(fixture.utf8Bytes);
  });

  it.each([
    ["https://account.invalid", "https://account.invalid/old/folder/a%20b%252Fc"],
    ["http://127.0.0.1:10000/accounta", "http://127.0.0.1:10000/accounta/old/blob"],
  ])("preserves configured SharedKey pipeline across containers in %s", async (endpoint, target) => {
    const store = make(http, {
      connectionString: `DefaultEndpointsProtocol=http;AccountName=account;AccountKey=${accountKey};BlobEndpoint=${endpoint}`,
    });
    expect(await store.download(`blob:v2:${target}`)).toBe("payload");
    expect(await store.delete(`blob:v2:${target}`)).toBe(PayloadDeleteOutcome.Deleted);
    expect(http.requests.map((r) => r.method)).toEqual(["GET", "HEAD", "DELETE"]);
    for (const request of http.requests) {
      const url = new URL(request.url);
      expect(url.origin + url.pathname).toBe(target);
      expect(url.searchParams.get("timeout")).toBe("120");
      expect(request.headers.get("authorization")).toMatch(/^SharedKey /);
    }
    expect(http.requests[2].headers.get("if-match")).toBe('"owned-etag"');
    expect(http.requests[2].headers.get("x-ms-delete-snapshots")).toBe("include");
  });

  it.each([
    "https://other.invalid/old/blob",
    "http://account.invalid/old/blob",
    "https://account.invalid:444/old/blob",
    "http://127.0.0.1:10000/accountb/old/blob",
  ])("never forwards configured account keys to %s", async (target) => {
    const store = make(http);
    await expect(store.download(`blob:v2:${target}`)).rejects.toBeInstanceOf(PayloadStorageException);
    await expect(store.delete(`blob:v2:${target}`)).rejects.toBeInstanceOf(PayloadStorageException);
    expect(http.requests).toHaveLength(0);
  });

  it("uses identity, not the configured account key, for cross-account reads", async () => {
    const credential = {
      getToken: async () => ({ token: "synthetic-access-token", expiresOnTimestamp: Date.now() + 3600000 }),
    };
    const store = make(http, { credential });
    expect(await store.download("blob:v2:https://other.invalid/old/blob")).toBe("payload");
    expect(http.requests[0].headers.get("authorization")).toBe("Bearer synthetic-access-token");
  });

  it("supports account URI and identity without a connection string", async () => {
    const store = make(http, {
      connectionString: undefined,
      accountUri: "https://account.invalid",
      credential: {
        getToken: async () => ({ token: "synthetic-access-token", expiresOnTimestamp: Date.now() + 3600000 }),
      },
    });
    expect(await store.download("blob:v2:https://account.invalid/durabletask-payloads/blob")).toBe("payload");
    expect(http.requests[0].headers.get("authorization")).toBe("Bearer synthetic-access-token");
  });

  it("classifies the service endpoint independently of normalized blob-name escaping", async () => {
    expect(await make(http).download("blob:v2:https://account.invalid/old/folder%2fblob")).toBe("payload");
    expect(http.requests[0].headers.get("authorization")).toMatch(/^SharedKey /);
    expect(new URL(http.requests[0].url).pathname).toBe("/old/folder/blob");
  });

  it("rejects another path-style account on the same host without sending SharedKey", async () => {
    const store = make(http, {
      connectionString: `DefaultEndpointsProtocol=http;AccountName=accounta;AccountKey=${accountKey};BlobEndpoint=http://127.0.0.1:10000/accounta`,
    });
    await expect(store.download("blob:v2:http://127.0.0.1:10000/accountb/old/blob")).rejects.toBeInstanceOf(
      PayloadStorageException,
    );
    expect(http.requests).toHaveLength(0);
  });

  it("preserves a configured SAS across same-account containers without persisting it", async () => {
    const store = make(http, {
      connectionString:
        "AccountName=account;SharedAccessSignature=sv=2025-01-05&sr=c&sp=rwd&sig=synthetic;BlobEndpoint=https://account.invalid",
    });
    const token = await store.upload("payload");
    expect(token).not.toContain("sig=");
    await store.download("blob:v2:https://account.invalid/old/blob");
    expect(new URL(http.requests.at(-1)!.url).searchParams.get("sig")).toBe("synthetic");
  });

  it.each([
    [{}, PayloadDeleteOutcome.NotStoreOwned],
    [{ managed_by: "customer" }, PayloadDeleteOutcome.NotStoreOwned],
    [{ MANAGED_BY: "dts" }, PayloadDeleteOutcome.Deleted],
  ])("checks ownership case-insensitively before conditional deletion (%#)", async (metadata, outcome) => {
    http.metadata = metadata;
    expect(await make(http).delete("blob:v2:https://account.invalid/durabletask-payloads/blob")).toBe(outcome);
    expect(http.requests.some((r) => r.method === "DELETE")).toBe(outcome === PayloadDeleteOutcome.Deleted);
  });

  it.each(["BlobNotFound", "ContainerNotFound"])("confirms absence only for %s", async (code) => {
    http.error = { status: 404, code };
    expect(await make(http).delete("blob:v2:https://account.invalid/durabletask-payloads/blob")).toBe(
      PayloadDeleteOutcome.AlreadyAbsent,
    );
    await expect(
      make(http).download("blob:v2:https://account.invalid/durabletask-payloads/blob"),
    ).rejects.toBeInstanceOf(PayloadStorageException);
  });

  it.each([
    [404, ""],
    [412, "ConditionNotMet"],
    [403, "AuthorizationPermissionMismatch"],
  ])("propagates uncertain storage failures %s/%s", async (status, code) => {
    http.error = { status, code };
    await expect(make(http).delete("blob:v2:https://account.invalid/durabletask-payloads/blob")).rejects.toMatchObject({
      statusCode: status,
    });
  });

  it.each([
    "blob:v1:bad",
    "blob:v1:other:blob",
    "blob:v2:invalid",
    "blob:v2:https://account.invalid/container/",
    "blob:v3:future",
  ])("rejects malformed or mismatched tokens without storage I/O (%s)", async (token) => {
    await expect(make(http).download(token)).rejects.toBeInstanceOf(TypeError);
    expect(http.requests).toHaveLength(0);
  });
});
