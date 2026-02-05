// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

type TagsMapLike = {
  forEach: (callback: (value: string, key: string) => void) => void;
};

/**
 * Converts a map-like collection of tag key/value pairs into a plain record object.
 *
 * @param tagsMap - A map-like object containing tag values keyed by tag name.
 * @returns A record containing the tag key/value pairs, or `undefined` if the input
 *          is `undefined` or if no tags are present.
 */
export function mapToRecord(tagsMap?: TagsMapLike): Record<string, string> | undefined {
  if (!tagsMap) {
    return;
  }

  const tags: Record<string, string> = {};
  tagsMap.forEach((value, key) => {
    tags[key] = value;
  });

  return Object.keys(tags).length > 0 ? tags : undefined;
}
