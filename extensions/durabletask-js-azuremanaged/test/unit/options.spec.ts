// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  DurableTaskAzureManagedClientOptions,
  DurableTaskAzureManagedWorkerOptions,
} from "../../src/options";
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

describe("Options", () => {
  const VALID_CONNECTION_STRING = "Endpoint=https://example.com;Authentication=None;TaskHub=myTaskHub";
  const VALID_ENDPOINT = "https://example.com";
  const VALID_TASKHUB = "myTaskHub";
  const CUSTOM_RESOURCE_ID = "https://custom.resource";
  const CUSTOM_REFRESH_MARGIN = 10 * 60 * 1000; // 10 minutes in ms

  describe("DurableTaskAzureManagedClientOptions", () => {
    describe("fromConnectionString", () => {
      it("should create valid options from connection string", () => {
        const options = DurableTaskAzureManagedClientOptions.fromConnectionString(VALID_CONNECTION_STRING);

        expect(options.getEndpointAddress()).toBe(VALID_ENDPOINT);
        expect(options.getTaskHubName()).toBe(VALID_TASKHUB);
      });
    });

    describe("setEndpointAddress", () => {
      it("should update endpoint", () => {
        const options = new DurableTaskAzureManagedClientOptions();

        options.setEndpointAddress(VALID_ENDPOINT);

        expect(options.getEndpointAddress()).toBe(VALID_ENDPOINT);
      });

      it("should return this for method chaining", () => {
        const options = new DurableTaskAzureManagedClientOptions();

        const result = options.setEndpointAddress(VALID_ENDPOINT);

        expect(result).toBe(options);
      });
    });

    describe("setTaskHubName", () => {
      it("should update task hub name", () => {
        const options = new DurableTaskAzureManagedClientOptions();

        options.setTaskHubName(VALID_TASKHUB);

        expect(options.getTaskHubName()).toBe(VALID_TASKHUB);
      });

      it("should return this for method chaining", () => {
        const options = new DurableTaskAzureManagedClientOptions();

        const result = options.setTaskHubName(VALID_TASKHUB);

        expect(result).toBe(options);
      });
    });

    describe("setCredential", () => {
      it("should update credential", () => {
        const options = new DurableTaskAzureManagedClientOptions();
        const mockCredential = new MockTokenCredential();

        options.setCredential(mockCredential);

        expect(options.getCredential()).toBe(mockCredential);
      });

      it("should return this for method chaining", () => {
        const options = new DurableTaskAzureManagedClientOptions();

        const result = options.setCredential(null);

        expect(result).toBe(options);
      });
    });

    describe("setResourceId", () => {
      it("should update resource ID", () => {
        const options = new DurableTaskAzureManagedClientOptions();

        options.setResourceId(CUSTOM_RESOURCE_ID);

        expect(options.getResourceId()).toBe(CUSTOM_RESOURCE_ID);
      });

      it("should have default resource ID", () => {
        const options = new DurableTaskAzureManagedClientOptions();

        expect(options.getResourceId()).toBe("https://durabletask.io");
      });
    });

    describe("setAllowInsecureCredentials", () => {
      it("should update insecure credentials flag", () => {
        const options = new DurableTaskAzureManagedClientOptions();

        options.setAllowInsecureCredentials(true);

        expect(options.isAllowInsecureCredentials()).toBe(true);
      });

      it("should default to false", () => {
        const options = new DurableTaskAzureManagedClientOptions();

        expect(options.isAllowInsecureCredentials()).toBe(false);
      });
    });

    describe("setTokenRefreshMargin", () => {
      it("should update token refresh margin", () => {
        const options = new DurableTaskAzureManagedClientOptions();

        options.setTokenRefreshMargin(CUSTOM_REFRESH_MARGIN);

        expect(options.getTokenRefreshMargin()).toBe(CUSTOM_REFRESH_MARGIN);
      });

      it("should have default token refresh margin of 5 minutes", () => {
        const options = new DurableTaskAzureManagedClientOptions();

        expect(options.getTokenRefreshMargin()).toBe(5 * 60 * 1000);
      });
    });

    describe("getHostAddress", () => {
      it("should parse https endpoint correctly", () => {
        const options = new DurableTaskAzureManagedClientOptions().setEndpointAddress("https://example.com");

        expect(options.getHostAddress()).toBe("example.com");
      });

      it("should handle endpoint without protocol by adding https", () => {
        const options = new DurableTaskAzureManagedClientOptions().setEndpointAddress("example.com");

        expect(options.getHostAddress()).toBe("example.com");
      });

      it("should handle endpoint with port", () => {
        const options = new DurableTaskAzureManagedClientOptions().setEndpointAddress("https://example.com:8080");

        expect(options.getHostAddress()).toBe("example.com:8080");
      });

      it("should throw for invalid URL", () => {
        const options = new DurableTaskAzureManagedClientOptions().setEndpointAddress("invalid:url");

        expect(() => options.getHostAddress()).toThrow("Invalid endpoint URL:");
      });
    });

    describe("createChannelCredentials", () => {
      it("should create credentials when allowInsecure is false", () => {
        const options = new DurableTaskAzureManagedClientOptions()
          .setEndpointAddress(VALID_ENDPOINT)
          .setTaskHubName(VALID_TASKHUB)
          .setAllowInsecureCredentials(false);

        const credentials = options.createChannelCredentials();

        expect(credentials).toBeDefined();
      });

      it("should create credentials when allowInsecure is true", () => {
        const options = new DurableTaskAzureManagedClientOptions()
          .setEndpointAddress(VALID_ENDPOINT)
          .setTaskHubName(VALID_TASKHUB)
          .setAllowInsecureCredentials(true);

        const credentials = options.createChannelCredentials();

        expect(credentials).toBeDefined();
      });
    });

    describe("createMetadataGenerator", () => {
      it("should create a metadata generator function", () => {
        const options = new DurableTaskAzureManagedClientOptions()
          .setEndpointAddress(VALID_ENDPOINT)
          .setTaskHubName(VALID_TASKHUB);

        const generator = options.createMetadataGenerator();

        expect(typeof generator).toBe("function");
      });

      it("should include task hub name in metadata", (done) => {
        const options = new DurableTaskAzureManagedClientOptions()
          .setEndpointAddress(VALID_ENDPOINT)
          .setTaskHubName(VALID_TASKHUB);

        const generator = options.createMetadataGenerator();

        generator({ service_url: "https://example.com" }, (error, metadata) => {
          expect(error).toBeNull();
          expect(metadata).toBeDefined();
          expect(metadata?.get("taskhub")).toContain(VALID_TASKHUB);
          done();
        });
      });

      it("should include authorization header when credential is set", (done) => {
        const mockCredential = new MockTokenCredential();
        const options = new DurableTaskAzureManagedClientOptions()
          .setEndpointAddress(VALID_ENDPOINT)
          .setTaskHubName(VALID_TASKHUB)
          .setCredential(mockCredential);

        const generator = options.createMetadataGenerator();

        generator({ service_url: "https://example.com" }, (error, metadata) => {
          expect(error).toBeNull();
          expect(metadata).toBeDefined();
          const authHeader = metadata?.get("Authorization");
          expect(authHeader).toBeDefined();
          expect(authHeader?.[0]).toContain("Bearer");
          done();
        });
      });

      it("should NOT include workerid header in metadata (client only)", (done) => {
        const options = new DurableTaskAzureManagedClientOptions()
          .setEndpointAddress(VALID_ENDPOINT)
          .setTaskHubName(VALID_TASKHUB);

        const generator = options.createMetadataGenerator();

        generator({ service_url: "https://example.com" }, (error, metadata) => {
          expect(error).toBeNull();
          expect(metadata).toBeDefined();
          // Client should NOT have workerid header
          expect(metadata?.get("workerid")).toEqual([]);
          done();
        });
      });
    });
  });

  describe("DurableTaskAzureManagedWorkerOptions", () => {
    describe("fromConnectionString", () => {
      it("should create valid options from connection string", () => {
        const options = DurableTaskAzureManagedWorkerOptions.fromConnectionString(VALID_CONNECTION_STRING);

        expect(options.getEndpointAddress()).toBe(VALID_ENDPOINT);
        expect(options.getTaskHubName()).toBe(VALID_TASKHUB);
      });
    });

    describe("workerId", () => {
      it("should generate a default workerId", () => {
        const options = new DurableTaskAzureManagedWorkerOptions();

        expect(options.getWorkerId()).toBeDefined();
        expect(options.getWorkerId().length).toBeGreaterThan(0);
      });

      it("should allow setting a custom workerId", () => {
        const options = new DurableTaskAzureManagedWorkerOptions();
        const customWorkerId = "custom-worker-123";

        options.setWorkerId(customWorkerId);

        expect(options.getWorkerId()).toBe(customWorkerId);
      });

      it("should return this for method chaining", () => {
        const options = new DurableTaskAzureManagedWorkerOptions();

        const result = options.setWorkerId("test");

        expect(result).toBe(options);
      });
    });

    describe("createMetadataGenerator", () => {
      it("should include workerid header in metadata", (done) => {
        const options = new DurableTaskAzureManagedWorkerOptions()
          .setEndpointAddress(VALID_ENDPOINT)
          .setTaskHubName(VALID_TASKHUB)
          .setWorkerId("test-worker");

        const generator = options.createMetadataGenerator();

        generator({ service_url: "https://example.com" }, (error, metadata) => {
          expect(error).toBeNull();
          expect(metadata).toBeDefined();
          expect(metadata?.get("workerid")).toContain("test-worker");
          done();
        });
      });

      it("should include x-user-agent header with DurableTaskWorker", (done) => {
        const options = new DurableTaskAzureManagedWorkerOptions()
          .setEndpointAddress(VALID_ENDPOINT)
          .setTaskHubName(VALID_TASKHUB);

        const generator = options.createMetadataGenerator();

        generator({ service_url: "https://example.com" }, (error, metadata) => {
          expect(error).toBeNull();
          expect(metadata).toBeDefined();
          const userAgentHeader = metadata?.get("x-user-agent");
          expect(userAgentHeader).toBeDefined();
          expect(userAgentHeader?.[0]).toContain("DurableTaskWorker");
          done();
        });
      });
    });
  });
});
