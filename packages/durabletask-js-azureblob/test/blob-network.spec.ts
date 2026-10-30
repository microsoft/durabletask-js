// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { createServer, IncomingMessage, ServerResponse, Server } from "http";
import { Socket } from "net";
import { getEventListeners } from "events";
import { Readable } from "stream";
import { BlobServiceClient } from "@azure/storage-blob";
import { BlobPayloadStore } from "../src";
import { fork } from "child_process";
import { join } from "path";

describe("BlobPayloadStore native SDK networking", () => {
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

  beforeAll(async () => {
    server = createServer((request, response) => {
      response.setHeader("connection", "close");
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

  afterEach(async () => {
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    const closed = [...sockets].map((socket) => new Promise<void>((resolve) => socket.once("close", resolve)));
    server.closeAllConnections();
    await Promise.all(closed);
  });

  afterAll(async () => {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });

  async function waitForRequest(started: Promise<void>, operation: Promise<unknown>): Promise<void> {
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        started,
        operation.then(
          () => {
            throw new Error("The operation completed before the server received the request.");
          },
          (error: unknown) => {
            throw error;
          },
        ),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error("The server did not receive the request.")), 1000);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  it.each(["abort", "reset"] as const)(
    "lets the native SDK settle an active body on %s without crashing or hanging",
    async (action) => {
      let active!: ServerResponse;
      handler = (_request, response) => {
        active = response;
        headers(response, 100);
      };
      const child = fork(join(__dirname, "fixtures", "active-download.js"), [endpoint], {
        stdio: ["ignore", "pipe", "pipe", "ipc"],
      });
      child.stdout!.resume();
      let stderr = "";
      child.stderr!.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
      let watchdog: NodeJS.Timeout | undefined;
      let observationTimer: NodeJS.Timeout | undefined;
      let watchdogFired = false;
      let bytes = 0;
      let complete = true;
      let observation:
        | {
            result?: { outcome: string; originalReason?: boolean; name: string };
            callerAborted: boolean;
            callerListeners: number;
            rawClosed: boolean;
          }
        | undefined;
      child.on(
        "message",
        (message: NonNullable<typeof observation> & { type: string; bytes: number; complete: boolean }) => {
          if (message.type === "ready") {
            watchdog = setTimeout(() => {
              watchdogFired = true;
              child.kill();
            }, 1000);
          } else if (message.type === "headers") active.write("prefix");
          else if (message.type === "body") {
            bytes = message.bytes;
            complete = message.complete;
            if (action === "abort") child.send("abort");
            else active.socket!.destroy();
            observationTimer = setTimeout(() => {
              if (child.connected) child.send("observe");
            }, 150);
          } else if (message.type === "observation") {
            observation = message;
            child.send("cleanup");
          }
        },
      );
      try {
        const code = await new Promise<number | null>((resolve, reject) => {
          child.once("error", reject);
          child.once("close", resolve);
        });
        expect({ code, stderr, watchdogFired }).toEqual({ code: 0, stderr: "", watchdogFired: false });
        expect(bytes).toBe(6);
        expect(complete).toBe(false);
        expect(observation?.result).toMatchObject({
          outcome: "rejected",
          originalReason: action === "abort",
        });
        expect(observation?.callerAborted).toBe(action === "abort");
        expect(observation?.callerListeners).toBe(0);
        expect(observation?.rawClosed).toBe(true);
        expect(requests).toHaveLength(1);
      } finally {
        clearTimeout(watchdog);
        clearTimeout(observationTimer);
        if (child.exitCode === null && child.signalCode === null) child.kill();
      }
    },
  );

  it("reads a progressive response through the native SDK", async () => {
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

  it("does not HTTP-retry corrupt gzip after a complete response", async () => {
    handler = (_request, response) => {
      headers(response, 7, 200, "gzip");
      response.end("notgzip");
    };
    await expect(make(3).download(token())).rejects.toMatchObject({ code: "Z_DATA_ERROR" });
    expect(requests).toHaveLength(1);
  });

  it.each([0, undefined])(
    "eagerly closes a corrupt gzip response with an open tail (timeout=%s)",
    async (tryTimeoutInMs) => {
      let responseClosed = false;
      let socketClosed = false;
      let socketClose!: () => void;
      const closed = new Promise<void>((resolve) => (socketClose = resolve));
      handler = (_request, response) => {
        response.once("close", () => {
          responseClosed = true;
        });
        response.socket!.once("close", () => {
          socketClosed = true;
          socketClose();
        });
        headers(response, 100, 200, "gzip");
        response.write("notgzip");
      };
      const controller = new AbortController();
      const watchdog = setTimeout(
        () => controller.abort(new Error("test watchdog: gzip failure did not settle")),
        1000,
      );
      const store = new BlobPayloadStore({
        connectionString: `DefaultEndpointsProtocol=http;AccountName=account;AccountKey=${accountKey};BlobEndpoint=${endpoint}`,
        clientOptions: { retryOptions: { tryTimeoutInMs, maxTries: 1 } },
      });
      const operation = store.download(token(), controller.signal);
      try {
        await expect(operation).rejects.toMatchObject({ code: "Z_DATA_ERROR" });
        await closed;
        expect({
          responseClosed,
          socketClosed,
          openSockets: sockets.size,
          callerAborted: controller.signal.aborted,
          callerListeners: getEventListeners(controller.signal, "abort").length,
          gets: requests.filter((request) => request.method === "GET").length,
        }).toEqual({
          responseClosed: true,
          socketClosed: true,
          openSockets: 0,
          callerAborted: false,
          callerListeners: 0,
          gets: 1,
        });
      } finally {
        clearTimeout(watchdog);
        controller.abort(new Error("test-only final cleanup after observation"));
        server.closeAllConnections();
        if (requests.length) await closed;
        await operation.catch(() => {});
      }
    },
  );

  it("keeps a normally completed response connection available for the next download", async () => {
    const connections: Socket[] = [];
    handler = (request, response) => {
      connections.push(request.socket);
      response.setHeader("connection", "keep-alive");
      headers(response, 7);
      response.end("payload");
    };
    const store = make();
    await expect(store.download(token())).resolves.toBe("payload");
    expect(connections[0].destroyed).toBe(false);
    await expect(store.download(token())).resolves.toBe("payload");
    expect(connections).toHaveLength(2);
    expect(connections[1]).toBe(connections[0]);
    expect(connections[1].destroyed).toBe(false);
  });

  it("matches the native SDK's disabled keep-alive behavior", async () => {
    const connections: Socket[] = [];
    handler = (request, response) => {
      connections.push(request.socket);
      response.setHeader("connection", "keep-alive");
      headers(response, 7);
      response.end("payload");
    };
    const localConnection = `DefaultEndpointsProtocol=http;AccountName=account;AccountKey=${accountKey};BlobEndpoint=${endpoint}`;
    const native = BlobServiceClient.fromConnectionString(localConnection, {
      keepAliveOptions: { enable: false },
      retryOptions: { maxTries: 1 },
    })
      .getContainerClient("durabletask-payloads")
      .getBlobClient("blob");
    for (let i = 0; i < 2; i++) {
      const { readableStreamBody: body } = await native.download();
      if (!(body instanceof Readable)) throw new Error("Expected the SDK's Node-readable download body");
      const chunks: Buffer[] = [];
      for await (const chunk of body) chunks.push(chunk);
      expect(Buffer.concat(chunks).toString()).toBe("payload");
    }
    const store = new BlobPayloadStore({
      connectionString: localConnection,
      clientOptions: {
        keepAliveOptions: { enable: false },
        retryOptions: { maxTries: 1, tryTimeoutInMs: timeout },
      },
    });
    await expect(store.download(token())).resolves.toBe("payload");
    await expect(store.download(token())).resolves.toBe("payload");
    expect(connections).toHaveLength(4);
    expect(connections[2] === connections[3]).toBe(connections[0] === connections[1]);
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
      await waitForRequest(started, pending);
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
    await waitForRequest(started, leader);
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

  it("leaves a stalled SDK request caller-cancellable with a zero server timeout hint", async () => {
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
    const operation = store.download(token(), controller.signal);
    const pending = operation.then(
      (value) => {
        settled = true;
        return value;
      },
      (error: unknown) => {
        settled = true;
        return error;
      },
    );
    try {
      await waitForRequest(started, operation);
      await new Promise<void>((resolve) => timers.add(setTimeout(resolve, timeout * 2)));
      expect(settled).toBe(false);
      controller.abort(reason);
      expect(await pending).toBe(reason);
      expect(requests).toHaveLength(1);
    } finally {
      controller.abort(reason);
      await pending;
    }
  });

  it("surfaces early operation failures instead of hanging at the server-receipt gate", async () => {
    const neverReceived = new Promise<void>(() => {});
    await expect(waitForRequest(neverReceived, make().download("blob:v2:invalid"))).rejects.toBeInstanceOf(TypeError);
    expect(requests).toHaveLength(0);
  });
});
