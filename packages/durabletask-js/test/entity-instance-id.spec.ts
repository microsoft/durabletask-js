// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { EntityInstanceId } from "../src/entities/entity-instance-id";

describe("EntityInstanceId", () => {
  describe("constructor", () => {
    it("should normalize name to lowercase", () => {
      const entityId = new EntityInstanceId("Counter", "key1");
      expect(entityId.name).toBe("counter");
    });

    it("should normalize mixed case name to lowercase", () => {
      const entityId = new EntityInstanceId("MyCounterEntity", "key1");
      expect(entityId.name).toBe("mycounterentity");
    });

    it("should preserve key case", () => {
      const entityId = new EntityInstanceId("counter", "MyKey-123");
      expect(entityId.key).toBe("MyKey-123");
    });

    it("should allow empty key", () => {
      const entityId = new EntityInstanceId("counter", "");
      expect(entityId.key).toBe("");
    });

    it("should throw error when name contains '@'", () => {
      expect(() => new EntityInstanceId("counter@invalid", "key1")).toThrow(
        "Entity names may not contain '@' characters."
      );
    });

    it("should throw error when name is empty", () => {
      expect(() => new EntityInstanceId("", "key1")).toThrow("Entity name must not be empty.");
    });

    it("should throw error when key is null", () => {
      expect(() => new EntityInstanceId("counter", null as any)).toThrow(
        "Entity key must not be null or undefined."
      );
    });

    it("should throw error when key is undefined", () => {
      expect(() => new EntityInstanceId("counter", undefined as any)).toThrow(
        "Entity key must not be null or undefined."
      );
    });
  });

  describe("toString", () => {
    it("should return correct format @name@key", () => {
      const entityId = new EntityInstanceId("counter", "user-123");
      expect(entityId.toString()).toBe("@counter@user-123");
    });

    it("should use lowercase name in output", () => {
      const entityId = new EntityInstanceId("Counter", "Key1");
      expect(entityId.toString()).toBe("@counter@Key1");
    });

    it("should handle empty key", () => {
      const entityId = new EntityInstanceId("counter", "");
      expect(entityId.toString()).toBe("@counter@");
    });

    it("should handle key with special characters", () => {
      const entityId = new EntityInstanceId("counter", "user/123:abc");
      expect(entityId.toString()).toBe("@counter@user/123:abc");
    });

    it("should handle key containing '@'", () => {
      const entityId = new EntityInstanceId("counter", "user@domain.com");
      expect(entityId.toString()).toBe("@counter@user@domain.com");
    });
  });

  describe("fromString", () => {
    it("should parse valid entity ID", () => {
      const entityId = EntityInstanceId.fromString("@counter@user-123");
      expect(entityId.name).toBe("counter");
      expect(entityId.key).toBe("user-123");
    });

    it("should parse entity ID with empty key", () => {
      const entityId = EntityInstanceId.fromString("@counter@");
      expect(entityId.name).toBe("counter");
      expect(entityId.key).toBe("");
    });

    it("should parse entity ID with @ in key", () => {
      const entityId = EntityInstanceId.fromString("@counter@user@domain.com");
      expect(entityId.name).toBe("counter");
      expect(entityId.key).toBe("user@domain.com");
    });

    it("should normalize name to lowercase when parsing", () => {
      // Even if the string has uppercase (which shouldn't happen from toString),
      // the constructor will lowercase it
      const entityId = EntityInstanceId.fromString("@Counter@key1");
      expect(entityId.name).toBe("counter");
    });

    it("should throw error for empty string", () => {
      expect(() => EntityInstanceId.fromString("")).toThrow("Instance ID must not be empty.");
    });

    it("should throw error when not starting with @", () => {
      expect(() => EntityInstanceId.fromString("counter@key1")).toThrow(
        "Instance ID 'counter@key1' is not a valid entity ID. Must start with '@'."
      );
    });

    it("should throw error when missing second @", () => {
      expect(() => EntityInstanceId.fromString("@counterkey1")).toThrow(
        "Instance ID '@counterkey1' is not a valid entity ID. Expected format: @name@key"
      );
    });

    it("should throw error when name is empty", () => {
      expect(() => EntityInstanceId.fromString("@@key1")).toThrow(
        "Instance ID '@@key1' is not a valid entity ID. Entity name is empty."
      );
    });
  });

  describe("equals", () => {
    it("should return true for equal entity IDs", () => {
      const entityId1 = new EntityInstanceId("counter", "key1");
      const entityId2 = new EntityInstanceId("counter", "key1");
      expect(entityId1.equals(entityId2)).toBe(true);
    });

    it("should return true for same name with different case", () => {
      const entityId1 = new EntityInstanceId("Counter", "key1");
      const entityId2 = new EntityInstanceId("COUNTER", "key1");
      expect(entityId1.equals(entityId2)).toBe(true);
    });

    it("should return false for different names", () => {
      const entityId1 = new EntityInstanceId("counter", "key1");
      const entityId2 = new EntityInstanceId("timer", "key1");
      expect(entityId1.equals(entityId2)).toBe(false);
    });

    it("should return false for different keys", () => {
      const entityId1 = new EntityInstanceId("counter", "key1");
      const entityId2 = new EntityInstanceId("counter", "key2");
      expect(entityId1.equals(entityId2)).toBe(false);
    });

    it("should return false for different key case", () => {
      const entityId1 = new EntityInstanceId("counter", "Key1");
      const entityId2 = new EntityInstanceId("counter", "key1");
      expect(entityId1.equals(entityId2)).toBe(false);
    });

    it("should return false for null", () => {
      const entityId = new EntityInstanceId("counter", "key1");
      expect(entityId.equals(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      const entityId = new EntityInstanceId("counter", "key1");
      expect(entityId.equals(undefined)).toBe(false);
    });
  });

  describe("roundtrip", () => {
    it("should roundtrip through toString and fromString", () => {
      const original = new EntityInstanceId("MyEntity", "user-123");
      const str = original.toString();
      const parsed = EntityInstanceId.fromString(str);

      expect(parsed.name).toBe(original.name);
      expect(parsed.key).toBe(original.key);
      expect(parsed.equals(original)).toBe(true);
    });

    it("should roundtrip with special characters in key", () => {
      const original = new EntityInstanceId("entity", "key/with:special@chars");
      const str = original.toString();
      const parsed = EntityInstanceId.fromString(str);

      expect(parsed.key).toBe(original.key);
      expect(parsed.equals(original)).toBe(true);
    });
  });
});
