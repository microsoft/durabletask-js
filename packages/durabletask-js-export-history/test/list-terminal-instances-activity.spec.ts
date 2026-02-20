// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { OrchestrationStatus } from "@microsoft/durabletask-js";
import { createListTerminalInstancesActivity } from "../src/activities/list-terminal-instances-activity";

describe("ListTerminalInstancesActivity", () => {
  it("should return instance IDs and next checkpoint", async () => {
    const mockClient = {
      listInstanceIds: jest.fn().mockResolvedValue({
        values: ["instance-1", "instance-2", "instance-3"],
        continuationToken: "instance-3",
      }),
    };

    const activity = createListTerminalInstancesActivity(mockClient);

    const result = await activity(undefined, {
      completedTimeFrom: new Date("2024-01-01"),
      completedTimeTo: new Date("2024-06-01"),
      runtimeStatus: [OrchestrationStatus.COMPLETED],
      maxInstancesPerBatch: 10,
    });

    expect(result.instanceIds).toEqual(["instance-1", "instance-2", "instance-3"]);
    expect(result.nextCheckpoint).toEqual({ lastInstanceKey: "instance-3" });

    expect(mockClient.listInstanceIds).toHaveBeenCalledWith({
      runtimeStatus: [OrchestrationStatus.COMPLETED],
      completedTimeFrom: new Date("2024-01-01"),
      completedTimeTo: new Date("2024-06-01"),
      pageSize: 10,
      lastInstanceKey: undefined,
    });
  });

  it("should return empty list when no instances found", async () => {
    const mockClient = {
      listInstanceIds: jest.fn().mockResolvedValue({
        values: [],
        continuationToken: undefined,
      }),
    };

    const activity = createListTerminalInstancesActivity(mockClient);

    const result = await activity(undefined, {
      completedTimeFrom: new Date("2024-01-01"),
      maxInstancesPerBatch: 100,
    });

    expect(result.instanceIds).toEqual([]);
    expect(result.nextCheckpoint).toEqual({ lastInstanceKey: undefined });
  });

  it("should pass lastInstanceKey for pagination", async () => {
    const mockClient = {
      listInstanceIds: jest.fn().mockResolvedValue({
        values: ["instance-4"],
        continuationToken: "instance-4",
      }),
    };

    const activity = createListTerminalInstancesActivity(mockClient);

    await activity(undefined, {
      completedTimeFrom: new Date("2024-01-01"),
      maxInstancesPerBatch: 100,
      lastInstanceKey: "instance-3",
    });

    expect(mockClient.listInstanceIds).toHaveBeenCalledWith(
      expect.objectContaining({
        lastInstanceKey: "instance-3",
      }),
    );
  });

  it("should throw when input is missing", async () => {
    const mockClient = {
      listInstanceIds: jest.fn(),
    };

    const activity = createListTerminalInstancesActivity(mockClient);

    await expect(activity(undefined, undefined as any)).rejects.toThrow("input is required");
  });
});
