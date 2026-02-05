// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { randomUUID } from "crypto";
import { getName } from "../task";
import { TOrchestrator } from "../types/orchestrator.type";
import { TInput } from "../types/input.type";
import { OrchestrationState } from "../orchestration/orchestration-state";
import { FailureDetails } from "../task/failure-details";
import { InMemoryOrchestrationBackend, OrchestrationInstance } from "./in-memory-backend";
import * as pb from "../proto/orchestrator_service_pb";

/**
 * Client for scheduling and managing orchestrations in the in-memory backend.
 * 
 * This client provides a similar API to TaskHubGrpcClient but operates
 * entirely in-memory for testing purposes.
 */
export class TestOrchestrationClient {
  constructor(private readonly backend: InMemoryOrchestrationBackend) {}

  /**
   * Schedules a new orchestration.
   */
  async scheduleNewOrchestration(
    orchestrator: TOrchestrator | string,
    input?: TInput,
    instanceId?: string,
    startAt?: Date,
  ): Promise<string> {
    const name = typeof orchestrator === "string" ? orchestrator : getName(orchestrator);
    const id = instanceId ?? randomUUID();
    const encodedInput = input !== undefined ? JSON.stringify(input) : undefined;

    this.backend.createInstance(id, name, encodedInput, startAt);
    return id;
  }

  /**
   * Gets the current state of an orchestration.
   */
  async getOrchestrationState(
    instanceId: string,
    fetchPayloads: boolean = true,
  ): Promise<OrchestrationState | undefined> {
    const instance = this.backend.getInstance(instanceId);
    if (!instance) {
      return undefined;
    }
    return this.toOrchestrationState(instance, fetchPayloads);
  }

  /**
   * Waits for an orchestration to start running.
   */
  async waitForOrchestrationStart(
    instanceId: string,
    fetchPayloads: boolean = false,
    timeout: number = 60,
  ): Promise<OrchestrationState | undefined> {
    const instance = await this.backend.waitForState(
      instanceId,
      (inst) => inst.status !== pb.OrchestrationStatus.ORCHESTRATION_STATUS_PENDING,
      timeout * 1000,
    );
    if (!instance) {
      return undefined;
    }
    return this.toOrchestrationState(instance, fetchPayloads);
  }

  /**
   * Waits for an orchestration to complete.
   */
  async waitForOrchestrationCompletion(
    instanceId: string,
    fetchPayloads: boolean = true,
    timeout: number = 60,
  ): Promise<OrchestrationState | undefined> {
    const instance = await this.backend.waitForState(
      instanceId,
      (inst) => this.isTerminalStatus(inst.status),
      timeout * 1000,
    );
    if (!instance) {
      return undefined;
    }
    return this.toOrchestrationState(instance, fetchPayloads);
  }

  /**
   * Raises an event to an orchestration.
   */
  async raiseOrchestrationEvent(instanceId: string, eventName: string, data: any = null): Promise<void> {
    const encodedData = data !== null ? JSON.stringify(data) : undefined;
    this.backend.raiseEvent(instanceId, eventName, encodedData);
  }

  /**
   * Terminates an orchestration.
   */
  async terminateOrchestration(instanceId: string, output: any = null): Promise<void> {
    const encodedOutput = output !== null ? JSON.stringify(output) : undefined;
    this.backend.terminate(instanceId, encodedOutput);
  }

  /**
   * Suspends an orchestration.
   */
  async suspendOrchestration(instanceId: string): Promise<void> {
    this.backend.suspend(instanceId);
  }

  /**
   * Resumes a suspended orchestration.
   */
  async resumeOrchestration(instanceId: string): Promise<void> {
    this.backend.resume(instanceId);
  }

  /**
   * Purges a completed orchestration from storage.
   */
  async purgeOrchestration(instanceId: string): Promise<{ deletedInstanceCount: number }> {
    const deleted = this.backend.purge(instanceId);
    return { deletedInstanceCount: deleted ? 1 : 0 };
  }

  /**
   * Stops the client. No-op for in-memory backend.
   */
  async stop(): Promise<void> {
    // No-op - in-memory client has nothing to stop
  }

  private isTerminalStatus(status: pb.OrchestrationStatus): boolean {
    return (
      status === pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED ||
      status === pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED ||
      status === pb.OrchestrationStatus.ORCHESTRATION_STATUS_TERMINATED
    );
  }

  private toOrchestrationState(instance: OrchestrationInstance, fetchPayloads: boolean): OrchestrationState {
    let failureDetails: FailureDetails | undefined;
    if (instance.failureDetails) {
      failureDetails = new FailureDetails(
        instance.failureDetails.getErrormessage(),
        instance.failureDetails.getErrortype(),
        instance.failureDetails.getStacktrace()?.getValue(),
      );
    }

    return new OrchestrationState(
      instance.instanceId,
      instance.name,
      this.backend.toClientStatus(instance.status),
      instance.createdAt,
      instance.lastUpdatedAt,
      fetchPayloads ? instance.input : undefined,
      fetchPayloads ? instance.output : undefined,
      fetchPayloads ? instance.customStatus : undefined,
      failureDetails,
    );
  }
}
