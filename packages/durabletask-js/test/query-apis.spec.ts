// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Page, createAsyncPageable } from "../src/orchestration/page";
import { FailureDetails } from "../src/task/failure-details";
import {
  OrchestrationQuery,
  ListInstanceIdsOptions,
  DEFAULT_PAGE_SIZE,
} from "../src/orchestration/orchestration-query";
import { OrchestrationStatus } from "../src/orchestration/enum/orchestration-status.enum";
import { OrchestrationState } from "../src/orchestration/orchestration-state";

describe("Page", () => {
  describe("constructor", () => {
    it("should create a page with values and no continuation token", () => {
      const values = ["item1", "item2", "item3"];
      const page = new Page(values);

      expect(page.values).toEqual(values);
      expect(page.continuationToken).toBeUndefined();
      expect(page.hasMoreResults).toBe(false);
    });

    it("should create a page with values and a continuation token", () => {
      const values = ["item1", "item2"];
      const continuationToken = "token123";
      const page = new Page(values, continuationToken);

      expect(page.values).toEqual(values);
      expect(page.continuationToken).toBe(continuationToken);
      expect(page.hasMoreResults).toBe(true);
    });

    it("should handle empty values array", () => {
      const page = new Page([]);

      expect(page.values).toEqual([]);
      expect(page.hasMoreResults).toBe(false);
    });

    it("should treat empty string continuation token as no more results", () => {
      const page = new Page(["item1"], "");

      expect(page.hasMoreResults).toBe(false);
    });
  });

  describe("hasMoreResults", () => {
    it("should return true when continuation token is present and non-empty", () => {
      const page = new Page(["item1"], "nextPage");
      expect(page.hasMoreResults).toBe(true);
    });

    it("should return false when continuation token is undefined", () => {
      const page = new Page(["item1"]);
      expect(page.hasMoreResults).toBe(false);
    });

    it("should return false when continuation token is empty string", () => {
      const page = new Page(["item1"], "");
      expect(page.hasMoreResults).toBe(false);
    });
  });
});

describe("createAsyncPageable", () => {
  it("should iterate over all items across multiple pages", async () => {
    let callCount = 0;
    const pageFunc = async (continuationToken?: string): Promise<Page<string>> => {
      callCount++;
      if (continuationToken === undefined) {
        return new Page(["item1", "item2"], "page2");
      } else if (continuationToken === "page2") {
        return new Page(["item3", "item4"], "page3");
      } else {
        return new Page(["item5"], undefined);
      }
    };

    const pageable = createAsyncPageable(pageFunc);
    const items: string[] = [];

    for await (const item of pageable) {
      items.push(item);
    }

    expect(items).toEqual(["item1", "item2", "item3", "item4", "item5"]);
    expect(callCount).toBe(3);
  });

  it("should iterate over pages using asPages()", async () => {
    let callCount = 0;
    const pageFunc = async (): Promise<Page<number>> => {
      callCount++;
      if (callCount === 1) {
        return new Page([1, 2, 3], "page2");
      } else {
        return new Page([4, 5], undefined);
      }
    };

    const pageable = createAsyncPageable(pageFunc);
    const pages: Page<number>[] = [];

    for await (const page of pageable.asPages()) {
      pages.push(page);
    }

    expect(pages.length).toBe(2);
    expect(pages[0].values).toEqual([1, 2, 3]);
    expect(pages[0].continuationToken).toBe("page2");
    expect(pages[1].values).toEqual([4, 5]);
    expect(pages[1].continuationToken).toBeUndefined();
  });

  it("should handle single page with no continuation token", async () => {
    const pageFunc = async (): Promise<Page<string>> => {
      return new Page(["only-item"], undefined);
    };

    const pageable = createAsyncPageable(pageFunc);
    const items: string[] = [];

    for await (const item of pageable) {
      items.push(item);
    }

    expect(items).toEqual(["only-item"]);
  });

  it("should handle empty first page", async () => {
    const pageFunc = async (): Promise<Page<string>> => {
      return new Page([], undefined);
    };

    const pageable = createAsyncPageable(pageFunc);
    const items: string[] = [];

    for await (const item of pageable) {
      items.push(item);
    }

    expect(items).toEqual([]);
  });

  it("should pass continuation token to page function", async () => {
    const receivedTokens: (string | undefined)[] = [];
    const pageFunc = async (continuationToken?: string): Promise<Page<string>> => {
      receivedTokens.push(continuationToken);
      if (continuationToken === undefined) {
        return new Page(["a"], "token1");
      } else if (continuationToken === "token1") {
        return new Page(["b"], "token2");
      } else {
        return new Page(["c"], undefined);
      }
    };

    const pageable = createAsyncPageable(pageFunc);

    for await (const _ of pageable) {
      // consume iterator
    }

    expect(receivedTokens).toEqual([undefined, "token1", "token2"]);
  });

  it("should allow starting from a specific continuation token using asPages", async () => {
    const receivedTokens: (string | undefined)[] = [];
    const pageFunc = async (continuationToken?: string): Promise<Page<string>> => {
      receivedTokens.push(continuationToken);
      if (continuationToken === "startHere") {
        return new Page(["fromMiddle"], "nextToken");
      } else {
        return new Page(["end"], undefined);
      }
    };

    const pageable = createAsyncPageable(pageFunc);
    const pages: Page<string>[] = [];

    for await (const page of pageable.asPages("startHere")) {
      pages.push(page);
    }

    expect(receivedTokens).toEqual(["startHere", "nextToken"]);
    expect(pages[0].values).toEqual(["fromMiddle"]);
    expect(pages[1].values).toEqual(["end"]);
  });

  it("should pass page size hint to page function", async () => {
    let receivedPageSize: number | undefined;
    const pageFunc = async (_: string | undefined, pageSize?: number): Promise<Page<string>> => {
      receivedPageSize = pageSize;
      return new Page(["item"], undefined);
    };

    const pageable = createAsyncPageable(pageFunc);

    for await (const _ of pageable.asPages(undefined, 50)) {
      // consume iterator
    }

    expect(receivedPageSize).toBe(50);
  });
});

describe("OrchestrationQuery", () => {
  it("should have correct default page size", () => {
    expect(DEFAULT_PAGE_SIZE).toBe(100);
  });

  it("should allow creating query with all optional fields undefined", () => {
    const query: OrchestrationQuery = {};

    expect(query.createdFrom).toBeUndefined();
    expect(query.createdTo).toBeUndefined();
    expect(query.statuses).toBeUndefined();
    expect(query.taskHubNames).toBeUndefined();
    expect(query.instanceIdPrefix).toBeUndefined();
    expect(query.pageSize).toBeUndefined();
    expect(query.fetchInputsAndOutputs).toBeUndefined();
    expect(query.continuationToken).toBeUndefined();
  });

  it("should allow creating query with all fields populated", () => {
    const createdFrom = new Date("2024-01-01");
    const createdTo = new Date("2024-12-31");
    const query: OrchestrationQuery = {
      createdFrom,
      createdTo,
      statuses: [OrchestrationStatus.COMPLETED, OrchestrationStatus.RUNNING],
      taskHubNames: ["hub1", "hub2"],
      instanceIdPrefix: "prefix-",
      pageSize: 50,
      fetchInputsAndOutputs: true,
      continuationToken: "token123",
    };

    expect(query.createdFrom).toBe(createdFrom);
    expect(query.createdTo).toBe(createdTo);
    expect(query.statuses).toEqual([OrchestrationStatus.COMPLETED, OrchestrationStatus.RUNNING]);
    expect(query.taskHubNames).toEqual(["hub1", "hub2"]);
    expect(query.instanceIdPrefix).toBe("prefix-");
    expect(query.pageSize).toBe(50);
    expect(query.fetchInputsAndOutputs).toBe(true);
    expect(query.continuationToken).toBe("token123");
  });

  it("should support filtering by single status", () => {
    const query: OrchestrationQuery = {
      statuses: [OrchestrationStatus.FAILED],
    };

    expect(query.statuses?.length).toBe(1);
    expect(query.statuses?.[0]).toBe(OrchestrationStatus.FAILED);
  });

  it("should support all orchestration statuses", () => {
    const allStatuses = [
      OrchestrationStatus.RUNNING,
      OrchestrationStatus.COMPLETED,
      OrchestrationStatus.FAILED,
      OrchestrationStatus.TERMINATED,
      OrchestrationStatus.CONTINUED_AS_NEW,
      OrchestrationStatus.PENDING,
      OrchestrationStatus.SUSPENDED,
    ];

    const query: OrchestrationQuery = {
      statuses: allStatuses,
    };

    expect(query.statuses).toEqual(allStatuses);
  });
});

describe("ListInstanceIdsOptions", () => {
  it("should allow creating options with all fields undefined", () => {
    const options: ListInstanceIdsOptions = {};

    expect(options.runtimeStatus).toBeUndefined();
    expect(options.completedTimeFrom).toBeUndefined();
    expect(options.completedTimeTo).toBeUndefined();
    expect(options.pageSize).toBeUndefined();
    expect(options.lastInstanceKey).toBeUndefined();
  });

  it("should allow creating options with all fields populated", () => {
    const completedTimeFrom = new Date("2024-01-01");
    const completedTimeTo = new Date("2024-12-31");
    const options: ListInstanceIdsOptions = {
      runtimeStatus: [OrchestrationStatus.COMPLETED, OrchestrationStatus.FAILED],
      completedTimeFrom,
      completedTimeTo,
      pageSize: 25,
      lastInstanceKey: "key123",
    };

    expect(options.runtimeStatus).toEqual([OrchestrationStatus.COMPLETED, OrchestrationStatus.FAILED]);
    expect(options.completedTimeFrom).toBe(completedTimeFrom);
    expect(options.completedTimeTo).toBe(completedTimeTo);
    expect(options.pageSize).toBe(25);
    expect(options.lastInstanceKey).toBe("key123");
  });

  it("should support filtering by terminal statuses", () => {
    const terminalStatuses = [
      OrchestrationStatus.COMPLETED,
      OrchestrationStatus.FAILED,
      OrchestrationStatus.TERMINATED,
    ];

    const options: ListInstanceIdsOptions = {
      runtimeStatus: terminalStatuses,
    };

    expect(options.runtimeStatus).toEqual(terminalStatuses);
  });

  it("should allow pagination with just lastInstanceKey", () => {
    const options: ListInstanceIdsOptions = {
      lastInstanceKey: "someKey",
    };

    expect(options.lastInstanceKey).toBe("someKey");
    expect(options.pageSize).toBeUndefined();
  });
});

describe("OrchestrationState", () => {
  it("should create state with all required fields", () => {
    const state = new OrchestrationState(
      "instance-1",
      "TestOrchestration",
      OrchestrationStatus.COMPLETED,
      new Date("2024-01-01T00:00:00Z"),
      new Date("2024-01-01T01:00:00Z"),
    );

    expect(state.instanceId).toBe("instance-1");
    expect(state.name).toBe("TestOrchestration");
    expect(state.runtimeStatus).toBe(OrchestrationStatus.COMPLETED);
    expect(state.createdAt).toEqual(new Date("2024-01-01T00:00:00Z"));
    expect(state.lastUpdatedAt).toEqual(new Date("2024-01-01T01:00:00Z"));
    expect(state.serializedInput).toBeUndefined();
    expect(state.serializedOutput).toBeUndefined();
    expect(state.serializedCustomStatus).toBeUndefined();
    expect(state.failureDetails).toBeUndefined();
  });

  it("should create state with optional fields", () => {
    const state = new OrchestrationState(
      "instance-2",
      "TestOrchestration",
      OrchestrationStatus.COMPLETED,
      new Date("2024-01-01T00:00:00Z"),
      new Date("2024-01-01T01:00:00Z"),
      '{"input": "test"}',
      '{"output": "result"}',
      '{"status": "custom"}',
    );

    expect(state.serializedInput).toBe('{"input": "test"}');
    expect(state.serializedOutput).toBe('{"output": "result"}');
    expect(state.serializedCustomStatus).toBe('{"status": "custom"}');
  });

  it("should correctly indicate running status", () => {
    const state = new OrchestrationState(
      "instance-3",
      "TestOrchestration",
      OrchestrationStatus.RUNNING,
      new Date(),
      new Date(),
    );

    expect(state.runtimeStatus).toBe(OrchestrationStatus.RUNNING);
  });

  it("should correctly indicate failed status with failure details", () => {
    const failureDetails = new FailureDetails("Error", "Something went wrong", "stack trace");

    const state = new OrchestrationState(
      "instance-4",
      "TestOrchestration",
      OrchestrationStatus.FAILED,
      new Date(),
      new Date(),
      undefined,
      undefined,
      undefined,
      failureDetails,
    );

    expect(state.runtimeStatus).toBe(OrchestrationStatus.FAILED);
    expect(state.failureDetails).toBeDefined();
    expect(state.failureDetails?.message).toBe("Error");
    expect(state.failureDetails?.errorType).toBe("Something went wrong");
  });
});
