// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { DurableTaskSchedulerConnectionString } from "../../../src/scheduler/connection-string";

describe("DurableTaskSchedulerConnectionString", () => {
  const VALID_CONNECTION_STRING = "Endpoint=https://example.com;Authentication=ManagedIdentity;TaskHub=myTaskHub";

  describe("constructor", () => {
    it("should parse valid connection string", () => {
      const connectionString = new DurableTaskSchedulerConnectionString(VALID_CONNECTION_STRING);

      expect(connectionString.getEndpoint()).toBe("https://example.com");
      expect(connectionString.getAuthentication()).toBe("ManagedIdentity");
      expect(connectionString.getTaskHubName()).toBe("myTaskHub");
    });

    it("should handle connection string with whitespace", () => {
      const connectionStringWithSpaces =
        "Endpoint = https://example.com ; Authentication = ManagedIdentity ; TaskHub = myTaskHub";

      const connectionString = new DurableTaskSchedulerConnectionString(connectionStringWithSpaces);

      expect(connectionString.getEndpoint()).toBe("https://example.com");
      expect(connectionString.getAuthentication()).toBe("ManagedIdentity");
      expect(connectionString.getTaskHubName()).toBe("myTaskHub");
    });

    it("should throw for null connection string", () => {
      expect(() => new DurableTaskSchedulerConnectionString(null as unknown as string)).toThrow(
        "connectionString must not be null or empty",
      );
    });

    it("should throw for empty connection string", () => {
      expect(() => new DurableTaskSchedulerConnectionString("")).toThrow("connectionString must not be null or empty");
    });

    it("should throw for whitespace-only connection string", () => {
      expect(() => new DurableTaskSchedulerConnectionString("   ")).toThrow(
        "connectionString must not be null or empty",
      );
    });

    it("should throw when missing required Endpoint property", () => {
      const missingEndpoint = "Authentication=ManagedIdentity;TaskHub=myTaskHub";

      expect(() => new DurableTaskSchedulerConnectionString(missingEndpoint)).toThrow(
        "The connection string must contain a Endpoint property",
      );
    });

    it("should throw when missing required Authentication property", () => {
      const missingAuthentication = "Endpoint=https://example.com;TaskHub=myTaskHub";

      expect(() => new DurableTaskSchedulerConnectionString(missingAuthentication)).toThrow(
        "The connection string must contain a Authentication property",
      );
    });

    it("should throw when missing required TaskHub property", () => {
      const missingTaskHub = "Endpoint=https://example.com;Authentication=ManagedIdentity";

      expect(() => new DurableTaskSchedulerConnectionString(missingTaskHub)).toThrow(
        "The connection string must contain a TaskHub property",
      );
    });
  });

  describe("getAdditionallyAllowedTenants", () => {
    it("should return split comma-separated values", () => {
      const connectionStringWithTenants =
        VALID_CONNECTION_STRING + ";AdditionallyAllowedTenants=tenant1,tenant2,tenant3";

      const connectionString = new DurableTaskSchedulerConnectionString(connectionStringWithTenants);
      const tenants = connectionString.getAdditionallyAllowedTenants();

      expect(tenants).not.toBeNull();
      expect(tenants).toHaveLength(3);
      expect(tenants).toEqual(["tenant1", "tenant2", "tenant3"]);
    });

    it("should return undefined when property not present", () => {
      const connectionString = new DurableTaskSchedulerConnectionString(VALID_CONNECTION_STRING);

      expect(connectionString.getAdditionallyAllowedTenants()).toBeUndefined();
    });
  });

  describe("getClientId", () => {
    it("should return correct value when present", () => {
      const connectionStringWithClientId = VALID_CONNECTION_STRING + ";ClientID=my-client-id";

      const connectionString = new DurableTaskSchedulerConnectionString(connectionStringWithClientId);

      expect(connectionString.getClientId()).toBe("my-client-id");
    });

    it("should return undefined when not present", () => {
      const connectionString = new DurableTaskSchedulerConnectionString(VALID_CONNECTION_STRING);

      expect(connectionString.getClientId()).toBeUndefined();
    });
  });

  describe("getTenantId", () => {
    it("should return correct value when present", () => {
      const connectionStringWithTenantId = VALID_CONNECTION_STRING + ";TenantId=my-tenant-id";

      const connectionString = new DurableTaskSchedulerConnectionString(connectionStringWithTenantId);

      expect(connectionString.getTenantId()).toBe("my-tenant-id");
    });

    it("should return undefined when not present", () => {
      const connectionString = new DurableTaskSchedulerConnectionString(VALID_CONNECTION_STRING);

      expect(connectionString.getTenantId()).toBeUndefined();
    });
  });

  describe("getTokenFilePath", () => {
    it("should return correct value when present", () => {
      const connectionStringWithTokenFilePath = VALID_CONNECTION_STRING + ";TokenFilePath=/path/to/token";

      const connectionString = new DurableTaskSchedulerConnectionString(connectionStringWithTokenFilePath);

      expect(connectionString.getTokenFilePath()).toBe("/path/to/token");
    });

    it("should return undefined when not present", () => {
      const connectionString = new DurableTaskSchedulerConnectionString(VALID_CONNECTION_STRING);

      expect(connectionString.getTokenFilePath()).toBeUndefined();
    });
  });

  describe("authentication types", () => {
    const authenticationTypes = [
      "DefaultAzure",
      "ManagedIdentity",
      "WorkloadIdentity",
      "Environment",
      "AzureCli",
      "AzurePowerShell",
      "VisualStudioCode",
      "InteractiveBrowser",
      "None",
    ];

    authenticationTypes.forEach((authType) => {
      it(`should accept ${authType} authentication type`, () => {
        const connectionStringWithAuthType = `Endpoint=https://example.com;Authentication=${authType};TaskHub=myTaskHub`;

        const connectionString = new DurableTaskSchedulerConnectionString(connectionStringWithAuthType);

        expect(connectionString.getAuthentication()).toBe(authType);
      });
    });
  });
});
