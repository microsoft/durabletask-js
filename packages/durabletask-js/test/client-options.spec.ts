// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TaskHubGrpcClient, TaskHubGrpcClientOptions } from "../src";

describe("TaskHubGrpcClient", () => {
  describe("constructor with options", () => {
    it("should accept default version option", () => {
      const options: TaskHubGrpcClientOptions = {
        hostAddress: "localhost:4001",
        defaultVersion: "1.0.0",
      };

      // This should not throw
      const client = new TaskHubGrpcClient(options);

      expect(client).toBeDefined();
    });

    it("should work without default version option", () => {
      const options: TaskHubGrpcClientOptions = {
        hostAddress: "localhost:4001",
      };

      const client = new TaskHubGrpcClient(options);

      expect(client).toBeDefined();
    });

    it("should accept all standard options", () => {
      const options: TaskHubGrpcClientOptions = {
        hostAddress: "localhost:4001",
        useTLS: false,
        defaultVersion: "2.0.0",
      };

      const client = new TaskHubGrpcClient(options);

      expect(client).toBeDefined();
    });
  });
});
