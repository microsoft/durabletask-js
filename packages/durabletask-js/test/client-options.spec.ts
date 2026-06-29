// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
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

    it("should accept endpoint alias and task hub metadata option", async () => {
      const client = new TaskHubGrpcClient({
        endpoint: "localhost:4001",
        taskHub: "functions-taskhub",
      });

      const metadata = await (client as any)._metadataGenerator();

      expect(metadata.get("taskhub")).toEqual(["functions-taskhub"]);
    });

    it("should preserve taskhub from custom metadata generator", async () => {
      const client = new TaskHubGrpcClient({
        endpoint: "localhost:4001",
        taskHub: "options-taskhub",
        metadataGenerator: async () => {
          const metadata = new grpc.Metadata();
          metadata.set("taskhub", "custom-taskhub");
          metadata.set("x-test", "value");
          return metadata;
        },
      });

      const metadata = await (client as any)._metadataGenerator();

      expect(metadata.get("taskhub")).toEqual(["custom-taskhub"]);
      expect(metadata.get("x-test")).toEqual(["value"]);
    });
  });
});
