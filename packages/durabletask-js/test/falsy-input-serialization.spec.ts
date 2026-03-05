// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { OrchestrationContext } from "../src/task/context/orchestration-context";
import {
  newExecutionStartedEvent,
  newOrchestratorStartedEvent,
} from "../src/utils/pb-helper.util";
import { OrchestrationExecutor } from "../src/worker/orchestration-executor";
import * as pb from "../src/proto/orchestrator_service_pb";
import { Registry } from "../src/worker/registry";
import { TOrchestrator } from "../src/types/orchestrator.type";
import { NoOpLogger } from "../src/types/logger.type";
import { ActivityContext } from "../src/task/context/activity-context";

const testLogger = new NoOpLogger();
const TEST_INSTANCE_ID = "falsy-test-instance";

describe("Falsy input serialization", () => {
  describe("callActivity with falsy inputs", () => {
    it.each([
      { input: 0, label: "zero" },
      { input: "", label: "empty string" },
      { input: false, label: "false" },
      { input: null, label: "null" },
    ])("should correctly serialize $label as activity input", async ({ input }) => {
      const myActivity = async (_ctx: ActivityContext, actInput: any) => actInput;

      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        const result = yield ctx.callActivity(myActivity, input as any);
        return result;
      };

      const registry = new Registry();
      const orchestratorName = registry.addOrchestrator(orchestrator);
      registry.addActivity(myActivity);

      const newEvents = [
        newOrchestratorStartedEvent(new Date()),
        newExecutionStartedEvent(orchestratorName, TEST_INSTANCE_ID),
      ];

      const executor = new OrchestrationExecutor(registry, testLogger);
      const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);

      // Should have a ScheduleTask action with the serialized input
      const scheduleAction = result.actions.find((a) => a.hasScheduletask());
      expect(scheduleAction).toBeDefined();
      const inputValue = scheduleAction!.getScheduletask()!.getInput();
      expect(inputValue).toBeDefined();
      expect(inputValue!.getValue()).toEqual(JSON.stringify(input));
    });
  });

  describe("callSubOrchestrator with falsy inputs", () => {
    it.each([
      { input: 0, label: "zero" },
      { input: "", label: "empty string" },
      { input: false, label: "false" },
      { input: null, label: "null" },
    ])("should correctly serialize $label as sub-orchestration input", async ({ input }) => {
      const subOrchestrator: TOrchestrator = async (_ctx: OrchestrationContext, subInput: any) => {
        return subInput;
      };

      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        const result = yield ctx.callSubOrchestrator(subOrchestrator, input as any);
        return result;
      };

      const registry = new Registry();
      const orchestratorName = registry.addOrchestrator(orchestrator);
      registry.addOrchestrator(subOrchestrator);

      const newEvents = [
        newOrchestratorStartedEvent(new Date()),
        newExecutionStartedEvent(orchestratorName, TEST_INSTANCE_ID),
      ];

      const executor = new OrchestrationExecutor(registry, testLogger);
      const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);

      // Should have a CreateSubOrchestration action with the serialized input
      const subOrchAction = result.actions.find((a) => a.hasCreatesuborchestration());
      expect(subOrchAction).toBeDefined();
      const inputValue = subOrchAction!.getCreatesuborchestration()!.getInput();
      expect(inputValue).toBeDefined();
      expect(inputValue!.getValue()).toEqual(JSON.stringify(input));
    });
  });

  describe("orchestration completion with falsy results", () => {
    it.each([
      { result: 0, label: "zero" },
      { result: "", label: "empty string" },
      { result: false, label: "false" },
      { result: null, label: "null" },
    ])("should correctly serialize $label as orchestration result", async ({ result }) => {
      const orchestrator: TOrchestrator = async (_ctx: OrchestrationContext) => {
        return result;
      };

      const registry = new Registry();
      const orchestratorName = registry.addOrchestrator(orchestrator);

      const newEvents = [
        newOrchestratorStartedEvent(new Date()),
        newExecutionStartedEvent(orchestratorName, TEST_INSTANCE_ID),
      ];

      const executor = new OrchestrationExecutor(registry, testLogger);
      const execResult = await executor.execute(TEST_INSTANCE_ID, [], newEvents);

      expect(execResult.actions.length).toEqual(1);
      const completeAction = execResult.actions[0].getCompleteorchestration();
      expect(completeAction).toBeDefined();
      expect(completeAction!.getOrchestrationstatus()).toEqual(
        pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED,
      );
      const resultValue = completeAction!.getResult();
      expect(resultValue).toBeDefined();
      expect(resultValue!.getValue()).toEqual(JSON.stringify(result));
    });
  });

  describe("continueAsNew with falsy input", () => {
    it("should correctly serialize zero as continue-as-new input", async () => {
      const orchestrator: TOrchestrator = async (ctx: OrchestrationContext, input: any): Promise<any> => {
        if (input === 0) {
          ctx.continueAsNew(0, false);
          return;
        }
        return input;
      };

      const registry = new Registry();
      const orchestratorName = registry.addOrchestrator(orchestrator);

      const newEvents = [
        newOrchestratorStartedEvent(new Date()),
        newExecutionStartedEvent(orchestratorName, TEST_INSTANCE_ID, JSON.stringify(0)),
      ];

      const executor = new OrchestrationExecutor(registry, testLogger);
      const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);

      expect(result.actions.length).toEqual(1);
      const completeAction = result.actions[0].getCompleteorchestration();
      expect(completeAction).toBeDefined();
      expect(completeAction!.getOrchestrationstatus()).toEqual(
        pb.OrchestrationStatus.ORCHESTRATION_STATUS_CONTINUED_AS_NEW,
      );
      const resultValue = completeAction!.getResult();
      expect(resultValue).toBeDefined();
      expect(resultValue!.getValue()).toEqual(JSON.stringify(0));
    });
  });

  describe("undefined inputs are still treated as no input", () => {
    it("should not set input when activity input is undefined", async () => {
      const myActivity = async (_ctx: ActivityContext) => "done";

      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        const result = yield ctx.callActivity(myActivity);
        return result;
      };

      const registry = new Registry();
      const orchestratorName = registry.addOrchestrator(orchestrator);
      registry.addActivity(myActivity);

      const newEvents = [
        newOrchestratorStartedEvent(new Date()),
        newExecutionStartedEvent(orchestratorName, TEST_INSTANCE_ID),
      ];

      const executor = new OrchestrationExecutor(registry, testLogger);
      const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);

      const scheduleAction = result.actions.find((a) => a.hasScheduletask());
      expect(scheduleAction).toBeDefined();
      // Input should be undefined when not provided
      const inputValue = scheduleAction!.getScheduletask()!.getInput();
      expect(inputValue).toBeUndefined();
    });
  });
});
