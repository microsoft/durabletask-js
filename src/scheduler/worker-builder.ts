// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TokenCredential } from "@azure/identity";
import * as grpc from "@grpc/grpc-js";
import { DurableTaskSchedulerOptions } from "./options";
import { TaskHubGrpcWorker } from "../worker/task-hub-grpc-worker";
import * as stubs from "../proto/orchestrator_service_grpc_pb";
import { TOrchestrator } from "../types/orchestrator.type";
import { TActivity } from "../types/activity.type";
import { TInput } from "../types/input.type";
import { TOutput } from "../types/output.type";

/**
 * A wrapper around TaskHubGrpcWorker that provides scheduler-specific configuration.
 * This allows the gRPC worker to be created with scheduler credentials and options.
 */
export class SchedulerTaskHubGrpcWorker extends TaskHubGrpcWorker {
  private _schedulerHostAddress: string;
  private _schedulerCredentials: grpc.ChannelCredentials;
  private _schedulerChannelOptions: grpc.ChannelOptions;

  constructor(hostAddress: string, credentials: grpc.ChannelCredentials, channelOptions: grpc.ChannelOptions) {
    // Call parent with undefined to skip normal initialization
    super();
    this._schedulerHostAddress = hostAddress;
    this._schedulerCredentials = credentials;
    this._schedulerChannelOptions = channelOptions;
  }

  /**
   * Overrides the parent start method to use scheduler-specific configuration.
   */
  override async start(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const self = this as any;

    if (self._isRunning) {
      throw new Error("The worker is already running.");
    }

    // Create the gRPC client with scheduler-specific configuration
    const stub = new stubs.TaskHubSidecarServiceClient(
      this._schedulerHostAddress,
      this._schedulerCredentials,
      this._schedulerChannelOptions,
    );

    self._stub = stub;

    // Create a custom GrpcClient-like object for the internal worker
    const clientLike = {
      stub: stub,
    };

    // Call the internal worker method
    self.internalRunWorker(clientLike);
    self._isRunning = true;
  }
}

/**
 * Builder for creating DurableTaskWorker instances that connect to Azure-managed Durable Task Scheduler.
 * This class provides various methods to create and configure workers using either connection strings or explicit parameters.
 */
export class DurableTaskSchedulerWorkerBuilder {
  private _options: DurableTaskSchedulerOptions;
  private _grpcChannelOptions: grpc.ChannelOptions = {};
  private _orchestrators: { name?: string; fn: TOrchestrator }[] = [];
  private _activities: { name?: string; fn: TActivity<TInput, TOutput> }[] = [];

  /**
   * Creates a new instance of DurableTaskSchedulerWorkerBuilder.
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
  connectionString(connectionString: string): DurableTaskSchedulerWorkerBuilder {
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
  ): DurableTaskSchedulerWorkerBuilder {
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
  resourceId(resourceId: string): DurableTaskSchedulerWorkerBuilder {
    this._options.setResourceId(resourceId);
    return this;
  }

  /**
   * Sets the token refresh margin.
   *
   * @param marginMs The token refresh margin in milliseconds.
   * @returns This builder instance.
   */
  tokenRefreshMargin(marginMs: number): DurableTaskSchedulerWorkerBuilder {
    this._options.setTokenRefreshMargin(marginMs);
    return this;
  }

  /**
   * Sets whether insecure credentials are allowed.
   *
   * @param allowInsecure True to allow insecure credentials.
   * @returns This builder instance.
   */
  allowInsecureCredentials(allowInsecure: boolean): DurableTaskSchedulerWorkerBuilder {
    this._options.setAllowInsecureCredentials(allowInsecure);
    return this;
  }

  /**
   * Sets additional gRPC channel options.
   *
   * @param options The gRPC channel options.
   * @returns This builder instance.
   */
  grpcChannelOptions(options: grpc.ChannelOptions): DurableTaskSchedulerWorkerBuilder {
    this._grpcChannelOptions = options;
    return this;
  }

  /**
   * Registers an orchestrator function with the worker.
   *
   * @param fn The orchestrator function.
   * @returns This builder instance.
   */
  addOrchestrator(fn: TOrchestrator): DurableTaskSchedulerWorkerBuilder {
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
  addNamedOrchestrator(name: string, fn: TOrchestrator): DurableTaskSchedulerWorkerBuilder {
    this._orchestrators.push({ name, fn });
    return this;
  }

  /**
   * Registers an activity function with the worker.
   *
   * @param fn The activity function.
   * @returns This builder instance.
   */
  addActivity(fn: TActivity<TInput, TOutput>): DurableTaskSchedulerWorkerBuilder {
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
  addNamedActivity(name: string, fn: TActivity<TInput, TOutput>): DurableTaskSchedulerWorkerBuilder {
    this._activities.push({ name, fn });
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

    const defaultOptions: grpc.ChannelOptions = {
      "grpc.max_receive_message_length": -1,
      "grpc.max_send_message_length": -1,
      "grpc.primary_user_agent": "durabletask-js-scheduler",
    };

    const combinedOptions = {
      ...defaultOptions,
      ...this._grpcChannelOptions,
    };

    const worker = new SchedulerTaskHubGrpcWorker(hostAddress, channelCredentials, combinedOptions);

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
 * Creates a TaskHubGrpcWorker configured for Azure-managed Durable Task Scheduler using a connection string.
 *
 * @param connectionString The connection string for Azure-managed Durable Task Scheduler.
 * @returns A new DurableTaskSchedulerWorkerBuilder instance.
 * @throws Error if connectionString is null or undefined.
 */
export function createSchedulerWorkerBuilder(connectionString: string): DurableTaskSchedulerWorkerBuilder;

/**
 * Creates a TaskHubGrpcWorker configured for Azure-managed Durable Task Scheduler using explicit parameters.
 *
 * @param endpoint The endpoint address for Azure-managed Durable Task Scheduler.
 * @param taskHubName The name of the task hub to connect to.
 * @param credential The token credential for authentication, or null for anonymous access.
 * @returns A new DurableTaskSchedulerWorkerBuilder instance.
 * @throws Error if endpoint or taskHubName is null or undefined.
 */
export function createSchedulerWorkerBuilder(
  endpoint: string,
  taskHubName: string,
  credential?: TokenCredential | null,
): DurableTaskSchedulerWorkerBuilder;

export function createSchedulerWorkerBuilder(
  endpointOrConnectionString: string,
  taskHubName?: string,
  credential?: TokenCredential | null,
): DurableTaskSchedulerWorkerBuilder {
  const builder = new DurableTaskSchedulerWorkerBuilder();

  if (taskHubName !== undefined) {
    // Called with (endpoint, taskHubName, credential?)
    return builder.endpoint(endpointOrConnectionString, taskHubName, credential);
  } else {
    // Called with (connectionString)
    return builder.connectionString(endpointOrConnectionString);
  }
}
