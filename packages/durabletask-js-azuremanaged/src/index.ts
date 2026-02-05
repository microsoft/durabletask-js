// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export { DurableTaskAzureManagedConnectionString } from "./connection-string";
export { AccessTokenCache } from "./access-token-cache";
export { DurableTaskAzureManagedClientOptions, DurableTaskAzureManagedWorkerOptions } from "./options";
export { getCredentialFromAuthenticationType } from "./credential-factory";
export { getUserAgent } from "./user-agent";
export {
  ClientRetryOptions,
  createServiceConfig,
  DEFAULT_SERVICE_CONFIG,
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_INITIAL_BACKOFF_MS,
  DEFAULT_MAX_BACKOFF_MS,
  DEFAULT_BACKOFF_MULTIPLIER,
} from "./retry-policy";
export { DurableTaskAzureManagedClientBuilder, createAzureManagedClient } from "./client-builder";
export { DurableTaskAzureManagedWorkerBuilder, createAzureManagedWorkerBuilder } from "./worker-builder";

// Logger exports - re-export from core package for convenience
export { Logger, ConsoleLogger, NoOpLogger } from "@microsoft/durabletask-js";

// Versioning exports - re-export from core package for convenience
export { VersioningOptions, VersionMatchStrategy, VersionFailureStrategy } from "@microsoft/durabletask-js";

// Azure-specific logger adapter
export { AzureLoggerAdapter, createAzureLogger } from "./azure-logger-adapter";
