// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { EntityInstanceId } from "../src/entities/entity-instance-id";
import {
  EntityOperationFailedException,
  TaskFailureDetails,
  createTaskFailureDetails,
} from "../src/entities/entity-operation-failed-exception";
import * as pb from "../src/proto/orchestrator_service_pb";
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";

describe("EntityOperationFailedException", () => {
  describe("constructor", () => {
    it("should create exception with correct properties", () => {
      // Arrange
      const entityId = new EntityInstanceId("counter", "my-counter");
      const operationName = "increment";
      const failureDetails: TaskFailureDetails = {
        errorType: "InvalidOperationError",
        errorMessage: "Counter cannot be negative",
      };

      // Act
      const exception = new EntityOperationFailedException(entityId, operationName, failureDetails);

      // Assert
      expect(exception.entityId).toBe(entityId);
      expect(exception.operationName).toBe(operationName);
      expect(exception.failureDetails).toBe(failureDetails);
      expect(exception.name).toBe("EntityOperationFailedException");
    });

    it("should format message correctly", () => {
      // Arrange
      const entityId = new EntityInstanceId("user", "user-123");
      const operationName = "updateProfile";
      const failureDetails: TaskFailureDetails = {
        errorType: "ValidationError",
        errorMessage: "Invalid email format",
      };

      // Act
      const exception = new EntityOperationFailedException(entityId, operationName, failureDetails);

      // Assert
      expect(exception.message).toBe(
        "Operation 'updateProfile' of entity '@user@user-123' failed: Invalid email format",
      );
    });

    it("should be instanceof Error", () => {
      // Arrange
      const entityId = new EntityInstanceId("counter", "my-counter");
      const failureDetails: TaskFailureDetails = {
        errorType: "Error",
        errorMessage: "Something went wrong",
      };

      // Act
      const exception = new EntityOperationFailedException(entityId, "op", failureDetails);

      // Assert
      expect(exception instanceof Error).toBe(true);
      expect(exception instanceof EntityOperationFailedException).toBe(true);
    });

    it("should include stack trace", () => {
      // Arrange
      const entityId = new EntityInstanceId("counter", "my-counter");
      const failureDetails: TaskFailureDetails = {
        errorType: "Error",
        errorMessage: "Error",
        stackTrace: "at SomeClass.method()\n  at AnotherClass.call()",
      };

      // Act
      const exception = new EntityOperationFailedException(entityId, "op", failureDetails);

      // Assert
      expect(exception.failureDetails.stackTrace).toBeDefined();
      expect(exception.failureDetails.stackTrace).toContain("SomeClass.method");
    });

    it("should include inner failure", () => {
      // Arrange
      const entityId = new EntityInstanceId("counter", "my-counter");
      const innerFailure: TaskFailureDetails = {
        errorType: "InnerError",
        errorMessage: "Inner cause",
      };
      const failureDetails: TaskFailureDetails = {
        errorType: "OuterError",
        errorMessage: "Outer error",
        innerFailure,
      };

      // Act
      const exception = new EntityOperationFailedException(entityId, "op", failureDetails);

      // Assert
      expect(exception.failureDetails.innerFailure).toBeDefined();
      expect(exception.failureDetails.innerFailure!.errorType).toBe("InnerError");
    });
  });
});

describe("createTaskFailureDetails", () => {
  it("should return undefined for undefined input", () => {
    // Act
    const result = createTaskFailureDetails(undefined);

    // Assert
    expect(result).toBeUndefined();
  });

  it("should convert protobuf TaskFailureDetails", () => {
    // Arrange
    const proto = new pb.TaskFailureDetails();
    proto.setErrortype("TestError");
    proto.setErrormessage("Test message");

    const stackTrace = new StringValue();
    stackTrace.setValue("Stack trace here");
    proto.setStacktrace(stackTrace);

    // Act
    const result = createTaskFailureDetails(proto);

    // Assert
    expect(result).toBeDefined();
    expect(result!.errorType).toBe("TestError");
    expect(result!.errorMessage).toBe("Test message");
    expect(result!.stackTrace).toBe("Stack trace here");
  });

  it("should handle nested inner failure", () => {
    // Arrange
    const innerProto = new pb.TaskFailureDetails();
    innerProto.setErrortype("InnerError");
    innerProto.setErrormessage("Inner message");

    const proto = new pb.TaskFailureDetails();
    proto.setErrortype("OuterError");
    proto.setErrormessage("Outer message");
    proto.setInnerfailure(innerProto);

    // Act
    const result = createTaskFailureDetails(proto);

    // Assert
    expect(result).toBeDefined();
    expect(result!.innerFailure).toBeDefined();
    expect(result!.innerFailure!.errorType).toBe("InnerError");
    expect(result!.innerFailure!.errorMessage).toBe("Inner message");
  });

  it("should handle missing optional fields", () => {
    // Arrange
    const proto = new pb.TaskFailureDetails();
    proto.setErrortype("Error");
    proto.setErrormessage("Message");
    // No stack trace or inner failure

    // Act
    const result = createTaskFailureDetails(proto);

    // Assert
    expect(result).toBeDefined();
    expect(result!.stackTrace).toBeUndefined();
    expect(result!.innerFailure).toBeUndefined();
  });
});
