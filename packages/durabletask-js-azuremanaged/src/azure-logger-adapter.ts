// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { createClientLogger, AzureLogger } from "@azure/logger";
import { Logger } from "@microsoft/durabletask-js";

/**
 * Pre-configured logger adapter that uses the default "durabletask" namespace.
 * 
 * This adapter integrates with the Azure SDK logging infrastructure, allowing
 * log output to be controlled via the `AZURE_LOG_LEVEL` environment variable
 * or programmatically using `setLogLevel()` from `@azure/logger`.
 * 
 * Supported log levels (when configured via AZURE_LOG_LEVEL or setLogLevel()):
 * - error: Only show errors
 * - warning: Show warnings and errors
 * - info: Show info, warnings, and errors
 * - verbose: Show all logs including debug messages
 * 
 * @example
 * ```typescript
 * // Enable verbose logging via environment variable
 * process.env.AZURE_LOG_LEVEL = "verbose";
 * 
 * // Use with the client builder
 * const client = new DurableTaskAzureManagedClientBuilder()
 *   .connectionString(connectionString)
 *   .logger(AzureLoggerAdapter)
 *   .build();
 * ```
 */
export const AzureLoggerAdapter: Logger = createAzureLogger();

/**
 * Creates a Logger instance that integrates with Azure SDK's logging infrastructure.
 * 
 * The created logger uses `@azure/logger` under the hood, which means:
 * - Log output can be controlled via the `AZURE_LOG_LEVEL` environment variable
 * - Log output can be redirected using `setLogLevel()` from `@azure/logger`
 * - Logs are prefixed with the namespace for easy filtering
 * 
 * @param namespace - Optional sub-namespace to append to "durabletask".
 *                    For example, "client" results in "durabletask:client".
 * @returns A Logger instance configured for the specified namespace.
 * 
 * @example
 * ```typescript
 * // Create a logger for client operations
 * const clientLogger = createAzureLogger("client");
 * // Logs will be prefixed with "durabletask:client"
 * 
 * // Create a logger for worker operations
 * const workerLogger = createAzureLogger("worker");
 * // Logs will be prefixed with "durabletask:worker"
 * 
 * // Create a logger with default namespace
 * const defaultLogger = createAzureLogger();
 * // Logs will be prefixed with "durabletask"
 * ```
 */
export function createAzureLogger(namespace?: string): Logger {
  const fullNamespace = namespace ? `durabletask:${namespace}` : "durabletask";
  const azureLogger: AzureLogger = createClientLogger(fullNamespace);
  
  return {
    error: (message: string, ...args: unknown[]): void => {
      azureLogger.error(message, ...args);
    },
    warn: (message: string, ...args: unknown[]): void => {
      azureLogger.warning(message, ...args);
    },
    info: (message: string, ...args: unknown[]): void => {
      azureLogger.info(message, ...args);
    },
    debug: (message: string, ...args: unknown[]): void => {
      azureLogger.verbose(message, ...args);
    },
  };
}
