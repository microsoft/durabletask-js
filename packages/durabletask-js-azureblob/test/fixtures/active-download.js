// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const path = require("node:path");
const { channel } = require("node:diagnostics_channel");
const { getEventListeners } = require("node:events");

require("ts-node").register({
  project: path.join(__dirname, "..", "..", "tsconfig.json"),
  transpileOnly: true,
  swc: true,
});
const { BlobPayloadStore } = require("../../src/blob-payload-store.ts");
const endpoint = process.argv[2];
const controller = new AbortController();
const reason = Object.freeze(new Error("caller canceled an active download"));
const accountKey = Buffer.alloc(64).toString("base64");
let operation;
let result;
let raw;
let established;
const responses = channel("http.client.response.finish");
responses.subscribe(({ response }) => {
  if (raw) return;
  raw = response;
  raw.once("data", (chunk) => {
    established = setTimeout(() => {
      process.send({ type: "body", bytes: chunk.length, complete: raw.complete });
    }, 25);
  });
  process.send({ type: "headers" });
});
process.on("message", (message) => {
  if (message === "abort") controller.abort(reason);
  if (message === "observe") {
    process.send({
      type: "observation",
      result,
      callerAborted: controller.signal.aborted,
      callerListeners: getEventListeners(controller.signal, "abort").length,
      rawClosed: raw.closed,
    });
  }
  if (message === "cleanup") {
    clearTimeout(established);
    controller.abort(new Error("test cleanup after observation"));
    void operation.then(() => process.disconnect());
  }
});
const store = new BlobPayloadStore({
  connectionString: `DefaultEndpointsProtocol=http;AccountName=account;AccountKey=${accountKey};BlobEndpoint=${endpoint}`,
  clientOptions: { retryOptions: { maxTries: 1, tryTimeoutInMs: 0 } },
});
process.send({ type: "ready" });
operation = store.download(`blob:v2:${endpoint}/durabletask-payloads/blob`, controller.signal).then(
  () => {
    result = { outcome: "resolved" };
  },
  (error) => {
    result = {
      outcome: "rejected",
      originalReason: error === reason,
      name: error.name,
      code: error.code,
    };
  },
);
