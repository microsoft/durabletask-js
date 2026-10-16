// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { OrchestrationContext } from "../task/context/orchestration-context";
import { Task } from "../task/task";
import { whenAll, whenAny } from "../task";
import { RetryPolicy } from "../task/retry/retry-policy";
import { TaskFailureDetails } from "../task/failure-details";
import { TaskFailedError } from "../task/exception/task-failed-error";
import { Logger, ConsoleLogger } from "../types/logger.type";

export const BlobPurgeConstants = {
  orchestrator: "BlobPurgeJobOrchestrator",
  instanceId: "BlobPurgeJob-__dt_blob_payload_autopurge__",
  fetch: "GetLargePayloadTombstonesActivity",
  delete: "DeleteExternalBlobActivity",
  report: "ReportLargePayloadPurgeResultsActivity",
  configurationEvent: "SetBatchSize",
} as const;

export enum LargePayloadPurgeDisposition {
  Unspecified = 0,
  Deleted = 1,
  Retry = 2,
  Quarantined = 3,
}

// These activity/orchestration wire shapes intentionally retain .NET's default JSON property casing.
export interface LargePayloadTombstone {
  TombstoneToken: string;
  PayloadToken: string;
}
export interface LargePayloadPurgeResult {
  TombstoneToken: string;
  Disposition: LargePayloadPurgeDisposition;
}
export interface BlobPurgeOutcome {
  Disposition: LargePayloadPurgeDisposition;
}
export interface BlobPurgeJobRunRequest {
  PurgeBatchSize: number;
  PurgedCount: number;
}

export function validatePurgeBatchSize(batchSize: number): void {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1000) {
    throw new RangeError("Purge batch size must be an integer between 1 and 1000.");
  }
}

export function isUnsupportedPurgeFailure(failure: TaskFailureDetails): boolean {
  for (let current: TaskFailureDetails | undefined = failure; current; current = current.innerFailure) {
    if (current.errorType === "System.NotImplementedException" || current.errorType === "NotImplementedException")
      return true;
  }
  return false;
}

const retry = new RetryPolicy({
  maxNumberOfAttempts: 3,
  firstRetryIntervalInMilliseconds: 15000,
  backoffCoefficient: 2,
  maxRetryIntervalInMilliseconds: 60000,
  handleFailure: (failure) => !isUnsupportedPurgeFailure(failure),
});
const taskOptions = { retry, version: "" };

export async function* blobPurgeJobOrchestrator(
  context: OrchestrationContext,
  input: BlobPurgeJobRunRequest,
  logger: Logger = new ConsoleLogger(),
): AsyncGenerator<Task<any>, void, any> {
  validatePurgeBatchSize(input.PurgeBatchSize);
  const replayLogger = context.createReplaySafeLogger(logger);
  let batchSize = input.PurgeBatchSize;
  let purgedCount = input.PurgedCount ?? 0;
  let cycles = 0;
  let configuration = context.waitForExternalEvent(BlobPurgeConstants.configurationEvent);
  for (;;) {
    // CAN cannot preserve a configuration already delivered to this waiter.
    while (configuration.isComplete) {
      batchSize = configuration.getResult();
      validatePurgeBatchSize(batchSize);
      configuration = context.waitForExternalEvent(BlobPurgeConstants.configurationEvent);
    }
    if (cycles >= 5) {
      context.continueAsNew({ PurgeBatchSize: batchSize, PurgedCount: purgedCount }, true);
      return;
    }
    context.setCustomStatus({ Status: "Running", BatchSize: batchSize, PurgedCount: purgedCount });
    cycles++;
    let wait = false;
    try {
      const tombstones: LargePayloadTombstone[] = yield context.callActivity(
        BlobPurgeConstants.fetch,
        batchSize,
        taskOptions,
      );
      if (!tombstones?.length) {
        wait = true;
      } else {
        const results: LargePayloadPurgeResult[] = [];
        for (let start = 0; start < tombstones.length; start += 50 * 4) {
          const chunks: LargePayloadTombstone[][] = [];
          const tasks: Task<BlobPurgeOutcome[]>[] = [];
          for (let index = start; index < Math.min(start + 50 * 4, tombstones.length); index += 50) {
            const chunk = tombstones.slice(index, index + 50);
            chunks.push(chunk);
            tasks.push(
              context.callActivity(
                BlobPurgeConstants.delete,
                chunk.map((t) => t.PayloadToken),
                taskOptions,
              ),
            );
          }
          const outcomes: BlobPurgeOutcome[][] = yield whenAll(tasks);
          for (let index = 0; index < chunks.length; index++) {
            const chunk = chunks[index];
            if (!outcomes[index] || outcomes[index].length !== chunk.length) {
              throw new Error("The blob delete activity must return exactly one outcome per token.");
            }
            results.push(
              ...chunk.map((tombstone, position) => ({
                TombstoneToken: tombstone.TombstoneToken,
                Disposition: outcomes[index][position].Disposition,
              })),
            );
          }
        }
        yield context.callActivity(BlobPurgeConstants.report, results, taskOptions);
        purgedCount += results.filter((r) => r.Disposition === LargePayloadPurgeDisposition.Deleted).length;
        wait = results.every((r) => r.Disposition === LargePayloadPurgeDisposition.Retry);
      }
    } catch (error) {
      if (error instanceof TaskFailedError && isUnsupportedPurgeFailure(error.details)) {
        replayLogger.warn("Large payload auto-purge backend unsupported; waiting for explicit configuration.");
        context.setCustomStatus({ Status: "BackendUnsupported", BatchSize: batchSize, PurgedCount: purgedCount });
        yield configuration;
      } else {
        replayLogger.error("Large payload auto-purge cycle failed; backing off before another attempt.");
        wait = true;
      }
    }
    if (wait && !configuration.isComplete) {
      context.setCustomStatus({ Status: "Waiting", BatchSize: batchSize, PurgedCount: purgedCount });
      const timer = context.createTimer(new Date(context.currentUtcDateTime.getTime() + 60000));
      yield whenAny([timer, configuration]);
      if (!timer.isComplete) timer.cancel();
    }
  }
}
