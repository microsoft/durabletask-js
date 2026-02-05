// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TokenCredential } from "@azure/identity";
import * as grpc from "@grpc/grpc-js";
import { DurableTaskAzureManagedWorkerOptions } from "./options";
import { TaskHubGrpcWorker, TOrchestrator, TActivity, TInput, TOutput, Logger, ConsoleLogger } from "@microsoft/durabletask-js";

/**
 * Builder for creating DurableTaskWorker instances that connect to Azure-managed Durable Task service.
 * This class provides various methods to create and configure workers using either connection strings or explicit parameters.
 */
export class DurableTaskAzureManagedWorkerBuilder {
  private _options: DurableTaskAzureManagedWorkerOptions;
  private _grpcChannelOptions: grpc.ChannelOptions = {};
  private _orchestrators: { name?: string; fn: TOrchestrator }[] = [];
  private _activities: { name?: string; fn: TActivity<TInput, TOutput> }[] = [];
  private _logger: Logger = new ConsoleLogger();
  private _shutdownTimeoutMs?: number;

  /**
   * Creates a new instance of DurableTaskAzureManagedWorkerBuilder.
   */
  constructor() {
    this._options = new DurableTaskAzureManagedWorkerOptions();
  }

  /**
   * Configures the builder using a connection string.
   *
   * @param connectionString The connection string for Azure-managed Durable Task service.
   * @returns This builder instance.
   * @throws Error if connectionString is null or undefined.
   */
  connectionString(connectionString: string): DurableTaskAzureManagedWorkerBuilder {
    if (!connectionString) {
      throw new Error("connectionString must not be null or empty");
    }

    this._options = DurableTaskAzureManagedWorkerOptions.fromConnectionString(connectionString);
    return this;
  }

  /**
   * Configures the builder using explicit parameters.
   *
   * @param endpoint The endpoint address for Azure-managed Durable Task service.
   * @param taskHubName The name of the task hub to connect to.
   * @param credential The token credential for authentication, or null for anonymous access.
   * @returns This builder instance.
   * @throws Error if endpoint or taskHubName is null or undefined.
   */
  endpoint(
    endpoint: string,
    taskHubName: string,
    credential?: TokenCredential | null,
  ): DurableTaskAzureManagedWorkerBuilder {
    if (!endpoint) {
      throw new Error("endpoint must not be null or empty");
    }
    if (!taskHubName) {
      throw new Error("taskHubName must not be null or empty");
    }

    this._options
      .setEndpointAddress(endpoint)
      .setTaskHubName(taskHubName)
      .setCredential(credential ?? null)
      .setAllowInsecureCredentials(credential === null || credential === undefined);

    return this;
  }

  /**
   * Sets the resource ID for authentication.
   *
   * @param resourceId The resource ID.
   * @returns This builder instance.
   */
  resourceId(resourceId: string): DurableTaskAzureManagedWorkerBuilder {
    this._options.setResourceId(resourceId);
    return this;
  }

  /**
   * Sets the token refresh margin.
   *
   * @param marginMs The token refresh margin in milliseconds.
   * @returns This builder instance.
   */
  tokenRefreshMargin(marginMs: number): DurableTaskAzureManagedWorkerBuilder {
    this._options.setTokenRefreshMargin(marginMs);
    return this;
  }

  /**
   * Sets the worker ID used to identify this worker instance.
   * Default value is: hostname,pid,uniqueId
   *
   * @param workerId The worker ID.
   * @returns This builder instance.
   */
  workerId(workerId: string): DurableTaskAzureManagedWorkerBuilder {
    this._options.setWorkerId(workerId);
    return this;
  }

  /**
   * Sets whether insecure credentials are allowed.
   *
   * @param allowInsecure True to allow insecure credentials.
   * @returns This builder instance.
   */
  allowInsecureCredentials(allowInsecure: boolean): DurableTaskAzureManagedWorkerBuilder {
    this._options.setAllowInsecureCredentials(allowInsecure);
    return this;
  }

  /**
   * Sets additional gRPC channel options.
   *
   * @param options The gRPC channel options.
   * @returns This builder instance.
   */
  grpcChannelOptions(options: grpc.ChannelOptions): DurableTaskAzureManagedWorkerBuilder {
    this._grpcChannelOptions = options;
    return this;
  }

  /**
   * Registers an orchestrator function with the worker.
   *
   * @param fn The orchestrator function.
   * @returns This builder instance.
   */
  addOrchestrator(fn: TOrchestrator): DurableTaskAzureManagedWorkerBuilder {
    this._orchestrators.push({ fn });
    return this;
  }

  /**
   * Registers a named orchestrator function with the worker.
   *
   * @param name The name of the orchestrator.
   * @param fn The orchestrator function.
   * @returns This builder instance.
   */
  addNamedOrchestrator(name: string, fn: TOrchestrator): DurableTaskAzureManagedWorkerBuilder {
    this._orchestrators.push({ name, fn });
    return this;
  }

  /**
   * Registers an activity function with the worker.
   *
   * @param fn The activity function.
   * @returns This builder instance.
   */
  addActivity(fn: TActivity<TInput, TOutput>): DurableTaskAzureManagedWorkerBuilder {
    this._activities.push({ fn });
    return this;
  }

  /**
   * Registers a named activity function with the worker.
   *
   * @param name The name of the activity.
   * @param fn The activity function.
   * @returns This builder instance.
   */
  addNamedActivity(name: string, fn: TActivity<TInput, TOutput>): DurableTaskAzureManagedWorkerBuilder {
    this._activities.push({ name, fn });
    return this;
  }

  /**
   * Sets the logger to use for logging.
   * Defaults to ConsoleLogger.
   *
   * @param logger The logger instance.
   * @returns This builder instance.
   */
  logger(logger: Logger): DurableTaskAzureManagedWorkerBuilder {
    this._logger = logger;
    return this;
  }

  /**
   * Sets the shutdown timeout in milliseconds.
   * This is the maximum time to wait for pending work items to complete during shutdown.
   * Defaults to 30000 (30 seconds).
   *
   * @param timeoutMs The shutdown timeout in milliseconds.
   * @returns This builder instance.
   */
  shutdownTimeout(timeoutMs: number): DurableTaskAzureManagedWorkerBuilder {
    this._shutdownTimeoutMs = timeoutMs;
    return this;
  }

  /**
   * Builds and returns a configured TaskHubGrpcWorker.
   *
   * @returns A new configured TaskHubGrpcWorker instance.
   */
  build(): TaskHubGrpcWorker {
    const hostAddress = this._options.getHostAddress();
    const channelCredentials = this._options.createChannelCredentials();
    const metadataGenerator = this._options.createMetadataGenerator();

    const defaultOptions: grpc.ChannelOptions = {
      "grpc.primary_user_agent": "durabletask-js-azuremanaged",
      "grpc.enable_retries": 1,
      "grpc.service_config": this._options.getServiceConfig(),
    };

    const combinedOptions = {
      ...defaultOptions,
      ...this._grpcChannelOptions,
    };

    // Use the core TaskHubGrpcWorker with custom credentials and metadata generator
    // For insecure connections, metadata is passed via the metadataGenerator parameter
    // For secure connections, metadata is included in the channel credentials
    const worker = new TaskHubGrpcWorker(
      hostAddress,
      combinedOptions,
      true,
      channelCredentials,
      metadataGenerator,
      this._logger,
      this._shutdownTimeoutMs,
    );

    // Register all orchestrators
    for (const { name, fn } of this._orchestrators) {
      if (name) {
        worker.addNamedOrchestrator(name, fn);
      } else {
        worker.addOrchestrator(fn);
      }
    }

    // Register all activities
    for (const { name, fn } of this._activities) {
      if (name) {
        worker.addNamedActivity(name, fn);
      } else {
        worker.addActivity(fn);
      }
    }

    return worker;
  }
}

/**
 * Creates an Azure-managed Durable Task worker builder using a connection string.
 *
 * @param connectionString The connection string for Azure-managed Durable Task service.
 * @returns A new DurableTaskAzureManagedWorkerBuilder instance.
 * @throws Error if connectionString is null or undefined.
 */
export function createAzureManagedWorkerBuilder(connectionString: string): DurableTaskAzureManagedWorkerBuilder;

/**
 * Creates an Azure-managed Durable Task worker builder using explicit parameters.
 *
 * @param endpoint The endpoint address for Azure-managed Durable Task service.
 * @param taskHubName The name of the task hub to connect to.
 * @param credential The token credential for authentication, or null for anonymous access.
 * @returns A new DurableTaskAzureManagedWorkerBuilder instance.
 * @throws Error if endpoint or taskHubName is null or undefined.
 */
export function createAzureManagedWorkerBuilder(
  endpoint: string,
  taskHubName: string,
  credential?: TokenCredential | null,
): DurableTaskAzureManagedWorkerBuilder;

export function createAzureManagedWorkerBuilder(
  endpointOrConnectionString: string,
  taskHubName?: string,
  credential?: TokenCredential | null,
): DurableTaskAzureManagedWorkerBuilder {
  const builder = new DurableTaskAzureManagedWorkerBuilder();

  if (taskHubName !== undefined) {
    // Called with (endpoint, taskHubName, credential?)
    return builder.endpoint(endpointOrConnectionString, taskHubName, credential);
  } else {
    // Called with (connectionString)
    return builder.connectionString(endpointOrConnectionString);
  }
}
