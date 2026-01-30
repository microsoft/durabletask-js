// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  CleanEntityStorageRequest,
  CleanEntityStorageResult,
  defaultCleanEntityStorageRequest,
} from "../src/entities/clean-entity-storage";

describe("CleanEntityStorage", () => {
  describe("defaultCleanEntityStorageRequest", () => {
    it("should return default request with maximal cleaning", () => {
      const request = defaultCleanEntityStorageRequest();

      expect(request.removeEmptyEntities).toBe(true);
      expect(request.releaseOrphanedLocks).toBe(true);
      expect(request.continuationToken).toBeUndefined();
    });
  });

  describe("CleanEntityStorageRequest interface", () => {
    it("should allow minimal request", () => {
      const request: CleanEntityStorageRequest = {};

      expect(request.removeEmptyEntities).toBeUndefined();
      expect(request.releaseOrphanedLocks).toBeUndefined();
    });

    it("should allow custom request", () => {
      const request: CleanEntityStorageRequest = {
        removeEmptyEntities: true,
        releaseOrphanedLocks: false,
        continuationToken: "token123",
      };

      expect(request.removeEmptyEntities).toBe(true);
      expect(request.releaseOrphanedLocks).toBe(false);
      expect(request.continuationToken).toBe("token123");
    });

    it("should allow only removeEmptyEntities", () => {
      const request: CleanEntityStorageRequest = {
        removeEmptyEntities: true,
      };

      expect(request.removeEmptyEntities).toBe(true);
      expect(request.releaseOrphanedLocks).toBeUndefined();
    });

    it("should allow only releaseOrphanedLocks", () => {
      const request: CleanEntityStorageRequest = {
        releaseOrphanedLocks: true,
      };

      expect(request.removeEmptyEntities).toBeUndefined();
      expect(request.releaseOrphanedLocks).toBe(true);
    });
  });

  describe("CleanEntityStorageResult interface", () => {
    it("should hold result values", () => {
      const result: CleanEntityStorageResult = {
        emptyEntitiesRemoved: 10,
        orphanedLocksReleased: 5,
        continuationToken: undefined,
      };

      expect(result.emptyEntitiesRemoved).toBe(10);
      expect(result.orphanedLocksReleased).toBe(5);
      expect(result.continuationToken).toBeUndefined();
    });

    it("should hold continuation token when not complete", () => {
      const result: CleanEntityStorageResult = {
        emptyEntitiesRemoved: 100,
        orphanedLocksReleased: 50,
        continuationToken: "continue-from-here",
      };

      expect(result.continuationToken).toBe("continue-from-here");
    });

    it("should hold zero counts", () => {
      const result: CleanEntityStorageResult = {
        emptyEntitiesRemoved: 0,
        orphanedLocksReleased: 0,
      };

      expect(result.emptyEntitiesRemoved).toBe(0);
      expect(result.orphanedLocksReleased).toBe(0);
    });
  });
});
