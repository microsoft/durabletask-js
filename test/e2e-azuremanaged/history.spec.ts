// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * E2E tests for getOrchestrationHistory in Durable Task Scheduler (DTS).
 *
 * Environment variables (choose one):
 *   - DTS_CONNECTION_STRING: Full connection string (e.g., "Endpoint=https://...;Authentication=DefaultAzure;TaskHub=...")
 *   OR
 *   - ENDPOINT: The endpoint for the DTS emulator (default: localhost:8080)
 *   - TASKHUB: The task hub name (default: default)
 */

import {
  TaskHubGrpcClient,
  TaskHubGrpcWorker,
  getName,
  whenAll,
  ActivityContext,
  OrchestrationContext,
  Task,
  TOrchestrator,
  HistoryEventType,
  ExecutionStartedEvent,
  ExecutionCompletedEvent,
  TaskScheduledEvent,
  TaskCompletedEvent,
  TimerCreatedEvent,
  TimerFiredEvent,
  SubOrchestrationInstanceCreatedEvent,
  SubOrchestrationInstanceCompletedEvent,
  EventRaisedEvent,
} from "@microsoft/durabletask-js";
import {
  DurableTaskAzureManagedClientBuilder,
  DurableTaskAzureManagedWorkerBuilder,
} from "@microsoft/durabletask-js-azuremanaged";

// Read environment variables
const connectionString = process.env.DTS_CONNECTION_STRING;
const endpoint = process.env.ENDPOINT || "localhost:8080";
const taskHub = process.env.TASKHUB || "default";

function createClient(): TaskHubGrpcClient {
  if (connectionString) {
    return new DurableTaskAzureManagedClientBuilder().connectionString(connectionString).build();
  }
  return new DurableTaskAzureManagedClientBuilder()
    .endpoint(endpoint, taskHub, null) // null credential for emulator (no auth)
    .build();
}

function createWorker(): TaskHubGrpcWorker {
  if (connectionString) {
    return new DurableTaskAzureManagedWorkerBuilder().connectionString(connectionString).build();
  }
  return new DurableTaskAzureManagedWorkerBuilder()
    .endpoint(endpoint, taskHub, null) // null credential for emulator (no auth)
    .build();
}

describe("getOrchestrationHistory E2E Tests", () => {
  let taskHubClient: TaskHubGrpcClient;
  let taskHubWorker: TaskHubGrpcWorker;

  beforeEach(async () => {
    taskHubClient = createClient();
    taskHubWorker = createWorker();
  });

  afterEach(async () => {
    try {
      await taskHubWorker.stop();
    } catch {
      // Worker may not have been started in some tests
    }
    await taskHubClient.stop();
  });

  it("should retrieve history for a simple orchestration", async () => {
    const simpleOrchestrator: TOrchestrator = async (_: OrchestrationContext) => {
      return "Hello, World!";
    };

    taskHubWorker.addOrchestrator(simpleOrchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(simpleOrchestrator);
    await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    const history = await taskHubClient.getOrchestrationHistory(id);

    expect(history).toBeDefined();
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);

    // Check for ExecutionStarted event
    const startedEvents = history.filter(e => e.type === HistoryEventType.ExecutionStarted) as ExecutionStartedEvent[];
    expect(startedEvents.length).toBe(1);
    expect(startedEvents[0].name).toBe(getName(simpleOrchestrator));

    // Check for ExecutionCompleted event
    const completedEvents = history.filter(e => e.type === HistoryEventType.ExecutionCompleted) as ExecutionCompletedEvent[];
    expect(completedEvents.length).toBe(1);
    expect(completedEvents[0].result).toBe(JSON.stringify("Hello, World!"));
  }, 31000);

  it("should retrieve history for an orchestration with activities", async () => {
    const addOne = async (_: ActivityContext, input: number) => {
      return input + 1;
    };

    const activityOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, startVal: number): any {
      const result = yield ctx.callActivity(addOne, startVal);
      return result;
    };

    taskHubWorker.addOrchestrator(activityOrchestrator);
    taskHubWorker.addActivity(addOne);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(activityOrchestrator, 5);
    await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    const history = await taskHubClient.getOrchestrationHistory(id);

    expect(history).toBeDefined();
    expect(history.length).toBeGreaterThan(0);

    // Check for TaskScheduled event
    const scheduledEvents = history.filter(e => e.type === HistoryEventType.TaskScheduled) as TaskScheduledEvent[];
    expect(scheduledEvents.length).toBe(1);
    expect(scheduledEvents[0].name).toBe(getName(addOne));
    expect(scheduledEvents[0].input).toBe(JSON.stringify(5));

    // Check for TaskCompleted event
    const taskCompletedEvents = history.filter(e => e.type === HistoryEventType.TaskCompleted) as TaskCompletedEvent[];
    expect(taskCompletedEvents.length).toBe(1);
    expect(taskCompletedEvents[0].result).toBe(JSON.stringify(6));
  }, 31000);

  it("should retrieve history for an orchestration with a timer", async () => {
    const timerOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const fireAt = new Date(ctx.currentUtcDateTime.getTime() + 1000); // 1 second timer
      yield ctx.createTimer(fireAt);
      return "Timer completed";
    };

    taskHubWorker.addOrchestrator(timerOrchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(timerOrchestrator);
    await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    const history = await taskHubClient.getOrchestrationHistory(id);

    expect(history).toBeDefined();
    expect(history.length).toBeGreaterThan(0);

    // Check for TimerCreated event
    const timerCreatedEvents = history.filter(e => e.type === HistoryEventType.TimerCreated) as TimerCreatedEvent[];
    expect(timerCreatedEvents.length).toBe(1);
    expect(timerCreatedEvents[0].fireAt).toBeDefined();

    // Check for TimerFired event
    const timerFiredEvents = history.filter(e => e.type === HistoryEventType.TimerFired) as TimerFiredEvent[];
    expect(timerFiredEvents.length).toBe(1);
  }, 31000);

  it("should retrieve history for an orchestration with sub-orchestration", async () => {
    const childOrchestrator: TOrchestrator = async (_: OrchestrationContext) => {
      return "Child completed";
    };

    const parentOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const result = yield ctx.callSubOrchestrator(childOrchestrator);
      return result;
    };

    taskHubWorker.addOrchestrator(childOrchestrator);
    taskHubWorker.addOrchestrator(parentOrchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(parentOrchestrator);
    await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    const history = await taskHubClient.getOrchestrationHistory(id);

    expect(history).toBeDefined();
    expect(history.length).toBeGreaterThan(0);

    // Check for SubOrchestrationInstanceCreated event
    const subOrchCreatedEvents = history.filter(e => e.type === HistoryEventType.SubOrchestrationInstanceCreated) as SubOrchestrationInstanceCreatedEvent[];
    expect(subOrchCreatedEvents.length).toBe(1);
    expect(subOrchCreatedEvents[0].name).toBe(getName(childOrchestrator));

    // Check for SubOrchestrationInstanceCompleted event
    const subOrchCompletedEvents = history.filter(e => e.type === HistoryEventType.SubOrchestrationInstanceCompleted) as SubOrchestrationInstanceCompletedEvent[];
    expect(subOrchCompletedEvents.length).toBe(1);
    expect(subOrchCompletedEvents[0].result).toBe(JSON.stringify("Child completed"));
  }, 31000);

  it("should retrieve history for an orchestration with external events", async () => {
    const eventOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const event = yield ctx.waitForExternalEvent("MyEvent");
      return event;
    };

    taskHubWorker.addOrchestrator(eventOrchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(eventOrchestrator);
    
    // Wait a bit for the orchestration to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await taskHubClient.raiseOrchestrationEvent(id, "MyEvent", { data: "event payload" });
    await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    const history = await taskHubClient.getOrchestrationHistory(id);

    expect(history).toBeDefined();
    expect(history.length).toBeGreaterThan(0);

    // Check for EventRaised event
    const eventRaisedEvents = history.filter(e => e.type === HistoryEventType.EventRaised) as EventRaisedEvent[];
    expect(eventRaisedEvents.length).toBe(1);
    expect(eventRaisedEvents[0].name).toBe("MyEvent");
    expect(eventRaisedEvents[0].input).toBe(JSON.stringify({ data: "event payload" }));
  }, 31000);

  it("should retrieve history for an orchestration with multiple activities", async () => {
    const activity1 = async (_: ActivityContext) => "Activity 1 result";
    const activity2 = async (_: ActivityContext) => "Activity 2 result";

    const multiActivityOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const tasks: Task<any>[] = [
        ctx.callActivity(activity1),
        ctx.callActivity(activity2),
      ];
      const results = yield whenAll(tasks);
      return results;
    };

    taskHubWorker.addOrchestrator(multiActivityOrchestrator);
    taskHubWorker.addActivity(activity1);
    taskHubWorker.addActivity(activity2);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(multiActivityOrchestrator);
    await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    const history = await taskHubClient.getOrchestrationHistory(id);

    expect(history).toBeDefined();
    expect(history.length).toBeGreaterThan(0);

    // Check for TaskScheduled events
    const scheduledEvents = history.filter(e => e.type === HistoryEventType.TaskScheduled) as TaskScheduledEvent[];
    expect(scheduledEvents.length).toBe(2);

    // Check for TaskCompleted events
    const taskCompletedEvents = history.filter(e => e.type === HistoryEventType.TaskCompleted) as TaskCompletedEvent[];
    expect(taskCompletedEvents.length).toBe(2);
  }, 31000);

  it("should return empty array for non-existent orchestration", async () => {
    // Note: The DTS emulator returns an empty history for non-existent instances
    // rather than throwing an error. This is different from the .NET SDK behavior.
    const history = await taskHubClient.getOrchestrationHistory("non-existent-instance-id");
    expect(history).toEqual([]);
  }, 31000);

  it("should throw error for empty instanceId", async () => {
    await expect(taskHubClient.getOrchestrationHistory(""))
      .rejects
      .toThrow("instanceId is required");
  }, 5000);

  it("should have correct eventId ordering in history", async () => {
    const addOne = async (_: ActivityContext, input: number) => input + 1;

    const sequenceOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      let value = 0;
      for (let i = 0; i < 3; i++) {
        value = yield ctx.callActivity(addOne, value);
      }
      return value;
    };

    taskHubWorker.addOrchestrator(sequenceOrchestrator);
    taskHubWorker.addActivity(addOne);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(sequenceOrchestrator);
    await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    const history = await taskHubClient.getOrchestrationHistory(id);

    expect(history).toBeDefined();
    expect(history.length).toBeGreaterThan(0);

    // Verify that eventIds are generally increasing (note: some events may have eventId -1)
    // Filter out events with -1 eventId and verify remaining ones are in order
    const eventsWithPositiveIds = history.filter(e => e.eventId >= 0);
    let previousEventId = -1;
    for (const event of eventsWithPositiveIds) {
      expect(event.eventId).toBeGreaterThan(previousEventId);
      previousEventId = event.eventId;
    }

    // Verify timestamps are present and valid
    for (const event of history) {
      expect(event.timestamp).toBeDefined();
      expect(event.timestamp instanceof Date).toBe(true);
    }
  }, 31000);

  it("should have OrchestratorStarted events in history", async () => {
    const simpleOrchestrator: TOrchestrator = async (_: OrchestrationContext) => {
      return "Done";
    };

    taskHubWorker.addOrchestrator(simpleOrchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(simpleOrchestrator);
    await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    const history = await taskHubClient.getOrchestrationHistory(id);

    expect(history).toBeDefined();

    // Check for OrchestratorStarted events (there may be multiple due to replay)
    const orchestratorStartedEvents = history.filter(e => e.type === HistoryEventType.OrchestratorStarted);
    expect(orchestratorStartedEvents.length).toBeGreaterThanOrEqual(1);

    // Check that ExecutionStarted and ExecutionCompleted are present
    const executionStartedEvents = history.filter(e => e.type === HistoryEventType.ExecutionStarted);
    expect(executionStartedEvents.length).toBe(1);

    const executionCompletedEvents = history.filter(e => e.type === HistoryEventType.ExecutionCompleted);
    expect(executionCompletedEvents.length).toBe(1);
  }, 31000);

  it("should include tags in ExecutionStarted event", async () => {
    const taggedOrchestrator: TOrchestrator = async (_: OrchestrationContext) => {
      return "Tagged result";
    };

    taskHubWorker.addOrchestrator(taggedOrchestrator);
    await taskHubWorker.start();

    const tags = {
      "environment": "test",
      "owner": "copilot",
      "priority": "high"
    };

    const id = await taskHubClient.scheduleNewOrchestration(taggedOrchestrator, {
      tags: tags
    });
    await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    const history = await taskHubClient.getOrchestrationHistory(id);

    expect(history).toBeDefined();
    expect(history.length).toBeGreaterThan(0);

    // Check for ExecutionStarted event with tags
    const startedEvents = history.filter(e => e.type === HistoryEventType.ExecutionStarted) as ExecutionStartedEvent[];
    expect(startedEvents.length).toBe(1);
    
    const startedEvent = startedEvents[0];
    expect(startedEvent.tags).toBeDefined();
    expect(startedEvent.tags).toEqual(tags);
    expect(startedEvent.tags?.["environment"]).toBe("test");
    expect(startedEvent.tags?.["owner"]).toBe("copilot");
    expect(startedEvent.tags?.["priority"]).toBe("high");
  }, 31000);
});
