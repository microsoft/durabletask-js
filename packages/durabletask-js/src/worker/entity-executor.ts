// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ITaskEntity } from "../entities/task-entity";
import { EntityInstanceId } from "../entities/entity-instance-id";
import { TaskEntityOperation } from "../entities/task-entity-operation";
import { TaskEntityState } from "../entities/task-entity-state";
import { TaskEntityContext, StartOrchestrationOptions } from "../entities/task-entity-context";
import { SignalEntityOptions } from "../entities/signal-entity-options";
import * as pb from "../proto/orchestrator_service_pb";
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import { Timestamp } from "google-protobuf/google/protobuf/timestamp_pb";
import { randomUUID } from "crypto";

/**
 * Internal type representing actions collected during entity execution.
 *
 * @remarks
 * Values are serialized immediately when action is created (not later),
 * requestTime is captured at action creation time, and instanceId is
 * converted to string immediately.
 */
export type EntityAction =
  | {
      type: "signalEntity";
      instanceId: string;
      name: string;
      input: string | undefined;
      scheduledTime?: Date;
      requestTime: Date;
    }
  | {
      type: "scheduleOrchestration";
      instanceId: string;
      name: string;
      input: string | undefined;
      scheduledTime?: Date;
      requestTime: Date;
    };


/**
 * Internal state management with checkpoint/rollback support.
 *
 * @remarks
 * Stores state as serialized JSON string for cheap checkpoint,
 * uses lazy deserialization with cached value, and checkpoint
 * is a simple string copy (O(1) vs O(n) deep clone).
 */
class StateShim implements TaskEntityState {
  /** Serialized JSON string of the current state */
  private serializedValue: string | undefined;

  /** Lazy-deserialized object cache */
  private cachedValue: unknown;

  /** Whether cachedValue is valid (needs re-parse after rollback) */
  private cacheValid: boolean;

  /** Serialized JSON string checkpoint for rollback */
  private checkpointValue: string | undefined;

  constructor() {
    this.serializedValue = undefined;
    this.cachedValue = undefined;
    this.cacheValid = false;
    this.checkpointValue = undefined;
  }

  get hasState(): boolean {
    return this.serializedValue !== undefined && this.serializedValue !== null;
  }

  getState<T>(defaultValue?: T): T | undefined {
    if (!this.hasState) {
      return defaultValue;
    }

    // Lazy deserialization - only parse when needed
    if (!this.cacheValid) {
      this.cachedValue =
        this.serializedValue !== undefined ? JSON.parse(this.serializedValue) : undefined;
      this.cacheValid = true;
    }

    return this.cachedValue as T;
  }

  setState(state: unknown): void {
    this.cachedValue = state;
    this.serializedValue = state !== undefined && state !== null ? JSON.stringify(state) : undefined;
    this.cacheValid = true;
  }

  /**
   * Commits the current state as the checkpoint.
   * This is a cheap string copy (O(1)), not a deep clone.
   */
  commit(): void {
    // String assignment is cheap - strings are immutable
    this.checkpointValue = this.serializedValue;
  }

  /**
   * Rolls back state to the last checkpoint.
   * Invalidates the cache so next getState() will re-parse.
   */
  rollback(): void {
    this.serializedValue = this.checkpointValue;
    // Invalidate cache - will re-parse on next getState()
    this.cachedValue = undefined;
    this.cacheValid = false;
  }

  /**
   * Gets the current serialized state for the result.
   * No serialization needed - we already store as string.
   */
  getCurrentSerializedState(): string | undefined {
    if (!this.hasState) {
      return undefined;
    }
    return this.serializedValue;
  }

  /**
   * Sets the serialized state value directly.
   * Used when loading state from EntityBatchRequest.
   */
  setSerializedState(serializedState: string | undefined): void {
    this.serializedValue = serializedState;
    this.cachedValue = undefined;
    this.cacheValid = false;
  }
}

/**
 * Internal context management with checkpoint/rollback support for actions.
 */
class ContextShim implements TaskEntityContext {
  private actions: EntityAction[] = [];
  private checkpointPosition = 0;
  private readonly entityId: EntityInstanceId;

  constructor(entityId: EntityInstanceId) {
    this.entityId = entityId;
  }

  get id(): EntityInstanceId {
    return this.entityId;
  }

  signalEntity(
    id: EntityInstanceId,
    operationName: string,
    input?: unknown,
    options?: SignalEntityOptions,
  ): void {
    this.actions.push({
      type: "signalEntity",
      instanceId: id.toString(),
      name: operationName,
      input: input !== undefined ? JSON.stringify(input) : undefined,
      scheduledTime: options?.signalTime,
      requestTime: new Date(),
    });
  }

  scheduleNewOrchestration(
    name: string,
    input?: unknown,
    options?: StartOrchestrationOptions,
  ): string {
    const instanceId = options?.instanceId ?? randomUUID();
    this.actions.push({
      type: "scheduleOrchestration",
      instanceId,
      name,
      input: input !== undefined ? JSON.stringify(input) : undefined,
      scheduledTime: options?.startAt,
      requestTime: new Date(),
    });
    return instanceId;
  }

  /**
   * Commits the current actions as the checkpoint.
   */
  commit(): void {
    this.checkpointPosition = this.actions.length;
  }

  /**
   * Rolls back actions to the last checkpoint.
   */
  rollback(): void {
    this.actions = this.actions.slice(0, this.checkpointPosition);
  }

  /**
   * Resets the context for reuse.
   */
  reset(): void {
    this.actions = [];
    this.checkpointPosition = 0;
  }

  /**
   * Gets all committed actions.
   */
  getActions(): EntityAction[] {
    return [...this.actions];
  }
}

/**
 * Internal operation wrapper for each operation in the batch.
 */
class OperationShim implements TaskEntityOperation {
  private readonly contextShim: ContextShim;
  private readonly stateShim: StateShim;
  private operationName: string = "";
  private operationInput: unknown = undefined;

  constructor(contextShim: ContextShim, stateShim: StateShim) {
    this.contextShim = contextShim;
    this.stateShim = stateShim;
  }

  get name(): string {
    return this.operationName;
  }

  get context(): TaskEntityContext {
    return this.contextShim;
  }

  get state(): TaskEntityState {
    return this.stateShim;
  }

  get hasInput(): boolean {
    return this.operationInput !== undefined;
  }

  getInput<T>(): T | undefined {
    return this.operationInput as T | undefined;
  }

  setNameAndInput(name: string, input: unknown): void {
    this.operationName = name;
    this.operationInput = input;
  }
}

/**
 * Executes entity operations in batch with transactional semantics.
 *
 * @remarks
 * This class implements transactional behavior:
 * - Entity is passed to constructor and stored as field
 * - Shims are created and reused across operations
 * - Each operation is executed independently
 * - State is checkpointed before each operation
 * - On exception, state and actions are rolled back for that operation
 * - Other operations in the batch continue to execute
 */
export class TaskEntityShim {
  private readonly entity: ITaskEntity;
  private readonly entityId: EntityInstanceId;
  private readonly stateShim: StateShim;
  private readonly contextShim: ContextShim;
  private readonly operationShim: OperationShim;
  private readonly results: pb.OperationResult[] = [];

  /**
   * Creates a new TaskEntityShim for executing operations on an entity.
   *
   * @param entity - The entity to execute operations on.
   * @param entityId - The ID of the entity.
   */
  constructor(entity: ITaskEntity, entityId: EntityInstanceId) {
    this.entity = entity;
    this.entityId = entityId;
    this.stateShim = new StateShim();
    this.contextShim = new ContextShim(entityId);
    this.operationShim = new OperationShim(this.contextShim, this.stateShim);
  }

  /**
   * Executes a batch of operations on the entity.
   *
   * @param request - The batch request containing operations.
   * @returns The batch result containing results for each operation.
   */
  async executeAsync(request: pb.EntityBatchRequest): Promise<pb.EntityBatchResult> {
    // Set the current state, and commit it so we can roll back to it later.
    // The commit/rollback mechanism is needed since we treat entity operations transactionally.
    // This means that if an operation throws an unhandled exception, all its effects are rolled back.
    // In particular, (1) the entity state is reverted to what it was prior to the operation, and
    // (2) all of the messages sent by the operation (e.g. if it started a new orchestrations) are discarded.
    const requestState = this.getSerializedState(request.getEntitystate());
    if (requestState !== undefined) {
      this.stateShim.setSerializedState(requestState);
    }
    this.stateShim.commit();  // Commit so we can rollback to initial state

    // Clear previous results
    this.results.length = 0;

    const operations = request.getOperationsList();

    for (const opRequest of operations) {
      const opResult = await this.executeOperation(opRequest);
      this.results.push(opResult);
    }

    // Build the batch result
    const batchResult = new pb.EntityBatchResult();
    batchResult.setResultsList(this.results);
    batchResult.setActionsList(this.convertActionsToProto(this.contextShim.getActions()));

    // Set final entity state
    const finalState = this.stateShim.getCurrentSerializedState();
    if (finalState !== undefined) {
      const stateValue = new StringValue();
      stateValue.setValue(finalState);
      batchResult.setEntitystate(stateValue);
    }

    // Reset context for potential reuse
    this.contextShim.reset();

    return batchResult;
  }

  /**
   * Executes a single operation with transactional semantics.
   */
  private async executeOperation(opRequest: pb.OperationRequest): Promise<pb.OperationResult> {
    const startTime = new Date();

    // Parse operation input
    const inputValue = opRequest.getInput();
    const input = inputValue ? JSON.parse(inputValue.getValue()) : undefined;

    // Set operation details
    this.operationShim.setNameAndInput(opRequest.getOperation(), input);

    const result = new pb.OperationResult();

    try {
      // Execute the entity operation
      const output = await Promise.resolve(this.entity.run(this.operationShim));
      const endTime = new Date();

      // Commit state and actions on success
      // State was already committed before execution, commit again to capture changes
      this.stateShim.commit();
      this.contextShim.commit();

      // Create success result
      const success = new pb.OperationResultSuccess();
      if (output !== undefined && output !== null) {
        const resultValue = new StringValue();
        resultValue.setValue(JSON.stringify(output));
        success.setResult(resultValue);
      }
      success.setStarttimeutc(this.dateToTimestamp(startTime));
      success.setEndtimeutc(this.dateToTimestamp(endTime));

      result.setSuccess(success);
    } catch (error) {
      const endTime = new Date();

      // Rollback state and actions on failure
      this.stateShim.rollback();
      this.contextShim.rollback();

      // Create failure result
      const failure = new pb.OperationResultFailure();
      const failureDetails = new pb.TaskFailureDetails();

      if (error instanceof Error) {
        failureDetails.setErrortype(error.name);
        failureDetails.setErrormessage(error.message);
        if (error.stack) {
          failureDetails.setStacktrace(new StringValue().setValue(error.stack));
        }
      } else {
        failureDetails.setErrortype("Error");
        failureDetails.setErrormessage(String(error));
      }

      failure.setFailuredetails(failureDetails);
      failure.setStarttimeutc(this.dateToTimestamp(startTime));
      failure.setEndtimeutc(this.dateToTimestamp(endTime));

      result.setFailure(failure);
    }

    return result;
  }

  /**
   * Gets the serialized state string from the proto StringValue.
   * Does not parse - StateManager stores state as serialized string.
   */
  private getSerializedState(stateValue: StringValue | undefined): string | undefined {
    if (!stateValue) {
      return undefined;
    }
    const stateStr = stateValue.getValue();
    if (!stateStr) {
      return undefined;
    }
    return stateStr;
  }

  /**
   * Converts a Date to a protobuf Timestamp.
   */
  private dateToTimestamp(date: Date): Timestamp {
    const timestamp = new Timestamp();
    timestamp.setSeconds(Math.floor(date.getTime() / 1000));
    timestamp.setNanos((date.getTime() % 1000) * 1000000);
    return timestamp;
  }

  /**
   * Converts EntityActions to proto OperationActions.
   */
  private convertActionsToProto(actions: EntityAction[]): pb.OperationAction[] {
    return actions.map((action, index) => {
      const protoAction = new pb.OperationAction();
      protoAction.setId(index);

      if (action.type === "signalEntity") {
        const signalAction = new pb.SendSignalAction();
        signalAction.setInstanceid(action.instanceId);  // Already converted to string
        signalAction.setName(action.name);
        if (action.input !== undefined) {
          const inputValue = new StringValue();
          inputValue.setValue(action.input);  // Already serialized
          signalAction.setInput(inputValue);
        }
        if (action.scheduledTime) {
          signalAction.setScheduledtime(this.dateToTimestamp(action.scheduledTime));
        }
        signalAction.setRequesttime(this.dateToTimestamp(action.requestTime));  // Use captured time
        protoAction.setSendsignal(signalAction);
      } else if (action.type === "scheduleOrchestration") {
        const startAction = new pb.StartNewOrchestrationAction();
        startAction.setInstanceid(action.instanceId);
        startAction.setName(action.name);
        if (action.input !== undefined) {
          const inputValue = new StringValue();
          inputValue.setValue(action.input);  // Already serialized
          startAction.setInput(inputValue);
        }
        if (action.scheduledTime) {
          startAction.setScheduledtime(this.dateToTimestamp(action.scheduledTime));
        }
        startAction.setRequesttime(this.dateToTimestamp(action.requestTime));  // Use captured time
        protoAction.setStartneworchestration(startAction);
      }

      return protoAction;
    });
  }
}
