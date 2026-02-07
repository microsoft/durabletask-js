// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { EntityInstanceId } from "../src/entities/entity-instance-id";
import {
  EntityMetadata,
  createEntityMetadata,
  createEntityMetadataWithoutState,
} from "../src/entities/entity-metadata";

describe("EntityMetadata", () => {
  describe("createEntityMetadata", () => {
    it("should create metadata with state", () => {
      const id = new EntityInstanceId("counter", "user-123");
      const lastModified = new Date("2026-01-26T10:00:00Z");
      const state = { count: 42 };

      const metadata = createEntityMetadata(id, lastModified, 5, "orchestration-1", state);

      expect(metadata.id.equals(id)).toBe(true);
      expect(metadata.lastModifiedTime).toBe(lastModified);
      expect(metadata.backlogQueueSize).toBe(5);
      expect(metadata.lockedBy).toBe("orchestration-1");
      expect(metadata.includesState).toBe(true);
      expect(metadata.state).toEqual({ count: 42 });
    });

    it("should create metadata with primitive state", () => {
      const id = new EntityInstanceId("counter", "user-123");
      const metadata = createEntityMetadata<number>(id, new Date(), 0, undefined, 100);

      expect(metadata.includesState).toBe(true);
      expect(metadata.state).toBe(100);
    });

    it("should create metadata with null-ish state as not including state", () => {
      const id = new EntityInstanceId("counter", "user-123");
      const metadata = createEntityMetadata(id, new Date(), 0, undefined, undefined);

      expect(metadata.includesState).toBe(false);
    });

    it("should allow undefined lockedBy", () => {
      const id = new EntityInstanceId("counter", "user-123");
      const metadata = createEntityMetadata(id, new Date(), 0, undefined, "state");

      expect(metadata.lockedBy).toBeUndefined();
    });
  });

  describe("createEntityMetadataWithoutState", () => {
    it("should create metadata without state", () => {
      const id = new EntityInstanceId("counter", "user-123");
      const lastModified = new Date("2026-01-26T10:00:00Z");

      const metadata = createEntityMetadataWithoutState(id, lastModified, 3, "orch-1");

      expect(metadata.id.equals(id)).toBe(true);
      expect(metadata.lastModifiedTime).toBe(lastModified);
      expect(metadata.backlogQueueSize).toBe(3);
      expect(metadata.lockedBy).toBe("orch-1");
      expect(metadata.includesState).toBe(false);
    });

    it("should throw when accessing state", () => {
      const id = new EntityInstanceId("counter", "user-123");
      const metadata = createEntityMetadataWithoutState(id, new Date(), 0, undefined);

      expect(() => metadata.state).toThrow("Cannot retrieve state when includesState is false");
    });
  });

  describe("type safety", () => {
    it("should work with typed state", () => {
      interface CounterState {
        value: number;
        lastUpdated: string;
      }

      const id = new EntityInstanceId("counter", "user-123");
      const state: CounterState = { value: 42, lastUpdated: "2026-01-26" };
      const metadata: EntityMetadata<CounterState> = createEntityMetadata(
        id,
        new Date(),
        0,
        undefined,
        state
      );

      expect(metadata.state?.value).toBe(42);
      expect(metadata.state?.lastUpdated).toBe("2026-01-26");
    });

    it("should work with array state", () => {
      const id = new EntityInstanceId("list", "items");
      const state = [1, 2, 3, 4, 5];
      const metadata = createEntityMetadata<number[]>(id, new Date(), 0, undefined, state);

      expect(metadata.state).toEqual([1, 2, 3, 4, 5]);
    });
  });
});
