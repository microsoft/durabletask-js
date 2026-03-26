// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as pb from "../src/proto/orchestrator_service_pb";
import { OrchestrationStatus, fromProtobuf, toProtobuf } from "../src/orchestration/enum/orchestration-status.enum";

/**
 * Exhaustive mapping between client OrchestrationStatus and proto OrchestrationStatus.
 * Every entry in the proto enum (except unspecified/unknown sentinel values) must have
 * a corresponding client enum member.
 */
const STATUS_PAIRS: [OrchestrationStatus, pb.OrchestrationStatus][] = [
  [OrchestrationStatus.RUNNING, pb.OrchestrationStatus.ORCHESTRATION_STATUS_RUNNING],
  [OrchestrationStatus.COMPLETED, pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED],
  [OrchestrationStatus.CONTINUED_AS_NEW, pb.OrchestrationStatus.ORCHESTRATION_STATUS_CONTINUED_AS_NEW],
  [OrchestrationStatus.FAILED, pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED],
  [OrchestrationStatus.CANCELED, pb.OrchestrationStatus.ORCHESTRATION_STATUS_CANCELED],
  [OrchestrationStatus.TERMINATED, pb.OrchestrationStatus.ORCHESTRATION_STATUS_TERMINATED],
  [OrchestrationStatus.PENDING, pb.OrchestrationStatus.ORCHESTRATION_STATUS_PENDING],
  [OrchestrationStatus.SUSPENDED, pb.OrchestrationStatus.ORCHESTRATION_STATUS_SUSPENDED],
];

describe("OrchestrationStatus enum", () => {
  describe("fromProtobuf", () => {
    it.each(STATUS_PAIRS)(
      "should convert client %s from proto %s",
      (clientStatus, protoStatus) => {
        expect(fromProtobuf(protoStatus)).toBe(clientStatus);
      },
    );

    it("should throw on unknown proto value", () => {
      expect(() => fromProtobuf(999 as pb.OrchestrationStatus)).toThrow(
        "Unknown protobuf OrchestrationStatus value: 999",
      );
    });
  });

  describe("toProtobuf", () => {
    it.each(STATUS_PAIRS)(
      "should convert client %s to proto %s",
      (clientStatus, protoStatus) => {
        expect(toProtobuf(clientStatus)).toBe(protoStatus);
      },
    );

    it("should throw on unknown client value", () => {
      expect(() => toProtobuf(999 as OrchestrationStatus)).toThrow(
        "Unknown OrchestrationStatus value: 999",
      );
    });
  });

  describe("round-trip", () => {
    it.each(STATUS_PAIRS)(
      "should round-trip client %s through proto and back",
      (clientStatus) => {
        expect(fromProtobuf(toProtobuf(clientStatus))).toBe(clientStatus);
      },
    );
  });

  describe("completeness", () => {
    it("should cover all non-zero proto OrchestrationStatus values", () => {
      // Get all numeric values from the proto enum (protobuf JS enums are plain objects)
      const protoValues = new Set<number>();
      for (const [key, value] of Object.entries(pb.OrchestrationStatus)) {
        if (typeof value === "number" && key.startsWith("ORCHESTRATION_STATUS_")) {
          protoValues.add(value);
        }
      }

      const coveredProtoValues = new Set(STATUS_PAIRS.map(([, proto]) => proto as number));

      for (const protoValue of protoValues) {
        expect(coveredProtoValues).toContain(protoValue);
      }
    });

    it("should have matching numeric values between client and proto enums", () => {
      for (const [clientStatus, protoStatus] of STATUS_PAIRS) {
        expect(clientStatus as number).toBe(protoStatus as number);
      }
    });
  });
});
