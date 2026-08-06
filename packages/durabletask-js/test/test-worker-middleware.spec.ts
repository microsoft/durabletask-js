// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { InMemoryOrchestrationBackend } from "../src/testing/in-memory-backend";
import { TestOrchestrationClient } from "../src/testing/test-client";
import { TestOrchestrationWorker } from "../src/testing/test-worker";
import { ActivityContext } from "../src/task/context/activity-context";
import { OrchestrationContext } from "../src/task/context/orchestration-context";
import { ActivityMiddlewareContext } from "../src/worker/middleware";

describe("TestOrchestrationWorker middleware registration", () => {
  it("returns the worker for chaining and locks registration after start", async () => {
    const worker = new TestOrchestrationWorker(new InMemoryOrchestrationBackend());
    const orchestrationMiddleware = jest.fn(async (context, next) => next(context));
    const activityMiddleware = jest.fn(async (context, next) => next(context));

    expect(worker.useOrchestrationMiddleware(orchestrationMiddleware)).toBe(worker);
    expect(worker.useActivityMiddleware(activityMiddleware)).toBe(worker);

    await worker.start();
    try {
      expect(() => worker.useOrchestrationMiddleware(orchestrationMiddleware)).toThrow(
        "Cannot add orchestration middleware while worker is running.",
      );
      expect(() => worker.useActivityMiddleware(activityMiddleware)).toThrow(
        "Cannot add activity middleware while worker is running.",
      );
    } finally {
      await worker.stop();
    }
  });

  it("preserves scheduled activity version and tags in middleware context", async () => {
    const backend = new InMemoryOrchestrationBackend();
    const client = new TestOrchestrationClient(backend);
    const worker = new TestOrchestrationWorker(backend);
    let activityContext: ActivityMiddlewareContext | undefined;
    const activity = (_context: ActivityContext, input: string) => input;
    const orchestrator = async function* (context: OrchestrationContext): any {
      return yield context.callActivity(activity, "input", {
        version: "v2",
        tags: { tenant: "contoso" },
      });
    };
    worker.useActivityMiddleware(async (context, next) => {
      activityContext = context;
      await next(context);
    });
    worker.addActivity(activity);
    worker.addOrchestrator(orchestrator);

    await worker.start();
    try {
      const id = await client.scheduleNewOrchestration(orchestrator);
      await client.waitForOrchestrationCompletion(id, true, 5);
    } finally {
      await worker.stop();
    }

    expect(activityContext?.version).toBe("v2");
    expect(activityContext?.tags).toEqual({ tenant: "contoso" });
  });
});
