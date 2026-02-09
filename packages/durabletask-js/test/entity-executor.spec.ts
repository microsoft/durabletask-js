// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TaskEntityShim } from "../src/worker/entity-executor";
import { TaskEntity } from "../src/entities/task-entity";
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
