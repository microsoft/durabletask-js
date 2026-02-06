// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Logger, LogEvent, isStructuredLogger } from "../types/logger.type";

/**
 * Emits a log message, using structured logging when the logger supports it.
 *
 * If the logger implements {@link StructuredLogger}, the event metadata (eventId,
 * category, properties) is forwarded via `logEvent()`. Otherwise, the message is
 * logged via the plain `Logger` method for the given level.
 *
 * @param logger - The logger instance.
 * @param level - The log level.
 * @param event - Structured event metadata.
 * @param message - The formatted log message string.
 *
 * @internal
 */
export function emitLog(
  logger: Logger,
  level: "error" | "warn" | "info" | "debug",
  event: LogEvent,
  message: string,
): void {
  if (isStructuredLogger(logger)) {
    logger.logEvent(level, event, message);
  } else {
    logger[level](message);
  }
}
