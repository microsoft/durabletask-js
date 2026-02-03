// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TokenCredential } from "@azure/identity";
import * as grpc from "@grpc/grpc-js";
import { DurableTaskAzureManagedClientOptions } from "./options";
import { ClientRetryOptions } from "./retry-policy";
import { TaskHubGrpcClient, Logger, ConsoleLogger } from "@microsoft/durabletask-js";

/**
 * Builder for creating DurableTaskClient instances that connect to Azure-managed Durable Task service.
 * This class provides various methods to create and configure clients using either connection strings or explicit parameters.
 */
export class DurableTaskAzureManagedClientBuilder {
  private _options: DurableTaskAzureManagedClientOptions;
  private _grpcChannelOptions: grpc.ChannelOptions = {};
  private _logger: Logger = new ConsoleLogger();

  /**
   * Creates a new instance of DurableTaskAzureManagedClientBuilder.
   */
  constructor() {
    this._options = new DurableTaskAzureManagedClientOptions();
  }

  /**
   * Configures the builder using a connection string.
   *
   * @param connectionString The connection string for Azure-managed Durable Task service.
   * @returns This builder instance.
   * @throws Error if connectionString is null or undefined.
   */
  connectionString(connectionString: string): DurableTaskAzureManagedClientBuilder {
    if (!connectionString) {
      throw new Error("connectionString must not be null or empty");
    }

    this._options = DurableTaskAzureManagedClientOptions.fromConnectionString(connectionString);
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
  ): DurableTaskAzureManagedClientBuilder {
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
  resourceId(resourceId: string): DurableTaskAzureManagedClientBuilder {
    this._options.setResourceId(resourceId);
    return this;
  }

  /**
   * Sets the token refresh margin.
   *
   * @param marginMs The token refresh margin in milliseconds.
   * @returns This builder instance.
   */
  tokenRefreshMargin(marginMs: number): DurableTaskAzureManagedClientBuilder {
    this._options.setTokenRefreshMargin(marginMs);
    return this;
  }

  /**
   * Sets whether insecure credentials are allowed.
   *
   * @param allowInsecure True to allow insecure credentials.
   * @returns This builder instance.
   */
  allowInsecureCredentials(allowInsecure: boolean): DurableTaskAzureManagedClientBuilder {
    this._options.setAllowInsecureCredentials(allowInsecure);
    return this;
  }

  /**
   * Sets additional gRPC channel options.
   *
   * @param options The gRPC channel options.
   * @returns This builder instance.
   */
  grpcChannelOptions(options: grpc.ChannelOptions): DurableTaskAzureManagedClientBuilder {
    this._grpcChannelOptions = options;
    return this;
  }

  /**
   * Sets the retry options for gRPC calls.
   *
   * @param options The retry options.
   * @returns This builder instance.
   */
  retryOptions(options: ClientRetryOptions): DurableTaskAzureManagedClientBuilder {
    this._options.setRetryOptions(options);
    return this;
  }

  /**
   * Sets the logger to use for logging.
   * Defaults to ConsoleLogger.
   *
   * @param logger The logger instance.
   * @returns This builder instance.
   */
  logger(logger: Logger): DurableTaskAzureManagedClientBuilder {
    this._logger = logger;
    return this;
  }

  /**
   * Builds and returns a configured TaskHubGrpcClient.
   *
   * @returns A new configured TaskHubGrpcClient instance.
   */
  build(): TaskHubGrpcClient {
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

    // Use the core TaskHubGrpcClient with custom credentials and metadata generator
    // For insecure connections, metadata is passed via the metadataGenerator parameter
    // For secure connections, metadata is included in the channel credentials
    return new TaskHubGrpcClient(hostAddress, combinedOptions, true, channelCredentials, metadataGenerator, this._logger);
  }
}

/**
 * Creates an Azure-managed Durable Task client using a connection string.
 *
 * @param connectionString The connection string for Azure-managed Durable Task service.
 * @returns A new configured TaskHubGrpcClient instance.
 * @throws Error if connectionString is null or undefined.
 */
export function createAzureManagedClient(connectionString: string): TaskHubGrpcClient;

/**
 * Creates an Azure-managed Durable Task client using explicit parameters.
 *
 * @param endpoint The endpoint address for Azure-managed Durable Task service.
 * @param taskHubName The name of the task hub to connect to.
 * @param credential The token credential for authentication, or null for anonymous access.
 * @returns A new configured TaskHubGrpcClient instance.
 * @throws Error if endpoint or taskHubName is null or undefined.
 */
export function createAzureManagedClient(
  endpoint: string,
  taskHubName: string,
  credential?: TokenCredential | null,
): TaskHubGrpcClient;

export function createAzureManagedClient(
  endpointOrConnectionString: string,
  taskHubName?: string,
  credential?: TokenCredential | null,
): TaskHubGrpcClient {
  const builder = new DurableTaskAzureManagedClientBuilder();

  if (taskHubName !== undefined) {
    // Called with (endpoint, taskHubName, credential?)
    return builder.endpoint(endpointOrConnectionString, taskHubName, credential).build();
  } else {
    // Called with (connectionString)
    return builder.connectionString(endpointOrConnectionString).build();
  }
}
