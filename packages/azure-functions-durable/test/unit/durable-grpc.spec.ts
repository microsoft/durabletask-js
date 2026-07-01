// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { addDurableGrpcMetadata } from "../../src/durable-grpc";

describe("addDurableGrpcMetadata", () => {
  it("adds durableRequiresGrpc without mutating the original binding", () => {
    const binding = { type: "orchestrationTrigger", name: "context" };

    const actual = addDurableGrpcMetadata(binding);

    expect(actual).toEqual({
      type: "orchestrationTrigger",
      name: "context",
      durableRequiresGrpc: true,
    });
    expect(binding).toEqual({ type: "orchestrationTrigger", name: "context" });
  });
});
