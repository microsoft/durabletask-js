// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { HttpRequest, HttpResponse } from "@azure/functions";
import { TaskHubGrpcClient } from "@microsoft/durabletask-js";
import {
  HttpManagementPayload,
  createHttpManagementPayload as createPayload,
} from "./http-management-payload";
import { createAzureFunctionsMetadataGenerator } from "./metadata";

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

    super({
      hostAddress: getGrpcHostAddress(rpcBaseUrl),
      useTLS: false,
      metadataGenerator: createAzureFunctionsMetadataGenerator(taskHubName),
    });

    this.taskHubName = taskHubName;
    this.connectionName = config.connectionName ?? "";
    this.creationUrls = config.creationUrls ?? {};
    this.managementUrls = config.managementUrls ?? {};
    this.baseUrl = config.baseUrl ?? "";
    this.requiredQueryStringParameters = requiredQueryStringParameters;
    this.rpcBaseUrl = rpcBaseUrl;
    this.httpBaseUrl = config.httpBaseUrl ?? "";
    this.maxGrpcMessageSizeInBytes = config.maxGrpcMessageSizeInBytes ?? 0;
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
}

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
