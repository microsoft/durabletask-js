// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Message } from "google-protobuf";
import * as pb from "../proto/orchestrator_service_pb";

type ProtobufMessageConstructor<T extends Message> = {
  deserializeBinary(bytes: Uint8Array): T;
};

/**
 * Decodes a base64-encoded protobuf message.
 *
 * @remarks
 * This is intended for host integrations, such as Azure Functions, that receive
 * TaskHubSidecarService payloads as base64 strings. It follows this package's
 * runtime support matrix, which currently requires Node.js 22 or higher.
 */
export function decodeBase64Protobuf<T extends Message>(
  encodedMessage: string,
  messageType: ProtobufMessageConstructor<T>,
): T {
  return messageType.deserializeBinary(Buffer.from(encodedMessage, "base64"));
}

/**
 * Encodes a protobuf message as a base64 string.
 *
 * @remarks
 * This is intended for host integrations, such as Azure Functions, that return
 * TaskHubSidecarService payloads as base64 strings. It follows this package's
 * runtime support matrix, which currently requires Node.js 22 or higher.
 */
export function encodeBase64Protobuf(message: Message): string {
  return Buffer.from(message.serializeBinary()).toString("base64");
}

export function decodeOrchestratorRequestFromBase64(encodedMessage: string): pb.OrchestratorRequest {
  return decodeBase64Protobuf(encodedMessage, pb.OrchestratorRequest);
}

export function encodeOrchestratorResponseToBase64(message: pb.OrchestratorResponse): string {
  return encodeBase64Protobuf(message);
}

export function decodeEntityBatchRequestFromBase64(encodedMessage: string): pb.EntityBatchRequest {
  return decodeBase64Protobuf(encodedMessage, pb.EntityBatchRequest);
}

export function encodeEntityBatchResultToBase64(message: pb.EntityBatchResult): string {
  return encodeBase64Protobuf(message);
}

export function decodeEntityRequestFromBase64(encodedMessage: string): pb.EntityRequest {
  return decodeBase64Protobuf(encodedMessage, pb.EntityRequest);
}
