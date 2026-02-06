// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Structured log event metadata, matching the .NET Durable Task SDK logging pattern.
 *
 * Each log message in the SDK is associated with a unique event ID and a category,
 * consistent with the `[LoggerMessage]` pattern used in the .NET SDK.
 *
 * @example
 * ```typescript
 * const event: LogEvent = {
 *   eventId: 600,
 *   category: "Microsoft.DurableTask.Worker.Orchestrations",
 *   properties: { instanceId: "abc123", name: "MyOrchestrator" },
 * };
 * ```
 */
export interface LogEvent {
  /** Unique numeric event ID matching the .NET SDK event IDs for cross-SDK log correlation. */
  eventId: number;
  /** Hierarchical logger category (e.g., "Microsoft.DurableTask.Worker.Orchestrations"). */
  category: string;
  /** Structured properties captured as key-value pairs for log filtering and analysis. */
  properties?: Record<string, unknown>;
}

/**
 * Logger interface for the Durable Task SDK.
 *
 * Users can implement this interface to integrate their own logging framework
 * (e.g., Winston, Pino, Azure Logger) with the SDK.
 */
export interface Logger {
  /**
   * Logs an error message.
   * @param message - The error message to log.
   * @param args - Additional arguments to include in the log.
   */
  error(message: string, ...args: unknown[]): void;

  /**
   * Logs a warning message.
   * @param message - The warning message to log.
   * @param args - Additional arguments to include in the log.
   */
  warn(message: string, ...args: unknown[]): void;

  /**
   * Logs an informational message.
   * @param message - The informational message to log.
   * @param args - Additional arguments to include in the log.
   */
  info(message: string, ...args: unknown[]): void;

  /**
   * Logs a debug message.
   * @param message - The debug message to log.
   * @param args - Additional arguments to include in the log.
   */
  debug(message: string, ...args: unknown[]): void;
}

/**
 * Extended logger interface that supports structured log events with event IDs,
 * categories, and structured properties.
 *
 * This interface extends the base {@link Logger} to provide structured logging
 * capabilities matching the .NET Durable Task SDK pattern. Consumers that implement
 * only the base {@link Logger} interface will continue to work — the SDK's centralized
 * log functions detect `StructuredLogger` support at runtime and fall back to
 * plain string logging when structured logging is unavailable.
 *
 * @example
 * ```typescript
 * class MyStructuredLogger implements StructuredLogger {
 *   error(message: string, ...args: unknown[]): void { ... }
 *   warn(message: string, ...args: unknown[]): void { ... }
 *   info(message: string, ...args: unknown[]): void { ... }
 *   debug(message: string, ...args: unknown[]): void { ... }
 *   logEvent(level: "error" | "warn" | "info" | "debug", event: LogEvent, message: string): void {
 *     // Forward to your structured logging backend
 *   }
 * }
 * ```
 */
export interface StructuredLogger extends Logger {
  /**
   * Logs a message with structured event metadata.
   *
   * @param level - The log level ("error", "warn", "info", "debug").
   * @param event - Structured event metadata including eventId, category, and properties.
   * @param message - The formatted log message string.
   */
  logEvent(level: "error" | "warn" | "info" | "debug", event: LogEvent, message: string): void;
}

/**
 * Type guard to check if a Logger instance supports structured logging.
 *
 * @param logger - The logger to check.
 * @returns `true` if the logger implements {@link StructuredLogger}.
 */
export function isStructuredLogger(logger: Logger): logger is StructuredLogger {
  return typeof (logger as StructuredLogger).logEvent === "function";
}

/**
 * Creates a `logEvent` handler that formats structured log events with a
 * `[eventId] [category]` prefix and dispatches to the provided log functions.
 *
 * This allows different logging backends (Console, Azure Logger, etc.) to share
 * the same formatting and dispatch logic without duplication.
 *
 * @param logFns - A map of log-level names to their corresponding output functions.
 * @returns A function with the same signature as {@link StructuredLogger.logEvent}.
 */
export function createLogEventHandler(
  logFns: Record<"error" | "warn" | "info" | "debug", (message: string, ...args: unknown[]) => void>,
): (level: "error" | "warn" | "info" | "debug", event: LogEvent, message: string) => void {
  return (level, event, message) => {
    const prefix = `[${event.eventId}] [${event.category}]`;
    const fullMessage = `${prefix} ${message}`;
    const logFn = logFns[level];
    if (event.properties != null && Object.keys(event.properties).length > 0) {
      logFn(fullMessage, event.properties);
    } else {
      logFn(fullMessage);
    }
  };
}

/**
 * Default logger implementation that delegates to the console.
 *
 * This is the default logger used by the SDK when no custom logger is provided.
 * It implements {@link StructuredLogger} to support structured log output.
 *
 * When structured log events are emitted, the console output includes the event ID
 * and category prefix for easy filtering, matching the .NET SDK's output pattern.
 */
export class ConsoleLogger implements StructuredLogger {
  private _logEventHandler = createLogEventHandler({
    error: (msg: string, ...args: unknown[]) => console.error(msg, ...args),
    warn: (msg: string, ...args: unknown[]) => console.warn(msg, ...args),
    info: (msg: string, ...args: unknown[]) => console.info(msg, ...args),
    debug: (msg: string, ...args: unknown[]) => console.debug(msg, ...args),
  });

  error(message: string, ...args: unknown[]): void {
    console.error(message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    console.info(message, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    console.debug(message, ...args);
  }

  logEvent(level: "error" | "warn" | "info" | "debug", event: LogEvent, message: string): void {
    this._logEventHandler(level, event, message);
  }
}

/**
 * A no-op logger that silently discards all log messages.
 *
 * Useful for testing or when logging should be disabled.
 */
export class NoOpLogger implements StructuredLogger {
  error(_message: string, ..._args: unknown[]): void {
    // No-op
  }

  warn(_message: string, ..._args: unknown[]): void {
    // No-op
  }

  info(_message: string, ..._args: unknown[]): void {
    // No-op
  }

  debug(_message: string, ..._args: unknown[]): void {
    // No-op
  }

  logEvent(
    _level: "error" | "warn" | "info" | "debug",
    _event: LogEvent,
    _message: string,
  ): void {
    // No-op
  }
}
