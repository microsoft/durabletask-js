// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { toHttpHeadersLike } from "@azure/core-http-compat";
import { createDefaultHttpClient, createHttpHeaders } from "@azure/core-rest-pipeline";
import {
  HttpOperationResponse,
  IHttpClient,
  newPipeline,
  Pipeline,
  RestError,
  StoragePipelineOptions,
  StorageRetryPolicyType,
  WebResource,
} from "@azure/storage-blob";
import { Readable } from "stream";

type Signal = WebResource["abortSignal"];
type Credential = Parameters<typeof newPipeline>[0];

const MAX_TIMER_MS = 2147483647;
const DEFAULT_HTTP_CLIENT = createDefaultHttpClient();

/** The SDK owns retries; the transport adapter bounds each send and pending body read. */
export function createPayloadPipeline(credential: Credential, options: StoragePipelineOptions): Pipeline {
  const retry = {
    ...options.retryOptions,
    maxTries: options.retryOptions?.maxTries ?? 9,
    retryDelayInMs: options.retryOptions?.retryDelayInMs ?? 250,
    maxRetryDelayInMs: options.retryOptions?.maxRetryDelayInMs ?? 10000,
    tryTimeoutInMs: options.retryOptions?.tryTimeoutInMs ?? 120000,
    retryPolicyType: options.retryOptions?.retryPolicyType ?? StorageRetryPolicyType.EXPONENTIAL,
  };
  if (!Number.isSafeInteger(retry.maxTries) || retry.maxTries < 1) {
    throw new RangeError("retryOptions.maxTries must be a positive integer.");
  }
  for (const [name, value] of Object.entries({
    retryDelayInMs: retry.retryDelayInMs,
    maxRetryDelayInMs: retry.maxRetryDelayInMs,
    tryTimeoutInMs: retry.tryTimeoutInMs,
  })) {
    if (!Number.isFinite(value) || value < 0)
      throw new RangeError(`retryOptions.${name} must be finite and nonnegative.`);
  }
  const transport: IHttpClient = options.httpClient ?? {
    async sendRequest(request) {
      const response = await DEFAULT_HTTP_CLIENT.sendRequest({
        ...request,
        headers: createHttpHeaders(request.headers.toJson({ preserveCase: true })),
        disableKeepAlive: options.keepAliveOptions?.enable === false,
        allowInsecureConnection: true,
      });
      return { ...response, request, headers: toHttpHeadersLike(response.headers) };
    },
  };
  return newPipeline(credential, {
    ...options,
    retryOptions: retry,
    httpClient: { sendRequest: (request) => sendAttempt(transport, request, retry.tryTimeoutInMs) },
  });
}

async function sendAttempt(next: IHttpClient, request: WebResource, timeout: number): Promise<HttpOperationResponse> {
  const callerSignal = request.abortSignal;
  throwIfAborted(callerSignal);
  const controller = new AbortController();
  let timer: NodeJS.Timeout | undefined;
  let timedOut: RestError | undefined;
  let headersReceived = false;
  let source: Readable | undefined;
  let body: Readable | undefined;
  const clear = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  const arm = () => {
    clear();
    if (timeout) {
      let remaining = timeout;
      const schedule = () => {
        const duration = Math.min(remaining, MAX_TIMER_MS);
        timer = setTimeout(() => {
          remaining -= duration;
          if (remaining > 0) schedule();
          else {
            timedOut = new RestError(`Payload storage network/read timed out after ${timeout} ms.`, {
              code: "ETIMEDOUT",
            });
            controller.abort();
            source?.destroy(timedOut);
          }
        }, duration);
      };
      schedule();
    }
  };
  const onAbort = () => {
    controller.abort();
    source?.destroy();
    body?.destroy(Object.assign(new Error("The payload request was aborted."), { name: "AbortError" }));
  };
  const progress = request.onDownloadProgress;
  const onProgress: WebResource["onDownloadProgress"] = (event) => {
    if (!headersReceived) arm();
    progress?.(event);
  };
  const cleanup = () => {
    clear();
    callerSignal?.removeEventListener("abort", onAbort);
    if (request.abortSignal === controller.signal) request.abortSignal = callerSignal;
    if (request.onDownloadProgress === onProgress) request.onDownloadProgress = progress;
  };
  request.abortSignal = controller.signal;
  request.onDownloadProgress = onProgress;
  callerSignal?.addEventListener("abort", onAbort, { once: true });
  arm();
  try {
    const response = await next.sendRequest(request);
    headersReceived = true;
    clear();
    throwIfAborted(callerSignal);
    if (timedOut) throw timedOut;
    const streamed =
      request.streamResponseStatusCodes?.has(response.status) || request.streamResponseStatusCodes?.has(Infinity);
    if (streamed && response.readableStreamBody instanceof Readable) {
      source = response.readableStreamBody;
      const input = source;
      const iterator = input[Symbol.asyncIterator]();
      let reading = false;
      body = new Readable({
        read() {
          if (reading) return;
          reading = true;
          arm();
          void iterator.next().then(
            (chunk) => {
              clear();
              reading = false;
              if (!this.destroyed) this.push(chunk.done ? null : chunk.value);
            },
            (error: unknown) => {
              clear();
              reading = false;
              if (this.destroyed) return;
              const failure = timedOut ?? normalizeInternalAbort(error);
              this.destroy(
                failure instanceof Error ? failure : new Error("Payload response read failed.", { cause: failure }),
              );
            },
          );
        },
        destroy(error, callback) {
          cleanup();
          if (!input.readableEnded) {
            controller.abort();
            input.destroy();
          }
          callback(error);
        },
      });
      response.readableStreamBody = body;
    } else {
      if (response.readableStreamBody instanceof Readable) response.readableStreamBody.destroy();
      cleanup();
    }
    return response;
  } catch (error) {
    cleanup();
    controller.abort();
    source?.destroy();
    throwIfAborted(callerSignal);
    throw timedOut ?? error;
  }
}

function normalizeInternalAbort(error: unknown): unknown {
  if (!(error instanceof Error) || error.name !== "AbortError") return error;
  return Object.assign(new RestError(error.message, { code: RestError.REQUEST_SEND_ERROR }), { cause: error });
}

function throwIfAborted(signal: Signal): void {
  if (signal?.aborted) {
    throw "reason" in signal
      ? signal.reason
      : Object.assign(new Error("The payload request was aborted."), { name: "AbortError" });
  }
}
