// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Readable } from "stream";
import { getEventListeners } from "events";
import { gunzipSync, gzipSync } from "zlib";
import {
  BlobClient,
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

  describe("BlobPayloadStore native SDK retries and options", () => {
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

    it.each([500, 503])("uses the native immediate first retry for ordinary HTTP %s", async (status) => {
      http.failures.push({ status, code: "Transient" });
      const pending = make(http).download(token);
      const assertion = expect(pending).resolves.toBe("payload");
      await jest.runAllTimersAsync();
      await assertion;
      expect(http.requests).toHaveLength(2);
      expect(http.times[1] - http.times[0]).toBe(0);
      expect(jest.getTimerCount()).toBe(0);
    });

    it.each(["InternalError", "OperationTimedOut", "ServerBusy"])(
      "uses native copy-source classification, not ordinary service code %s",
      async (code) => {
        for (const name of ["x-ms-error-code", "x-ms-copy-source-error-code"]) {
          http.failures.push({
            status: 400,
            code: name === "x-ms-error-code" ? code : "Other",
            headers: { [name]: code },
          });
          const pending = make(http).download(token);
          const assertion =
            name === "x-ms-copy-source-error-code"
              ? expect(pending).resolves.toBe("payload")
              : expect(pending).rejects.toMatchObject({ statusCode: 400 });
          void assertion.catch(() => {});
          await jest.runAllTimersAsync();
          await assertion;
        }
        expect(http.requests).toHaveLength(3);
      },
    );

    it("uses exactly nine native attempts with the same timing as the raw SDK, without nested retries", async () => {
      http.error = { status: 503, code: "ServerBusy" };
      const pending = make(http).download(token);
      const assertion = expect(pending).rejects.toMatchObject({ statusCode: 503 });
      await jest.runAllTimersAsync();
      await assertion;
      expect(http.requests).toHaveLength(9);
      const raw = new RecordingClient();
      raw.error = http.error;
      const native = new BlobClient(token.slice("blob:v2:".length), undefined, {
        httpClient: raw,
        retryOptions: { maxTries: 9, retryDelayInMs: 250, maxRetryDelayInMs: 10000 },
      }).download();
      const nativeAssertion = expect(native).rejects.toMatchObject({ statusCode: 503 });
      await jest.runAllTimersAsync();
      await nativeAssertion;
      const delays = (times: number[]) => times.slice(1).map((time, index) => time - times[index]);
      expect(raw.requests).toHaveLength(9);
      expect(delays(raw.times)).toEqual([0, 250, 750, 1750, 3750, 7750, 10000, 10000]);
      expect(delays(http.times)).toEqual(delays(raw.times));
      expect(jest.getTimerCount()).toBe(0);
    });

    it.each([400, 401, 403, 404, 408, 409, 412, 429, 502, 504])(
      "uses the SDK's terminal classification for ordinary HTTP %s",
      async (status) => {
        http.error = { status, code: "Permanent" };
        const pending = make(http).download(token);
        const assertion = expect(pending).rejects.toThrow();
        await jest.runAllTimersAsync();
        await assertion;
        expect(http.requests).toHaveLength(1);
        expect(jest.getTimerCount()).toBe(0);
      },
    );

    it.each([1, 2])("honors caller maxTries=%s as a non-nested HTTP attempt budget", async (maxTries) => {
      http.error = { status: 503, code: "ServerBusy" };
      const assertion = expect(make(http, { maxTries, retryDelayInMs: 0 }).download(token)).rejects.toMatchObject({
        statusCode: 503,
      });
      await jest.runAllTimersAsync();
      await assertion;
      expect(http.requests).toHaveLength(maxTries);
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
        http.failures.push({ status: 503, code: "ServerBusy" });
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

    it.each<Record<string, string>>([
      { "retry-after-ms": "1300", "x-ms-retry-after-ms": "2200", "Retry-After": "3" },
      { "Retry-After": "Tue, 01 Jan 2030 00:00:03 GMT" },
      { "Retry-After": "2147484" },
    ])("leaves Retry-After behavior to the native SDK (%#)", async (headers) => {
      http.failures.push({ status: 503, code: "ServerBusy", headers });
      const pending = make(http).download(token);
      const assertion = expect(pending).resolves.toBe("payload");
      await jest.runAllTimersAsync();
      await assertion;
      expect(http.times[1] - http.times[0]).toBe(0);
      expect(jest.getTimerCount()).toBe(0);
    });

    it.each([0, 0.999])("uses native primary exponential delay without custom jitter (random=%s)", async (random) => {
      jest.mocked(Math.random).mockReturnValue(random);
      http.failures.push({ status: 503, code: "ServerBusy" }, { status: 503, code: "ServerBusy" });
      const pending = make(http).download(token);
      const assertion = expect(pending).resolves.toBe("payload");
      await jest.runAllTimersAsync();
      await assertion;
      expect(http.times.slice(1).map((time, index) => time - http.times[index])).toEqual([0, 250]);
    });

    it.each([
      { maximum: 5, random: 0.5 },
      { maximum: 100, random: 0.999 },
      { maximum: 100, random: 0 },
    ])("preserves native FIXED delay without custom caps or jitter ($maximum/$random)", async ({ maximum, random }) => {
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
      expect(http.times[1] - http.times[0]).toBe(30);
    });

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
      const pending = make(http, {
        retryPolicyType: StorageRetryPolicyType.FIXED,
        retryDelayInMs: 1000,
      }).download(token, controller.signal);
      const rejected = pending.catch((error: unknown) => error);
      await jest.advanceTimersByTimeAsync(0);
      controller.abort(reason);
      await jest.runAllTimersAsync();
      expect(await rejected).toBe(reason);
      expect(http.requests).toHaveLength(1);
      expect(jest.getTimerCount()).toBe(0);
    });

    it.each([
      new RestError("socket reset", { code: "ECONNRESET" }),
      new RestError("transport send failed", { code: RestError.REQUEST_SEND_ERROR }),
    ])("recovers from a transient I/O failure %#", async (failure) => {
      http.failures.push(failure);
      const pending = make(http).download(token);
      const assertion = expect(pending).resolves.toBe("payload");
      void assertion.catch(() => {});
      await jest.runAllTimersAsync();
      await assertion;
      expect(http.requests).toHaveLength(2);
    });

    it.each([
      new RestError("status zero without a native retry code", { statusCode: 0 }),
      Object.assign(new Error("custom transport failure"), { code: "ECONNRESET" }),
    ])("leaves non-native I/O classifications to the SDK (%#)", async (failure) => {
      http.failures.push(failure);
      const assertion = expect(make(http).download(token)).rejects.toBe(failure);
      void assertion.catch(() => {});
      await jest.runAllTimersAsync();
      await assertion;
      expect(http.requests).toHaveLength(1);
      expect(jest.getTimerCount()).toBe(0);
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
      "rejects ambiguous secondary absence with its real cause when the native %s budget is exhausted",
      async (operation) => {
        const hosts: string[] = [];
        const send = http.sendRequest.bind(http);
        http.sendRequest = async (request) => {
          hosts.push(new URL(request.url).host);
          return send(request);
        };
        http.failures.push({ status: 503, code: "ServerBusy" }, { status: 404, code: "BlobNotFound" });
        const pending = make(http, { maxTries: 2, secondaryHost: "secondary.invalid" })[operation](token);
        const assertion = expect(pending).rejects.toMatchObject({
          code: RestError.REQUEST_SEND_ERROR,
          cause: { statusCode: 404 },
        });
        void assertion.catch(() => {});
        await jest.runAllTimersAsync();
        await assertion;
        const failure: unknown = await pending.catch((error: unknown) => error);
        if (!(failure instanceof RestError)) throw new Error("Expected an uncertain-primary transport error");
        expect(failure.statusCode).toBeUndefined();
        expect(failure).toMatchObject({
          cause: { request: { url: expect.stringContaining("secondary.invalid") }, statusCode: 404 },
        });
        expect(hosts).toEqual(["account.invalid", "secondary.invalid"]);
        expect(http.requests).toHaveLength(2);
        expect(http.requests.some((request) => request.method === "DELETE")).toBe(false);
      },
    );

    it("observes the raw SDK's secondary 404 at maxTries2 without claiming primary absence", async () => {
      http.failures.push({ status: 503, code: "ServerBusy" }, { status: 404, code: "BlobNotFound" });
      const pending = new BlobClient(token.slice("blob:v2:".length), undefined, {
        httpClient: http,
        retryOptions: { maxTries: 2, secondaryHost: "secondary.invalid" },
      }).download();
      const assertion = expect(pending).rejects.toMatchObject({
        statusCode: 404,
        request: { url: expect.stringContaining("secondary.invalid") },
      });
      await jest.runAllTimersAsync();
      await assertion;
      expect(http.requests).toHaveLength(2);
    });

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
      "does not report absence after a primary transport error and final secondary 404 during %s",
      async (operation) => {
        const failure = Object.freeze(new RestError("primary socket failure", { code: "ECONNRESET" }));
        http.failures.push(failure, { status: 404, code: "BlobNotFound" });
        const pending = make(http, { maxTries: 2, secondaryHost: "secondary.invalid" })[operation](token);
        const assertion = expect(pending).rejects.toMatchObject({
          code: RestError.REQUEST_SEND_ERROR,
          cause: { statusCode: 404 },
        });
        void assertion.catch(() => {});
        await jest.runAllTimersAsync();
        await assertion;
        expect(http.requests).toHaveLength(2);
      },
    );

    it.each(["download", "delete"] as const)(
      "still confirms primary BlobNotFound without a secondary read for %s",
      async (operation) => {
        http.error = { status: 404, code: "BlobNotFound" };
        const pending = make(http, { maxTries: 2, secondaryHost: "secondary.invalid" })[operation](token);
        const assertion =
          operation === "delete"
            ? expect(pending).resolves.toBe(PayloadDeleteOutcome.AlreadyAbsent)
            : expect(pending).rejects.toBeInstanceOf(PayloadStorageException);
        await jest.runAllTimersAsync();
        await assertion;
        expect(http.requests).toHaveLength(1);
      },
    );

    it("confirms a subsequent primary 404 after the SDK stops using a lagging secondary", async () => {
      http.failures.push(
        { status: 503, code: "ServerBusy" },
        { status: 404, code: "BlobNotFound" },
        { status: 404, code: "BlobNotFound" },
      );
      const pending = make(http, { maxTries: 3, secondaryHost: "secondary.invalid" }).delete(token);
      const assertion = expect(pending).resolves.toBe(PayloadDeleteOutcome.AlreadyAbsent);
      await jest.runAllTimersAsync();
      await assertion;
      expect(http.requests).toHaveLength(3);
    });

    it("uses the same retry boundary for credentialed cross-account and same-account reads", async () => {
      const store = new BlobPayloadStore({
        connectionString,
        credential: { getToken: async () => ({ token: "synthetic-token", expiresOnTimestamp: Date.now() + 3600000 }) },
        clientOptions: {
          httpClient: http,
          proxyOptions: { host: "http://127.0.0.1", port: 8080 },
          keepAliveOptions: { enable: false },
          userAgentOptions: { userAgentPrefix: "payload-resilience-test" },
          retryOptions: { maxTries: 2 },
        },
      });
      for (const endpoint of ["account.invalid/other/blob", "other.invalid/other/blob"]) {
        http.failures.push({ status: 503, code: "ServerBusy" });
        const assertion = expect(store.download(`blob:v2:https://${endpoint}`)).resolves.toBe("payload");
        await jest.runAllTimersAsync();
        await assertion;
      }
      expect(http.requests).toHaveLength(4);
      for (const request of http.requests) {
        expect(request.headers.get("user-agent")).toContain("payload-resilience-test");
        expect(request.headers.get("authorization")).toMatch(/^(SharedKey account:|Bearer synthetic-token)/);
        expect(request.agent).toBeDefined();
        expect(request.keepAlive).toBe(true);
      }
    });

    it.each([undefined, 0, 100.5])(
      "passes the caller signal directly without injecting progress or a deadline (server timeout=%s)",
      async (tryTimeoutInMs) => {
        const controller = new AbortController();
        await expect(make(http, { tryTimeoutInMs }).download(token, controller.signal)).resolves.toBe("payload");
        expect(http.requests).toHaveLength(1);
        const request = http.requests[0];
        expect(request.abortSignal).toBe(controller.signal);
        expect(request.onDownloadProgress).toBeUndefined();
        expect(new URL(request.url).searchParams.get("timeout")).toBe(
          tryTimeoutInMs === 0 ? null : String(Math.floor((tryTimeoutInMs ?? 120000) / 1000)),
        );
        expect(jest.getTimerCount()).toBe(0);
      },
    );

    it("lets the SDK release a failed gzip body without adding timers or caller listeners", async () => {
      let written = false;
      const source = new Readable({
        read() {
          if (!written) {
            written = true;
            this.push("notgzip");
          }
        },
      });
      http.encoding = "gzip";
      const send = http.sendRequest.bind(http);
      http.sendRequest = async (request) => {
        const response = await send(request);
        response.headers.set("content-length", "100");
        response.readableStreamBody = source;
        return response;
      };
      const controller = new AbortController();
      const pending = make(http, { maxTries: 1 }).download(token, controller.signal);
      try {
        await expect(pending).rejects.toMatchObject({ code: "Z_DATA_ERROR" });
        await jest.advanceTimersByTimeAsync(0);
        expect({
          inputDestroyed: source.destroyed,
          callerAborted: controller.signal.aborted,
          callerListeners: getEventListeners(controller.signal, "abort").length,
          timers: jest.getTimerCount(),
        }).toEqual({ inputDestroyed: true, callerAborted: false, callerListeners: 0, timers: 0 });
        expect(http.requests).toHaveLength(1);
      } finally {
        controller.abort();
        source.destroy();
        await pending.catch(() => {});
        await jest.advanceTimersByTimeAsync(0);
      }
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

    it("passes a long native server timeout hint without creating a client timer", async () => {
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
      expect(actualSignal).toBe(controller.signal);
      expect(new URL(http.requests[0].url).searchParams.get("timeout")).toBe("2147484");
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
      expect(http.times[1] - http.times[0]).toBe(0);
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

    it("leaves a transport's non-timeout AbortError terminal under the native SDK", async () => {
      const failure = Object.freeze(
        Object.assign(new Error("internal transport cancellation"), { name: "AbortError" }),
      );
      http.failures.push(failure);
      const controller = new AbortController();
      const pending = make(http).download(token, controller.signal);
      const assertion = expect(pending).rejects.toBe(failure);
      void assertion.catch(() => {});
      await jest.runAllTimersAsync();
      await assertion;
      expect(http.requests).toHaveLength(1);
      expect(controller.signal.aborted).toBe(false);
    });

    it("allows the SDK to resume a retryable body error using the original ETag", async () => {
      const failure = Object.freeze(Object.assign(new Error("body disconnected"), { code: "ECONNRESET" }));
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

    it("preserves the SDK's terminal body AbortError without normalizing or retrying it", async () => {
      const failure = Object.freeze(Object.assign(new Error("native body aborted"), { name: "AbortError" }));
      const send = http.sendRequest.bind(http);
      http.sendRequest = async (request) => {
        const response = await send(request);
        response.readableStreamBody = new Readable({
          read() {
            this.destroy(failure);
          },
        });
        return response;
      };
      await expect(make(http).download(token)).rejects.toBe(failure);
      expect(http.requests).toHaveLength(1);
    });

    it("retains the SDK's separate five-resumption body budget", async () => {
      const send = http.sendRequest.bind(http);
      http.sendRequest = async (request) => {
        const response = await send(request);
        response.readableStreamBody = new Readable({
          read() {
            this.destroy(new Error("interrupted SDK response"));
          },
        });
        return response;
      };
      await expect(make(http, { maxTries: 1 }).download(token)).rejects.toThrow("retries: 5, max retries: 5");
      expect(http.requests).toHaveLength(6);
      for (const request of http.requests.slice(1)) {
        expect(request.headers.get("if-match")).toBe('"owned-etag"');
        expect(request.headers.get("range") ?? request.headers.get("x-ms-range")).toBe("bytes=0-6");
      }
    });

    it.each([false, true])(
      "resumes compressed UTF-8 bytes without changing ETag/offset (changed=%s)",
      async (changed) => {
        const text = "\u00e9\ud83d\ude80".repeat(200);
        const bytes = gzipSync(Buffer.from(text));
        const split = 11;
        http.encoding = "gzip";
        http.content = bytes;
        const send = http.sendRequest.bind(http);
        http.sendRequest = async (request) => {
          const response = await send(request);
          if (http.requests.length === 1) {
            response.readableStreamBody = Readable.from(
              (async function* () {
                yield bytes.subarray(0, split);
                throw new Error("interrupted compressed body");
              })(),
            );
          } else if (changed) {
            response.status = 412;
            response.headers.set("x-ms-error-code", "ConditionNotMet");
            response.headers.set("content-type", "application/xml");
            response.readableStreamBody = undefined;
            response.bodyAsText = "<Error><Code>ConditionNotMet</Code><Message>Changed ETag</Message></Error>";
          } else {
            response.status = 206;
            response.headers.set("content-length", String(bytes.length - split));
            response.readableStreamBody = Readable.from([bytes.subarray(split)]);
          }
          return response;
        };
        const pending = make(http).download(token);
        if (changed) await expect(pending).rejects.toMatchObject({ statusCode: 412 });
        else await expect(pending).resolves.toBe(text);
        expect(http.requests).toHaveLength(2);
        expect(http.requests[1].headers.get("if-match")).toBe('"owned-etag"');
        expect(http.requests[1].headers.get("range") ?? http.requests[1].headers.get("x-ms-range")).toBe(
          `bytes=${split}-${bytes.length - 1}`,
        );
      },
    );

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
