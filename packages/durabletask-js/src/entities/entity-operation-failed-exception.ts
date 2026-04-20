// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { EntityInstanceId } from "./entity-instance-id";
import * as pb from "../proto/orchestrator_service_pb";
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import { TaskFailedError } from "../task/exception/task-failed-error";

/**
 * Details about a task failure.
 *
 * @remarks
 * Contains structured information about an error that occurred during
 * entity operation execution, including error type, message, and stack trace.
 */
export interface TaskFailureDetails {
  /**
   * The type of error (e.g., exception type name).
   */
  readonly errorType: string;

  /**
   * The error message.
   */
  readonly errorMessage: string;

  /**
   * The stack trace, if available.
   */
  readonly stackTrace?: string;

  /**
   * Details about an inner failure, if any.
   */
  readonly innerFailure?: TaskFailureDetails;
}

/**
 * Creates TaskFailureDetails from a protobuf TaskFailureDetails message.
 *
 * @param proto - The protobuf TaskFailureDetails message.
 * @returns The TaskFailureDetails object.
 */
export function createTaskFailureDetails(proto: pb.TaskFailureDetails | undefined): TaskFailureDetails | undefined {
  if (!proto) {
    return undefined;
  }

  return {
    errorType: proto.getErrortype(),
    errorMessage: proto.getErrormessage(),
    stackTrace: proto.getStacktrace()?.getValue(),
    innerFailure: createTaskFailureDetails(proto.getInnerfailure()),
  };
}

/**
 * Converts an entity TaskFailureDetails interface to a protobuf TaskFailureDetails message.
 */
function toProtoFailureDetails(details: TaskFailureDetails): pb.TaskFailureDetails {
  const proto = new pb.TaskFailureDetails();
  proto.setErrortype(details.errorType);
  proto.setErrormessage(details.errorMessage);
  if (details.stackTrace) {
    const sv = new StringValue();
    sv.setValue(details.stackTrace);
    proto.setStacktrace(sv);
  }
  if (details.innerFailure) {
    proto.setInnerfailure(toProtoFailureDetails(details.innerFailure));
  }
  return proto;
}

/**
 * Exception that gets thrown when an entity operation fails with an unhandled exception.
 *
 * @remarks
 * Extends `TaskFailedError` so that existing `catch` blocks checking
 * `instanceof TaskFailedError` continue to work, while also allowing
 * more specific `instanceof EntityOperationFailedException` checks.
 *
 * Detailed information associated with a particular operation failure, including exception details,
 * can be found in the `failureDetails` property.
 */
export class EntityOperationFailedException extends TaskFailedError {
  /**
   * The ID of the entity.
   */
  readonly entityId: EntityInstanceId;

  /**
   * The name of the operation that failed.
   */
  readonly operationName: string;

  /**
   * The details of the task failure, including exception information.
   */
  readonly failureDetails: TaskFailureDetails;

  /**
   * Creates a new EntityOperationFailedException.
   *
   * @param entityId - The entity ID.
   * @param operationName - The operation name.
   * @param failureDetails - The failure details.
   * @param protoFailureDetails - Optional protobuf failure details. If not provided,
   *   they are constructed from `failureDetails`.
   */
  constructor(
    entityId: EntityInstanceId,
    operationName: string,
    failureDetails: TaskFailureDetails,
    protoFailureDetails?: pb.TaskFailureDetails,
  ) {
    const message = EntityOperationFailedException.getExceptionMessage(operationName, entityId, failureDetails);
    const protoDetails = protoFailureDetails ?? toProtoFailureDetails(failureDetails);
    super(message, protoDetails);
    this.name = "EntityOperationFailedException";
    this.entityId = entityId;
    this.operationName = operationName;
    this.failureDetails = failureDetails;

    // Set the prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, EntityOperationFailedException.prototype);
  }

  private static getExceptionMessage(
    operationName: string,
    entityId: EntityInstanceId,
    failureDetails: TaskFailureDetails,
  ): string {
    return `Operation '${operationName}' of entity '${entityId.toString()}' failed: ${failureDetails.errorMessage}`;
  }
}
