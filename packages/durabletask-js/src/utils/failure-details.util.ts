// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { JavaScriptValue, Value } from "google-protobuf/google/protobuf/struct_pb";
import * as pb from "../proto/orchestrator_service_pb";
import { FailureDetails } from "../task/failure-details";

export function convertFailureDetails(details: pb.TaskFailureDetails): FailureDetails;
export function convertFailureDetails(details: pb.TaskFailureDetails | undefined): FailureDetails | undefined;
export function convertFailureDetails(details: pb.TaskFailureDetails | undefined): FailureDetails | undefined {
  if (!details) {
    return undefined;
  }

  return new FailureDetails(
    details.getErrormessage(),
    details.getErrortype(),
    details.getStacktrace()?.getValue(),
    convertFailureDetails(details.getInnerfailure()),
    convertFailureProperties(details),
  );
}

export function convertFailureProperties(
  details: pb.TaskFailureDetails,
): Readonly<Record<string, unknown>> | undefined {
  const properties = details.getPropertiesMap();
  return properties.getLength() === 0
    ? undefined
    : Object.fromEntries(Array.from(properties.entries(), ([key, value]) => [key, value.toJavaScript()]));
}

export function setFailureProperties(
  details: pb.TaskFailureDetails,
  properties: Readonly<Record<string, unknown>> | undefined,
): void {
  if (properties === undefined) return;
  for (const [key, value] of Object.entries(properties)) {
    validatePropertyValue(value, key);
    details.getPropertiesMap().set(key, Value.fromJavaScript(value));
  }
}

function validatePropertyValue(
  value: unknown,
  key: string,
  ancestors = new Set<object>(),
): asserts value is JavaScriptValue {
  // google-protobuf maps silently drop this key instead of preserving it as data.
  if (key === "__proto__") throw new TypeError("google-protobuf cannot serialize a '__proto__' failure property.");
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return;
  if (
    typeof value !== "object" ||
    (!Array.isArray(value) &&
      Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    throw new TypeError("Failure properties must contain only protobuf Value-compatible data.");
  }
  if (ancestors.has(value)) throw new TypeError("Cannot serialize circular failure properties.");
  ancestors.add(value);
  for (const [childKey, child] of Object.entries(value)) {
    validatePropertyValue(child, childKey, ancestors);
  }
  ancestors.delete(value);
}
