import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import { Timestamp } from "google-protobuf/google/protobuf/timestamp_pb";
import * as pb from "../proto/orchestrator_service_pb";
import * as stubs from "../proto/orchestrator_service_grpc_pb";
import { TOrchestrator } from "../types/orchestrator.type";
import { TInput } from "../types/input.type";
import { getName } from "../task";
import { randomUUID } from "crypto";
import { promisify } from "util";
import { newOrchestrationState } from "../orchestration";
import { OrchestrationState } from "../orchestration/orchestration-state";
import { GrpcClient } from "./client-grpc";
import { OrchestrationStatus, toProtobuf } from "../orchestration/enum/orchestration-status.enum";
import { TimeoutError } from "../exception/timeout-error";
import { PurgeResult } from "../orchestration/orchestration-purge-result";
import { PurgeInstanceCriteria } from "../orchestration/orchestration-purge-criteria";
import * as grpc from "@grpc/grpc-js";

export class TaskHubGrpcClient {
  private _stub: stubs.TaskHubSidecarServiceClient;

  constructor(hostAddress?: string, option?: grpc.ChannelOptions) {
    this._stub = new GrpcClient(hostAddress, option).stub;
  }

  async stop(): Promise<void> {
    await this._stub.close();

    // Wait a bit to let the async operations finish
    // https://github.com/grpc/grpc-node/issues/1563#issuecomment-829483711
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  async scheduleNewOrchestration(name: string, input?: TInput, instanceId?: string, startAt?: Date): Promise<string> {
    const req = new pb.CreateInstanceRequest();
    req.setName(name);
    req.setInstanceid(instanceId ?? randomUUID());

    const i = new StringValue();
    i.setValue(JSON.stringify(input));

    const ts = new Timestamp();
    ts.fromDate(new Date(startAt?.getTime() ?? 0));

    req.setInput(i);
    req.setScheduledstarttimestamp(ts);

    console.log(`Starting new ${name} instance with ID = ${req.getInstanceid()}`);

    const prom = promisify(this._stub.startInstance.bind(this._stub));
    const res = (await prom(req)) as pb.CreateInstanceResponse;

    return res.getInstanceid();
  }

  async getOrchestrationState(
    instanceId: string,
    fetchPayloads: boolean = true,
  ): Promise<OrchestrationState | undefined> {
    const req = new pb.GetInstanceRequest();
    req.setInstanceid(instanceId);
    req.setGetinputsandoutputs(fetchPayloads);

    const prom = promisify(this._stub.getInstance.bind(this._stub));
    const res = (await prom(req)) as pb.GetInstanceResponse;

    return newOrchestrationState(req.getInstanceid(), res);
  }

  async waitForOrchestrationStart(
    instanceId: string,
    fetchPayloads: boolean = false,
    timeout: number = 60,
  ): Promise<OrchestrationState | undefined> {
    const req = new pb.GetInstanceRequest();
    req.setInstanceid(instanceId);
    req.setGetinputsandoutputs(fetchPayloads);

    try {
      const prom = promisify(this._stub.waitForInstanceStart.bind(this._stub));

      // Execute the request and wait for the first response or timeout
      const res = (await Promise.race([
        prom(req),
        new Promise((_, reject) => setTimeout(() => reject(new TimeoutError()), timeout * 1000)),
      ])) as pb.GetInstanceResponse;

      return newOrchestrationState(req.getInstanceid(), res);
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  async waitForOrchestrationCompletion(
    instanceId: string,
    fetchPayloads: boolean = true,
    timeout: number = 60,
  ): Promise<OrchestrationState | undefined> {
    const req = new pb.GetInstanceRequest();
    req.setInstanceid(instanceId);
    req.setGetinputsandoutputs(fetchPayloads);

    try {
      console.info(`Waiting ${timeout} seconds for instance ${instanceId} to complete...`);

      const prom = promisify(this._stub.waitForInstanceCompletion.bind(this._stub));

      // Execute the request and wait for the first response or timeout
      const res = (await Promise.race([
        prom(req),
        new Promise((_, reject) => setTimeout(() => reject(new TimeoutError()), timeout * 1000)),
      ])) as pb.GetInstanceResponse;

      const state = newOrchestrationState(req.getInstanceid(), res);

      if (!state) {
        return undefined;
      }

      let details;

      if (state.runtimeStatus === OrchestrationStatus.FAILED && state.failureDetails) {
        details = state.failureDetails;
        console.info(`Instance ${instanceId} failed: [${details.errorType}] ${details.message}`);
      } else if (state.runtimeStatus === OrchestrationStatus.TERMINATED) {
        console.info(`Instance ${instanceId} was terminated`);
      } else if (state.runtimeStatus === OrchestrationStatus.COMPLETED) {
        console.info(`Instance ${instanceId} completed`);
      }

      return state;
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  async raiseOrchestrationEvent(instanceId: string, eventName: string, data: any = null): Promise<void> {
    const req = new pb.RaiseEventRequest();
    req.setInstanceid(instanceId);
    req.setName(eventName);

    const i = new StringValue();
    i.setValue(JSON.stringify(data));

    req.setInput(i);

    console.log(`Raising event '${eventName}' for instance '${instanceId}'`);

    const prom = promisify(this._stub.raiseEvent.bind(this._stub));
    await prom(req);
  }

  async terminateOrchestration(instanceId: string, output: any = null): Promise<void> {
    const req = new pb.TerminateRequest();
    req.setInstanceid(instanceId);

    const i = new StringValue();
    i.setValue(JSON.stringify(output));

    req.setOutput(i);

    console.log(`Terminating '${instanceId}'`);

    const prom = promisify(this._stub.terminateInstance.bind(this._stub));
    await prom(req);
  }

  async suspendOrchestration(instanceId: string): Promise<void> {
    const req = new pb.SuspendRequest();
    req.setInstanceid(instanceId);

    console.log(`Suspending '${instanceId}'`);

    const prom = promisify(this._stub.suspendInstance.bind(this._stub));
    await prom(req);
  }

  async resumeOrchestration(instanceId: string): Promise<void> {
    const req = new pb.ResumeRequest();
    req.setInstanceid(instanceId);

    console.log(`Resuming '${instanceId}'`);

    const prom = promisify(this._stub.resumeInstance.bind(this._stub));
    await prom(req);
  }

  /**
   * Purges orchestration instance metadata from the durable store.
   *
   * This method can be used to permanently delete orchestration metadata from the underlying storage provider,
   * including any stored inputs, outputs, and orchestration history records. This is often useful for implementing
   * data retention policies and for keeping storage costs minimal. Only orchestration instances in the
   * `Completed`, `Failed`, or `Terminated` state can be purged.
   *
   * If the target orchestration instance is not found in the data store, or if the instance is found but not in a
   * terminal state, then the returned {@link PurgeResult} will report that zero instances were purged.
   * Otherwise, the existing data will be purged, and the returned {@link PurgeResult} will report that one instance
   * was purged.
   *
   * @param value - The unique ID of the orchestration instance to purge or orchestration instance filter criteria used
   * to determine which instances to purge.
   * @returns A Promise that resolves to a {@link PurgeResult} or `undefined` if the purge operation was not successful.
   */
  async purgeOrchestration(value: string | PurgeInstanceCriteria): Promise<PurgeResult | undefined> {
    let res;
    if (typeof value === `string`) {
      const instanceId = value;
      const req = new pb.PurgeInstancesRequest();
      req.setInstanceid(instanceId);

      console.log(`Purging Instance '${instanceId}'`);

      const prom = promisify(this._stub.purgeInstances.bind(this._stub));
      res = (await prom(req)) as pb.PurgeInstancesResponse;
    } else {
      const purgeInstanceCriteria = value;
      const req = new pb.PurgeInstancesRequest();
      const filter = new pb.PurgeInstanceFilter();
      const createdTimeFrom = purgeInstanceCriteria.getCreatedTimeFrom();
      if (createdTimeFrom != undefined) {
        const timestamp = new Timestamp();
        timestamp.fromDate(createdTimeFrom);
        filter.setCreatedtimefrom(timestamp);
      }
      const createdTimeTo = purgeInstanceCriteria.getCreatedTimeTo();
      if (createdTimeTo != undefined) {
        const timestamp = new Timestamp();
        timestamp.fromDate(createdTimeTo);
        filter.setCreatedtimeto(timestamp);
      }
      const runtimeStatusList = purgeInstanceCriteria.getRuntimeStatusList();
      for (const status of runtimeStatusList) {
        filter.addRuntimestatus(toProtobuf(status));
      }
      req.setPurgeinstancefilter(filter);
      const timeout = purgeInstanceCriteria.getTimeout();

      console.log("Purging Instance using purging criteria");

      const prom = promisify(this._stub.purgeInstances.bind(this._stub));
      // Execute the request and wait for the first response or timeout
      res = (await Promise.race([
        prom(req),
        new Promise((_, reject) => setTimeout(() => reject(new TimeoutError()), timeout)),
      ])) as pb.PurgeInstancesResponse;
    }
    if (!res) {
      return;
    }
    return new PurgeResult(res.getDeletedinstancecount());
  }
}
