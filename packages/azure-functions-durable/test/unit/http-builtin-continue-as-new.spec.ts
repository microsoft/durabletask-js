// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  InMemoryOrchestrationBackend,
  TestOrchestrationClient,
  TestOrchestrationWorker,
  OrchestrationStatus,
  OrchestrationContext,
  ActivityContext,
  TOrchestrator,
} from "@microsoft/durabletask-js";
import {
  BUILTIN_HTTP_ACTIVITY_NAME,
  BUILTIN_HTTP_POLL_ORCHESTRATOR_NAME,
  builtinHttpPollOrchestrator,
} from "../../src/http/builtin";
import { DurableHttpRequestPayload } from "../../src/http/models";

// End-to-end proof (item 5) that the callHttp shape survives continueAsNew.
//
// `callHttp` schedules the built-in poll orchestrator as a DEFAULT-ID sub-orchestration
// (no explicit instanceId). Before the core instance-ID fix, the default child ID was
// `${parentId}:${seqHex}` — which repeats every continueAsNew generation — so a
// `callHttp -> continueAsNew -> callHttp` orchestration failed on the second generation with
// "Orchestration instance '...:0001' already exists". This drives the REAL poll orchestrator
// through the in-memory core backend (stub HTTP activity, no network) to prove it now completes.
describe("callHttp built-in poll orchestrator across continue-as-new", () => {
  let backend: InMemoryOrchestrationBackend;
  let client: TestOrchestrationClient;
  let worker: TestOrchestrationWorker;

  beforeEach(() => {
    backend = new InMemoryOrchestrationBackend();
    client = new TestOrchestrationClient(backend);
    worker = new TestOrchestrationWorker(backend);
  });

  afterEach(async () => {
    try {
      await worker.stop();
    } catch {
      // ignore if not running
    }
    backend.reset();
  });

  it("completes callHttp -> continueAsNew -> callHttp without an instance-ID collision", async () => {
    // Stub the built-in HTTP activity: a terminal 200 so the poll orchestrator returns in one hop
    // (no 202 loop, no durable timer, no network).
    const httpActivity = async (_ctx: ActivityContext, _req: DurableHttpRequestPayload) => ({
      statusCode: 200,
      headers: {},
      content: "ok",
    });

    // Mirror callHttp exactly: a single yield scheduling the built-in poll orchestrator with a
    // default (auto-derived) instance ID, then continue-as-new and do it again.
    const parent: TOrchestrator = async function* (ctx: OrchestrationContext, gen: number): any {
      const res = yield ctx.callSubOrchestrator(BUILTIN_HTTP_POLL_ORCHESTRATOR_NAME, {
        uri: "https://example.com/op",
        method: "GET",
      });
      if (gen < 1) {
        ctx.continueAsNew(gen + 1, true);
        return;
      }
      return (res as { statusCode: number }).statusCode;
    };

    worker.addNamedActivity(BUILTIN_HTTP_ACTIVITY_NAME, httpActivity);
    worker.addNamedOrchestrator(
      BUILTIN_HTTP_POLL_ORCHESTRATOR_NAME,
      builtinHttpPollOrchestrator as unknown as TOrchestrator,
    );
    worker.addNamedOrchestrator("CallHttpParent", parent);
    await worker.start();

    const id = await client.scheduleNewOrchestration("CallHttpParent", 0);
    const state = await client.waitForOrchestrationCompletion(id, true, 15);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(state?.serializedOutput).toEqual(JSON.stringify(200));
  });
});
