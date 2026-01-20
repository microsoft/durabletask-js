// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { DurableTaskSchedulerWorkerBuilder, createSchedulerWorkerBuilder } from "../../../src/scheduler/worker-builder";
import { TokenCredential, AccessToken, GetTokenOptions } from "@azure/identity";

// Mock TokenCredential for testing
class MockTokenCredential implements TokenCredential {
  async getToken(_scopes: string | string[], _options?: GetTokenOptions): Promise<AccessToken | null> {
    return {
      token: "mock-token",
      expiresOnTimestamp: Date.now() + 3600000, // 1 hour from now
    };
  }
}

describe("DurableTaskSchedulerWorkerBuilder", () => {
  const VALID_CONNECTION_STRING = "Endpoint=https://example.com;Authentication=None;TaskHub=myTaskHub";
  const VALID_ENDPOINT = "https://example.com";
  const VALID_TASKHUB = "myTaskHub";

  describe("connectionString", () => {
    it("should configure builder with connection string", () => {
      const builder = new DurableTaskSchedulerWorkerBuilder();

      const result = builder.connectionString(VALID_CONNECTION_STRING);

      expect(result).toBe(builder);
    });

    it("should throw for null connection string", () => {
      const builder = new DurableTaskSchedulerWorkerBuilder();

      expect(() => builder.connectionString(null as unknown as string)).toThrow(
        "connectionString must not be null or empty",
      );
    });

    it("should throw for empty connection string", () => {
      const builder = new DurableTaskSchedulerWorkerBuilder();

      expect(() => builder.connectionString("")).toThrow("connectionString must not be null or empty");
    });
  });

  describe("endpoint", () => {
    it("should configure builder with explicit parameters", () => {
      const builder = new DurableTaskSchedulerWorkerBuilder();
      const mockCredential = new MockTokenCredential();

      const result = builder.endpoint(VALID_ENDPOINT, VALID_TASKHUB, mockCredential);

      expect(result).toBe(builder);
    });

    it("should throw for null endpoint", () => {
      const builder = new DurableTaskSchedulerWorkerBuilder();

      expect(() => builder.endpoint(null as unknown as string, VALID_TASKHUB)).toThrow(
        "endpoint must not be null or empty",
      );
    });

    it("should throw for empty endpoint", () => {
      const builder = new DurableTaskSchedulerWorkerBuilder();

      expect(() => builder.endpoint("", VALID_TASKHUB)).toThrow("endpoint must not be null or empty");
    });

    it("should throw for null task hub name", () => {
      const builder = new DurableTaskSchedulerWorkerBuilder();

      expect(() => builder.endpoint(VALID_ENDPOINT, null as unknown as string)).toThrow(
        "taskHubName must not be null or empty",
      );
    });

    it("should throw for empty task hub name", () => {
      const builder = new DurableTaskSchedulerWorkerBuilder();

      expect(() => builder.endpoint(VALID_ENDPOINT, "")).toThrow("taskHubName must not be null or empty");
    });

    it("should allow null credential for anonymous access", () => {
      const builder = new DurableTaskSchedulerWorkerBuilder();

      expect(() => builder.endpoint(VALID_ENDPOINT, VALID_TASKHUB, null)).not.toThrow();
    });

    it("should allow undefined credential for anonymous access", () => {
      const builder = new DurableTaskSchedulerWorkerBuilder();

      expect(() => builder.endpoint(VALID_ENDPOINT, VALID_TASKHUB)).not.toThrow();
    });
  });

  describe("resourceId", () => {
    it("should configure resource ID", () => {
      const builder = new DurableTaskSchedulerWorkerBuilder();

      const result = builder.resourceId("https://custom.resource");

      expect(result).toBe(builder);
    });
  });

  describe("tokenRefreshMargin", () => {
    it("should configure token refresh margin", () => {
      const builder = new DurableTaskSchedulerWorkerBuilder();

      const result = builder.tokenRefreshMargin(10 * 60 * 1000);

      expect(result).toBe(builder);
    });
  });

  describe("allowInsecureCredentials", () => {
    it("should configure insecure credentials flag", () => {
      const builder = new DurableTaskSchedulerWorkerBuilder();

      const result = builder.allowInsecureCredentials(true);

      expect(result).toBe(builder);
    });
  });

  describe("grpcChannelOptions", () => {
    it("should configure gRPC channel options", () => {
      const builder = new DurableTaskSchedulerWorkerBuilder();

      const result = builder.grpcChannelOptions({ "grpc.keepalive_time_ms": 10000 });

      expect(result).toBe(builder);
    });
  });

  describe("addOrchestrator", () => {
    it("should add orchestrator", () => {
      const builder = new DurableTaskSchedulerWorkerBuilder();
      const orchestrator = function* testOrchestrator() {
        yield;
      };

      const result = builder.addOrchestrator(orchestrator);

      expect(result).toBe(builder);
    });
  });

  describe("addNamedOrchestrator", () => {
    it("should add named orchestrator", () => {
      const builder = new DurableTaskSchedulerWorkerBuilder();
      const orchestrator = function* testOrchestrator() {
        yield;
      };

      const result = builder.addNamedOrchestrator("TestOrchestrator", orchestrator);

      expect(result).toBe(builder);
    });
  });

  describe("addActivity", () => {
    it("should add activity", () => {
      const builder = new DurableTaskSchedulerWorkerBuilder();
      const activity = () => "result";

      const result = builder.addActivity(activity);

      expect(result).toBe(builder);
    });
  });

  describe("addNamedActivity", () => {
    it("should add named activity", () => {
      const builder = new DurableTaskSchedulerWorkerBuilder();
      const activity = () => "result";

      const result = builder.addNamedActivity("TestActivity", activity);

      expect(result).toBe(builder);
    });
  });

  describe("build", () => {
    it("should build a worker with connection string", () => {
      const builder = new DurableTaskSchedulerWorkerBuilder();

      const worker = builder.connectionString(VALID_CONNECTION_STRING).build();

      expect(worker).toBeDefined();
    });

    it("should build a worker with explicit parameters", () => {
      const builder = new DurableTaskSchedulerWorkerBuilder();

      const worker = builder.endpoint(VALID_ENDPOINT, VALID_TASKHUB).allowInsecureCredentials(true).build();

      expect(worker).toBeDefined();
    });

    it("should register orchestrators and activities", () => {
      const builder = new DurableTaskSchedulerWorkerBuilder();
      const orchestrator = function* testOrchestrator() {
        yield;
      };
      const activity = () => "result";

      const worker = builder
        .connectionString(VALID_CONNECTION_STRING)
        .addOrchestrator(orchestrator)
        .addActivity(activity)
        .build();

      expect(worker).toBeDefined();
    });
  });
});

describe("createSchedulerWorkerBuilder", () => {
  const VALID_CONNECTION_STRING = "Endpoint=https://example.com;Authentication=None;TaskHub=myTaskHub";
  const VALID_ENDPOINT = "https://example.com";
  const VALID_TASKHUB = "myTaskHub";

  it("should create builder with connection string", () => {
    const builder = createSchedulerWorkerBuilder(VALID_CONNECTION_STRING);

    expect(builder).toBeDefined();
    expect(builder).toBeInstanceOf(DurableTaskSchedulerWorkerBuilder);
  });

  it("should create builder with explicit parameters", () => {
    const mockCredential = new MockTokenCredential();

    const builder = createSchedulerWorkerBuilder(VALID_ENDPOINT, VALID_TASKHUB, mockCredential);

    expect(builder).toBeDefined();
    expect(builder).toBeInstanceOf(DurableTaskSchedulerWorkerBuilder);
  });

  it("should create builder with null credential", () => {
    const builder = createSchedulerWorkerBuilder(VALID_ENDPOINT, VALID_TASKHUB, null);

    expect(builder).toBeDefined();
    expect(builder).toBeInstanceOf(DurableTaskSchedulerWorkerBuilder);
  });
});
