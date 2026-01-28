// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TokenCredential } from "@azure/identity";
import * as grpc from "@grpc/grpc-js";
import { DurableTaskAzureManagedConnectionString } from "./connection-string";
import { AccessTokenCache } from "./access-token-cache";
import { getCredentialFromAuthenticationType } from "./credential-factory";
import { getUserAgent } from "./user-agent";
import { ClientRetryOptions, createServiceConfig, DEFAULT_SERVICE_CONFIG } from "./retry-policy";

/**
 * Base options for configuring the Azure-managed Durable Task service.
 * Contains properties common to both client and worker configurations.
 */
abstract class DurableTaskAzureManagedOptionsBase {
  protected _endpointAddress: string = "";
  protected _taskHubName: string = "";
  protected _credential: TokenCredential | null = null;
  protected _resourceId: string = "https://durabletask.io";
  protected _allowInsecureCredentials: boolean = false;
  protected _tokenRefreshMargin: number = 5 * 60 * 1000; // 5 minutes in milliseconds
  protected _retryOptions: ClientRetryOptions | undefined = undefined;

  /**
   * Gets the endpoint address.
   */
  getEndpointAddress(): string {
    return this._endpointAddress;
  }

  /**
   * Gets the task hub name.
   */
  getTaskHubName(): string {
    return this._taskHubName;
  }

  /**
   * Gets the credential used for authentication.
   */
  getCredential(): TokenCredential | null {
    return this._credential;
  }

  /**
   * Gets the resource ID.
   */
  getResourceId(): string {
    return this._resourceId;
  }

  /**
   * Gets whether insecure credentials are allowed.
   */
  isAllowInsecureCredentials(): boolean {
    return this._allowInsecureCredentials;
  }

  /**
   * Gets the token refresh margin in milliseconds.
   */
  getTokenRefreshMargin(): number {
    return this._tokenRefreshMargin;
  }

  /**
   * Gets the retry options for gRPC calls.
   */
  getRetryOptions(): ClientRetryOptions | undefined {
    return this._retryOptions;
  }

  /**
   * Gets the gRPC service config JSON string with retry policy.
   */
  getServiceConfig(): string {
    if (this._retryOptions) {
      return createServiceConfig(this._retryOptions);
    }
    return DEFAULT_SERVICE_CONFIG;
  }

  /**
   * Parses and normalizes the endpoint URL.
   *
   * @returns The normalized host address for gRPC connection.
   */
  getHostAddress(): string {
    let endpoint = this._endpointAddress;

    // Add https:// prefix if no protocol is specified
    if (!endpoint.startsWith("http://") && !endpoint.startsWith("https://")) {
      endpoint = "https://" + endpoint;
    }

    try {
      const url = new URL(endpoint);
      let authority = url.hostname;
      if (url.port) {
        authority += ":" + url.port;
      }
      return authority;
    } catch {
      throw new Error(`Invalid endpoint URL: ${endpoint}`);
    }
  }

  /**
   * Creates a gRPC channel metadata generator.
   * @param callerType The type of caller for user-agent header.
   * @param workerId Optional worker ID (only for workers).
   */
  protected createMetadataGeneratorInternal(
    callerType: string,
    workerId?: string,
  ): (params: { service_url: string }, callback: (error: Error | null, metadata?: grpc.Metadata) => void) => void {
    // Create token cache only if credential is not null
    let tokenCache: AccessTokenCache | null = null;
    if (this._credential) {
      const scope = this._resourceId + "/.default";
      tokenCache = new AccessTokenCache(this._credential, scope, this._tokenRefreshMargin);
    }

    const taskHubName = this._taskHubName;
    const userAgent = getUserAgent(callerType);

    return (_params: { service_url: string }, callback: (error: Error | null, metadata?: grpc.Metadata) => void) => {
      const metadata = new grpc.Metadata();
      metadata.set("taskhub", taskHubName);
      metadata.set("x-user-agent", userAgent);

      // Only add workerid for workers
      if (workerId) {
        metadata.set("workerid", workerId);
      }

      if (tokenCache) {
        tokenCache
          .getToken()
          .then((token) => {
            metadata.set("Authorization", `Bearer ${token.token}`);
            callback(null, metadata);
          })
          .catch((error) => {
            callback(error);
          });
      } else {
        callback(null, metadata);
      }
    };
  }

  /**
   * Creates gRPC channel credentials based on the configured options.
   * @param callerType The type of caller.
   * @param workerId Optional worker ID (only for workers).
   */
  protected createChannelCredentialsInternal(callerType: string, workerId?: string): grpc.ChannelCredentials {
    const metadataGenerator = this.createMetadataGeneratorInternal(callerType, workerId);
    const callCredentials = grpc.credentials.createFromMetadataGenerator(metadataGenerator);

    if (this._allowInsecureCredentials) {
      // For insecure connections (e.g., emulator), we still need to add metadata
      const insecureCredentials = grpc.ChannelCredentials.createInsecure();
      return insecureCredentials.compose(callCredentials);
    }

    const channelCredentials = grpc.ChannelCredentials.createSsl();
    return channelCredentials.compose(callCredentials);
  }

  /**
   * Configures base options from a parsed connection string.
   */
  protected configureFromConnectionString(connectionString: DurableTaskAzureManagedConnectionString): void {
    this._endpointAddress = connectionString.getEndpoint();
    this._taskHubName = connectionString.getTaskHubName();

    const credential = getCredentialFromAuthenticationType(connectionString);
    this._credential = credential;
    this._allowInsecureCredentials = credential === null;
  }
}

/**
 * Options for configuring the Azure-managed Durable Task client.
 */
export class DurableTaskAzureManagedClientOptions extends DurableTaskAzureManagedOptionsBase {
  /**
   * Creates a new instance of DurableTaskAzureManagedClientOptions.
   */
  constructor() {
    super();
  }

  /**
   * Creates a new instance from a connection string.
   */
  static fromConnectionString(connectionString: string): DurableTaskAzureManagedClientOptions {
    const parsedConnectionString = new DurableTaskAzureManagedConnectionString(connectionString);
    return DurableTaskAzureManagedClientOptions.fromParsedConnectionString(parsedConnectionString);
  }

  /**
   * Creates a new instance from a parsed connection string.
   */
  static fromParsedConnectionString(
    connectionString: DurableTaskAzureManagedConnectionString,
  ): DurableTaskAzureManagedClientOptions {
    const options = new DurableTaskAzureManagedClientOptions();
    options.configureFromConnectionString(connectionString);
    return options;
  }

  setEndpointAddress(endpointAddress: string): DurableTaskAzureManagedClientOptions {
    this._endpointAddress = endpointAddress;
    return this;
  }

  setTaskHubName(taskHubName: string): DurableTaskAzureManagedClientOptions {
    this._taskHubName = taskHubName;
    return this;
  }

  setCredential(credential: TokenCredential | null): DurableTaskAzureManagedClientOptions {
    this._credential = credential;
    return this;
  }

  setResourceId(resourceId: string): DurableTaskAzureManagedClientOptions {
    this._resourceId = resourceId;
    return this;
  }

  setAllowInsecureCredentials(allowInsecureCredentials: boolean): DurableTaskAzureManagedClientOptions {
    this._allowInsecureCredentials = allowInsecureCredentials;
    return this;
  }

  setTokenRefreshMargin(tokenRefreshMargin: number): DurableTaskAzureManagedClientOptions {
    this._tokenRefreshMargin = tokenRefreshMargin;
    return this;
  }

  setRetryOptions(retryOptions: ClientRetryOptions): DurableTaskAzureManagedClientOptions {
    this._retryOptions = retryOptions;
    return this;
  }

  /**
   * Creates a gRPC channel metadata generator.
   * Does NOT include workerid header (client only).
   */
  createMetadataGenerator(): (
    params: { service_url: string },
    callback: (error: Error | null, metadata?: grpc.Metadata) => void,
  ) => void {
    return this.createMetadataGeneratorInternal("DurableTaskClient");
  }

  /**
   * Creates gRPC channel credentials for the client.
   * Does NOT include workerid header.
   */
  createChannelCredentials(): grpc.ChannelCredentials {
    return this.createChannelCredentialsInternal("DurableTaskClient");
  }
}

/**
 * Options for configuring the Azure-managed Durable Task worker.
 */
export class DurableTaskAzureManagedWorkerOptions extends DurableTaskAzureManagedOptionsBase {
  private _workerId: string;

  /**
   * Creates a new instance of DurableTaskAzureManagedWorkerOptions.
   */
  constructor() {
    super();
    this._workerId = DurableTaskAzureManagedWorkerOptions.generateDefaultWorkerId();
  }

  /**
   * Generates a default worker ID in the format: hostname,pid,uniqueId
   * This matches the .NET format: {MachineName},{ProcessId},{Guid}
   */
  private static generateDefaultWorkerId(): string {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const os = require("os");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = require("crypto");
    const hostname = os.hostname();
    const pid = process.pid;
    const uniqueId = crypto.randomUUID().replace(/-/g, "");
    return `${hostname},${pid},${uniqueId}`;
  }

  /**
   * Creates a new instance from a connection string.
   */
  static fromConnectionString(connectionString: string): DurableTaskAzureManagedWorkerOptions {
    const parsedConnectionString = new DurableTaskAzureManagedConnectionString(connectionString);
    return DurableTaskAzureManagedWorkerOptions.fromParsedConnectionString(parsedConnectionString);
  }

  /**
   * Creates a new instance from a parsed connection string.
   */
  static fromParsedConnectionString(
    connectionString: DurableTaskAzureManagedConnectionString,
  ): DurableTaskAzureManagedWorkerOptions {
    const options = new DurableTaskAzureManagedWorkerOptions();
    options.configureFromConnectionString(connectionString);
    return options;
  }

  /**
   * Gets the worker ID used to identify the worker instance.
   */
  getWorkerId(): string {
    return this._workerId;
  }

  setEndpointAddress(endpointAddress: string): DurableTaskAzureManagedWorkerOptions {
    this._endpointAddress = endpointAddress;
    return this;
  }

  setTaskHubName(taskHubName: string): DurableTaskAzureManagedWorkerOptions {
    this._taskHubName = taskHubName;
    return this;
  }

  setCredential(credential: TokenCredential | null): DurableTaskAzureManagedWorkerOptions {
    this._credential = credential;
    return this;
  }

  setResourceId(resourceId: string): DurableTaskAzureManagedWorkerOptions {
    this._resourceId = resourceId;
    return this;
  }

  setAllowInsecureCredentials(allowInsecureCredentials: boolean): DurableTaskAzureManagedWorkerOptions {
    this._allowInsecureCredentials = allowInsecureCredentials;
    return this;
  }

  setTokenRefreshMargin(tokenRefreshMargin: number): DurableTaskAzureManagedWorkerOptions {
    this._tokenRefreshMargin = tokenRefreshMargin;
    return this;
  }

  /**
   * Sets the worker ID used to identify the worker instance.
   */
  setWorkerId(workerId: string): DurableTaskAzureManagedWorkerOptions {
    this._workerId = workerId;
    return this;
  }

  /**
   * Creates a gRPC channel metadata generator.
   * Includes workerid header (worker only).
   */
  createMetadataGenerator(): (
    params: { service_url: string },
    callback: (error: Error | null, metadata?: grpc.Metadata) => void,
  ) => void {
    return this.createMetadataGeneratorInternal("DurableTaskWorker", this._workerId);
  }

  /**
   * Creates gRPC channel credentials for the worker.
   * Includes workerid header.
   */
  createChannelCredentials(): grpc.ChannelCredentials {
    return this.createChannelCredentialsInternal("DurableTaskWorker", this._workerId);
  }
}
