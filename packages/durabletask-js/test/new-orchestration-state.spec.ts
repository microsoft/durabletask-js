// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as pb from "../src/proto/orchestrator_service_pb";
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import { Timestamp } from "google-protobuf/google/protobuf/timestamp_pb";
import { newOrchestrationState } from "../src/orchestration";

/**
 * Helper to create a GetInstanceResponse with the given orchestration state.
 */
function createResponse(
  name: string,
  status: pb.OrchestrationStatus,
  options?: {
    failureDetails?: pb.TaskFailureDetails;
    input?: string;
    output?: string;
    customStatus?: string;
  },
): pb.GetInstanceResponse {
  const state = new pb.OrchestrationState();
  state.setName(name);
  state.setOrchestrationstatus(status);

  const now = new Timestamp();
  now.fromDate(new Date());
  state.setCreatedtimestamp(now);
  state.setLastupdatedtimestamp(now);

  if (options?.failureDetails) {
    state.setFailuredetails(options.failureDetails);
  }

  if (options?.input !== undefined) {
    const inputValue = new StringValue();
    inputValue.setValue(options.input);
    state.setInput(inputValue);
  }

  if (options?.output !== undefined) {
    const outputValue = new StringValue();
    outputValue.setValue(options.output);
    state.setOutput(outputValue);
  }

  if (options?.customStatus !== undefined) {
    const customStatusValue = new StringValue();
    customStatusValue.setValue(options.customStatus);
    state.setCustomstatus(customStatusValue);
  }

  const res = new pb.GetInstanceResponse();
  res.setExists(true);
  res.setOrchestrationstate(state);
  return res;
}

describe("newOrchestrationState", () => {
  it("should return undefined when response is undefined", () => {
    const result = newOrchestrationState("test-id", undefined);
    expect(result).toBeUndefined();
  });

  it("should return undefined when instance does not exist", () => {
    const res = new pb.GetInstanceResponse();
    res.setExists(false);
    const result = newOrchestrationState("test-id", res);
    expect(result).toBeUndefined();
  });

  it("should return state for a completed orchestration", () => {
    const res = createResponse(
      "TestOrchestrator",
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED,
      { output: '"hello"' },
    );

    const result = newOrchestrationState("test-id", res);

    expect(result).toBeDefined();
    expect(result!.instanceId).toBe("test-id");
    expect(result!.name).toBe("TestOrchestrator");
    expect(result!.serializedOutput).toBe('"hello"');
    expect(result!.failureDetails).toBeUndefined();
  });

  it("should preserve failure details with non-empty error message", () => {
    const failureDetails = new pb.TaskFailureDetails();
    failureDetails.setErrormessage("Something went wrong");
    failureDetails.setErrortype("Error");
    const stackValue = new StringValue();
    stackValue.setValue("Error: Something went wrong\n  at test.ts:1");
    failureDetails.setStacktrace(stackValue);

    const res = createResponse(
      "TestOrchestrator",
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
      { failureDetails },
    );

    const result = newOrchestrationState("test-id", res);

    expect(result).toBeDefined();
    expect(result!.failureDetails).toBeDefined();
    expect(result!.failureDetails!.message).toBe("Something went wrong");
    expect(result!.failureDetails!.errorType).toBe("Error");
    expect(result!.failureDetails!.stackTrace).toBe(
      "Error: Something went wrong\n  at test.ts:1",
    );
  });

  it("should preserve failure details when error message is an empty string", () => {
    const failureDetails = new pb.TaskFailureDetails();
    failureDetails.setErrormessage("");
    failureDetails.setErrortype("Error");

    const res = createResponse(
      "TestOrchestrator",
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
      { failureDetails },
    );

    const result = newOrchestrationState("test-id", res);

    expect(result).toBeDefined();
    expect(result!.failureDetails).toBeDefined();
    expect(result!.failureDetails!.message).toBe("");
    expect(result!.failureDetails!.errorType).toBe("Error");
  });

  it("should preserve failure details when error type is an empty string", () => {
    const failureDetails = new pb.TaskFailureDetails();
    failureDetails.setErrormessage("Some error");
    failureDetails.setErrortype("");

    const res = createResponse(
      "TestOrchestrator",
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
      { failureDetails },
    );

    const result = newOrchestrationState("test-id", res);

    expect(result).toBeDefined();
    expect(result!.failureDetails).toBeDefined();
    expect(result!.failureDetails!.message).toBe("Some error");
    expect(result!.failureDetails!.errorType).toBe("");
  });

  it("should preserve failure details when both error message and type are empty strings", () => {
    const failureDetails = new pb.TaskFailureDetails();
    failureDetails.setErrormessage("");
    failureDetails.setErrortype("");

    const res = createResponse(
      "TestOrchestrator",
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
      { failureDetails },
    );

    const result = newOrchestrationState("test-id", res);

    expect(result).toBeDefined();
    expect(result!.failureDetails).toBeDefined();
    expect(result!.failureDetails!.message).toBe("");
    expect(result!.failureDetails!.errorType).toBe("");
  });

  it("should not set failure details when no failure details exist in response", () => {
    const res = createResponse(
      "TestOrchestrator",
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED,
    );

    const result = newOrchestrationState("test-id", res);

    expect(result).toBeDefined();
    expect(result!.failureDetails).toBeUndefined();
  });

  it("should extract stack trace using getValue() instead of toString()", () => {
    const failureDetails = new pb.TaskFailureDetails();
    failureDetails.setErrormessage("test error");
    failureDetails.setErrortype("TypeError");
    const stackValue = new StringValue();
    stackValue.setValue("TypeError: test error\n  at Object.<anonymous> (test.ts:1:1)");
    failureDetails.setStacktrace(stackValue);

    const res = createResponse(
      "TestOrchestrator",
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
      { failureDetails },
    );

    const result = newOrchestrationState("test-id", res);

    expect(result).toBeDefined();
    expect(result!.failureDetails).toBeDefined();
    expect(result!.failureDetails!.stackTrace).toBe(
      "TypeError: test error\n  at Object.<anonymous> (test.ts:1:1)",
    );
  });

  it("should handle failure details without stack trace", () => {
    const failureDetails = new pb.TaskFailureDetails();
    failureDetails.setErrormessage("error without stack");
    failureDetails.setErrortype("Error");

    const res = createResponse(
      "TestOrchestrator",
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
      { failureDetails },
    );

    const result = newOrchestrationState("test-id", res);

    expect(result).toBeDefined();
    expect(result!.failureDetails).toBeDefined();
    expect(result!.failureDetails!.message).toBe("error without stack");
    expect(result!.failureDetails!.stackTrace).toBeUndefined();
  });
});
