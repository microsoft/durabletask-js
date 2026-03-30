// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AccessTokenCache } from "../../src/access-token-cache";
import { TokenCredential, AccessToken, GetTokenOptions } from "@azure/identity";

/**
 * Mock TokenCredential that tracks call counts and supports configurable delays.
 */
class MockTokenCredential implements TokenCredential {
  callCount = 0;
  private readonly tokenFactory: () => AccessToken | null;
  private readonly delay: number;

  constructor(
    tokenFactory?: () => AccessToken | null,
    delayMs: number = 0,
  ) {
    this.tokenFactory =
      tokenFactory ??
      (() => ({
        token: `token-${this.callCount}`,
        expiresOnTimestamp: Date.now() + 3600000,
      }));
    this.delay = delayMs;
  }

  async getToken(
    _scopes: string | string[],
    _options?: GetTokenOptions,
  ): Promise<AccessToken | null> {
    this.callCount++;
    if (this.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delay));
    }
    return this.tokenFactory();
  }
}

describe("AccessTokenCache", () => {
  describe("basic caching", () => {
    it("should call credential.getToken on first call", async () => {
      const cred = new MockTokenCredential();
      const cache = new AccessTokenCache(cred, "scope");

      const token = await cache.getToken();

      expect(token).toBeDefined();
      expect(token.token).toContain("token-");
      expect(cred.callCount).toBe(1);
    });

    it("should return cached token on subsequent calls", async () => {
      const cred = new MockTokenCredential();
      const cache = new AccessTokenCache(cred, "scope");

      const token1 = await cache.getToken();
      const token2 = await cache.getToken();

      expect(token1).toBe(token2);
      expect(cred.callCount).toBe(1);
    });

    it("should refresh token when expired", async () => {
      let callNum = 0;
      const cred = new MockTokenCredential(() => {
        callNum++;
        return {
          token: `token-${callNum}`,
          // First token expires immediately (in the past), second lasts 1 hour
          expiresOnTimestamp: callNum === 1 ? Date.now() - 1000 : Date.now() + 3600000,
        };
      });
      const cache = new AccessTokenCache(cred, "scope", 0);

      const token1 = await cache.getToken();
      expect(token1.token).toBe("token-1");
      expect(cred.callCount).toBe(1);

      // Token is expired, should refresh
      const token2 = await cache.getToken();
      expect(token2.token).toBe("token-2");
      expect(cred.callCount).toBe(2);
    });

    it("should refresh when within margin of expiration", async () => {
      const marginMs = 60000; // 1 minute margin
      let callNum = 0;
      const cred = new MockTokenCredential(() => {
        callNum++;
        return {
          token: `token-${callNum}`,
          // First token expires within margin, second lasts 1 hour
          expiresOnTimestamp: callNum === 1 ? Date.now() + 30000 : Date.now() + 3600000,
        };
      });
      const cache = new AccessTokenCache(cred, "scope", marginMs);

      await cache.getToken();
      expect(cred.callCount).toBe(1);

      // Token is within margin, should refresh
      const token2 = await cache.getToken();
      expect(token2.token).toBe("token-2");
      expect(cred.callCount).toBe(2);
    });

    it("should refresh when refreshAfterTimestamp is in the past", async () => {
      let callNum = 0;
      const cred = new MockTokenCredential(() => {
        callNum++;
        return {
          token: `token-${callNum}`,
          expiresOnTimestamp: Date.now() + 3600000,
          // First token signals it should be refreshed now
          refreshAfterTimestamp: callNum === 1 ? Date.now() - 1000 : undefined,
        };
      });
      const cache = new AccessTokenCache(cred, "scope", 0);

      await cache.getToken();
      expect(cred.callCount).toBe(1);

      // refreshAfterTimestamp is in the past, should refresh
      const token2 = await cache.getToken();
      expect(token2.token).toBe("token-2");
      expect(cred.callCount).toBe(2);
    });
  });

  describe("error handling", () => {
    it("should throw when credential returns null", async () => {
      const cred = new MockTokenCredential(() => null);
      const cache = new AccessTokenCache(cred, "scope");

      await expect(cache.getToken()).rejects.toThrow(
        "Failed to obtain access token from credential",
      );
    });

    it("should propagate credential errors", async () => {
      const cred: TokenCredential = {
        getToken: async () => {
          throw new Error("Network error");
        },
      };
      const cache = new AccessTokenCache(cred, "scope");

      await expect(cache.getToken()).rejects.toThrow("Network error");
    });

    it("should allow retry after a failed fetch", async () => {
      let callNum = 0;
      const cred: TokenCredential = {
        getToken: async () => {
          callNum++;
          if (callNum === 1) {
            throw new Error("Transient error");
          }
          return {
            token: "recovered-token",
            expiresOnTimestamp: Date.now() + 3600000,
          };
        },
      };
      const cache = new AccessTokenCache(cred, "scope");

      await expect(cache.getToken()).rejects.toThrow("Transient error");

      // Second call should succeed since pendingTokenFetch was cleared
      const token = await cache.getToken();
      expect(token.token).toBe("recovered-token");
    });
  });

  describe("concurrent access (race condition prevention)", () => {
    it("should make only one credential call when multiple callers request simultaneously", async () => {
      const cred = new MockTokenCredential(
        () => ({
          token: "shared-token",
          expiresOnTimestamp: Date.now() + 3600000,
        }),
        50, // 50ms delay to simulate network call
      );
      const cache = new AccessTokenCache(cred, "scope");

      // Launch 10 concurrent getToken calls
      const promises = Array.from({ length: 10 }, () => cache.getToken());
      const results = await Promise.all(promises);

      // All should get the same token
      for (const result of results) {
        expect(result.token).toBe("shared-token");
      }

      // Only ONE credential call should have been made
      expect(cred.callCount).toBe(1);
    });

    it("should share the same promise for concurrent callers during token refresh", async () => {
      let callNum = 0;
      const cred = new MockTokenCredential(
        () => {
          callNum++;
          return {
            token: `token-${callNum}`,
            // First token expires immediately
            expiresOnTimestamp: callNum === 1 ? Date.now() - 1000 : Date.now() + 3600000,
          };
        },
        50,
      );
      const cache = new AccessTokenCache(cred, "scope", 0);

      // First call to populate cache with an expired token
      await cache.getToken();
      expect(cred.callCount).toBe(1);

      // Now launch concurrent refresh requests
      const promises = Array.from({ length: 5 }, () => cache.getToken());
      const results = await Promise.all(promises);

      // All should get the refreshed token
      for (const result of results) {
        expect(result.token).toBe("token-2");
      }

      // Only one additional credential call should have been made
      expect(cred.callCount).toBe(2);
    });

    it("should clear pending fetch on error so subsequent callers can retry", async () => {
      let callNum = 0;
      const cred: TokenCredential = {
        getToken: async () => {
          callNum++;
          if (callNum === 1) {
            await new Promise((resolve) => setTimeout(resolve, 50));
            throw new Error("Auth service unavailable");
          }
          return {
            token: "success-token",
            expiresOnTimestamp: Date.now() + 3600000,
          };
        },
      };
      const cache = new AccessTokenCache(cred, "scope");

      // Multiple concurrent calls - all should fail together
      const failingPromises = Array.from({ length: 3 }, () => cache.getToken());
      const settledResults = await Promise.allSettled(failingPromises);

      for (const result of settledResults) {
        expect(result.status).toBe("rejected");
      }

      // After failure, pendingTokenFetch should be cleared
      // Next call should succeed
      const token = await cache.getToken();
      expect(token.token).toBe("success-token");
    });
  });
});
