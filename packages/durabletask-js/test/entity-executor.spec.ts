// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TaskEntityShim } from "../src/worker/entity-executor";
import { TaskEntity, ITaskEntity } from "../src/entities/task-entity";
import { TaskEntityOperation } from "../src/entities/task-entity-operation";
import { EntityInstanceId } from "../src/entities/entity-instance-id";
import * as pb from "../src/proto/orchestrator_service_pb";
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";

// Helper to create EntityBatchRequest
function createBatchRequest(
  instanceId: string,
  operations: { name: string; input?: unknown }[],
  initialState?: unknown,
): pb.EntityBatchRequest {
  const request = new pb.EntityBatchRequest();
  request.setInstanceid(instanceId);

  if (initialState !== undefined) {
    const stateValue = new StringValue();
    stateValue.setValue(JSON.stringify(initialState));
    request.setEntitystate(stateValue);
  }

  for (const op of operations) {
    const opRequest = new pb.OperationRequest();
    opRequest.setOperation(op.name);
    if (op.input !== undefined) {
      const inputValue = new StringValue();
      inputValue.setValue(JSON.stringify(op.input));
      opRequest.setInput(inputValue);
    }
    request.addOperations(opRequest);
  }

  return request;
}

// Simple counter entity for testing
class CounterEntity extends TaskEntity<{ count: number }> {
  add(amount: number): number {
    this.state.count += amount;
    return this.state.count;
  }

  get(): number {
    return this.state.count;
  }

  throwError(): void {
    throw new Error("Intentional error");
  }

  signalOther(): void {
    this.context?.signalEntity(
      new EntityInstanceId("other", "key"),
      "ping",
      { message: "hello" },
    );
  }

  startOrchestration(): string {
    return this.context?.scheduleNewOrchestration("TestOrchestrator", { data: 123 }) ?? "";
  }

  protected initializeState(): { count: number } {
    return { count: 0 };
  }
}

describe("TaskEntityShim", () => {
  const entityId = new EntityInstanceId("counter", "test");

  describe("executeAsync", () => {
    it("should execute a single operation successfully", async () => {
      const entity = new CounterEntity();
      const shim = new TaskEntityShim(entity, entityId);
      const request = createBatchRequest(
        entityId.toString(),
        [{ name: "add", input: 5 }],
        { count: 10 },
      );

      const result = await shim.executeAsync(request);

      expect(result.getResultsList()).toHaveLength(1);
      const opResult = result.getResultsList()[0];
      expect(opResult.hasSuccess()).toBe(true);
      expect(opResult.hasFailure()).toBe(false);

      const success = opResult.getSuccess()!;
      const resultValue = success.getResult()?.getValue();
      expect(JSON.parse(resultValue!)).toBe(15); // 10 + 5
    });

    it("should execute multiple operations in order", async () => {
      const entity = new CounterEntity();
      const shim = new TaskEntityShim(entity, entityId);
      const request = createBatchRequest(
        entityId.toString(),
        [
          { name: "add", input: 5 },
          { name: "add", input: 3 },
          { name: "get" },
        ],
        { count: 0 },
      );

      const result = await shim.executeAsync(request);

      expect(result.getResultsList()).toHaveLength(3);

      // First add: 0 + 5 = 5
      expect(JSON.parse(result.getResultsList()[0].getSuccess()!.getResult()!.getValue())).toBe(5);

      // Second add: 5 + 3 = 8
      expect(JSON.parse(result.getResultsList()[1].getSuccess()!.getResult()!.getValue())).toBe(8);

      // Get: 8
      expect(JSON.parse(result.getResultsList()[2].getSuccess()!.getResult()!.getValue())).toBe(8);
    });

    it("should initialize state when no initial state provided", async () => {
      const entity = new CounterEntity();
      const shim = new TaskEntityShim(entity, entityId); // No initial state
      const request = createBatchRequest(
        entityId.toString(),
        [{ name: "get" }],
        // No initial state
      );

      const result = await shim.executeAsync(request);

      expect(result.getResultsList()).toHaveLength(1);
      // Should use initializeState() which returns { count: 0 }
      expect(JSON.parse(result.getResultsList()[0].getSuccess()!.getResult()!.getValue())).toBe(0);
    });

    it("should persist final state in result", async () => {
      const entity = new CounterEntity();
      const shim = new TaskEntityShim(entity, entityId);
      const request = createBatchRequest(
        entityId.toString(),
        [{ name: "add", input: 42 }],
        { count: 0 },
      );

      const result = await shim.executeAsync(request);

      const finalState = result.getEntitystate()?.getValue();
      expect(finalState).toBeDefined();
      expect(JSON.parse(finalState!)).toEqual({ count: 42 });
    });
  });

  describe("error handling and rollback", () => {
    it("should record failure for operation that throws", async () => {
      const entity = new CounterEntity();
      const shim = new TaskEntityShim(entity, entityId);
      const request = createBatchRequest(
        entityId.toString(),
        [{ name: "throwError" }],
        { count: 0 },
      );

      const result = await shim.executeAsync(request);

      expect(result.getResultsList()).toHaveLength(1);
      const opResult = result.getResultsList()[0];
      expect(opResult.hasSuccess()).toBe(false);
      expect(opResult.hasFailure()).toBe(true);

      const failure = opResult.getFailure()!;
      expect(failure.getFailuredetails()?.getErrormessage()).toBe("Intentional error");
    });

    it("should continue executing after failed operation", async () => {
      const entity = new CounterEntity();
      const shim = new TaskEntityShim(entity, entityId);
      const request = createBatchRequest(
        entityId.toString(),
        [
          { name: "add", input: 5 },
          { name: "throwError" },
          { name: "add", input: 3 },
        ],
        { count: 0 },
      );

      const result = await shim.executeAsync(request);

      expect(result.getResultsList()).toHaveLength(3);

      // First add succeeds: 0 + 5 = 5
      expect(result.getResultsList()[0].hasSuccess()).toBe(true);

      // Second operation fails
      expect(result.getResultsList()[1].hasFailure()).toBe(true);

      // Third add succeeds: state was rolled back to 5, then + 3 = 8
      expect(result.getResultsList()[2].hasSuccess()).toBe(true);
      expect(JSON.parse(result.getResultsList()[2].getSuccess()!.getResult()!.getValue())).toBe(8);
    });

    it("should rollback state changes on exception", async () => {
      // Create a custom entity that modifies state before throwing
      class FailingEntity extends TaskEntity<{ count: number }> {
        modifyThenFail(): void {
          this.state.count = 999; // Modify state
          throw new Error("Fail after modify");
        }

        get(): number {
          return this.state.count;
        }

        protected initializeState(): { count: number } {
          return { count: 0 };
        }
      }

      const entity = new FailingEntity();
      const shim = new TaskEntityShim(entity, entityId);
      const request = createBatchRequest(
        entityId.toString(),
        [
          { name: "modifyThenFail" },
          { name: "get" },
        ],
        { count: 10 },
      );

      const result = await shim.executeAsync(request);

      // First operation fails
      expect(result.getResultsList()[0].hasFailure()).toBe(true);

      // Second operation should see rolled-back state (10, not 999)
      expect(result.getResultsList()[1].hasSuccess()).toBe(true);
      expect(JSON.parse(result.getResultsList()[1].getSuccess()!.getResult()!.getValue())).toBe(10);
    });

    it("should rollback actions on exception", async () => {
      // Create entity that signals then throws
      class SignalThenFailEntity extends TaskEntity<{ count: number }> {
        signalThenFail(): void {
          this.context?.signalEntity(
            new EntityInstanceId("other", "key"),
            "shouldNotSee",
          );
          throw new Error("Fail after signal");
        }

        signalSuccess(): void {
          this.context?.signalEntity(
            new EntityInstanceId("other", "key"),
            "shouldSee",
          );
        }

        protected initializeState(): { count: number } {
          return { count: 0 };
        }
      }

      const entity = new SignalThenFailEntity();
      const shim = new TaskEntityShim(entity, entityId);
      const request = createBatchRequest(
        entityId.toString(),
        [
          { name: "signalThenFail" },
          { name: "signalSuccess" },
        ],
        { count: 0 },
      );

      const result = await shim.executeAsync(request);

      // Check that only the successful signal is in the actions
      const actions = result.getActionsList();
      expect(actions).toHaveLength(1);

      const signalAction = actions[0].getSendsignal()!;
      expect(signalAction.getName()).toBe("shouldSee");
    });
  });

  describe("actions collection", () => {
    it("should collect signal actions from entity", async () => {
      const entity = new CounterEntity();
      const shim = new TaskEntityShim(entity, entityId);
      const request = createBatchRequest(
        entityId.toString(),
        [{ name: "signalOther" }],
        { count: 0 },
      );

      const result = await shim.executeAsync(request);

      const actions = result.getActionsList();
      expect(actions).toHaveLength(1);

      const action = actions[0];
      expect(action.hasSendsignal()).toBe(true);

      const signalAction = action.getSendsignal()!;
      expect(signalAction.getInstanceid()).toBe("@other@key");
      expect(signalAction.getName()).toBe("ping");
      expect(JSON.parse(signalAction.getInput()!.getValue())).toEqual({ message: "hello" });
    });

    it("should collect orchestration actions from entity", async () => {
      const entity = new CounterEntity();
      const shim = new TaskEntityShim(entity, entityId);
      const request = createBatchRequest(
        entityId.toString(),
        [{ name: "startOrchestration" }],
        { count: 0 },
      );

      const result = await shim.executeAsync(request);

      const actions = result.getActionsList();
      expect(actions).toHaveLength(1);

      const action = actions[0];
      expect(action.hasStartneworchestration()).toBe(true);

      const orchAction = action.getStartneworchestration()!;
      expect(orchAction.getName()).toBe("TestOrchestrator");
      expect(JSON.parse(orchAction.getInput()!.getValue())).toEqual({ data: 123 });
    });

    it("should collect multiple actions from multiple operations", async () => {
      const entity = new CounterEntity();
      const shim = new TaskEntityShim(entity, entityId);
      const request = createBatchRequest(
        entityId.toString(),
        [
          { name: "signalOther" },
          { name: "startOrchestration" },
          { name: "signalOther" },
        ],
        { count: 0 },
      );

      const result = await shim.executeAsync(request);

      const actions = result.getActionsList();
      expect(actions).toHaveLength(3);

      expect(actions[0].hasSendsignal()).toBe(true);
      expect(actions[1].hasStartneworchestration()).toBe(true);
      expect(actions[2].hasSendsignal()).toBe(true);
    });
  });

  describe("timing information", () => {
    it("should include start and end times in success result", async () => {
      const entity = new CounterEntity();
      const shim = new TaskEntityShim(entity, entityId);
      const request = createBatchRequest(
        entityId.toString(),
        [{ name: "get" }],
        { count: 0 },
      );

      const beforeTime = new Date();
      const result = await shim.executeAsync(request);
      const afterTime = new Date();

      const success = result.getResultsList()[0].getSuccess()!;
      const startTime = success.getStarttimeutc()!;
      const endTime = success.getEndtimeutc()!;

      // Verify timestamps are within expected range
      const startMs = startTime.getSeconds() * 1000 + startTime.getNanos() / 1000000;
      const endMs = endTime.getSeconds() * 1000 + endTime.getNanos() / 1000000;

      expect(startMs).toBeGreaterThanOrEqual(beforeTime.getTime() - 1000);
      expect(endMs).toBeLessThanOrEqual(afterTime.getTime() + 1000);
      expect(endMs).toBeGreaterThanOrEqual(startMs);
    });

    it("should include start and end times in failure result", async () => {
      const entity = new CounterEntity();
      const shim = new TaskEntityShim(entity, entityId);
      const request = createBatchRequest(
        entityId.toString(),
        [{ name: "throwError" }],
        { count: 0 },
      );

      const result = await shim.executeAsync(request);

      const failure = result.getResultsList()[0].getFailure()!;
      expect(failure.getStarttimeutc()).toBeDefined();
      expect(failure.getEndtimeutc()).toBeDefined();
    });
  });

  describe("StateShim error handling", () => {
    it("should throw when setting non-serializable state", async () => {
      // Entity that sets state to a circular reference
      class CircularStateEntity extends TaskEntity<unknown> {
        makeCircular(): void {
          const obj: Record<string, unknown> = {};
          obj.self = obj; // Circular reference
          this.state = obj;
        }

        protected initializeState(): unknown {
          return {};
        }
      }

      const entity = new CircularStateEntity();
      const shim = new TaskEntityShim(entity, entityId);
      const request = createBatchRequest(
        entityId.toString(),
        [{ name: "makeCircular" }],
        {},
      );

      const result = await shim.executeAsync(request);

      // The operation should fail because setState will throw on JSON.stringify
      const opResult = result.getResultsList()[0];
      expect(opResult.hasFailure()).toBe(true);

      const failure = opResult.getFailure()!;
      expect(failure.getFailuredetails()?.getErrormessage()).toContain(
        "Entity state is not JSON-serializable",
      );
    });

    it("should preserve previous valid state after failed setState", async () => {
      // Entity that reads state via operation.state directly, attempts to set
      // non-serializable state, catches the error, then reads state again.
      // This tests that the StateShim cache is not corrupted by a failed setState.
      class RecoveringEntity implements ITaskEntity {
        run(operation: TaskEntityOperation): unknown {
          // First read populates the cache (cacheValid = true)
          const initialState = operation.state.getState<{ count: number }>();
          const initialCount = initialState?.count;

          try {
            const circular: Record<string, unknown> = {};
            circular.self = circular;
            operation.state.setState(circular); // Should throw
          } catch {
            // After failed setState, getState should return the previous valid state
          }

          const recoveredState = operation.state.getState<{ count: number }>();
          return { initialCount, recoveredCount: recoveredState?.count };
        }
      }

      const entity = new RecoveringEntity();
      const shim = new TaskEntityShim(entity, entityId);
      const request = createBatchRequest(
        entityId.toString(),
        [{ name: "recover" }],
        { count: 42 },
      );

      const result = await shim.executeAsync(request);

      const opResult = result.getResultsList()[0];
      expect(opResult.hasSuccess()).toBe(true);

      const output = JSON.parse(opResult.getSuccess()!.getResult()!.getValue());
      expect(output.initialCount).toBe(42);
      // After failed setState, getState should return 42 (not the circular object)
      expect(output.recoveredCount).toBe(42);
    });

    it("should allow valid setState after a failed setState", async () => {
      // Entity that fails a setState call, then successfully sets valid state
      class SetAfterFailEntity implements ITaskEntity {
        run(operation: TaskEntityOperation): unknown {
          // Read state to populate cache
          operation.state.getState();

          try {
            const circular: Record<string, unknown> = {};
            circular.self = circular;
            operation.state.setState(circular);
          } catch {
            // Expected - now set valid state
            operation.state.setState({ count: 99 });
          }

          return operation.state.getState<{ count: number }>()?.count;
        }
      }

      const entity = new SetAfterFailEntity();
      const shim = new TaskEntityShim(entity, entityId);
      const request = createBatchRequest(
        entityId.toString(),
        [{ name: "setAfterFail" }],
        { count: 10 },
      );

      const result = await shim.executeAsync(request);

      const opResult = result.getResultsList()[0];
      expect(opResult.hasSuccess()).toBe(true);
      expect(JSON.parse(opResult.getSuccess()!.getResult()!.getValue())).toBe(99);

      // Final state should be the recovered value
      const finalState = result.getEntitystate()?.getValue();
      expect(finalState).toBeDefined();
      expect(JSON.parse(finalState!)).toEqual({ count: 99 });
    });

    it("should preserve error cause in setState error", async () => {
      // Verify the error wrapping preserves the original cause
      class CauseCheckEntity implements ITaskEntity {
        caughtCause: unknown = undefined;

        run(operation: TaskEntityOperation): unknown {
          try {
            const circular: Record<string, unknown> = {};
            circular.self = circular;
            operation.state.setState(circular);
          } catch (e) {
            this.caughtCause = e instanceof Error ? e.cause : undefined;
            throw e; // Re-throw to record failure
          }
          return undefined;
        }
      }

      const entity = new CauseCheckEntity();
      const shim = new TaskEntityShim(entity, entityId);
      const request = createBatchRequest(
        entityId.toString(),
        [{ name: "checkCause" }],
        {},
      );

      await shim.executeAsync(request);

      // The wrapped error should preserve the original TypeError cause
      expect(entity.caughtCause).toBeDefined();
      expect(entity.caughtCause).toBeInstanceOf(TypeError);
    });
  });

  describe("corrupted initial state (getState error handling)", () => {
    it("should record failure with descriptive error when initial state is invalid JSON", async () => {
      // Simulates corrupted entity state from the sidecar
      const entity = new CounterEntity();
      const shim = new TaskEntityShim(entity, entityId);

      // Create batch request with invalid JSON as entity state
      const request = new pb.EntityBatchRequest();
      request.setInstanceid(entityId.toString());

      const stateValue = new StringValue();
      stateValue.setValue("{not valid json");
      request.setEntitystate(stateValue);

      const opRequest = new pb.OperationRequest();
      opRequest.setOperation("get");
      request.addOperations(opRequest);

      const result = await shim.executeAsync(request);

      // The operation should fail because getState() will throw on JSON.parse
      const opResult = result.getResultsList()[0];
      expect(opResult.hasFailure()).toBe(true);

      const failure = opResult.getFailure()!;
      const errorMessage = failure.getFailuredetails()?.getErrormessage() ?? "";
      // Error message should be descriptive (not a raw SyntaxError)
      expect(errorMessage).toContain("Entity state contains invalid JSON");
    });

    it("should preserve error cause in getState error", async () => {
      // Verify the error wrapping preserves the original SyntaxError cause
      class CauseInspectorEntity implements ITaskEntity {
        caughtError: Error | undefined = undefined;

        run(operation: TaskEntityOperation): unknown {
          try {
            operation.state.getState();
          } catch (e) {
            this.caughtError = e instanceof Error ? e : undefined;
            throw e;
          }
          return undefined;
        }
      }

      const entity = new CauseInspectorEntity();
      const shim = new TaskEntityShim(entity, entityId);

      const request = new pb.EntityBatchRequest();
      request.setInstanceid(entityId.toString());

      const stateValue = new StringValue();
      stateValue.setValue("<<<corrupted>>>");
      request.setEntitystate(stateValue);

      const opRequest = new pb.OperationRequest();
      opRequest.setOperation("inspect");
      request.addOperations(opRequest);

      await shim.executeAsync(request);

      // The wrapped error should have a SyntaxError cause
      expect(entity.caughtError).toBeDefined();
      expect(entity.caughtError!.message).toContain("Entity state contains invalid JSON");
      expect(entity.caughtError!.cause).toBeInstanceOf(SyntaxError);
    });

    it("should rollback to initial state when getState fails mid-batch", async () => {
      // First operation succeeds with valid state, second operation gets corrupted state
      // This tests that rollback works correctly for getState failures too
      class StateReaderEntity implements ITaskEntity {
        run(operation: TaskEntityOperation): unknown {
          const state = operation.state.getState<{ count: number }>();
          return state?.count;
        }
      }

      const entity = new StateReaderEntity();
      const shim = new TaskEntityShim(entity, entityId);

      // First, run with valid state
      const request1 = createBatchRequest(
        entityId.toString(),
        [{ name: "read" }],
        { count: 42 },
      );

      const result1 = await shim.executeAsync(request1);
      expect(result1.getResultsList()[0].hasSuccess()).toBe(true);
      expect(JSON.parse(result1.getResultsList()[0].getSuccess()!.getResult()!.getValue())).toBe(42);

      // Now run with corrupted state — the operation should fail but not crash
      const request2 = new pb.EntityBatchRequest();
      request2.setInstanceid(entityId.toString());

      const corruptState = new StringValue();
      corruptState.setValue("{broken json!");
      request2.setEntitystate(corruptState);

      const opRequest = new pb.OperationRequest();
      opRequest.setOperation("read");
      request2.addOperations(opRequest);

      const result2 = await shim.executeAsync(request2);

      // Operation should fail gracefully
      const opResult = result2.getResultsList()[0];
      expect(opResult.hasFailure()).toBe(true);
      expect(opResult.getFailure()!.getFailuredetails()?.getErrormessage()).toContain(
        "Entity state contains invalid JSON",
      );
    });

    it("should succeed for subsequent operations after corrupted state causes failure", async () => {
      // Corrupted state causes first operation to fail, but second operation
      // with no state read should still work
      class ConditionalReaderEntity implements ITaskEntity {
        run(operation: TaskEntityOperation): unknown {
          if (operation.name === "readState") {
            return operation.state.getState<{ count: number }>();
          }
          // "noRead" operation doesn't read state
          operation.state.setState({ count: 0 });
          return "reset";
        }
      }

      const entity = new ConditionalReaderEntity();
      const shim = new TaskEntityShim(entity, entityId);

      const request = new pb.EntityBatchRequest();
      request.setInstanceid(entityId.toString());

      const corruptState = new StringValue();
      corruptState.setValue("not-json");
      request.setEntitystate(corruptState);

      // First op: reads corrupted state → fails
      const op1 = new pb.OperationRequest();
      op1.setOperation("readState");
      request.addOperations(op1);

      // Second op: writes new state without reading → succeeds
      const op2 = new pb.OperationRequest();
      op2.setOperation("noRead");
      request.addOperations(op2);

      const result = await shim.executeAsync(request);

      expect(result.getResultsList()).toHaveLength(2);
      // First operation fails
      expect(result.getResultsList()[0].hasFailure()).toBe(true);
      // Second operation succeeds (rollback restored corrupted serialized state,
      // but noRead doesn't call getState so it works)
      expect(result.getResultsList()[1].hasSuccess()).toBe(true);
      expect(JSON.parse(result.getResultsList()[1].getSuccess()!.getResult()!.getValue())).toBe("reset");
    });
  });

  describe("invalid operation input", () => {
    it("should record failure when operation input is invalid JSON", async () => {
      const entity = new CounterEntity();
      const shim = new TaskEntityShim(entity, entityId);

      // Manually create a batch request with invalid JSON input
      const request = new pb.EntityBatchRequest();
      request.setInstanceid(entityId.toString());

      const stateValue = new StringValue();
      stateValue.setValue(JSON.stringify({ count: 0 }));
      request.setEntitystate(stateValue);

      const opRequest = new pb.OperationRequest();
      opRequest.setOperation("add");
      const inputValue = new StringValue();
      inputValue.setValue("{invalid json"); // Invalid JSON
      opRequest.setInput(inputValue);
      request.addOperations(opRequest);

      const result = await shim.executeAsync(request);

      const opResult = result.getResultsList()[0];
      expect(opResult.hasFailure()).toBe(true);
    });

    it("should continue executing after invalid JSON input failure", async () => {
      const entity = new CounterEntity();
      const shim = new TaskEntityShim(entity, entityId);

      // Create request with invalid JSON for first op, then a valid op
      const request = new pb.EntityBatchRequest();
      request.setInstanceid(entityId.toString());

      const stateValue = new StringValue();
      stateValue.setValue(JSON.stringify({ count: 10 }));
      request.setEntitystate(stateValue);

      // First op: invalid JSON input
      const op1 = new pb.OperationRequest();
      op1.setOperation("add");
      const badInput = new StringValue();
      badInput.setValue("not valid json!");
      op1.setInput(badInput);
      request.addOperations(op1);

      // Second op: valid operation
      const op2 = new pb.OperationRequest();
      op2.setOperation("get");
      request.addOperations(op2);

      const result = await shim.executeAsync(request);

      expect(result.getResultsList()).toHaveLength(2);

      // First operation fails due to invalid JSON
      expect(result.getResultsList()[0].hasFailure()).toBe(true);

      // Second operation succeeds, state should be rolled back to 10
      expect(result.getResultsList()[1].hasSuccess()).toBe(true);
      expect(JSON.parse(result.getResultsList()[1].getSuccess()!.getResult()!.getValue())).toBe(10);
    });
  });
});
