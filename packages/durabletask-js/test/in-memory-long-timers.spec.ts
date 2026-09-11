// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { InMemoryOrchestrationBackend } from "../src/testing/in-memory-backend";
import * as ph from "../src/utils/pb-helper.util";

const MAX_DELAY = 2_147_483_647;
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

describe("in-memory native long timers", () => {
  let backend: InMemoryOrchestrationBackend;

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date("2026-01-01T00:00:00Z") });
    backend = new InMemoryOrchestrationBackend();
  });

  afterEach(() => {
    backend.reset();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  function schedule() {
    backend.createInstance("long-timer", "orchestrator");
    const instance = backend.getNextOrchestrationWorkItem()!;
    const deadline = new Date(Date.now() + THIRTY_DAYS);
    backend.completeOrchestration(instance.instanceId, instance.completionToken, [
      ph.newCreateTimerAction(1, deadline),
    ]);
    return deadline;
  }

  it("bounds Node timeouts and emits a single durable TimerFired only at the final deadline", () => {
    const timeout = jest.spyOn(global, "setTimeout");
    const deadline = schedule();
    expect(timeout.mock.calls[0][1]).toBe(MAX_DELAY);
    jest.advanceTimersByTime(MAX_DELAY);
    expect(backend.getNextOrchestrationWorkItem()).toBeUndefined();
    expect(timeout.mock.calls[1][1]).toBe(THIRTY_DAYS - MAX_DELAY);
    jest.advanceTimersByTime(THIRTY_DAYS - MAX_DELAY - 1);
    expect(backend.getNextOrchestrationWorkItem()).toBeUndefined();
    jest.advanceTimersByTime(1);
    const instance = backend.getNextOrchestrationWorkItem()!;
    const fired = instance.pendingEvents.filter((event) => event.hasTimerfired());
    expect(fired).toHaveLength(1);
    expect(fired[0].getTimerfired()?.getTimerid()).toBe(1);
    expect(fired[0].getTimerfired()?.getFireat()?.toDate()).toEqual(deadline);
    expect(instance.history.filter((event) => event.hasTimercreated())).toHaveLength(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("clears a re-armed timer on reset", () => {
    schedule();
    jest.advanceTimersByTime(MAX_DELAY);
    expect(jest.getTimerCount()).toBe(1);
    backend.reset();
    expect(jest.getTimerCount()).toBe(0);
    jest.advanceTimersByTime(THIRTY_DAYS);
    expect(backend.getNextOrchestrationWorkItem()).toBeUndefined();
  });
});
