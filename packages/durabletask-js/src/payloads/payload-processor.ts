// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import * as pb from "../proto/orchestrator_service_pb";
import { newFailureDetails } from "../utils/pb-helper.util";
import { PayloadStorageException, PayloadStorageOptions } from "./payload-store";
import { runBounded } from "./run-bounded";

/** Explicit protobuf field mapping, aligned with the .NET AzureBlobPayloads SideCar interceptor. */
export class PayloadProcessor {
  private readonly _threshold: number;
  private readonly _maximum: number;

  constructor(private readonly _options: PayloadStorageOptions) {
    this._threshold = _options.thresholdBytes ?? 256 * 1024;
    this._maximum = _options.maxPayloadBytes ?? 10 * 1024 * 1024;
    if (!Number.isSafeInteger(this._threshold) || this._threshold < 0 || this._threshold > 1024 * 1024) {
      throw new RangeError("thresholdBytes must be an integer between 0 and 1 MiB.");
    }
    if (!Number.isSafeInteger(this._maximum) || this._maximum <= 0) {
      throw new RangeError("maxPayloadBytes must be a positive safe integer.");
    }
    if (!_options.store) throw new TypeError("A payload store is required.");
  }

  async externalize(message: unknown, signal?: AbortSignal): Promise<void> {
    const fields: (StringValue | undefined)[] = [];
    if (
      message instanceof pb.CreateInstanceRequest ||
      message instanceof pb.RaiseEventRequest ||
      message instanceof pb.SignalEntityRequest
    ) {
      fields.push(message.getInput());
    } else if (message instanceof pb.TerminateRequest) {
      fields.push(message.getOutput());
    } else if (
      message instanceof pb.SuspendRequest ||
      message instanceof pb.ResumeRequest ||
      message instanceof pb.RewindInstanceRequest
    ) {
      fields.push(message.getReason());
    } else if (message instanceof pb.ActivityResponse) {
      fields.push(message.getResult());
    } else if (message instanceof pb.OrchestratorResponse) {
      fields.push(message.getCustomstatus());
      for (const action of message.getActionsList()) {
        fields.push(
          action.getScheduletask()?.getInput(),
          action.getCreatesuborchestration()?.getInput(),
          action.getCompleteorchestration()?.getResult(),
          action.getCompleteorchestration()?.getDetails(),
          action.getTerminateorchestration()?.getReason(),
          action.getSendevent()?.getData(),
          action.getSendentitymessage()?.getEntityoperationsignaled()?.getInput(),
          action.getSendentitymessage()?.getEntityoperationcalled()?.getInput(),
        );
        for (const event of action.getRewindorchestration()?.getNewhistoryList() ?? []) {
          this._historyFields(event, fields);
        }
      }
    } else if (message instanceof pb.EntityBatchResult) {
      fields.push(message.getEntitystate());
      for (const result of message.getResultsList()) fields.push(result.getSuccess()?.getResult());
      for (const action of message.getActionsList()) {
        fields.push(action.getSendsignal()?.getInput(), action.getStartneworchestration()?.getInput());
      }
    } else if (message instanceof pb.EntityBatchRequest) {
      fields.push(message.getEntitystate());
      for (const operation of message.getOperationsList()) fields.push(operation.getInput());
    } else if (message instanceof pb.EntityRequest) {
      fields.push(message.getEntitystate());
    }
    const operations: (() => Promise<void>)[] = [];
    for (const field of fields) {
      const value = field?.getValue();
      if (!field || !value) continue;
      const size = Buffer.byteLength(value, "utf8");
      if (size < this._threshold) continue;
      operations.push(async () => {
        if (size > this._maximum) {
          throw new PayloadStorageException(
            `Payload size ${size} bytes exceeds the configured maximum of ${this._maximum} bytes.`,
          );
        }
        field.setValue(await this._options.store.upload(value, signal));
      });
    }
    try {
      await runBounded(operations, signal);
    } catch (error) {
      if (
        !isPermanentStorageFailure(error) ||
        !(message instanceof pb.ActivityResponse || message instanceof pb.OrchestratorResponse)
      )
        throw error;
      const details = newFailureDetails(error);
      details.setIsnonretriable(true);
      if (message instanceof pb.ActivityResponse) {
        message.clearResult();
        message.setFailuredetails(details);
      } else {
        message.clearCustomstatus();
        message.setIspartial(false);
        message.clearChunkindex();
        message.setActionsList([
          new pb.OrchestratorAction().setCompleteorchestration(
            new pb.CompleteOrchestrationAction()
              .setOrchestrationstatus(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED)
              .setFailuredetails(details),
          ),
        ]);
      }
    }
  }

  async resolve(message: unknown, signal?: AbortSignal): Promise<void> {
    const fields: (StringValue | undefined)[] = [];
    this._responseFields(message, fields);
    const operations: (() => Promise<void>)[] = [];
    for (const field of fields) {
      const value = field?.getValue();
      if (field && value && this._options.store.isKnownPayloadToken(value)) {
        operations.push(async () => {
          field.setValue(await this._options.store.download(value, signal));
        });
      }
    }
    await runBounded(operations, signal);
  }

  private _responseFields(message: unknown, fields: (StringValue | undefined)[]): void {
    if (message instanceof pb.GetInstanceResponse) {
      this._stateFields(message.getOrchestrationstate(), fields);
    } else if (message instanceof pb.QueryInstancesResponse) {
      for (const state of message.getOrchestrationstateList()) this._stateFields(state, fields);
    } else if (message instanceof pb.HistoryChunk) {
      for (const event of message.getEventsList()) this._historyFields(event, fields);
    } else if (message instanceof pb.GetEntityResponse) {
      fields.push(message.getEntity()?.getSerializedstate());
    } else if (message instanceof pb.QueryEntitiesResponse) {
      for (const entity of message.getEntitiesList()) fields.push(entity.getSerializedstate());
    } else if (message instanceof pb.WorkItem) {
      this._responseFields(message.getActivityrequest(), fields);
      this._responseFields(message.getOrchestratorrequest(), fields);
      this._responseFields(message.getEntityrequest(), fields);
      this._responseFields(message.getEntityrequestv2(), fields);
    } else if (message instanceof pb.ActivityRequest) {
      fields.push(message.getInput());
    } else if (message instanceof pb.OrchestratorRequest) {
      for (const event of [...message.getPasteventsList(), ...message.getNeweventsList()]) {
        this._historyFields(event, fields);
      }
    } else if (message instanceof pb.EntityBatchRequest) {
      fields.push(message.getEntitystate());
      for (const operation of message.getOperationsList()) fields.push(operation.getInput());
    } else if (message instanceof pb.EntityRequest) {
      fields.push(message.getEntitystate());
      for (const event of message.getOperationrequestsList()) this._historyFields(event, fields);
    }
  }

  private _stateFields(state: pb.OrchestrationState | undefined, fields: (StringValue | undefined)[]): void {
    if (state) fields.push(state.getInput(), state.getOutput(), state.getCustomstatus());
  }

  private _historyFields(event: pb.HistoryEvent, fields: (StringValue | undefined)[]): void {
    fields.push(
      event.getExecutionstarted()?.getInput(),
      event.getExecutioncompleted()?.getResult(),
      event.getExecutionterminated()?.getInput(),
      event.getTaskscheduled()?.getInput(),
      event.getTaskcompleted()?.getResult(),
      event.getSuborchestrationinstancecreated()?.getInput(),
      event.getSuborchestrationinstancecompleted()?.getResult(),
      event.getEventsent()?.getInput(),
      event.getEventraised()?.getInput(),
      event.getGenericevent()?.getData(),
      event.getContinueasnew()?.getInput(),
      event.getExecutionsuspended()?.getInput(),
      event.getExecutionresumed()?.getInput(),
      event.getExecutionrewound()?.getReason(),
      event.getEntityoperationsignaled()?.getInput(),
      event.getEntityoperationcalled()?.getInput(),
      event.getEntityoperationcompleted()?.getOutput(),
    );
    this._stateFields(event.getHistorystate()?.getOrchestrationstate(), fields);
  }
}

export function isPermanentStorageFailure(error: unknown): error is Error {
  if (error instanceof PayloadStorageException) return true;
  if (!(error instanceof Error) || !("statusCode" in error)) return false;
  const status = error.statusCode;
  return typeof status === "number" && status >= 400 && status < 500 && status !== 408 && status !== 429;
}
