// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Request to execute an operation on an ExportJob entity via orchestration.
 *
 * Note: `entityId` is serialized as a string (e.g. "@exportjob@my-key") rather than
 * an EntityInstanceId object to ensure it survives JSON round-tripping through
 * orchestration input serialization.
 */
export interface ExportJobOperationRequest {
  /**
   * The entity instance ID in string form (e.g. "@exportjob@my-key").
   * Use EntityInstanceId.toString() to produce this value.
   */
  readonly entityId: string;

  /**
   * The operation name to invoke on the entity.
   */
  readonly operationName: string;

  /**
   * Optional input for the operation.
   */
  readonly input?: unknown;
}
