// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

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
 * Default logger implementation that delegates to the console.
 * 
 * This is the default logger used by the SDK when no custom logger is provided.
 */
export class ConsoleLogger implements Logger {
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
}

/**
 * A no-op logger that silently discards all log messages.
 * 
 * Useful for testing or when logging should be disabled.
 */
export class NoOpLogger implements Logger {
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
}
