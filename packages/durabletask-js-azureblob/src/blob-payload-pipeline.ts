// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  HttpOperationResponse,
  newPipeline,
  Pipeline,
  RequestPolicy,
  RestError,
  StoragePipelineOptions,
  StorageRetryPolicyType,
  WebResource,
} from "@azure/storage-blob";
import { Readable } from "stream";

type Signal = WebResource["abortSignal"];
type Headers = Pick<HttpOperationResponse["headers"], "get">;
type Credential = Parameters<typeof newPipeline>[0];

const RETRY_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const RETRY_SERVICE_CODES = new Set(["InternalError", "OperationTimedOut", "ServerBusy"]);
const RETRY_NETWORK_CODES = new Set([
  "ETIMEDOUT",
  "ESOCKETTIMEDOUT",
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOENT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "TIMEOUT",
  "EPIPE",
  "REQUEST_SEND_ERROR",
]);
const MAX_TIMER_MS = 2147483647;

/** One HTTP retry policy; the Blob SDK separately owns its ETag-bound body resumptions. */
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
  const pipeline = newPipeline(credential, {
    ...options,
    retryOptions: { ...retry, maxTries: 1 },
  });
  pipeline.factories.push({
    create: (next) => ({
      async sendRequest(request) {
        const signal = request.abortSignal;
        const primary = new URL(request.url);
        const secondary = retry.secondaryHost ? new URL(primary) : undefined;
        if (secondary) secondary.host = retry.secondaryHost!;
        let secondaryNotFound = false;
        let primaryFailure: { response?: HttpOperationResponse; error: unknown } | undefined;
        for (let attempt = 1; ; attempt++) {
          throwIfAborted(signal);
          const useSecondary =
            secondary && !secondaryNotFound && ["GET", "HEAD", "OPTIONS"].includes(request.method) && attempt % 2 === 0;
          request.url = (useSecondary ? secondary : primary).href;
          let response: HttpOperationResponse | undefined;
          let error: unknown;
          try {
            response = await sendAttempt(next, request, retry.tryTimeoutInMs);
          } catch (failure) {
            throwIfAborted(signal);
            error = failure;
          }
          const status = response?.status ?? (error instanceof RestError ? error.statusCode : undefined);
          const headers = response?.headers ?? (error instanceof RestError ? error.response?.headers : undefined);
          const secondary404 = !!useSecondary && status === 404;
          if (secondary404) secondaryNotFound = true;
          const serviceError =
            status !== undefined &&
            status >= 400 &&
            headers &&
            [headers.get("x-ms-error-code"), headers.get("x-ms-copy-source-error-code")].some(
              (code) => code !== undefined && RETRY_SERVICE_CODES.has(code),
            );
          const networkError =
            (error instanceof RestError && error.statusCode === 0) ||
            (error instanceof Error &&
              "code" in error &&
              typeof error.code === "string" &&
              RETRY_NETWORK_CODES.has(error.code));
          const retryable =
            secondary404 || serviceError || networkError || (status !== undefined && RETRY_STATUSES.has(status));
          if (!useSecondary && retryable) primaryFailure = { response, error };
          if (attempt === retry.maxTries || !retryable) {
            if (secondary404) {
              if (!primaryFailure) {
                throw new RestError("The secondary response did not confirm primary payload absence.", {
                  code: RestError.REQUEST_SEND_ERROR,
                });
              }
              if (primaryFailure.response) return primaryFailure.response;
              throw primaryFailure.error;
            }
            if (response) return response;
            throw error;
          }
          if (response?.readableStreamBody instanceof Readable) response.readableStreamBody.destroy();
          const base =
            retry.retryDelayInMs *
            (retry.retryPolicyType === StorageRetryPolicyType.FIXED ? 1 : Math.pow(2, attempt - 1));
          const cap =
            retry.retryPolicyType === StorageRetryPolicyType.FIXED ? retry.retryDelayInMs : retry.maxRetryDelayInMs;
          const defaultDelay = Math.min(base * (0.8 + Math.random() * 0.4), cap);
          await wait(Math.max(defaultDelay, retryAfter(headers)), signal);
        }
      },
    }),
  });
  return pipeline;
}

async function sendAttempt(next: RequestPolicy, request: WebResource, timeout: number): Promise<HttpOperationResponse> {
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
    throw timedOut ?? normalizeInternalAbort(error);
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

function retryAfter(headers?: Headers): number {
  if (!headers) return 0;
  const milliseconds = headers.get("retry-after-ms") ?? headers.get("x-ms-retry-after-ms");
  const parseInteger = (value: string | undefined) => {
    if (value === undefined || !/^[+-]?\d+$/.test(value.trim())) return undefined;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= -2147483648 && parsed <= 2147483647 ? parsed : undefined;
  };
  const ms = parseInteger(milliseconds);
  if (ms !== undefined) return ms;
  const value = headers.get("retry-after");
  const seconds = parseInteger(value);
  if (seconds !== undefined) return seconds * 1000;
  return value && Number.isFinite(Date.parse(value)) ? Date.parse(value) - Date.now() : 0;
}

async function wait(delay: number, signal: Signal): Promise<void> {
  // Retry-After can exceed Node's timer limit. Chunk it instead of overflowing to 1 ms.
  let remaining = delay;
  while (remaining > 0) {
    throwIfAborted(signal);
    const duration = Math.min(remaining, MAX_TIMER_MS);
    let timer: NodeJS.Timeout | undefined;
    let onAbort = () => {};
    try {
      await new Promise<void>((resolve, reject) => {
        onAbort = () => {
          clearTimeout(timer);
          try {
            throwIfAborted(signal);
          } catch (error) {
            reject(error);
          }
        };
        timer = setTimeout(resolve, duration);
        signal?.addEventListener("abort", onAbort, { once: true });
        if (signal?.aborted) onAbort();
      });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
    remaining -= duration;
  }
  throwIfAborted(signal);
}
