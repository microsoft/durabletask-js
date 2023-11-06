import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import { Timestamp } from "google-protobuf/google/protobuf/timestamp_pb";
import * as pb from "./proto/orchestrator_service_pb";
import * as stubs from "./proto/orchestrator_service_grpc_pb";
import { TOrchestrator } from "./types/orchestrator.type";
import { TInput } from "./types/input.type";
import { TOutput } from "./types/output.type";
import { getName } from "./task";
import { randomUUID } from "crypto";
import { promisify } from "util";
import { newOrchestrationState } from "./orchestration";
import { OrchestrationState } from "./orchestration/orchestration-state";
import { GrpcClient } from "./client-grpc";
import { OrchestrationStatus } from "./orchestration/enum/orchestration-status.enum";
import { TimeoutError } from "./exception/timeout-error";

export class TaskHubGrpcClient {
  private _stub: stubs.TaskHubSidecarServiceClient;

  constructor(hostAddress: string) {
    this._stub = new GrpcClient(hostAddress).stub;
  }

  async stop(): Promise<void> {
    await this._stub.close();

    // Wait a bit to let the async operations finish
    // https://github.com/grpc/grpc-node/issues/1563#issuecomment-829483711
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  async scheduleNewOrchestration(
    orchestrator: TOrchestrator,
    input?: TInput,
    instanceId?: string,
    startAt?: Date,
  ): Promise<string> {
    const name = getName(orchestrator);

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
}
