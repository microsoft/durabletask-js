// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TokenCredential } from "@azure/core-auth";
import {
  BlobClient,
  BlobServiceClient,
  ContainerClient,
  newPipeline,
  RestError,
  StoragePipelineOptions,
} from "@azure/storage-blob";
import { PayloadStore, PayloadStorageException, PayloadDeleteOutcome } from "@microsoft/durabletask-js";
import { randomUUID } from "crypto";
import { Writable } from "stream";
import { pipeline } from "stream/promises";
import { promisify } from "util";
import { createGunzip, gzip } from "zlib";

const compress = promisify(gzip);

export interface BlobPayloadStoreOptions {
  connectionString?: string;
  accountUri?: string | URL;
  credential?: TokenCredential;
  /** Defaults to durabletask-payloads. */
  containerName?: string;
  /** Allow reads/deletes in all primary-account containers. Defaults to false. Uploads stay in containerName. */
  allowAllContainersInConfiguredAccount?: boolean;
  /** Additional HTTPS account endpoints with account-wide read/delete access. Requires accountUri and credential. */
  additionalAccountUris?: readonly (string | URL)[];
  /** Defaults to true. */
  compressionEnabled?: boolean;
  /** Azure SDK HTTP, proxy, and retry configuration. */
  clientOptions?: StoragePipelineOptions;
}

interface AccountLocation {
  service: BlobServiceClient;
  endpoint: URL;
  accountWide: boolean;
}

/** .NET-compatible blob:v2 writes and blob:v1/v2 reads, with ownership-checked conditional cleanup. */
export class BlobPayloadStore extends PayloadStore {
  private readonly _service: BlobServiceClient;
  private readonly _container: ContainerClient;
  private readonly _clientOptions: StoragePipelineOptions & { redirectOptions: { maxRetries: number } };
  private readonly _primaryLocation: AccountLocation;
  private readonly _locations: readonly AccountLocation[];
  private _generation?: object;
  private _initializing?: { promise: Promise<object>; signal?: AbortSignal };

  constructor(private readonly _options: BlobPayloadStoreOptions) {
    super();
    const containerName = _options.containerName ?? "durabletask-payloads";
    if (!containerName) throw new TypeError("containerName must not be empty.");
    if (
      _options.allowAllContainersInConfiguredAccount !== undefined &&
      typeof _options.allowAllContainersInConfiguredAccount !== "boolean"
    ) {
      throw new TypeError("allowAllContainersInConfiguredAccount must be a boolean.");
    }
    const retryOptions = _options.clientOptions?.retryOptions;
    this._clientOptions = {
      ..._options.clientOptions,
      redirectOptions: { maxRetries: 0 },
      retryOptions: {
        ...retryOptions,
        maxTries: retryOptions?.maxTries ?? 9,
        retryDelayInMs: retryOptions?.retryDelayInMs ?? 250,
        maxRetryDelayInMs: retryOptions?.maxRetryDelayInMs ?? 10000,
        tryTimeoutInMs: retryOptions?.tryTimeoutInMs ?? 120000,
      },
    };
    if (_options.accountUri && _options.credential) {
      this._service = new BlobServiceClient(
        String(_options.accountUri),
        newPipeline(_options.credential, this._clientOptions),
      );
    } else if (_options.connectionString) {
      const parsed = BlobServiceClient.fromConnectionString(_options.connectionString);
      this._service = new BlobServiceClient(parsed.url, newPipeline(parsed.credential, this._clientOptions));
    } else {
      throw new TypeError("Provide connectionString or both accountUri and credential.");
    }
    this._container = this._service.getContainerClient(containerName);
    this._primaryLocation = {
      service: this._service,
      endpoint: new URL(this._service.url),
      accountWide: _options.allowAllContainersInConfiguredAccount ?? false,
    };
    const primary = this._primaryLocation;
    const additional = new Map<string, AccountLocation>();
    for (const value of _options.additionalAccountUris ?? []) {
      if (!_options.accountUri || !_options.credential) {
        throw new TypeError("additionalAccountUris requires accountUri and a TokenCredential.");
      }
      let endpoint: URL;
      try {
        endpoint = new URL(String(value));
      } catch (error) {
        throw new TypeError("additionalAccountUris must contain valid absolute account endpoints.", { cause: error });
      }
      if (
        endpoint.protocol !== "https:" ||
        endpoint.hostname.includes("*") ||
        endpoint.username ||
        endpoint.password ||
        endpoint.search ||
        endpoint.hash
      ) {
        throw new TypeError(
          "additionalAccountUris must contain HTTPS account endpoints without credentials, query, or fragment.",
        );
      }
      endpoint.pathname = trimTrailingSlashes(endpoint.pathname) || "/";
      if (
        endpoint.origin === primary.endpoint.origin &&
        trimTrailingSlashes(endpoint.pathname) === trimTrailingSlashes(primary.endpoint.pathname)
      ) {
        throw new TypeError("Use allowAllContainersInConfiguredAccount to configure access to the primary account.");
      }
      if (additional.has(endpoint.href)) continue;
      const service = new BlobServiceClient(
        endpoint.href,
        newPipeline(_options.credential, {
          ...this._clientOptions,
          // A primary account's secondary endpoint does not belong to an additional account.
          retryOptions: { ...this._clientOptions.retryOptions, secondaryHost: undefined },
        }),
      );
      const probe = new BlobClient(service.getContainerClient("dts-scope-check").getBlobClient("probe").url);
      if (
        probe.containerName !== "dts-scope-check" ||
        probe.name !== "probe" ||
        probe.accountName !== service.accountName
      ) {
        throw new TypeError(
          "additionalAccountUris must identify SDK-recognized account service endpoints, not containers or blobs.",
        );
      }
      additional.set(endpoint.href, {
        endpoint,
        accountWide: true,
        service,
      });
    }
    this._locations = [primary, ...additional.values()].sort(
      (a, b) => b.endpoint.pathname.length - a.endpoint.pathname.length,
    );
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
      throwIfSecondaryNotFound(error, blob.url);
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
      throwIfSecondaryNotFound(error, blob.url);
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
      if (separator < 1 || separator === rest.length - 1) {
        throw new TypeError("Invalid external payload token.");
      }
      const containerName = rest.slice(0, separator);
      const primary = this._primaryLocation;
      if (!primary.accountWide && containerName !== this._container.containerName) {
        throw new TypeError("Invalid external payload token or token container does not match.");
      }
      const blob = this._service.getContainerClient(containerName).getBlobClient(rest.slice(separator + 1));
      this._validateBlobUrl(new URL(blob.url), primary, containerName);
      return blob;
    }
    if (!token.startsWith("blob:v2:")) throw new TypeError("Invalid external payload token.");
    const value = token.slice("blob:v2:".length).split(/[?#]/, 1)[0];
    if (/\/(?:\.|%2e){1,2}(?=\/|$)/i.test(value)) {
      throw new PayloadStorageException("The payload blob URL must not contain dot-segment traversal.");
    }
    let url: URL;
    try {
      url = new URL(token.slice("blob:v2:".length));
    } catch (error) {
      throw new TypeError("Invalid external payload blob URL.", { cause: error });
    }
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) {
      throw new TypeError("Invalid external payload blob URL.");
    }
    url.search = "";
    url.hash = "";
    const location = this._locations.find((candidate) => this._relativeBlobPath(url, candidate) !== undefined);
    if (!location) throw new PayloadStorageException("The payload blob URL is outside the configured access scope.");
    const relative = this._relativeBlobPath(url, location)!;
    const separator = relative.indexOf("/");
    if (separator < 1 || separator === relative.length - 1) throw new TypeError("Invalid external payload blob URL.");
    this._validateBlobUrl(url, location);
    const containerName = decodeURIComponent(relative.slice(0, separator));
    const name = decodeURIComponent(relative.slice(separator + 1));
    const blob = location.service.getContainerClient(containerName).getBlobClient(name);
    // Decoding an escaped blob name can introduce path traversal during SDK normalization.
    this._validateBlobUrl(new URL(blob.url), location, containerName);
    return blob;
  }

  private _relativeBlobPath(url: URL, location: AccountLocation): string | undefined {
    const prefix = trimTrailingSlashes(location.endpoint.pathname) + "/";
    if (url.origin === location.endpoint.origin && url.pathname.startsWith(prefix)) {
      return url.pathname.slice(prefix.length);
    }
    return undefined;
  }

  private _validateBlobUrl(url: URL, location: AccountLocation, selectedContainer?: string): void {
    const relative = this._relativeBlobPath(url, location);
    const separator = relative?.indexOf("/") ?? -1;
    if (
      relative === undefined ||
      separator < 1 ||
      separator === relative.length - 1 ||
      (selectedContainer !== undefined && relative.slice(0, separator) !== selectedContainer) ||
      (!location.accountWide && relative.slice(0, separator) !== this._container.containerName)
    ) {
      throw new PayloadStorageException("The payload blob URL is outside the configured access scope.");
    }
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

function trimTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === 47) end--;
  return value.slice(0, end);
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

function throwIfSecondaryNotFound(error: unknown, primaryUrl: string): void {
  if (
    error instanceof RestError &&
    error.statusCode === 404 &&
    error.request &&
    new URL(error.request.url).host !== new URL(primaryUrl).host
  ) {
    throw Object.assign(
      new RestError("A secondary response did not confirm whether the primary payload exists.", {
        code: RestError.REQUEST_SEND_ERROR,
      }),
      { cause: error },
    );
  }
}
