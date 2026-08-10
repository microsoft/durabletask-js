// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/** Thrown when an orchestration ID reuse request matches an existing dedupe status. */
export class OrchestrationAlreadyExistsError extends Error {
  // The options type is spelled out structurally instead of using the ambient
  // `ErrorOptions`, which only exists in the ES2022 lib. Naming it here would leak
  // into the emitted .d.ts and break consumers compiling against an older lib
  // (e.g. the `func`-style apps that default to `target: es6` without skipLibCheck).
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "OrchestrationAlreadyExistsError";
  }
}
