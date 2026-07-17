// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AccessToken, TokenCredential, GetTokenOptions } from "@azure/identity";

/**
 * Caches access tokens for Azure authentication.
 * This class is used by both client and worker components to authenticate with Azure-managed Durable Task services.
 */
export class AccessTokenCache {
  private readonly credential: TokenCredential;
  private readonly scopes: string | string[];
  private readonly margin: number;
  private cachedToken: AccessToken | null = null;
  private pendingTokenFetch: Promise<AccessToken> | null = null;

  /**
   * Creates a new instance of the AccessTokenCache.
   *
   * @param credential The token credential to use for obtaining tokens.
   * @param scopes The scopes for which to obtain the token.
   * @param marginMs The time margin in milliseconds before token expiration to refresh the token. Default is 5 minutes.
   */
  constructor(credential: TokenCredential, scopes: string | string[], marginMs: number = 5 * 60 * 1000) {
    this.credential = credential;
    this.scopes = scopes;
    this.margin = marginMs;
  }

  /**
   * Checks whether the cached token needs to be refreshed.
   */
  private needsRefresh(): boolean {
    const nowWithMargin = Date.now() + this.margin;
    return (
      this.cachedToken === null ||
      this.cachedToken.expiresOnTimestamp < nowWithMargin ||
      (this.cachedToken.refreshAfterTimestamp !== undefined && this.cachedToken.refreshAfterTimestamp < nowWithMargin)
    );
  }

  /**
   * Gets a valid access token, refreshing it if necessary.
   *
   * When multiple concurrent callers need a new token, only one credential
   * request is made. All callers share the same in-flight promise.
   *
   * @param options Optional token request options.
   * @returns A promise that resolves to a valid access token.
   */
  async getToken(options?: GetTokenOptions): Promise<AccessToken> {
    if (this.needsRefresh()) {
      if (!this.pendingTokenFetch) {
        this.pendingTokenFetch = this.credential
          .getToken(this.scopes, options)
          .then((token) => {
            if (!token) {
              throw new Error("Failed to obtain access token from credential");
            }
            this.cachedToken = token;
            return token;
          })
          .finally(() => {
            this.pendingTokenFetch = null;
          });
      }
      return this.pendingTokenFetch;
    }

    return this.cachedToken!;
  }
}
