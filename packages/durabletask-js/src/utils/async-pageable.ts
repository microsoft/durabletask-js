// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Represents a page of results from a paginated query.
 */
export interface Page<T> {
  /** The values in this page. */
  values: T[];
  /** The continuation token for fetching the next page, or undefined if this is the last page. */
  continuationToken?: string;
}

/**
 * A function that fetches a page of results.
 * @param continuationToken - The continuation token from the previous page, or undefined for the first page.
 * @returns A promise that resolves to the next page of results.
 */
export type PageFetcher<T> = (continuationToken?: string) => Promise<Page<T>>;

/**
 * Represents an asynchronous pageable collection that supports both
 * item-by-item iteration and page-by-page iteration.
 *
 * This is similar to .NET's AsyncPageable<T> from Azure SDK.
 *
 * @example
 * // Iterate by items
 * for await (const entity of client.getEntities(query)) {
 *   console.log(entity.id);
 * }
 *
 * @example
 * // Iterate by pages
 * for await (const page of client.getEntities(query).byPage()) {
 *   console.log(`Got ${page.values.length} items`);
 *   for (const entity of page.values) {
 *     console.log(entity.id);
 *   }
 * }
 */
export class AsyncPageable<T> {
  private readonly fetchPage: PageFetcher<T>;

  /**
   * Creates a new AsyncPageable instance.
   * @param fetchPage - A function that fetches a page of results given a continuation token.
   */
  constructor(fetchPage: PageFetcher<T>) {
    this.fetchPage = fetchPage;
  }

  /**
   * Creates an AsyncPageable from a page fetcher function.
   * @param fetchPage - A function that fetches a page of results.
   * @returns An AsyncPageable instance.
   */
  static create<T>(fetchPage: PageFetcher<T>): AsyncPageable<T> {
    return new AsyncPageable(fetchPage);
  }

  /**
   * Implements the async iterator protocol to iterate over individual items.
   * This automatically handles pagination, fetching additional pages as needed.
   */
  async *[Symbol.asyncIterator](): AsyncGenerator<T, void, unknown> {
    for await (const page of this.byPage()) {
      for (const item of page.values) {
        yield item;
      }
    }
  }

  /**
   * Returns an async generator that yields pages of results.
   * Use this when you need access to page boundaries or continuation tokens.
   *
   * @param options - Optional settings for page iteration.
   * @param options.continuationToken - A continuation token to resume from a specific page.
   * @returns An async generator that yields pages.
   */
  async *byPage(options?: { continuationToken?: string }): AsyncGenerator<Page<T>, void, unknown> {
    let continuationToken: string | undefined = options?.continuationToken;

    do {
      const page = await this.fetchPage(continuationToken);
      yield page;
      continuationToken = page.continuationToken;
    } while (continuationToken);
  }
}
