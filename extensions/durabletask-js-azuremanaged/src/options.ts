// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TokenCredential } from "@azure/identity";
import * as grpc from "@grpc/grpc-js";
import * as os from "os";
import * as crypto from "crypto";
import { DurableTaskAzureManagedConnectionString } from "./connection-string";
import { AccessTokenCache } from "./access-token-cache";
import { getCredentialFromAuthenticationType } from "./credential-factory";

/**
 * Generates a default worker ID in the format: hostname,pid,uniqueId
 * This matches the .NET format: {MachineName},{ProcessId},{Guid}
 */
function generateDefaultWorkerId(): string {
  const hostname = os.hostname();
  const pid = process.pid;
  const uniqueId = crypto.randomUUID().replace(/-/g, "");
  return `${hostname},${pid},${uniqueId}`;
}

/**
 * Options for configuring the Azure-managed Durable Task service.
 */
export class DurableTaskAzureManagedOptions {
  private _endpointAddress: string = "";
  private _taskHubName: string = "";
  private _credential: TokenCredential | null = null;
  private _resourceId: string = "https://durabletask.io";
  private _allowInsecureCredentials: boolean = false;
  private _tokenRefreshMargin: number = 5 * 60 * 1000; // 5 minutes in milliseconds
  private _workerId: string = generateDefaultWorkerId();

  /**
   * Creates a new instance of DurableTaskAzureManagedOptions.
   */
  constructor() {}

  /**
   * Creates a new instance of DurableTaskAzureManagedOptions from a connection string.
   *
   * @param connectionString The connection string to parse.
   * @returns A new DurableTaskAzureManagedOptions object.
   */
  static fromConnectionString(connectionString: string): DurableTaskAzureManagedOptions {
    const parsedConnectionString = new DurableTaskAzureManagedConnectionString(connectionString);
    return DurableTaskAzureManagedOptions.fromParsedConnectionString(parsedConnectionString);
  }

  /**
   * Creates a new instance of DurableTaskAzureManagedOptions from a parsed connection string.
   *
   * @param connectionString The parsed connection string.
   * @returns A new DurableTaskAzureManagedOptions object.
   */
  static fromParsedConnectionString(
    connectionString: DurableTaskAzureManagedConnectionString,
  ): DurableTaskAzureManagedOptions {
    const options = new DurableTaskAzureManagedOptions();
    options.setEndpointAddress(connectionString.getEndpoint());
    options.setTaskHubName(connectionString.getTaskHubName());

    const credential = getCredentialFromAuthenticationType(connectionString);
    options.setCredential(credential);
    options.setAllowInsecureCredentials(credential === null);

    return options;
  }

  /**
   * Gets the endpoint address.
   *
   * @returns The endpoint address.
   */
  getEndpointAddress(): string {
    return this._endpointAddress;
  }

  /**
   * Sets the endpoint address.
   *
   * @param endpointAddress The endpoint address.
   * @returns This options object.
   */
  setEndpointAddress(endpointAddress: string): DurableTaskAzureManagedOptions {
    this._endpointAddress = endpointAddress;
    return this;
  }

  /**
   * Gets the task hub name.
   *
   * @returns The task hub name.
   */
  getTaskHubName(): string {
    return this._taskHubName;
  }

  /**
   * Sets the task hub name.
   *
   * @param taskHubName The task hub name.
   * @returns This options object.
   */
  setTaskHubName(taskHubName: string): DurableTaskAzureManagedOptions {
    this._taskHubName = taskHubName;
    return this;
  }

  /**
   * Gets the credential used for authentication.
   *
   * @returns The credential.
   */
  getCredential(): TokenCredential | null {
    return this._credential;
  }

  /**
   * Sets the credential used for authentication.
   *
   * @param credential The credential.
   * @returns This options object.
   */
  setCredential(credential: TokenCredential | null): DurableTaskAzureManagedOptions {
    this._credential = credential;
    return this;
  }

  /**
   * Gets the resource ID.
   *
   * @returns The resource ID.
   */
  getResourceId(): string {
    return this._resourceId;
  }

  /**
   * Sets the resource ID.
   *
   * @param resourceId The resource ID.
   * @returns This options object.
   */
  setResourceId(resourceId: string): DurableTaskAzureManagedOptions {
    this._resourceId = resourceId;
    return this;
  }

  /**
   * Gets whether insecure credentials are allowed.
   *
   * @returns True if insecure credentials are allowed.
   */
  isAllowInsecureCredentials(): boolean {
    return this._allowInsecureCredentials;
  }

  /**
   * Sets whether insecure credentials are allowed.
   *
   * @param allowInsecureCredentials True to allow insecure credentials.
   * @returns This options object.
   */
  setAllowInsecureCredentials(allowInsecureCredentials: boolean): DurableTaskAzureManagedOptions {
    this._allowInsecureCredentials = allowInsecureCredentials;
    return this;
  }

  /**
   * Gets the token refresh margin in milliseconds.
   *
   * @returns The token refresh margin in milliseconds.
   */
  getTokenRefreshMargin(): number {
    return this._tokenRefreshMargin;
  }

  /**
   * Sets the token refresh margin in milliseconds.
   *
   * @param tokenRefreshMargin The token refresh margin in milliseconds.
   * @returns This options object.
   */
  setTokenRefreshMargin(tokenRefreshMargin: number): DurableTaskAzureManagedOptions {
    this._tokenRefreshMargin = tokenRefreshMargin;
    return this;
  }

  /**
   * Gets the worker ID used to identify the worker instance.
   *
   * @returns The worker ID.
   */
  getWorkerId(): string {
    return this._workerId;
  }

  /**
   * Sets the worker ID used to identify the worker instance.
   *
   * @param workerId The worker ID.
   * @returns This options object.
   */
  setWorkerId(workerId: string): DurableTaskAzureManagedOptions {
    this._workerId = workerId;
    return this;
  }

  /**
   * Creates a gRPC channel metadata generator that includes the authorization header and task hub name.
   *
   * @returns A configured metadata generator function.
   */
  createMetadataGenerator(): (
    params: { service_url: string },
    callback: (error: Error | null, metadata?: grpc.Metadata) => void,
  ) => void {
    // Create token cache only if credential is not null
    let tokenCache: AccessTokenCache | null = null;
    if (this._credential) {
      const scope = this._resourceId + "/.default";
      tokenCache = new AccessTokenCache(this._credential, scope, this._tokenRefreshMargin);
    }

    const taskHubName = this._taskHubName;
    const workerId = this._workerId;

    return (_params: { service_url: string }, callback: (error: Error | null, metadata?: grpc.Metadata) => void) => {
      const metadata = new grpc.Metadata();
      metadata.set("taskhub", taskHubName);
      metadata.set("workerid", workerId);

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
   *
   * @returns The configured gRPC channel credentials.
   */
  createChannelCredentials(): grpc.ChannelCredentials {
    if (this._allowInsecureCredentials) {
      // Insecure credentials can't be composed with call credentials in gRPC
      // For local development/testing without credentials, just return insecure credentials
      return grpc.ChannelCredentials.createInsecure();
    }

    const channelCredentials = grpc.ChannelCredentials.createSsl();

    // Add call credentials for metadata injection (only for secure connections)
    const metadataGenerator = this.createMetadataGenerator();
    const callCredentials = grpc.credentials.createFromMetadataGenerator(metadataGenerator);

    return channelCredentials.compose(callCredentials);
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
}
