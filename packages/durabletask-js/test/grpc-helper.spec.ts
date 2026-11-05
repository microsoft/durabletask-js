// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import { EventEmitter, getEventListeners } from "events";
import { callWithMetadata } from "../src/utils/grpc-helper.util";

describe("gRPC metadata acquisition cancellation", () => {
  const request = { id: "request" };
  const response = { id: "response" };
  let cancel: jest.Mock;
  let method: jest.Mock;

  beforeEach(() => {
    cancel = jest.fn();
    method = jest.fn((_request, _metadata, callback) => {
      callback(null, response);
      return Object.assign(new EventEmitter(), { cancel, getPeer: () => "test", getAuthContext: () => null });
    });
  });

  it("dispatches synchronously up to the RPC when no metadata generator is configured", async () => {
    const pending = callWithMetadata(method, request);
    expect(method).toHaveBeenCalledTimes(1);
    await expect(pending).resolves.toBe(response);
  });

  it.each([false, true])("acquires metadata once and cleans up on success (signal=%s)", async (withSignal) => {
    const controller = new AbortController();
    const metadata = new grpc.Metadata();
    const generator = jest.fn(async () => metadata);
    await expect(
      callWithMetadata(method, request, generator, withSignal ? controller.signal : undefined),
    ).resolves.toBe(response);
    expect(generator).toHaveBeenCalledTimes(1);
    expect(method).toHaveBeenCalledWith(request, metadata, expect.any(Function));
    expect(getEventListeners(controller.signal, "abort")).toHaveLength(0);
  });

  it.each(["throw", "reject"] as const)("preserves a live metadata %s without dispatching", async (kind) => {
    const controller = new AbortController();
    const failure = Object.freeze(new Error("metadata failed"));
    const generator = jest.fn(() => {
      if (kind === "throw") throw failure;
      return Promise.reject(failure);
    });
    await expect(callWithMetadata(method, request, generator, controller.signal)).rejects.toBe(failure);
    expect(method).not.toHaveBeenCalled();
    expect(getEventListeners(controller.signal, "abort")).toHaveLength(0);
  });

  it("does not dispatch a pre-aborted call without a metadata generator", async () => {
    const controller = new AbortController();
    const reason = Object.freeze(new Error("pre-aborted"));
    controller.abort(reason);
    await expect(callWithMetadata(method, request, undefined, controller.signal)).rejects.toBe(reason);
    expect(method).not.toHaveBeenCalled();
  });

  it.each(["throw", "pending"] as const)("skips a pre-aborted metadata generator that would %s", async (kind) => {
    let release!: (metadata: grpc.Metadata) => void;
    const metadata = new Promise<grpc.Metadata>((resolve) => (release = resolve));
    const controller = new AbortController();
    const reason = Object.freeze(new Error("cancel before metadata"));
    const generator = jest.fn(() => {
      if (kind === "throw") throw new Error("metadata must not run");
      return metadata;
    });
    controller.abort(reason);
    const pending = callWithMetadata(method, request, generator, controller.signal);
    void pending.catch(() => {});
    try {
      expect(generator).not.toHaveBeenCalled();
      await expect(pending).rejects.toBe(reason);
      expect(method).not.toHaveBeenCalled();
      expect(getEventListeners(controller.signal, "abort")).toHaveLength(0);
    } finally {
      release(new grpc.Metadata());
      await pending.catch(() => {});
    }
  });

  it.each(["resolve", "reject"] as const)(
    "cancels the metadata wait before a late %s without dispatch or an unhandled rejection",
    async (outcome) => {
      let release!: (metadata: grpc.Metadata) => void;
      let reject!: (error: Error) => void;
      const metadata = new Promise<grpc.Metadata>((resolve, fail) => {
        release = resolve;
        reject = fail;
      });
      const controller = new AbortController();
      const reason = Object.freeze(new Error("cancel pending metadata"));
      const unhandled = jest.fn();
      process.on("unhandledRejection", unhandled);
      let settled = false;
      let observed: unknown;
      const pending = callWithMetadata(method, request, () => metadata, controller.signal).then(
        () => {
          settled = true;
        },
        (error: unknown) => {
          settled = true;
          observed = error;
        },
      );
      try {
        controller.abort(reason);
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(settled).toBe(true);
        expect(observed).toBe(reason);
        expect(getEventListeners(controller.signal, "abort")).toHaveLength(0);
        expect(method).not.toHaveBeenCalled();
        if (outcome === "resolve") release(new grpc.Metadata());
        else reject(new Error("late metadata failure"));
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(method).not.toHaveBeenCalled();
        expect(unhandled).not.toHaveBeenCalled();
      } finally {
        release(new grpc.Metadata());
        await metadata.catch(() => {});
        await pending;
        process.removeListener("unhandledRejection", unhandled);
      }
    },
  );

  it("preserves cancellation triggered synchronously by a throwing metadata generator", async () => {
    const controller = new AbortController();
    const reason = Object.freeze(new Error("metadata canceled its caller"));
    const pending = callWithMetadata(
      method,
      request,
      () => {
        controller.abort(reason);
        throw new Error("later synchronous metadata failure");
      },
      controller.signal,
    );
    await expect(pending).rejects.toBe(reason);
    expect(method).not.toHaveBeenCalled();
    expect(getEventListeners(controller.signal, "abort")).toHaveLength(0);
  });

  it("continues to cancel a live RPC with the original caller reason", async () => {
    const controller = new AbortController();
    const reason = Object.freeze(new Error("cancel active RPC"));
    method.mockImplementation(() =>
      Object.assign(new EventEmitter(), { cancel, getPeer: () => "test", getAuthContext: () => null }),
    );
    const pending = callWithMetadata(method, request, undefined, controller.signal);
    controller.abort(reason);
    await expect(pending).rejects.toBe(reason);
    expect(method).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(getEventListeners(controller.signal, "abort")).toHaveLength(0);
  });
});
