// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Options for signaling an entity.
 *
 * @remarks
 * Signals are one-way (fire-and-forget) messages sent to entities.
 * The signalTime option allows scheduling a signal for future delivery.
 *
 * Dotnet reference: src/Abstractions/Entities/CallEntityOptions.cs - SignalEntityOptions
 */
export interface SignalEntityOptions {
  /**
   * The time at which to signal the entity.
   * If not specified, the signal is delivered immediately.
   */
  readonly signalTime?: Date;
}

/**
 * Options for calling an entity (request/response).
 *
 * @remarks
 * Currently empty, reserved for future extensibility.
 * Keeping this interface so we can ship with options in the API
 * and add properties later without breaking changes.
 *
 * Dotnet reference: src/Abstractions/Entities/CallEntityOptions.cs - CallEntityOptions
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CallEntityOptions {
  // No call options at the moment. Keeping this interface so we can ship with options in the API.
  // This will allow us to easily add them later without adjusting API surface.
}
