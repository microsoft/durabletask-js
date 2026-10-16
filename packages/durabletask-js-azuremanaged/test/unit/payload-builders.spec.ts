// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { PayloadStore, NoOpLogger } from "@microsoft/durabletask-js";
import { DurableTaskAzureManagedClientBuilder, DurableTaskAzureManagedWorkerBuilder } from "../../src";
import * as pb from "../../../durabletask-js/src/proto/orchestrator_service_pb";

class Store extends PayloadStore {
  async upload(): Promise<string> {
    return "external:payload";
  }
  async download(): Promise<string> {
    return '"resolved"';
  }
  isKnownPayloadToken(value: string): boolean {
    return value.startsWith("external:");
  }
}

describe("Azure-managed payload configuration", () => {
  it("preserves client payload settings when connection options are replaced", async () => {
    const client = new DurableTaskAzureManagedClientBuilder()
      .useExternalizedPayloads({ store: new Store(), thresholdBytes: 1 })
      .connectionString("Endpoint=http://localhost:8080;Authentication=None;TaskHub=payload-test")
      .logger(new NoOpLogger())
      .build();
    expect(client["_payloads"]).toBeDefined();
    await client.stop();
  });
  it("preserves worker payload settings and business registrations", () => {
    const worker = new DurableTaskAzureManagedWorkerBuilder()
      .useExternalizedPayloads({ store: new Store() })
      .addNamedOrchestrator("business", () => undefined)
      .connectionString("Endpoint=http://localhost:8080;Authentication=None;TaskHub=payload-test")
      .useWorkItemFilters()
      .build();
    const request = worker["_buildGetWorkItemsRequest"]();
    expect(request.getCapabilitiesList()).toContain(pb.WorkerCapability.WORKER_CAPABILITY_LARGE_PAYLOADS);
    expect(
      request
        .getWorkitemfilters()!
        .getOrchestrationsList()
        .map((f) => f.getName()),
    ).toEqual(["business"]);
  });
});
