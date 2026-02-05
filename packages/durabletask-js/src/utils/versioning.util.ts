// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Compares two version strings for ordering.
 *
 * This function supports semantic versioning comparison (e.g., "1.0.0" vs "2.1.0")
 * and falls back to lexicographic comparison for non-semver strings.
 *
 * Rules:
 * - Empty/undefined versions are considered equal to each other
 * - An empty version is considered less than a non-empty version
 * - Semantic versions are compared numerically by component (major.minor.patch)
 * - Non-semantic versions are compared lexicographically (case-insensitive)
 *
 * @param sourceVersion - The first version to compare.
 * @param otherVersion - The second version to compare.
 * @returns A negative number if sourceVersion < otherVersion,
 *          zero if sourceVersion === otherVersion,
 *          a positive number if sourceVersion > otherVersion.
 *
 * @example
 * ```typescript
 * compareVersions("1.0.0", "2.0.0"); // Returns negative number
 * compareVersions("2.0.0", "1.0.0"); // Returns positive number
 * compareVersions("1.0.0", "1.0.0"); // Returns 0
 * compareVersions("", "1.0.0");      // Returns negative number
 * ```
 */
export function compareVersions(sourceVersion: string | undefined, otherVersion: string | undefined): number {
  const sourceEmpty = !sourceVersion || sourceVersion.trim() === "";
  const otherEmpty = !otherVersion || otherVersion.trim() === "";

  // Both empty = equal
  if (sourceEmpty && otherEmpty) {
    return 0;
  }

  // Empty source < defined other
  if (sourceEmpty) {
    return -1;
  }

  // Defined source > empty other
  if (otherEmpty) {
    return 1;
  }

  // Try semantic version parsing
  const sourceComponents = parseSemanticVersion(sourceVersion!);
  const otherComponents = parseSemanticVersion(otherVersion!);

  if (sourceComponents && otherComponents) {
    // Compare major, minor, patch, revision in order
    for (let i = 0; i < Math.max(sourceComponents.length, otherComponents.length); i++) {
      const sourceVal = sourceComponents[i] ?? 0;
      const otherVal = otherComponents[i] ?? 0;
      if (sourceVal !== otherVal) {
        return sourceVal - otherVal;
      }
    }
    return 0;
  }

  // Fallback to lexicographic comparison (case-insensitive)
  return sourceVersion!.toLowerCase().localeCompare(otherVersion!.toLowerCase());
}

/**
 * Attempts to parse a version string as a semantic version.
 *
 * @param version - The version string to parse.
 * @returns An array of numeric version components, or undefined if parsing fails.
 */
function parseSemanticVersion(version: string): number[] | undefined {
  // Match patterns like "1", "1.0", "1.0.0", "1.0.0.0"
  const match = version.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:\.(\d+))?$/);
  if (!match) {
    return undefined;
  }

  const components: number[] = [];
  for (let i = 1; i <= 4; i++) {
    if (match[i] !== undefined) {
      components.push(parseInt(match[i], 10));
    }
  }
  return components;
}
