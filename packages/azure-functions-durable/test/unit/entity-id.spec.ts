// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { EntityInstanceId } from "@microsoft/durabletask-js";
import { EntityId } from "../../src/entity-id";

describe("EntityId", () => {
  it("constructs a classic v3 entity id, lowercasing the name and preserving the key", () => {
    const id = new EntityId("Counter", "User-1");

    expect(id.name).toBe("counter");
    expect(id.key).toBe("User-1");
    expect(id.toString()).toBe("@counter@User-1");
  });

  it("is an EntityInstanceId so it works with the core entity APIs", () => {
    expect(new EntityId("Counter", "k")).toBeInstanceOf(EntityInstanceId);
  });
});
