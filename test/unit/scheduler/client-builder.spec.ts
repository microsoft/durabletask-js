// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { DurableTaskSchedulerClientBuilder, createSchedulerClient } from "../../../src/scheduler/client-builder";
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

describe("DurableTaskSchedulerClientBuilder", () => {
  const VALID_CONNECTION_STRING = "Endpoint=https://example.com;Authentication=None;TaskHub=myTaskHub";
  const VALID_ENDPOINT = "https://example.com";
  const VALID_TASKHUB = "myTaskHub";

  describe("connectionString", () => {
    it("should configure builder with connection string", () => {
      const builder = new DurableTaskSchedulerClientBuilder();

      const result = builder.connectionString(VALID_CONNECTION_STRING);

      expect(result).toBe(builder);
    });

    it("should throw for null connection string", () => {
      const builder = new DurableTaskSchedulerClientBuilder();

      expect(() => builder.connectionString(null as unknown as string)).toThrow(
        "connectionString must not be null or empty",
      );
    });

    it("should throw for empty connection string", () => {
      const builder = new DurableTaskSchedulerClientBuilder();

      expect(() => builder.connectionString("")).toThrow("connectionString must not be null or empty");
    });
  });

  describe("endpoint", () => {
    it("should configure builder with explicit parameters", () => {
      const builder = new DurableTaskSchedulerClientBuilder();
      const mockCredential = new MockTokenCredential();

      const result = builder.endpoint(VALID_ENDPOINT, VALID_TASKHUB, mockCredential);

      expect(result).toBe(builder);
    });

    it("should throw for null endpoint", () => {
      const builder = new DurableTaskSchedulerClientBuilder();

      expect(() => builder.endpoint(null as unknown as string, VALID_TASKHUB)).toThrow(
        "endpoint must not be null or empty",
      );
    });

    it("should throw for empty endpoint", () => {
      const builder = new DurableTaskSchedulerClientBuilder();

      expect(() => builder.endpoint("", VALID_TASKHUB)).toThrow("endpoint must not be null or empty");
    });

    it("should throw for null task hub name", () => {
      const builder = new DurableTaskSchedulerClientBuilder();

      expect(() => builder.endpoint(VALID_ENDPOINT, null as unknown as string)).toThrow(
        "taskHubName must not be null or empty",
      );
    });

    it("should throw for empty task hub name", () => {
      const builder = new DurableTaskSchedulerClientBuilder();

      expect(() => builder.endpoint(VALID_ENDPOINT, "")).toThrow("taskHubName must not be null or empty");
    });

    it("should allow null credential for anonymous access", () => {
      const builder = new DurableTaskSchedulerClientBuilder();

      expect(() => builder.endpoint(VALID_ENDPOINT, VALID_TASKHUB, null)).not.toThrow();
    });

    it("should allow undefined credential for anonymous access", () => {
      const builder = new DurableTaskSchedulerClientBuilder();

      expect(() => builder.endpoint(VALID_ENDPOINT, VALID_TASKHUB)).not.toThrow();
    });
  });

  describe("resourceId", () => {
    it("should configure resource ID", () => {
      const builder = new DurableTaskSchedulerClientBuilder();

      const result = builder.resourceId("https://custom.resource");

      expect(result).toBe(builder);
    });
  });

  describe("tokenRefreshMargin", () => {
    it("should configure token refresh margin", () => {
      const builder = new DurableTaskSchedulerClientBuilder();

      const result = builder.tokenRefreshMargin(10 * 60 * 1000);

      expect(result).toBe(builder);
    });
  });

  describe("allowInsecureCredentials", () => {
    it("should configure insecure credentials flag", () => {
      const builder = new DurableTaskSchedulerClientBuilder();

      const result = builder.allowInsecureCredentials(true);

      expect(result).toBe(builder);
    });
  });

  describe("grpcChannelOptions", () => {
    it("should configure gRPC channel options", () => {
      const builder = new DurableTaskSchedulerClientBuilder();

      const result = builder.grpcChannelOptions({ "grpc.keepalive_time_ms": 10000 });

      expect(result).toBe(builder);
    });
  });

  describe("build", () => {
    it("should build a client with connection string", () => {
      const builder = new DurableTaskSchedulerClientBuilder();

      const client = builder.connectionString(VALID_CONNECTION_STRING).build();

      expect(client).toBeDefined();
    });

    it("should build a client with explicit parameters", () => {
      const builder = new DurableTaskSchedulerClientBuilder();

      const client = builder.endpoint(VALID_ENDPOINT, VALID_TASKHUB).allowInsecureCredentials(true).build();

      expect(client).toBeDefined();
    });
  });
});

describe("createSchedulerClient", () => {
  const VALID_CONNECTION_STRING = "Endpoint=https://example.com;Authentication=None;TaskHub=myTaskHub";
  const VALID_ENDPOINT = "https://example.com";
  const VALID_TASKHUB = "myTaskHub";

  it("should create client with connection string", () => {
    const client = createSchedulerClient(VALID_CONNECTION_STRING);

    expect(client).toBeDefined();
  });

  it("should create client with explicit parameters", () => {
    const mockCredential = new MockTokenCredential();

    const client = createSchedulerClient(VALID_ENDPOINT, VALID_TASKHUB, mockCredential);

    expect(client).toBeDefined();
  });

  it("should create client with null credential", () => {
    const client = createSchedulerClient(VALID_ENDPOINT, VALID_TASKHUB, null);

    expect(client).toBeDefined();
  });
});
