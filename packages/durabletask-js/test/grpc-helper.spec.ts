// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import { callWithMetadata } from "../src/utils/grpc-helper.util";

type Callback = (error: grpc.ServiceError | null, response: string) => void;

describe("callWithMetadata", () => {
  it("awaits metadata and skips the RPC when the signal is already aborted", async () => {
    const controller = new AbortController();
    const reason = new Error("stopped");
    let provideMetadata!: (metadata: grpc.Metadata) => void;
    const metadataGenerator = () =>
      new Promise<grpc.Metadata>((resolve) => {
        provideMetadata = resolve;
      });
    const method = jest.fn();

    const result = callWithMetadata(method, "request", metadataGenerator, {}, controller.signal);
    controller.abort(reason);
    provideMetadata(new grpc.Metadata());

    await expect(result).rejects.toBe(reason);
    expect(method).not.toHaveBeenCalled();
  });

  it("passes options and removes the abort listener after a synchronous callback", async () => {
    const controller = new AbortController();
    const removeEventListener = jest.spyOn(controller.signal, "removeEventListener");
    const call = { cancel: jest.fn() } as unknown as grpc.ClientUnaryCall;
    const options = { deadline: new Date() };
    const method = jest.fn((_request, _metadata, actualOptions, callback: Callback) => {
      callback(null, "response");
      return call;
    });

    await expect(callWithMetadata(method, "request", undefined, options, controller.signal)).resolves.toBe("response");
    expect(method.mock.calls[0][2]).toBe(options);
    expect(removeEventListener).toHaveBeenCalledWith("abort", expect.any(Function));
  });

  it.each(["callback error", "synchronous throw"])("cleans up after a %s", async (failure) => {
    const controller = new AbortController();
    const removeEventListener = jest.spyOn(controller.signal, "removeEventListener");
    const error = new Error(failure);
    const method = jest.fn((_request, _metadata, _options, callback: Callback) => {
      if (failure === "callback error") {
        callback(error as grpc.ServiceError, "");
        return { cancel: jest.fn() } as unknown as grpc.ClientUnaryCall;
      }
      throw error;
    });

    await expect(callWithMetadata(method, "request", undefined, {}, controller.signal)).rejects.toBe(error);
    expect(removeEventListener).toHaveBeenCalledWith("abort", expect.any(Function));
  });

  it("rejects and cancels when abort occurs synchronously during the RPC", async () => {
    const controller = new AbortController();
    const removeEventListener = jest.spyOn(controller.signal, "removeEventListener");
    const reason = new Error("stopped");
    const cancel = jest.fn();
    let callback!: Callback;
    const method = jest.fn((_request, _metadata, _options, rpcCallback: Callback) => {
      callback = rpcCallback;
      controller.abort(reason);
      return { cancel } as unknown as grpc.ClientUnaryCall;
    });

    const result = callWithMetadata(method, "request", undefined, {}, controller.signal);
    await expect(result).rejects.toBe(reason);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(removeEventListener).toHaveBeenCalledWith("abort", expect.any(Function));

    callback(null, "late response");
    await expect(result).rejects.toBe(reason);
  });
});
