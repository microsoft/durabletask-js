// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Enum representing the kind of export format.
 */
export enum ExportFormatKind {
  /**
   * JSONL (JSON Lines) format: one history event per line, gzip compressed.
   */
  Jsonl = "Jsonl",

  /**
   * JSON format: standard JSON array, uncompressed.
   */
  Json = "Json",
}

/**
 * Configuration for the export file format.
 */
export interface ExportFormat {
  /**
   * The kind of export format (Jsonl or Json).
   */
  readonly kind: ExportFormatKind;

  /**
   * The schema version for the export format.
   */
  readonly schemaVersion: string;
}

/**
 * Default schema version for export formats.
 */
export const DEFAULT_SCHEMA_VERSION = "1.0";

/**
 * Creates a default ExportFormat.
 * @param kind The format kind. Defaults to Jsonl.
 * @param schemaVersion The schema version. Defaults to "1.0".
 * @returns A new ExportFormat instance.
 */
export function createExportFormat(
  kind: ExportFormatKind = ExportFormatKind.Jsonl,
  schemaVersion: string = DEFAULT_SCHEMA_VERSION,
): ExportFormat {
  return { kind, schemaVersion };
}
