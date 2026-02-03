// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Represents a single page of results from a paginated query.
 * @template T The type of values held by the page.
 */
export class Page<T> {
  /**
   * The values contained in this page.
   */
  readonly values: readonly T[];

  /**
   * The continuation token for fetching the next page, or undefined if there are no more items.
   */
  readonly continuationToken?: string;

  /**
   * Creates a new Page instance.
   * @param values The values this page holds.
   * @param continuationToken The continuation token for the next page, or undefined if no more pages.
   */
  constructor(values: readonly T[], continuationToken?: string) {
    this.values = values;
    this.continuationToken = continuationToken;
  }

  /**
   * Returns true if there are more pages available.
   */
  get hasMoreResults(): boolean {
    return this.continuationToken !== undefined && this.continuationToken !== "";
  }
}

/**
 * Represents an async iterator over pages of results.
 * @template T The type of values held by each page.
 */
export interface AsyncPageable<T> extends AsyncIterable<T> {
  /**
   * Returns an async iterator over pages of results.
   * @param continuationToken Optional continuation token to start from.
   * @param pageSize Optional page size hint.
   */
  asPages(continuationToken?: string, pageSize?: number): AsyncIterable<Page<T>>;
}

/**
 * Creates an AsyncPageable from a page fetching function.
 * @template T The type of values held by each page.
 * @param pageFunc A function that fetches pages given a continuation token and page size.
 * @returns An AsyncPageable that can be iterated over.
 */
export function createAsyncPageable<T>(
  pageFunc: (continuationToken?: string, pageSize?: number) => Promise<Page<T>>,
): AsyncPageable<T> {
  return {
    async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
      let continuationToken: string | undefined = undefined;
      do {
        const page = await pageFunc(continuationToken, undefined);
        for (const item of page.values) {
          yield item;
        }
        continuationToken = page.continuationToken;
      } while (continuationToken !== undefined && continuationToken !== "");
    },

    asPages(
      startContinuationToken?: string,
      pageSizeHint?: number,
    ): AsyncIterable<Page<T>> {
      return {
        async *[Symbol.asyncIterator](): AsyncIterableIterator<Page<T>> {
          let continuationToken: string | undefined = startContinuationToken;
          do {
            const page = await pageFunc(continuationToken, pageSizeHint);
            yield page;
            continuationToken = page.continuationToken;
          } while (continuationToken !== undefined && continuationToken !== "");
        },
      };
    },
  };
}
