// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Logger } from "./logger.type";

/**
 * Interface representing a context that can determine if replay is occurring.
 * This is used by ReplaySafeLogger to check if logging should be suppressed.
 */
export interface ReplayContext {
  /**
   * Whether the orchestrator is currently replaying from history.
   */
  readonly isReplaying: boolean;
}

/**
 * A logger wrapper that only logs when the orchestration is not replaying.
 *
 * During orchestration replay, history events are re-processed to rebuild state.
 * This can cause duplicate log entries if not handled properly. The ReplaySafeLogger
 * wraps an existing logger and automatically suppresses log output during replay,
 * ensuring that logs are only written once when the orchestration is making forward progress.
 *
 * @example
 * ```typescript
 * // Inside an orchestrator function:
 * const logger = ctx.createReplaySafeLogger(myLogger);
 * logger.info("This will only be logged once, not during replay");
 * ```
 */
export class ReplaySafeLogger implements Logger {
  private readonly context: ReplayContext;
  private readonly innerLogger: Logger;

  /**
   * Creates a new ReplaySafeLogger.
   *
   * @param context - The replay context used to determine if replay is occurring.
   * @param logger - The underlying logger to delegate to when not replaying.
   */
  constructor(context: ReplayContext, logger: Logger) {
    if (!context) {
      throw new Error("context is required");
    }
    if (!logger) {
      throw new Error("logger is required");
    }
    this.context = context;
    this.innerLogger = logger;
  }

  /**
   * Logs an error message if not replaying.
   * @param message - The error message to log.
   * @param args - Additional arguments to include in the log.
   */
  error(message: string, ...args: unknown[]): void {
    if (!this.context.isReplaying) {
      this.innerLogger.error(message, ...args);
    }
  }

  /**
   * Logs a warning message if not replaying.
   * @param message - The warning message to log.
   * @param args - Additional arguments to include in the log.
   */
  warn(message: string, ...args: unknown[]): void {
    if (!this.context.isReplaying) {
      this.innerLogger.warn(message, ...args);
    }
  }

  /**
   * Logs an informational message if not replaying.
   * @param message - The informational message to log.
   * @param args - Additional arguments to include in the log.
   */
  info(message: string, ...args: unknown[]): void {
    if (!this.context.isReplaying) {
      this.innerLogger.info(message, ...args);
    }
  }

  /**
   * Logs a debug message if not replaying.
   * @param message - The debug message to log.
   * @param args - Additional arguments to include in the log.
   */
  debug(message: string, ...args: unknown[]): void {
    if (!this.context.isReplaying) {
      this.innerLogger.debug(message, ...args);
    }
  }
}
