// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  EntityQuery,
  normalizeInstanceIdPrefix,
  createEntityQuery,
} from "../src/entities/entity-query";

describe("EntityQuery", () => {
  describe("normalizeInstanceIdPrefix", () => {
    it("should return undefined for undefined input", () => {
      expect(normalizeInstanceIdPrefix(undefined)).toBeUndefined();
    });

    it("should return undefined for null input", () => {
      expect(normalizeInstanceIdPrefix(null)).toBeUndefined();
    });

    it("should prefix @ and lowercase for simple name", () => {
      expect(normalizeInstanceIdPrefix("Counter")).toBe("@counter");
    });

    it("should lowercase when @ already present", () => {
      expect(normalizeInstanceIdPrefix("@Counter")).toBe("@counter");
    });

    it("should handle empty string", () => {
      expect(normalizeInstanceIdPrefix("")).toBe("@");
    });

    it("should lowercase name portion only when key separator present", () => {
      // "Counter@" means exact name match "counter" with any key
      expect(normalizeInstanceIdPrefix("Counter@")).toBe("@counter@");
    });

    it("should preserve key case when key prefix provided", () => {
      // "Counter@User-123" means name "counter" with key starting with "User-123"
      expect(normalizeInstanceIdPrefix("Counter@User-123")).toBe("@counter@User-123");
    });

    it("should preserve key case with @ prefix", () => {
      expect(normalizeInstanceIdPrefix("@Counter@User-123")).toBe("@counter@User-123");
    });

    it("should handle complex key with special characters", () => {
      expect(normalizeInstanceIdPrefix("Entity@Key/With:Special@Chars")).toBe(
        "@entity@Key/With:Special@Chars"
      );
    });

    it("should handle already lowercase name", () => {
      expect(normalizeInstanceIdPrefix("counter")).toBe("@counter");
    });

    it("should handle mixed case in key", () => {
      expect(normalizeInstanceIdPrefix("COUNTER@MyKey")).toBe("@counter@MyKey");
    });
  });

  describe("createEntityQuery", () => {
    it("should normalize instanceIdStartsWith", () => {
      const query: EntityQuery = {
        instanceIdStartsWith: "Counter@User",
        includeState: true,
      };

      const normalized = createEntityQuery(query);

      expect(normalized.instanceIdStartsWith).toBe("@counter@User");
      expect(normalized.includeState).toBe(true);
    });

    it("should preserve other properties", () => {
      const lastModifiedFrom = new Date("2026-01-01");
      const lastModifiedTo = new Date("2026-01-31");

      const query: EntityQuery = {
        instanceIdStartsWith: "Counter",
        lastModifiedFrom,
        lastModifiedTo,
        includeState: false,
        includeTransient: true,
        pageSize: 50,
        continuationToken: "token123",
      };

      const normalized = createEntityQuery(query);

      expect(normalized.instanceIdStartsWith).toBe("@counter");
      expect(normalized.lastModifiedFrom).toBe(lastModifiedFrom);
      expect(normalized.lastModifiedTo).toBe(lastModifiedTo);
      expect(normalized.includeState).toBe(false);
      expect(normalized.includeTransient).toBe(true);
      expect(normalized.pageSize).toBe(50);
      expect(normalized.continuationToken).toBe("token123");
    });

    it("should handle undefined instanceIdStartsWith", () => {
      const query: EntityQuery = {
        includeState: true,
      };

      const normalized = createEntityQuery(query);

      expect(normalized.instanceIdStartsWith).toBeUndefined();
    });

    it("should handle empty query", () => {
      const query: EntityQuery = {};
      const normalized = createEntityQuery(query);

      expect(normalized).toEqual({});
    });
  });

  describe("interface usage", () => {
    it("should allow minimal query", () => {
      const query: EntityQuery = {};
      expect(query.instanceIdStartsWith).toBeUndefined();
      expect(query.includeState).toBeUndefined();
    });

    it("should allow full query", () => {
      const query: EntityQuery = {
        instanceIdStartsWith: "@counter@",
        lastModifiedFrom: new Date("2026-01-01"),
        lastModifiedTo: new Date("2026-12-31"),
        includeState: true,
        includeTransient: false,
        pageSize: 100,
        continuationToken: "abc123",
      };

      expect(query.instanceIdStartsWith).toBe("@counter@");
      expect(query.pageSize).toBe(100);
    });
  });
});
