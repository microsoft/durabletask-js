// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TokenCredential } from "@azure/identity";
import * as grpc from "@grpc/grpc-js";
import { DurableTaskSchedulerOptions } from "./options";
import { TaskHubGrpcClient } from "../client/client";
import * as stubs from "../proto/orchestrator_service_grpc_pb";

/**
 * A wrapper around TaskHubGrpcClient that provides scheduler-specific configuration.
 * This allows the gRPC client to be created with scheduler credentials and options.
 */
export class SchedulerTaskHubGrpcClient extends TaskHubGrpcClient {
  private _schedulerStub: stubs.TaskHubSidecarServiceClient;

  constructor(stub: stubs.TaskHubSidecarServiceClient) {
    // Call parent with dummy values - we'll override the stub
    super();
    this._schedulerStub = stub;
    // Override the parent's stub by directly setting it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any)._stub = stub;
  }
}

/**
 * Builder for creating DurableTaskClient instances that connect to Azure-managed Durable Task Scheduler.
 * This class provides various methods to create and configure clients using either connection strings or explicit parameters.
 */
export class DurableTaskSchedulerClientBuilder {
  private _options: DurableTaskSchedulerOptions;
  private _grpcChannelOptions: grpc.ChannelOptions = {};

  /**
   * Creates a new instance of DurableTaskSchedulerClientBuilder.
   */
  constructor() {
    this._options = new DurableTaskSchedulerOptions();
  }

  /**
   * Configures the builder using a connection string.
   *
   * @param connectionString The connection string for Azure-managed Durable Task Scheduler.
   * @returns This builder instance.
   * @throws Error if connectionString is null or undefined.
   */
  connectionString(connectionString: string): DurableTaskSchedulerClientBuilder {
    if (!connectionString) {
      throw new Error("connectionString must not be null or empty");
    }

    this._options = DurableTaskSchedulerOptions.fromConnectionString(connectionString);
    return this;
  }

  /**
   * Configures the builder using explicit parameters.
   *
   * @param endpoint The endpoint address for Azure-managed Durable Task Scheduler.
   * @param taskHubName The name of the task hub to connect to.
   * @param credential The token credential for authentication, or null for anonymous access.
   * @returns This builder instance.
   * @throws Error if endpoint or taskHubName is null or undefined.
   */
  endpoint(
    endpoint: string,
    taskHubName: string,
    credential?: TokenCredential | null,
  ): DurableTaskSchedulerClientBuilder {
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
  resourceId(resourceId: string): DurableTaskSchedulerClientBuilder {
    this._options.setResourceId(resourceId);
    return this;
  }

  /**
   * Sets the token refresh margin.
   *
   * @param marginMs The token refresh margin in milliseconds.
   * @returns This builder instance.
   */
  tokenRefreshMargin(marginMs: number): DurableTaskSchedulerClientBuilder {
    this._options.setTokenRefreshMargin(marginMs);
    return this;
  }

  /**
   * Sets whether insecure credentials are allowed.
   *
   * @param allowInsecure True to allow insecure credentials.
   * @returns This builder instance.
   */
  allowInsecureCredentials(allowInsecure: boolean): DurableTaskSchedulerClientBuilder {
    this._options.setAllowInsecureCredentials(allowInsecure);
    return this;
  }

  /**
   * Sets additional gRPC channel options.
   *
   * @param options The gRPC channel options.
   * @returns This builder instance.
   */
  grpcChannelOptions(options: grpc.ChannelOptions): DurableTaskSchedulerClientBuilder {
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
      "grpc.primary_user_agent": "durabletask-js-scheduler",
    };

    const combinedOptions = {
      ...defaultOptions,
      ...this._grpcChannelOptions,
    };

    const stub = new stubs.TaskHubSidecarServiceClient(hostAddress, channelCredentials, combinedOptions);
    return new SchedulerTaskHubGrpcClient(stub);
  }
}

/**
 * Creates a DurableTaskSchedulerClientBuilder configured for Azure-managed Durable Task Scheduler using a connection string.
 *
 * @param connectionString The connection string for Azure-managed Durable Task Scheduler.
 * @returns A new configured DurableTaskSchedulerClientBuilder instance.
 * @throws Error if connectionString is null or undefined.
 */
export function createSchedulerClient(connectionString: string): TaskHubGrpcClient;

/**
 * Creates a DurableTaskSchedulerClientBuilder configured for Azure-managed Durable Task Scheduler using explicit parameters.
 *
 * @param endpoint The endpoint address for Azure-managed Durable Task Scheduler.
 * @param taskHubName The name of the task hub to connect to.
 * @param credential The token credential for authentication, or null for anonymous access.
 * @returns A new configured DurableTaskSchedulerClientBuilder instance.
 * @throws Error if endpoint or taskHubName is null or undefined.
 */
export function createSchedulerClient(
  endpoint: string,
  taskHubName: string,
  credential?: TokenCredential | null,
): TaskHubGrpcClient;

export function createSchedulerClient(
  endpointOrConnectionString: string,
  taskHubName?: string,
  credential?: TokenCredential | null,
): TaskHubGrpcClient {
  const builder = new DurableTaskSchedulerClientBuilder();

  if (taskHubName !== undefined) {
    // Called with (endpoint, taskHubName, credential?)
    return builder.endpoint(endpointOrConnectionString, taskHubName, credential).build();
  } else {
    // Called with (connectionString)
    return builder.connectionString(endpointOrConnectionString).build();
  }
}
