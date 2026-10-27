// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TokenCredential } from "@azure/core-auth";
import { BlobClient, BlobServiceClient, ContainerClient, StoragePipelineOptions } from "@azure/storage-blob";
import { PayloadStore, PayloadStorageException, PayloadDeleteOutcome } from "@microsoft/durabletask-js";
import { randomUUID } from "crypto";
import { Writable } from "stream";
import { pipeline } from "stream/promises";
import { promisify } from "util";
import { createGunzip, gzip } from "zlib";
import { createPayloadPipeline } from "./blob-payload-pipeline";

const compress = promisify(gzip);

export interface BlobPayloadStoreOptions {
  connectionString?: string;
  accountUri?: string | URL;
  credential?: TokenCredential;
  /** Defaults to durabletask-payloads. */
  containerName?: string;
  /** Defaults to true. */
  compressionEnabled?: boolean;
  /** Azure SDK HTTP, proxy, and retry configuration. */
  clientOptions?: StoragePipelineOptions;
}

/** .NET-compatible blob:v2 writes and blob:v1/v2 reads, with ownership-checked conditional cleanup. */
export class BlobPayloadStore extends PayloadStore {
  private readonly _service: BlobServiceClient;
  private readonly _container: ContainerClient;
  private readonly _clientOptions: StoragePipelineOptions;
  private _generation?: object;
  private _initializing?: { promise: Promise<object>; signal?: AbortSignal };

  constructor(private readonly _options: BlobPayloadStoreOptions) {
    super();
    const containerName = _options.containerName ?? "durabletask-payloads";
    if (!containerName) throw new TypeError("containerName must not be empty.");
    this._clientOptions = _options.clientOptions ?? {};
    if (_options.accountUri && _options.credential) {
      this._service = new BlobServiceClient(
        String(_options.accountUri),
        createPayloadPipeline(_options.credential, this._clientOptions),
      );
    } else if (_options.connectionString) {
      const parsed = BlobServiceClient.fromConnectionString(_options.connectionString);
      this._service = new BlobServiceClient(parsed.url, createPayloadPipeline(parsed.credential, this._clientOptions));
    } else {
      throw new TypeError("Provide connectionString or both accountUri and credential.");
    }
    this._container = this._service.getContainerClient(containerName);
  }

  isKnownPayloadToken(value: string): boolean {
    return value.startsWith("blob:v1:") || value.startsWith("blob:v2:");
  }

  async upload(payload: string, signal?: AbortSignal): Promise<string> {
    signal?.throwIfAborted();
    const blob = this._container.getBlockBlobClient(randomUUID().replace(/-/g, ""));
    const compressed = this._options.compressionEnabled ?? true;
    const bytes = Buffer.from(payload, "utf8");
    const content = compressed ? await compress(bytes) : bytes;
    signal?.throwIfAborted();
    for (let attempt = 0; ; attempt++) {
      const generation = await this._ensureContainer(signal);
      try {
        await blob.upload(content, content.length, {
          abortSignal: signal,
          metadata: { managed_by: "dts" },
          blobHTTPHeaders: compressed ? { blobContentEncoding: "gzip" } : undefined,
        });
      } catch (error) {
        signal?.throwIfAborted();
        if (attempt === 0 && storageCode(error) === "ContainerNotFound") {
          if (this._generation === generation) this._generation = undefined;
          continue;
        }
        throw error;
      }
      const url = new URL(blob.url);
      url.search = "";
      url.hash = "";
      url.username = "";
      url.password = "";
      return `blob:v2:${url.href}`;
    }
  }

  async download(token: string, signal?: AbortSignal): Promise<string> {
    signal?.throwIfAborted();
    const blob = this._blobClient(token);
    try {
      const response = await blob.download(0, undefined, { abortSignal: signal });
      const body = response.readableStreamBody;
      if (!body) throw new PayloadStorageException("The payload blob response has no readable body.");
      const chunks: Buffer[] = [];
      const target = new Writable({
        write(chunk: Buffer, _encoding, callback) {
          chunks.push(chunk);
          callback();
        },
      });
      if (response.contentEncoding?.toLowerCase() === "gzip") {
        await pipeline(body, createGunzip(), target, { signal });
      } else {
        await pipeline(body, target, { signal });
      }
      return Buffer.concat(chunks)
        .toString("utf8")
        .replace(/^\uFEFF/, "");
    } catch (error) {
      signal?.throwIfAborted();
      if (storageStatus(error) === 404) {
        throw new PayloadStorageException("The payload blob was not found. It may have been deleted.", {
          cause: error,
        });
      }
      throw error;
    }
  }

  async delete(token: string, signal?: AbortSignal): Promise<PayloadDeleteOutcome> {
    signal?.throwIfAborted();
    const blob = this._blobClient(token);
    try {
      const properties = await blob.getProperties({ abortSignal: signal });
      const owned = Object.entries(properties.metadata ?? {}).some(
        ([key, value]) => key.toLowerCase() === "managed_by" && value === "dts",
      );
      if (!owned) return PayloadDeleteOutcome.NotStoreOwned;
      if (!properties.etag) throw new PayloadStorageException("The ownership response is missing its ETag.");
      await blob.delete({
        abortSignal: signal,
        deleteSnapshots: "include",
        conditions: { ifMatch: properties.etag },
      });
      return PayloadDeleteOutcome.Deleted;
    } catch (error) {
      signal?.throwIfAborted();
      if (
        storageStatus(error) === 404 &&
        (storageCode(error) === "BlobNotFound" || storageCode(error) === "ContainerNotFound")
      ) {
        return PayloadDeleteOutcome.AlreadyAbsent;
      }
      throw error;
    }
  }

  private _blobClient(token: string): BlobClient {
    if (token.startsWith("blob:v1:")) {
      const rest = token.slice("blob:v1:".length);
      const separator = rest.indexOf(":");
      if (
        separator < 1 ||
        separator === rest.length - 1 ||
        rest.slice(0, separator) !== this._container.containerName
      ) {
        throw new TypeError("Invalid external payload token or token container does not match.");
      }
      return this._container.getBlobClient(rest.slice(separator + 1));
    }
    if (!token.startsWith("blob:v2:")) throw new TypeError("Invalid external payload token.");
    let url: URL;
    try {
      url = new URL(token.slice("blob:v2:".length));
    } catch (error) {
      throw new TypeError("Invalid external payload blob URL.", { cause: error });
    }
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) {
      throw new TypeError("Invalid external payload blob URL.");
    }
    const decoded = new BlobClient(url.href);
    if (!decoded.containerName || !decoded.name) throw new TypeError("Invalid external payload blob URL.");
    const container = this._service.getContainerClient(decoded.containerName);
    const configuredUrl = new URL(container.url);
    // Match the service/container boundary, not normalized blob-name escaping. The SDK
    // preserves path-style account prefixes and the configured credential/pipeline.
    if (
      url.origin === configuredUrl.origin &&
      url.pathname.startsWith(configuredUrl.pathname.replace(/\/+$/, "") + "/")
    ) {
      return container.getBlobClient(decoded.name);
    }
    if (this._options.credential)
      return new BlobClient(
        url.href,
        createPayloadPipeline(this._options.credential, {
          ...this._clientOptions,
          retryOptions: { ...this._clientOptions.retryOptions, secondaryHost: undefined },
        }),
      );
    throw new PayloadStorageException(
      "Cross-account or cross-endpoint payload access requires identity authentication.",
    );
  }

  private async _ensureContainer(signal?: AbortSignal): Promise<object> {
    signal?.throwIfAborted();
    if (this._generation) return this._generation;
    if (!this._initializing) {
      const initializing = {
        signal,
        promise: this._container.createIfNotExists({ abortSignal: signal }).then(() => {
          this._generation = {};
          return this._generation;
        }),
      };
      this._initializing = initializing;
      const clear = () => {
        if (this._initializing === initializing) this._initializing = undefined;
      };
      void initializing.promise.then(clear, clear);
    }
    const initializing = this._initializing;
    try {
      return await waitForInitialization(initializing.promise, signal);
    } catch (error) {
      if (initializing.signal?.aborted && !signal?.aborted) {
        if (this._initializing === initializing) this._initializing = undefined;
        return this._ensureContainer(signal);
      }
      throw error;
    }
  }
}

async function waitForInitialization(promise: Promise<object>, signal?: AbortSignal): Promise<object> {
  if (!signal) return promise;
  signal.throwIfAborted();
  let onAbort = () => {};
  try {
    return await new Promise<object>((resolve, reject) => {
      onAbort = () => reject(signal.reason);
      signal.addEventListener("abort", onAbort, { once: true });
      promise.then(resolve, reject);
      if (signal.aborted) onAbort();
    });
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}

function storageCode(error: unknown): unknown {
  if (error === null || typeof error !== "object") return undefined;
  // HEAD failures have no response body; the Azure SDK exposes their service code in details.
  if (
    "details" in error &&
    error.details !== null &&
    typeof error.details === "object" &&
    "errorCode" in error.details &&
    typeof error.details.errorCode === "string"
  ) {
    return error.details.errorCode;
  }
  return "code" in error ? error.code : undefined;
}

function storageStatus(error: unknown): unknown {
  return error !== null && typeof error === "object" && "statusCode" in error ? error.statusCode : undefined;
}
