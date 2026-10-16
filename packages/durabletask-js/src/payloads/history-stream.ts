// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import * as pb from "../proto/orchestrator_service_pb";
import { PayloadProcessor } from "./payload-processor";

export class PayloadHydrationError extends Error {
  constructor(cause: unknown) {
    super("History payload hydration failed.", { cause });
    this.name = "PayloadHydrationError";
  }
}

/** Serializes chunk hydration, applies stream backpressure, and drains I/O before settling. */
export function readPayloadHistory(
  stream: grpc.ClientReadableStream<pb.HistoryChunk>,
  processor: PayloadProcessor,
  signal?: AbortSignal,
): Promise<pb.HistoryEvent[]> {
  return new Promise((resolve, reject) => {
    const events: pb.HistoryEvent[] = [];
    let pending = Promise.resolve();
    let finishing = false;
    const finish = (error?: unknown) => {
      if (finishing) return;
      finishing = true;
      stream.removeListener("data", onData);
      stream.removeListener("end", onEnd);
      stream.removeListener("error", onError);
      stream.removeListener("close", onClose);
      stream.on("error", () => {});
      signal?.removeEventListener("abort", onAbort);
      if (error !== undefined) stream.cancel();
      stream.destroy();
      void pending.then(() => (error === undefined ? resolve(events) : reject(error)), reject);
    };
    const onData = (chunk: pb.HistoryChunk) => {
      stream.pause();
      pending = pending.then(async () => {
        try {
          await processor.resolve(chunk, signal);
        } catch (error) {
          throw new PayloadHydrationError(error);
        }
        for (const event of chunk.getEventsList()) events.push(event);
        if (!finishing) stream.resume();
      });
      void pending.catch(finish);
    };
    const onEnd = () => finish();
    const onError = (error: unknown) => finish(error);
    const onClose = () => finish(new Error("History stream closed before all history was received."));
    const onAbort = () => finish(signal?.reason ?? new Error("History hydration was cancelled."));
    stream.on("data", onData);
    stream.once("end", onEnd);
    stream.once("error", onError);
    stream.once("close", onClose);
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) onAbort();
  });
}
