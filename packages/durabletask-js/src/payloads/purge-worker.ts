// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import * as lp from "../proto/large_payload_purge_pb";
import { LargePayloadPurgeService } from "../proto/large_payload_purge_grpc_pb";
import { Registry } from "../worker/registry";
import { WorkItemFilters } from "../worker/work-item-filters";
import { Logger } from "../types/logger.type";
import { getMetadata, MetadataGenerator } from "../utils/grpc-helper.util";
import { InvalidPayloadTokenError, PayloadStore, PayloadDeleteOutcome, PayloadStorageException } from "./payload-store";
import { runBounded } from "./run-bounded";
import { callPayloadPurge } from "./purge-transport";
import {
  BlobPurgeConstants,
  BlobPurgeOutcome,
  LargePayloadPurgeDisposition,
  LargePayloadPurgeResult,
  validatePurgeBatchSize,
} from "./purge";
import { blobPurgeJobOrchestrator } from "./purge-orchestrator";

const wireDispositions: Record<LargePayloadPurgeDisposition, lp.LargePayloadPurgeDisposition> = {
  [LargePayloadPurgeDisposition.Unspecified]:
    lp.LargePayloadPurgeDisposition.LARGE_PAYLOAD_PURGE_DISPOSITION_UNSPECIFIED,
  [LargePayloadPurgeDisposition.Deleted]: lp.LargePayloadPurgeDisposition.LARGE_PAYLOAD_PURGE_DISPOSITION_DELETED,
  [LargePayloadPurgeDisposition.Retry]: lp.LargePayloadPurgeDisposition.LARGE_PAYLOAD_PURGE_DISPOSITION_RETRY,
  [LargePayloadPurgeDisposition.Quarantined]:
    lp.LargePayloadPurgeDisposition.LARGE_PAYLOAD_PURGE_DISPOSITION_QUARANTINED,
};

export function registerPayloadPurge(
  registry: Registry,
  store: PayloadStore,
  getClient: () => grpc.Client,
  metadataGenerator: MetadataGenerator | undefined,
  getSignal: () => AbortSignal | undefined,
  logger: Logger,
): void {
  registry.addNamedOrchestrator(BlobPurgeConstants.orchestrator, (ctx, input) =>
    blobPurgeJobOrchestrator(ctx, input, logger),
  );
  registry.addNamedActivity(BlobPurgeConstants.fetch, async (_ctx, limit: number) => {
    validatePurgeBatchSize(limit);
    const signal = getSignal();
    const metadata = metadataGenerator ? await getMetadata(metadataGenerator, signal) : undefined;
    const client = getClient();
    let response: lp.GetLargePayloadTombstonesResponse;
    try {
      response = await callPayloadPurge(
        client,
        LargePayloadPurgeService.getLargePayloadTombstones,
        new lp.GetLargePayloadTombstonesRequest().setLimit(limit),
        metadata ? async () => metadata : undefined,
        signal,
        new Date(Date.now() + 60000),
      );
    } catch (error) {
      signal?.throwIfAborted();
      if (grpcStatus(error) === grpc.status.FAILED_PRECONDITION) {
        logger.info("Large payload purge fetch precondition not met; idling.");
        return [];
      }
      if (grpcStatus(error) === grpc.status.UNIMPLEMENTED) throw unsupportedBackend(error);
      throw error;
    }
    return response.getTombstonesList().map((t) => ({
      TombstoneToken: t.getTombstoneToken(),
      PayloadToken: t.getPayloadToken(),
    }));
  });
  registry.addNamedActivity(BlobPurgeConstants.delete, async (_ctx, tokens: string[]) =>
    deletePayloadChunk(store, tokens, logger, getSignal()),
  );
  registry.addNamedActivity(BlobPurgeConstants.report, async (_ctx, results: LargePayloadPurgeResult[]) => {
    if (!results?.length) return null;
    const request = new lp.ReportLargePayloadPurgeResultsRequest().setResultsList(
      results.map((r) => {
        const disposition = wireDispositions[r.Disposition];
        if (disposition === undefined) throw new TypeError("Unknown large-payload purge disposition.");
        return new lp.LargePayloadPurgeResult().setTombstoneToken(r.TombstoneToken).setDisposition(disposition);
      }),
    );
    const signal = getSignal();
    const metadata = metadataGenerator ? await getMetadata(metadataGenerator, signal) : undefined;
    const client = getClient();
    try {
      await callPayloadPurge(
        client,
        LargePayloadPurgeService.reportLargePayloadPurgeResults,
        request,
        metadata ? async () => metadata : undefined,
        signal,
        new Date(Date.now() + 60000),
      );
    } catch (error) {
      signal?.throwIfAborted();
      if (grpcStatus(error) === grpc.status.UNIMPLEMENTED) throw unsupportedBackend(error);
      throw error;
    }
    return null;
  });
}

export async function deletePayloadChunk(
  store: PayloadStore,
  tokens: string[],
  logger: Logger,
  signal?: AbortSignal,
): Promise<BlobPurgeOutcome[]> {
  signal?.throwIfAborted();
  const outcomes: BlobPurgeOutcome[] = new Array(tokens.length);
  await runBounded(
    tokens.map((token, index) => async () => {
      outcomes[index] = { Disposition: await deletePayload(store, token, logger, signal) };
    }),
    signal,
  );
  signal?.throwIfAborted();
  return outcomes;
}

async function deletePayload(
  store: PayloadStore,
  token: string,
  logger: Logger,
  signal?: AbortSignal,
): Promise<LargePayloadPurgeDisposition> {
  signal?.throwIfAborted();
  const classify = (disposition: LargePayloadPurgeDisposition, reason: string) => {
    logger.warn(`Large payload purge: ${reason}; disposition=${disposition}.`);
    return disposition;
  };
  if (token.startsWith("blob:v1:")) return classify(LargePayloadPurgeDisposition.Quarantined, "LegacyV1Token");
  if (!token.startsWith("blob:v2:")) return classify(LargePayloadPurgeDisposition.Retry, "UnsupportedTokenVersion");
  let url: URL;
  try {
    url = new URL(token.slice("blob:v2:".length));
  } catch {
    return classify(LargePayloadPurgeDisposition.Quarantined, "MalformedToken");
  }
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username ||
    url.password ||
    !/^\/[^/]+\/.+/.test(url.pathname)
  ) {
    return classify(LargePayloadPurgeDisposition.Quarantined, "MalformedToken");
  }
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), 60000);
  timer.unref();
  try {
    const deleteSignal = signal ? AbortSignal.any([signal, timeout.signal]) : timeout.signal;
    const outcome = await store.delete(token, deleteSignal);
    signal?.throwIfAborted();
    switch (outcome) {
      case PayloadDeleteOutcome.Deleted:
      case PayloadDeleteOutcome.AlreadyAbsent:
        return LargePayloadPurgeDisposition.Deleted;
      case PayloadDeleteOutcome.NotStoreOwned:
        logger.info("Large payload purge: NotStoreOwned; blob left untouched.");
        return LargePayloadPurgeDisposition.Deleted;
      default:
        return classify(LargePayloadPurgeDisposition.Retry, "UnexpectedDeleteOutcome");
    }
  } catch (error) {
    signal?.throwIfAborted();
    if (error instanceof InvalidPayloadTokenError)
      return classify(LargePayloadPurgeDisposition.Quarantined, "MalformedToken");
    if (error instanceof PayloadStorageException)
      return classify(LargePayloadPurgeDisposition.Retry, "StorageAccountUnreachable");
    const status = error !== null && typeof error === "object" && "statusCode" in error ? error.statusCode : undefined;
    if (status === 400) return classify(LargePayloadPurgeDisposition.Quarantined, "InvalidStorageRequest");
    if (status === 401 || status === 403)
      return classify(LargePayloadPurgeDisposition.Retry, "StorageAuthorizationFailed");
    return classify(LargePayloadPurgeDisposition.Retry, "UnconfirmedDelete");
  } finally {
    clearTimeout(timer);
  }
}

export function isPayloadPurgeTask(name?: string): boolean {
  return (
    name === BlobPurgeConstants.orchestrator ||
    name === BlobPurgeConstants.fetch ||
    name === BlobPurgeConstants.delete ||
    name === BlobPurgeConstants.report
  );
}

export function withPayloadPurgeFilters(filters: WorkItemFilters): WorkItemFilters {
  if (!(filters.orchestrations?.length || filters.activities?.length || filters.entities?.length)) return filters;
  return {
    ...filters,
    orchestrations: [
      ...(filters.orchestrations ?? []).filter((f) => f.name !== BlobPurgeConstants.orchestrator),
      { name: BlobPurgeConstants.orchestrator, versions: [] },
    ],
    activities: [
      ...(filters.activities ?? []).filter((f) => !isPayloadPurgeTask(f.name)),
      ...[BlobPurgeConstants.fetch, BlobPurgeConstants.delete, BlobPurgeConstants.report].map((name) => ({
        name,
        versions: [],
      })),
    ],
  };
}

function grpcStatus(error: unknown): unknown {
  return error !== null && typeof error === "object" && "code" in error ? error.code : undefined;
}

function unsupportedBackend(cause: unknown): Error {
  const error = new Error(
    "The backend does not implement large-payload auto-purge. Upgrade the backend or DTS emulator, then enable auto-purge again.",
    { cause },
  );
  error.name = "System.NotImplementedException";
  return error;
}
