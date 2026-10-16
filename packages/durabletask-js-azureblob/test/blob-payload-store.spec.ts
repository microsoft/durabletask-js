// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Readable } from "stream";
import { gunzipSync, gzipSync } from "zlib";
import { IHttpClient, HttpOperationResponse, WebResource } from "@azure/storage-blob";
import { PayloadDeleteOutcome, PayloadStorageException } from "@microsoft/durabletask-js";
import { BlobPayloadStore } from "../src";
import fixtures from "./dotnet-payload-fixtures.json";

const accountKey = Buffer.alloc(64).toString("base64");
const connectionString = `DefaultEndpointsProtocol=https;AccountName=account;AccountKey=${accountKey};BlobEndpoint=https://account.invalid`;

class RecordingClient implements IHttpClient {
  requests: WebResource[] = [];
  bodies: Buffer[] = [];
  content = Buffer.from("payload");
  encoding = "";
  metadata: Record<string, string> = { managed_by: "dts" };
  error: { status: number; code: string } | undefined;
  failFirstUpload = false;
  async sendRequest(request: WebResource): Promise<HttpOperationResponse> {
    this.requests.push(request);
    const headers = request.headers.clone();
    for (const header of headers.headersArray()) headers.remove(header.name);
    headers.set("x-ms-request-id", "offline");
    headers.set("etag", '"owned-etag"');
    headers.set("last-modified", new Date(0).toUTCString());
    headers.set("x-ms-blob-type", "BlockBlob");
    for (const [key, value] of Object.entries(this.metadata)) headers.set(`x-ms-meta-${key}`, value);
    if (this.encoding) headers.set("content-encoding", this.encoding);
    const container = new URL(request.url).searchParams.get("restype") === "container";
    const error =
      this.failFirstUpload && request.method === "PUT" && !container
        ? { status: 404, code: "ContainerNotFound" }
        : this.error;
    if (error) {
      this.failFirstUpload = false;
      headers.set("x-ms-error-code", error.code);
      headers.set("content-type", "application/xml");
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
