// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { createServer, IncomingMessage, ServerResponse, Server } from "http";
import { Socket } from "net";
import { gzipSync } from "zlib";
import { BlobPayloadStore } from "../src";

describe("BlobPayloadStore real network/read deadlines", () => {
  let server: Server;
  let endpoint: string;
  let handler: (request: IncomingMessage, response: ServerResponse) => void;
  let requests: IncomingMessage[];
  const sockets = new Set<Socket>();
  const timers = new Set<NodeJS.Timeout>();
  const timeout = 100;
  const etag = '"original-payload"';
  const accountKey = Buffer.alloc(64).toString("base64");
  const make = (maxTries = 1) =>
    new BlobPayloadStore({
      connectionString: `DefaultEndpointsProtocol=http;AccountName=account;AccountKey=${accountKey};BlobEndpoint=${endpoint}`,
      compressionEnabled: false,
      clientOptions: {
        retryOptions: { tryTimeoutInMs: timeout, maxTries, retryDelayInMs: 0, maxRetryDelayInMs: 0 },
      },
    });
  const token = () => `blob:v2:${endpoint}/durabletask-payloads/blob`;
  const headers = (response: ServerResponse, length: number, status = 200, encoding?: string) => {
    response.writeHead(status, {
      "content-length": String(length),
      etag,
      "x-ms-request-id": "local-deadline-test",
      "x-ms-blob-type": "BlockBlob",
      ...(encoding ? { "content-encoding": encoding } : {}),
    });
    response.flushHeaders();
  };
  const range = (request: IncomingMessage) => request.headers.range ?? request.headers["x-ms-range"];

  beforeAll(async () => {
    server = createServer((request, response) => {
      requests.push(request);
      handler(request, response);
    });
    server.on("connection", (socket) => {
      sockets.add(socket);
      socket.on("close", () => sockets.delete(socket));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected loopback TCP server");
    endpoint = `http://127.0.0.1:${address.port}/account`;
  });

  beforeEach(() => {
    requests = [];
  });

  afterEach(() => {
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    server.closeAllConnections();
  });

  afterAll(async () => {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });

  async function guardedDownload(store: BlobPayloadStore): Promise<{ error: unknown; watchdogFired: boolean }> {
    const controller = new AbortController();
    let watchdogFired = false;
    const timer = setTimeout(() => {
      watchdogFired = true;
      controller.abort(new Error("test watchdog: network timeout did not settle"));
    }, 1200);
    try {
      const error = await store.download(token(), controller.signal).then(
        () => undefined,
        (error: unknown) => error,
      );
      return { error, watchdogFired };
    } finally {
      clearTimeout(timer);
    }
  }

  it("aborts stalled response headers within the per-attempt timeout and HTTP retry budget", async () => {
    handler = () => {};
    const { error, watchdogFired } = await guardedDownload(make(2));
    expect(watchdogFired).toBe(false);
    expect(error).toMatchObject({ code: "ETIMEDOUT" });
    expect(requests).toHaveLength(2);
  });

  it("times out stalled reads with the SDK's distinct bounded Range/If-Match resumption budget", async () => {
    handler = (_request, response) => {
      headers(response, requests.length === 1 ? 7 : 6);
      if (requests.length === 1) response.write("p");
    };
    const { error, watchdogFired } = await guardedDownload(make());
    expect(watchdogFired).toBe(false);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toMatchObject({ name: "AbortError" });
    expect(requests).toHaveLength(6);
    for (const request of requests.slice(1)) {
      expect(range(request)).toBe("bytes=1-6");
      expect(request.headers["if-match"]).toBe(etag);
    }
  });

  it("allows healthy progressive reads that exceed one network timeout in total", async () => {
    handler = (_request, response) => {
      headers(response, 8);
      let written = 0;
      const write = () => {
        response.write("x");
        if (++written === 8) response.end();
        else timers.add(setTimeout(write, 25));
      };
      timers.add(setTimeout(write, 25));
    };
    await expect(make().download(token())).resolves.toBe("xxxxxxxx");
    expect(requests).toHaveLength(1);
  });

  it.each([false, true])(
    "resumes a timed-out compressed body with unchanged ETag/offset (HTTP retry=%s)",
    async (retryResponse) => {
      const text = "\u00e9\ud83d\ude80".repeat(200);
      const bytes = gzipSync(Buffer.from(text));
      const split = 11;
      handler = (request, response) => {
        if (requests.length === 1) {
          headers(response, bytes.length, 200, "gzip");
          response.write(bytes.subarray(0, split));
        } else if (retryResponse && requests.length === 2) {
          response.writeHead(429, { "content-type": "application/xml", "x-ms-error-code": "Throttled" });
          response.end("<Error><Code>Throttled</Code><Message>Retry resumed GET</Message></Error>");
        } else {
          expect(range(request)).toBe(`bytes=${split}-${bytes.length - 1}`);
          expect(request.headers["if-match"]).toBe(etag);
          headers(response, bytes.length - split, 206, "gzip");
          response.end(bytes.subarray(split));
        }
      };
      const controller = new AbortController();
      timers.add(setTimeout(() => controller.abort(new Error("test watchdog: stalled gzip body")), 1200));
      await expect(make(2).download(token(), controller.signal)).resolves.toBe(text);
      expect(requests).toHaveLength(retryResponse ? 3 : 2);
    },
  );

  it("does not mix content or retry when the resumed ETag condition fails", async () => {
    handler = (_request, response) => {
      if (requests.length === 1) {
        headers(response, 7);
        response.write("p");
      } else {
        response.writeHead(412, { "content-type": "application/xml", "x-ms-error-code": "ConditionNotMet" });
        response.end("<Error><Code>ConditionNotMet</Code><Message>Changed ETag</Message></Error>");
      }
    };
    const controller = new AbortController();
    timers.add(setTimeout(() => controller.abort(new Error("test watchdog: stalled ETag body")), 1200));
    await expect(make(2).download(token(), controller.signal)).rejects.toMatchObject({ statusCode: 412 });
    expect(requests).toHaveLength(2);
    expect(requests[1].headers["if-match"]).toBe(etag);
  });

  it("does not HTTP-retry corrupt gzip after a complete response", async () => {
    handler = (_request, response) => {
      headers(response, 7, 200, "gzip");
      response.end("notgzip");
    };
    await expect(make(3).download(token())).rejects.toMatchObject({ code: "Z_DATA_ERROR" });
    expect(requests).toHaveLength(1);
  });

  it.each(["headers", "body", "initialization"] as const)(
    "preserves caller abort identity during %s and closes I/O",
    async (stage) => {
      let received!: () => void;
      let closed!: () => void;
      const started = new Promise<void>((resolve) => (received = resolve));
      const finished = new Promise<void>((resolve) => (closed = resolve));
      handler = (_request, response) => {
        response.once("close", closed);
        if (stage === "body") {
          headers(response, 7);
          response.write("p");
        }
        received();
      };
      const controller = new AbortController();
      const reason = Object.freeze(new Error("caller canceled provider"));
      const pending =
        stage === "initialization"
          ? make(3).upload("owner", controller.signal)
          : make(3).download(token(), controller.signal);
      const rejected = pending.catch((error: unknown) => error);
      await started;
      controller.abort(reason);
      expect(await rejected).toBe(reason);
      await finished;
      expect(requests).toHaveLength(1);
    },
  );

  it("cancels only an initialization waiter and drains/reuses the surviving single flight", async () => {
    let initialization!: ServerResponse;
    let received!: () => void;
    const started = new Promise<void>((resolve) => (received = resolve));
    handler = (request, response) => {
      if (request.url?.includes("restype=container")) {
        initialization = response;
        received();
      } else {
        request.resume();
        response.writeHead(201, { "content-length": "0", etag });
        response.end();
      }
    };
    const store = make();
    const leader = store.upload("leader");
    const leaderSettled = leader.catch((error: unknown) => error);
    await started;
    const controller = new AbortController();
    const reason = Object.freeze(new Error("cancel only the initialization waiter"));
    const waiter = store.upload("waiter", controller.signal).catch((error: unknown) => error);
    controller.abort(reason);
    expect(await waiter).toBe(reason);
    expect(initialization.destroyed).toBe(false);
    initialization.writeHead(201, { "content-length": "0" });
    initialization.end();
    await expect(leaderSettled).resolves.toMatch(/^blob:v2:/);
    await expect(store.upload("later")).resolves.toMatch(/^blob:v2:/);
    expect(requests.filter((request) => request.url?.includes("restype=container"))).toHaveLength(1);
    expect(requests).toHaveLength(3);
  });

  it("honors an explicit zero network timeout while remaining caller-cancellable", async () => {
    let received!: () => void;
    const started = new Promise<void>((resolve) => (received = resolve));
    handler = () => received();
    const controller = new AbortController();
    const reason = new Error("cancel explicit infinite timeout");
    const store = new BlobPayloadStore({
      connectionString: `DefaultEndpointsProtocol=http;AccountName=account;AccountKey=${accountKey};BlobEndpoint=${endpoint}`,
      clientOptions: { retryOptions: { tryTimeoutInMs: 0, maxTries: 1 } },
    });
    let settled = false;
    const pending = store.download(token(), controller.signal).catch((error: unknown) => {
      settled = true;
      return error;
    });
    await started;
    await new Promise<void>((resolve) => timers.add(setTimeout(resolve, timeout * 2)));
    expect(settled).toBe(false);
    controller.abort(reason);
    expect(await pending).toBe(reason);
    expect(requests).toHaveLength(1);
  });
});
