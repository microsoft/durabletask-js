// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/** Confirmed results of a conditional, ownership-checked payload deletion. */
export enum PayloadDeleteOutcome {
  Unspecified = 0,
  Deleted = 1,
  AlreadyAbsent = 2,
  NotStoreOwned = 3,
}

/** Out-of-band storage for serialized UTF-8 payloads. Implementations must honor cancellation. */
export abstract class PayloadStore {
  abstract upload(payload: string, signal?: AbortSignal): Promise<string>;
  abstract download(token: string, signal?: AbortSignal): Promise<string>;
  abstract isKnownPayloadToken(value: string): boolean;

  /** Optional cleanup support. Never delete a blob without verifying ownership and its ETag. */
  async delete(_token: string, _signal?: AbortSignal): Promise<PayloadDeleteOutcome> {
    throw new Error("This payload store does not support deletion.");
  }
}

/** A permanent payload storage or size-limit failure. */
export class PayloadStorageException extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PayloadStorageException";
  }
}

/** Opt-in payload externalization. Configure the same store on all clients and workers. */
export interface PayloadStorageOptions {
  store: PayloadStore;
  /** Inclusive serialized UTF-8 size threshold. Defaults to 256 KiB; maximum 1 MiB. */
  thresholdBytes?: number;
  /** Maximum serialized size of one externalized payload. Defaults to 10 MiB. */
  maxPayloadBytes?: number;
}
