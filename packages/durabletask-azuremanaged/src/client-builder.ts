// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TokenCredential } from "@azure/identity";
import * as grpc from "@grpc/grpc-js";
import { DurableTaskAzureManagedOptions } from "./options";
import { TaskHubGrpcClient } from "@microsoft/durabletask-js";

/**
 * A wrapper around TaskHubGrpcClient that provides Azure-managed-specific configuration.
 * This allows the gRPC client to be created with Azure-managed credentials and options.
 *
 * Note: This class uses type assertions to set the internal stub property since the
 * parent class doesn't provide a protected setter. This is intentional to maintain
 * backward compatibility while enabling Azure-managed-specific authentication.
 */
export class AzureManagedTaskHubGrpcClient extends TaskHubGrpcClient {
  constructor(stub: grpc.Client) {
    super();
    // Set the internal stub directly since the parent class doesn't provide a setter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any)._stub = stub;
  }
}

/**
 * Builder for creating DurableTaskClient instances that connect to Azure-managed Durable Task service.
 * This class provides various methods to create and configure clients using either connection strings or explicit parameters.
 */
export class DurableTaskAzureManagedClientBuilder {
  private _options: DurableTaskAzureManagedOptions;
  private _grpcChannelOptions: grpc.ChannelOptions = {};

  /**
   * Creates a new instance of DurableTaskAzureManagedClientBuilder.
   */
  constructor() {
    this._options = new DurableTaskAzureManagedOptions();
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

    this._options = DurableTaskAzureManagedOptions.fromConnectionString(connectionString);
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
   * Builds and returns a configured TaskHubGrpcClient.
   *
   * @returns A new configured TaskHubGrpcClient instance.
   */
  build(): TaskHubGrpcClient {
    const hostAddress = this._options.getHostAddress();
    const channelCredentials = this._options.createChannelCredentials();

    const defaultOptions: grpc.ChannelOptions = {
      "grpc.max_receive_message_length": -1,
      "grpc.max_send_message_length": -1,
      "grpc.primary_user_agent": "durabletask-js-azuremanaged",
    };

    const combinedOptions = {
      ...defaultOptions,
      ...this._grpcChannelOptions,
    };

    // Dynamically require the proto stubs from the main package
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const stubs = require("@microsoft/durabletask-js/dist/proto/orchestrator_service_grpc_pb");
    const stub = new stubs.TaskHubSidecarServiceClient(hostAddress, channelCredentials, combinedOptions);
    return new AzureManagedTaskHubGrpcClient(stub);
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
