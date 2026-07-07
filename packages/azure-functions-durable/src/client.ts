// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { HttpRequest, HttpResponse } from "@azure/functions";
import {
  EntityInstanceId,
  OrchestrationQuery,
  OrchestrationStatus,
  TaskHubGrpcClient,
} from "@microsoft/durabletask-js";
import {
  HttpManagementPayload,
  createHttpManagementPayload as createPayload,
} from "./http-management-payload";
import { EntityStateResponse } from "./entity-state-response";
import { createAzureFunctionsMetadataGenerator } from "./metadata";
import {
  DurableOrchestrationStatus,
  OrchestrationRuntimeStatus,
  fromOrchestrationRuntimeStatus,
  toDurableOrchestrationStatus,
} from "./orchestration-status";
import { PurgeHistoryResult } from "./purge-history-result";

export interface DurableFunctionsClientConfig {
  taskHubName?: string;
  connectionName?: string;
  creationUrls?: Record<string, string>;
  managementUrls?: Record<string, string>;
  baseUrl?: string;
  requiredQueryStringParameters?: string;
  rpcBaseUrl?: string;
  httpBaseUrl?: string;
  maxGrpcMessageSizeInBytes?: number;
  grpcHttpClientTimeout?: unknown;
}

export type DurableFunctionsClientInput = string | DurableFunctionsClientConfig;

export class DurableFunctionsClient extends TaskHubGrpcClient {
  public readonly taskHubName: string;
  public readonly connectionName: string;
  public readonly creationUrls: Record<string, string>;
  public readonly managementUrls: Record<string, string>;
  public readonly baseUrl: string;
  public readonly requiredQueryStringParameters: string;
  public readonly rpcBaseUrl: string;
  public readonly httpBaseUrl: string;
  public readonly maxGrpcMessageSizeInBytes: number;
  public readonly grpcHttpClientTimeout: unknown;

  constructor(clientConfig: DurableFunctionsClientInput) {
    const config = parseClientConfig(clientConfig);
    const taskHubName = config.taskHubName ?? "";
    const requiredQueryStringParameters = config.requiredQueryStringParameters ?? "";
    const rpcBaseUrl = requireString(config.rpcBaseUrl, "rpcBaseUrl");
    const maxGrpcMessageSizeInBytes = config.maxGrpcMessageSizeInBytes ?? 0;

    super({
      hostAddress: getGrpcHostAddress(rpcBaseUrl),
      useTLS: false,
      metadataGenerator: createAzureFunctionsMetadataGenerator(taskHubName),
      // Honor the host-provided gRPC message size limit, matching the Python provider. When unset
      // (0), the gRPC library defaults are left in place.
      options:
        maxGrpcMessageSizeInBytes > 0
          ? {
              "grpc.max_receive_message_length": maxGrpcMessageSizeInBytes,
              "grpc.max_send_message_length": maxGrpcMessageSizeInBytes,
            }
          : undefined,
    });

    this.taskHubName = taskHubName;
    this.connectionName = config.connectionName ?? "";
    this.creationUrls = config.creationUrls ?? {};
    this.managementUrls = config.managementUrls ?? {};
    this.baseUrl = config.baseUrl ?? "";
    this.requiredQueryStringParameters = requiredQueryStringParameters;
    this.rpcBaseUrl = rpcBaseUrl;
    this.httpBaseUrl = config.httpBaseUrl ?? "";
    this.maxGrpcMessageSizeInBytes = maxGrpcMessageSizeInBytes;
    this.grpcHttpClientTimeout = config.grpcHttpClientTimeout;
  }

  createCheckStatusResponse(request: HttpRequest, instanceId: string): HttpResponse {
    const payload = this.createHttpManagementPayload(request, instanceId);

    return new HttpResponse({
      status: 202,
      body: JSON.stringify(payload),
      headers: {
        "content-type": "application/json",
        Location: payload.statusQueryGetUri,
      },
    });
  }

  createHttpManagementPayload(request: HttpRequest, instanceId: string): HttpManagementPayload {
    const instanceStatusUrl = getInstanceStatusUrl(request, instanceId);
    return createPayload(instanceId, instanceStatusUrl, this.requiredQueryStringParameters);
  }

  /**
   * Starts a new orchestration instance (classic Durable Functions v3 `startNew` alias).
   *
   * @param orchestratorName - The name of the orchestrator to start.
   * @param options - Optional input and instance ID.
   * @returns The instance ID of the started orchestration.
   */
  async startNew(
    orchestratorName: string,
    options?: { input?: unknown; instanceId?: string },
  ): Promise<string> {
    return this.scheduleNewOrchestration(
      orchestratorName,
      options?.input,
      options?.instanceId !== undefined ? { instanceId: options.instanceId } : undefined,
    );
  }

  /**
   * Gets the status of an orchestration instance in the classic Durable Functions (v3) shape.
   *
   * @param instanceId - The ID of the orchestration instance to query.
   * @param options - When `showInput` is `false`, input/output payloads are not fetched.
   * @returns The instance status, or `undefined` if the instance does not exist.
   */
  async getStatus(
    instanceId: string,
    options?: { showInput?: boolean },
  ): Promise<DurableOrchestrationStatus | undefined> {
    const state = await this.getOrchestrationState(instanceId, options?.showInput ?? true);
    return state ? toDurableOrchestrationStatus(state) : undefined;
  }

  /**
   * Gets the status of all orchestration instances (classic Durable Functions v3 shape).
   */
  async getStatusAll(): Promise<DurableOrchestrationStatus[]> {
    return this.collectStatuses({ fetchInputsAndOutputs: true });
  }

  /**
   * Gets the status of orchestration instances matching a filter (classic Durable Functions v3 shape).
   *
   * @param filter - Creation-time window and/or runtime-status filter.
   */
  async getStatusBy(filter: {
    createdTimeFrom?: Date;
    createdTimeTo?: Date;
    runtimeStatus?: OrchestrationRuntimeStatus[];
  }): Promise<DurableOrchestrationStatus[]> {
    return this.collectStatuses({
      createdFrom: filter.createdTimeFrom,
      createdTo: filter.createdTimeTo,
      statuses: filter.runtimeStatus?.map(fromOrchestrationRuntimeStatus),
      fetchInputsAndOutputs: true,
    });
  }

  /**
   * Waits up to a timeout for an orchestration to complete; if it does, returns an HTTP response with
   * its output/status, otherwise returns the same 202 check-status response as
   * {@link createCheckStatusResponse}. Classic Durable Functions v3 behavior.
   *
   * @param request - The incoming HTTP request (used to build management URLs on timeout).
   * @param instanceId - The orchestration instance to wait for.
   * @param waitOptions - Optional total wait timeout in milliseconds (default 10s).
   */
  async waitForCompletionOrCreateCheckStatusResponse(
    request: HttpRequest,
    instanceId: string,
    waitOptions?: { timeoutInMilliseconds?: number },
  ): Promise<HttpResponse> {
    const timeoutSeconds = Math.max(
      1,
      Math.ceil((waitOptions?.timeoutInMilliseconds ?? 10000) / 1000),
    );
    try {
      const state = await this.waitForOrchestrationCompletion(instanceId, true, timeoutSeconds);
      if (state) {
        const headers = { "content-type": "application/json" };
        if (state.runtimeStatus === OrchestrationStatus.COMPLETED) {
          return new HttpResponse({ status: 200, body: state.serializedOutput ?? "null", headers });
        }
        if (state.runtimeStatus === OrchestrationStatus.FAILED) {
          return new HttpResponse({
            status: 500,
            body: JSON.stringify(toDurableOrchestrationStatus(state)),
            headers,
          });
        }
        if (state.runtimeStatus === OrchestrationStatus.TERMINATED) {
          return new HttpResponse({
            status: 200,
            body: JSON.stringify(toDurableOrchestrationStatus(state)),
            headers,
          });
        }
      }
    } catch {
      // Timed out (or not yet terminal) waiting for completion: fall through to the check-status
      // response so the caller can poll the management endpoints.
    }
    return this.createCheckStatusResponse(request, instanceId);
  }

  /**
   * Reads the state of a durable entity in the classic Durable Functions (v3) shape.
   *
   * @param entityId - The target entity instance ID.
   * @param includeState - Whether to include the entity state in the response (default `true`).
   */
  async readEntityState<T = unknown>(
    entityId: EntityInstanceId,
    includeState = true,
  ): Promise<EntityStateResponse<T>> {
    const metadata = await this.getEntity<T>(entityId, includeState);
    if (!metadata) {
      return new EntityStateResponse<T>(false);
    }
    return new EntityStateResponse<T>(true, metadata.state);
  }

  /**
   * Purges the history of a single orchestration instance, returning the classic Durable Functions
   * (v3) {@link PurgeHistoryResult}.
   *
   * @param instanceId - The ID of the orchestration instance to purge.
   */
  async purgeInstanceHistory(instanceId: string): Promise<PurgeHistoryResult> {
    const result = await this.purgeOrchestration(instanceId);
    return new PurgeHistoryResult(result?.deletedInstanceCount ?? 0);
  }

  /** @hidden Iterates the core paged query and maps each instance to the v3 status shape. */
  private async collectStatuses(query: OrchestrationQuery): Promise<DurableOrchestrationStatus[]> {
    const results: DurableOrchestrationStatus[] = [];
    for await (const state of this.getAllInstances(query)) {
      results.push(toDurableOrchestrationStatus(state));
    }
    return results;
  }
}

/**
 * @deprecated Use {@link DurableFunctionsClient} instead. Retained as a classic Durable Functions
 * (v3) alias so existing code that imports `DurableOrchestrationClient` keeps working.
 */
export class DurableOrchestrationClient extends DurableFunctionsClient {}

export function getGrpcHostAddress(rpcBaseUrl: string): string {
  try {
    const hostAddress = new URL(rpcBaseUrl).host;
    if (!hostAddress) {
      throw new Error("rpcBaseUrl must include a host.");
    }
    return hostAddress;
  } catch (e) {
    throw new Error(`Invalid Durable Functions rpcBaseUrl: ${rpcBaseUrl}`, { cause: e });
  }
}

function getInstanceStatusUrl(request: HttpRequest, instanceId: string): string {
  const requestUrl = new URL(request.url);
  const encodedInstanceId = encodeURIComponent(instanceId);
  return `${requestUrl.protocol}//${requestUrl.host}/runtime/webhooks/durabletask/instances/${encodedInstanceId}`;
}

function parseClientConfig(clientConfig: DurableFunctionsClientInput): DurableFunctionsClientConfig {
  const value: unknown = typeof clientConfig === "string" ? JSON.parse(clientConfig) : clientConfig;
  const record = requireRecord(value, "Durable Functions client configuration");

  return {
    taskHubName: optionalString(record, "taskHubName"),
    connectionName: optionalString(record, "connectionName"),
    creationUrls: optionalStringRecord(record, "creationUrls"),
    managementUrls: optionalStringRecord(record, "managementUrls"),
    baseUrl: optionalString(record, "baseUrl"),
    requiredQueryStringParameters: optionalString(record, "requiredQueryStringParameters"),
    rpcBaseUrl: optionalString(record, "rpcBaseUrl"),
    httpBaseUrl: optionalString(record, "httpBaseUrl"),
    maxGrpcMessageSizeInBytes: optionalNumber(record, "maxGrpcMessageSizeInBytes"),
    grpcHttpClientTimeout: record.grpcHttpClientTimeout,
  };
}

function requireString(value: string | undefined, name: string): string {
  if (!value) {
    throw new TypeError(`Durable Functions client configuration is missing ${name}.`);
  }

  return value;
}

function requireRecord(value: unknown, name: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be a JSON object.`);
  }

  return value as Record<string, unknown>;
}

function optionalString(record: Record<string, unknown>, name: string): string | undefined {
  const value = record[name];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new TypeError(`Durable Functions client configuration field ${name} must be a string.`);
  }

  return value;
}

function optionalNumber(record: Record<string, unknown>, name: string): number | undefined {
  const value = record[name];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "number") {
    throw new TypeError(`Durable Functions client configuration field ${name} must be a number.`);
  }

  return value;
}

function optionalStringRecord(
  record: Record<string, unknown>,
  name: string,
): Record<string, string> | undefined {
  const value = record[name];
  if (value === undefined || value === null) {
    return undefined;
  }

  const valueRecord = requireRecord(value, `Durable Functions client configuration field ${name}`);
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(valueRecord)) {
    if (typeof entry !== "string") {
      throw new TypeError(
        `Durable Functions client configuration field ${name}.${key} must be a string.`,
      );
    }
    result[key] = entry;
  }

  return result;
}
