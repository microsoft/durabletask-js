// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  TaskEntityContext,
  StartOrchestrationOptions,
} from "../src/entities/task-entity-context";
import { EntityInstanceId } from "../src/entities/entity-instance-id";

describe("TaskEntityContext", () => {
  describe("interface structure", () => {
    it("should define id as EntityInstanceId property", () => {
      const mockContext: TaskEntityContext = {
        id: new EntityInstanceId("test", "key"),
        signalEntity: () => {},
        scheduleNewOrchestration: () => "instance-id",
      };
      expect(mockContext.id).toBeInstanceOf(EntityInstanceId);
    });

    it("should define signalEntity as a method", () => {
      const mockContext: TaskEntityContext = {
        id: new EntityInstanceId("test", "key"),
        signalEntity: () => {},
        scheduleNewOrchestration: () => "instance-id",
      };
      expect(typeof mockContext.signalEntity).toBe("function");
    });

    it("should define scheduleNewOrchestration as a method returning string", () => {
      const mockContext: TaskEntityContext = {
        id: new EntityInstanceId("test", "key"),
        signalEntity: () => {},
        scheduleNewOrchestration: () => "my-orchestration-id",
      };
      expect(typeof mockContext.scheduleNewOrchestration).toBe("function");
      expect(mockContext.scheduleNewOrchestration("test")).toBe("my-orchestration-id");
    });
  });

  describe("semantic contract", () => {
    it("signalEntity should accept entity ID and operation name", () => {
      const calls: { id: EntityInstanceId; operationName: string; input?: unknown }[] = [];
      const mockContext: TaskEntityContext = {
        id: new EntityInstanceId("source", "key"),
        signalEntity: (id, operationName, input) => {
          calls.push({ id, operationName, input });
        },
        scheduleNewOrchestration: () => "id",
      };

      const targetId = new EntityInstanceId("target", "targetKey");
      mockContext.signalEntity(targetId, "increment", 5);

      expect(calls).toHaveLength(1);
      expect(calls[0].id.toString()).toBe(targetId.toString());
      expect(calls[0].operationName).toBe("increment");
      expect(calls[0].input).toBe(5);
    });

    it("signalEntity should accept optional signalTime via options", () => {
      let receivedOptions: { signalTime?: Date } | undefined;
      const mockContext: TaskEntityContext = {
        id: new EntityInstanceId("source", "key"),
        signalEntity: (_id, _op, _input, options) => {
          receivedOptions = options;
        },
        scheduleNewOrchestration: () => "id",
      };

      const futureTime = new Date("2026-02-01");
      mockContext.signalEntity(
        new EntityInstanceId("target", "key"),
        "reminder",
        null,
        { signalTime: futureTime },
      );

      expect(receivedOptions?.signalTime).toEqual(futureTime);
    });

    it("scheduleNewOrchestration should return an instance ID", () => {
      const mockContext: TaskEntityContext = {
        id: new EntityInstanceId("entity", "key"),
        signalEntity: () => {},
        scheduleNewOrchestration: (name, _input, options) => {
          return options?.instanceId ?? `generated-for-${name}`;
        },
      };

      expect(mockContext.scheduleNewOrchestration("TestOrch")).toBe("generated-for-TestOrch");
      expect(
        mockContext.scheduleNewOrchestration("TestOrch", null, { instanceId: "custom-id" }),
      ).toBe("custom-id");
    });
  });
});

describe("StartOrchestrationOptions", () => {
  it("should be usable with no properties", () => {
    const options: StartOrchestrationOptions = {};
    expect(Object.keys(options)).toHaveLength(0);
  });

  it("should accept instanceId property", () => {
    const options: StartOrchestrationOptions = { instanceId: "my-id" };
    expect(options.instanceId).toBe("my-id");
  });

  it("should accept startAt property", () => {
    const startTime = new Date("2026-01-26T12:00:00Z");
    const options: StartOrchestrationOptions = { startAt: startTime };
    expect(options.startAt).toEqual(startTime);
  });

  it("should accept both properties", () => {
    const options: StartOrchestrationOptions = {
      instanceId: "test-instance",
      startAt: new Date("2026-06-01"),
    };
    expect(options.instanceId).toBe("test-instance");
    expect(options.startAt).toEqual(new Date("2026-06-01"));
  });
});
