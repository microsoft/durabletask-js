// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

jest.mock("os", () => {
  const actual = jest.requireActual<typeof import("os")>("os");
  return {
    ...actual,
    availableParallelism: jest.fn(actual.availableParallelism),
    cpus: jest.fn(actual.cpus),
  };
});

import * as os from "os";
import { ConcurrencyOptions, TaskHubGrpcWorker } from "../src";
import { NoOpLogger } from "../src/types/logger.type";

function getRequest(worker: TaskHubGrpcWorker): {
  getMaxconcurrentactivityworkitems(): number;
  getMaxconcurrentorchestrationworkitems(): number;
  getMaxconcurrententityworkitems(): number;
} {
  return (worker as any)._buildGetWorkItemsRequest();
}

describe("worker concurrency options", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("uses 100 times the available logical processor count for every default", () => {
    jest.mocked(os.availableParallelism).mockReturnValue(7);

    const request = getRequest(new TaskHubGrpcWorker({ logger: new NoOpLogger() }));

    expect(request.getMaxconcurrentactivityworkitems()).toBe(700);
    expect(request.getMaxconcurrentorchestrationworkitems()).toBe(700);
    expect(request.getMaxconcurrententityworkitems()).toBe(700);
  });

  it("preserves CPU-derived defaults for the deprecated positional constructor", () => {
    jest.mocked(os.availableParallelism).mockReturnValue(3);

    const request = getRequest(new TaskHubGrpcWorker("localhost:4001"));

    expect(request.getMaxconcurrentactivityworkitems()).toBe(300);
    expect(request.getMaxconcurrentorchestrationworkitems()).toBe(300);
    expect(request.getMaxconcurrententityworkitems()).toBe(300);
  });

  it("falls back to the logical CPU list when availableParallelism is unavailable", () => {
    jest.mocked(os.availableParallelism).mockReturnValue(undefined as never);
    jest.mocked(os.cpus).mockReturnValue([{ model: "test", speed: 1, times: {} as os.CpuInfo["times"] }]);

    const request = getRequest(new TaskHubGrpcWorker({ logger: new NoOpLogger() }));

    expect(request.getMaxconcurrentactivityworkitems()).toBe(100);
    expect(request.getMaxconcurrentorchestrationworkitems()).toBe(100);
    expect(request.getMaxconcurrententityworkitems()).toBe(100);
  });

  it("uses one logical processor when both CPU APIs fail", () => {
    jest.mocked(os.availableParallelism).mockImplementation(() => {
      throw new Error("unsupported");
    });
    jest.mocked(os.cpus).mockImplementation(() => {
      throw new Error("unsupported");
    });

    const request = getRequest(new TaskHubGrpcWorker({ logger: new NoOpLogger() }));

    expect(request.getMaxconcurrentactivityworkitems()).toBe(100);
    expect(request.getMaxconcurrentorchestrationworkitems()).toBe(100);
    expect(request.getMaxconcurrententityworkitems()).toBe(100);
  });

  it("applies custom limits independently and preserves zero", () => {
    const concurrency: ConcurrencyOptions = {
      maximumConcurrentActivityWorkItems: 0,
      maximumConcurrentOrchestrationWorkItems: 2,
      maximumConcurrentEntityWorkItems: 3,
    };

    const request = getRequest(new TaskHubGrpcWorker({ logger: new NoOpLogger(), concurrency }));

    expect(request.getMaxconcurrentactivityworkitems()).toBe(0);
    expect(request.getMaxconcurrentorchestrationworkitems()).toBe(2);
    expect(request.getMaxconcurrententityworkitems()).toBe(3);
  });

  it("uses the CPU-derived default independently for omitted custom limits", () => {
    jest.mocked(os.availableParallelism).mockReturnValue(4);

    const request = getRequest(
      new TaskHubGrpcWorker({
        logger: new NoOpLogger(),
        concurrency: { maximumConcurrentActivityWorkItems: 5 },
      }),
    );

    expect(request.getMaxconcurrentactivityworkitems()).toBe(5);
    expect(request.getMaxconcurrentorchestrationworkitems()).toBe(400);
    expect(request.getMaxconcurrententityworkitems()).toBe(400);
  });

  it("accepts safe integers above the protocol int32 range and caps only the wire hint", () => {
    const request = getRequest(
      new TaskHubGrpcWorker({
        logger: new NoOpLogger(),
        concurrency: { maximumConcurrentActivityWorkItems: Number.MAX_SAFE_INTEGER },
      }),
    );

    expect(request.getMaxconcurrentactivityworkitems()).toBe(2_147_483_647);
    expect(() => (request as any).serializeBinary()).not.toThrow();
  });

  it.each([
    ["maximumConcurrentActivityWorkItems", -1],
    ["maximumConcurrentActivityWorkItems", 1.5],
    ["maximumConcurrentOrchestrationWorkItems", Number.NaN],
    ["maximumConcurrentOrchestrationWorkItems", Number.POSITIVE_INFINITY],
    ["maximumConcurrentEntityWorkItems", Number.MAX_SAFE_INTEGER + 1],
  ] as const)("rejects invalid %s value %s", (name, value) => {
    expect(
      () =>
        new TaskHubGrpcWorker({
          logger: new NoOpLogger(),
          concurrency: { [name]: value },
        }),
    ).toThrow(`${name} must be a non-negative safe integer`);
  });
});
