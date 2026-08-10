// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { randomUUID } from "crypto";
import { getName } from "../task";
import { TOrchestrator } from "../types/orchestrator.type";
import { TInput } from "../types/input.type";
import { OrchestrationState } from "../orchestration/orchestration-state";
import { FailureDetails } from "../task/failure-details";
import { EntityInstanceId } from "../entities/entity-instance-id";
import { EntityMetadata } from "../entities/entity-metadata";
import { InMemoryOrchestrationBackend, OrchestrationInstance } from "./in-memory-backend";
import * as pb from "../proto/orchestrator_service_pb";
import { StartOrchestrationOptions } from "../task/options";

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
   *
   * The in-memory backend does not model orchestration versions or tags, so passing
   * either option throws instead of silently diverging from TaskHubGrpcClient.
   */
  async scheduleNewOrchestration(
    orchestrator: TOrchestrator | string,
    input?: TInput,
    instanceId?: string,
    startAt?: Date,
  ): Promise<string>;
  async scheduleNewOrchestration(
    orchestrator: TOrchestrator | string,
    input?: TInput,
    options?: StartOrchestrationOptions,
  ): Promise<string>;
  async scheduleNewOrchestration(
    orchestrator: TOrchestrator | string,
    input?: TInput,
    instanceIdOrOptions?: string | StartOrchestrationOptions,
    startAt?: Date,
  ): Promise<string> {
    const name = typeof orchestrator === "string" ? orchestrator : getName(orchestrator);
    if (typeof instanceIdOrOptions === "object") {
      if (instanceIdOrOptions.tags !== undefined) {
        throw new Error("TestOrchestrationClient does not support the 'tags' option");
      }
      if (instanceIdOrOptions.version !== undefined) {
        throw new Error("TestOrchestrationClient does not support the 'version' option");
      }
    }
    const instanceId =
      typeof instanceIdOrOptions === "string" || instanceIdOrOptions === undefined
        ? instanceIdOrOptions
        : instanceIdOrOptions.instanceId;
    const scheduledStartAt =
      typeof instanceIdOrOptions === "string" || instanceIdOrOptions === undefined
        ? startAt
        : instanceIdOrOptions.startAt;
    const dedupeStatuses =
      typeof instanceIdOrOptions === "string" || instanceIdOrOptions === undefined
        ? undefined
        : instanceIdOrOptions.dedupeStatuses;
    const id = instanceId ?? randomUUID();
    const encodedInput = input !== undefined ? JSON.stringify(input) : undefined;

    await this.backend.createOrchestrationInstance(id, name, encodedInput, scheduledStartAt, dedupeStatuses);
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
    // Always serialize data — including null — to match TaskHubGrpcClient behavior.
    // The real client unconditionally calls JSON.stringify(data), which turns null into "null".
    const encodedData = JSON.stringify(data);
    this.backend.raiseEvent(instanceId, eventName, encodedData);
  }

  /**
   * Terminates an orchestration.
   */
  async terminateOrchestration(instanceId: string, output: any = null): Promise<void> {
    // Always serialize output — including null — to match TaskHubGrpcClient behavior.
    // The real client unconditionally calls JSON.stringify(output), which turns null into "null".
    const encodedOutput = JSON.stringify(output);
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
   * Rewinds a failed orchestration so it re-runs from the point of failure.
   *
   * @param instanceId The instance to rewind.
   * @param reason Optional human-readable reason for the rewind.
   */
  async rewindOrchestration(instanceId: string, reason?: string): Promise<void> {
    this.backend.rewindInstance(instanceId, reason);
  }

  /**
   * Signals an entity with a one-way (fire-and-forget) operation.
   *
   * @param id The entity to signal.
   * @param operationName The name of the operation to invoke.
   * @param input Optional operation input. Serialized as JSON.
   */
  async signalEntity(id: EntityInstanceId, operationName: string, input?: unknown): Promise<void> {
    this.backend.signalEntity(id.toString(), operationName, input === undefined ? undefined : JSON.stringify(input));
  }

  /**
   * Gets the metadata of an entity, or undefined if the entity does not exist.
   *
   * @param id The entity to look up.
   * @param includeState Whether to deserialize and include the entity state.
   */
  async getEntity<T = unknown>(
    id: EntityInstanceId,
    includeState: boolean = true,
  ): Promise<EntityMetadata<T> | undefined> {
    const entity = this.backend.getEntity(id.toString());
    if (!entity) {
      return undefined;
    }

    return {
      id,
      lastModifiedTime: entity.lastModifiedAt,
      backlogQueueSize: entity.pendingOperations.length,
      lockedBy: entity.lockedBy,
      includesState: includeState,
      state:
        includeState && entity.serializedState !== undefined ? (JSON.parse(entity.serializedState) as T) : undefined,
    };
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
      status === pb.OrchestrationStatus.ORCHESTRATION_STATUS_TERMINATED ||
      status === pb.OrchestrationStatus.ORCHESTRATION_STATUS_CANCELED
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
