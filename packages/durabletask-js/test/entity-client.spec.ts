// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { EntityInstanceId } from "../src/entities/entity-instance-id";
import { EntityQuery } from "../src/entities/entity-query";
import * as pb from "../src/proto/orchestrator_service_pb";
import { Timestamp } from "google-protobuf/google/protobuf/timestamp_pb";
import { StringValue, Int32Value } from "google-protobuf/google/protobuf/wrappers_pb";

// Note: These are unit tests for the entity client methods.
// They test the proto request/response conversion logic.
// Integration tests with actual gRPC calls are in e2e tests.

describe("Entity Client Proto Conversion", () => {
  describe("SignalEntityRequest", () => {
    it("should create request with required fields", () => {
      // Arrange
      const entityId = new EntityInstanceId("counter", "my-counter");
      const operationName = "increment";

      // Act
      const req = new pb.SignalEntityRequest();
      req.setInstanceid(entityId.toString());
      req.setName(operationName);
      req.setRequestid("test-request-id");

      // Assert
      expect(req.getInstanceid()).toBe("@counter@my-counter");
      expect(req.getName()).toBe("increment");
      expect(req.getRequestid()).toBe("test-request-id");
    });

    it("should include input when provided", () => {
      // Arrange
      const entityId = new EntityInstanceId("counter", "my-counter");
      const input = { amount: 5 };

      // Act
      const req = new pb.SignalEntityRequest();
      req.setInstanceid(entityId.toString());
      req.setName("add");

      const inputValue = new StringValue();
      inputValue.setValue(JSON.stringify(input));
      req.setInput(inputValue);

      // Assert
      expect(req.getInput()?.getValue()).toBe('{"amount":5}');
    });

    it("should include scheduled time when provided", () => {
      // Arrange
      const scheduledTime = new Date("2026-01-27T12:00:00Z");

      // Act
      const req = new pb.SignalEntityRequest();
      req.setInstanceid("@test@test");
      req.setName("op");

      const ts = new Timestamp();
      ts.fromDate(scheduledTime);
      req.setScheduledtime(ts);

      // Assert
      expect(req.hasScheduledtime()).toBe(true);
      expect(req.getScheduledtime()?.toDate().toISOString()).toBe(scheduledTime.toISOString());
    });
  });

  describe("GetEntityRequest", () => {
    it("should create request with entity ID", () => {
      // Arrange
      const entityId = new EntityInstanceId("user", "user-123");

      // Act
      const req = new pb.GetEntityRequest();
      req.setInstanceid(entityId.toString());
      req.setIncludestate(true);

      // Assert
      expect(req.getInstanceid()).toBe("@user@user-123");
      expect(req.getIncludestate()).toBe(true);
    });

    it("should support excluding state", () => {
      // Arrange
      const entityId = new EntityInstanceId("user", "user-123");

      // Act
      const req = new pb.GetEntityRequest();
      req.setInstanceid(entityId.toString());
      req.setIncludestate(false);

      // Assert
      expect(req.getIncludestate()).toBe(false);
    });
  });

  describe("GetEntityResponse", () => {
    it("should indicate entity exists", () => {
      // Arrange & Act
      const res = new pb.GetEntityResponse();
      res.setExists(true);

      const metadata = new pb.EntityMetadata();
      metadata.setInstanceid("@counter@test");
      metadata.setBacklogqueuesize(0);

      const ts = new Timestamp();
      ts.fromDate(new Date());
      metadata.setLastmodifiedtime(ts);

      res.setEntity(metadata);

      // Assert
      expect(res.getExists()).toBe(true);
      expect(res.getEntity()).toBeDefined();
    });

    it("should indicate entity does not exist", () => {
      // Arrange & Act
      const res = new pb.GetEntityResponse();
      res.setExists(false);

      // Assert
      expect(res.getExists()).toBe(false);
    });
  });

  describe("QueryEntitiesRequest", () => {
    it("should create request with all query options", () => {
      // Arrange
      const query: EntityQuery = {
        instanceIdStartsWith: "@counter@",
        lastModifiedFrom: new Date("2026-01-01"),
        lastModifiedTo: new Date("2026-01-31"),
        includeState: true,
        includeTransient: false,
        pageSize: 100,
      };

      // Act
      const req = new pb.QueryEntitiesRequest();
      const protoQuery = new pb.EntityQuery();

      const prefix = new StringValue();
      prefix.setValue(query.instanceIdStartsWith!);
      protoQuery.setInstanceidstartswith(prefix);

      const fromTs = new Timestamp();
      fromTs.fromDate(query.lastModifiedFrom!);
      protoQuery.setLastmodifiedfrom(fromTs);

      const toTs = new Timestamp();
      toTs.fromDate(query.lastModifiedTo!);
      protoQuery.setLastmodifiedto(toTs);

      protoQuery.setIncludestate(query.includeState!);
      protoQuery.setIncludetransient(query.includeTransient!);

      const pageSize = new Int32Value();
      pageSize.setValue(query.pageSize!);
      protoQuery.setPagesize(pageSize);

      req.setQuery(protoQuery);

      // Assert
      const resultQuery = req.getQuery()!;
      expect(resultQuery.getInstanceidstartswith()?.getValue()).toBe("@counter@");
      expect(resultQuery.getIncludestate()).toBe(true);
      expect(resultQuery.getIncludetransient()).toBe(false);
      expect(resultQuery.getPagesize()?.getValue()).toBe(100);
    });
  });

  describe("QueryEntitiesResponse", () => {
    it("should parse entity list", () => {
      // Arrange & Act
      const res = new pb.QueryEntitiesResponse();

      const entity1 = new pb.EntityMetadata();
      entity1.setInstanceid("@counter@counter-1");
      entity1.setBacklogqueuesize(0);

      const entity2 = new pb.EntityMetadata();
      entity2.setInstanceid("@counter@counter-2");
      entity2.setBacklogqueuesize(5);

      res.setEntitiesList([entity1, entity2]);

      // Assert
      const entities = res.getEntitiesList();
      expect(entities.length).toBe(2);
      expect(entities[0].getInstanceid()).toBe("@counter@counter-1");
      expect(entities[1].getInstanceid()).toBe("@counter@counter-2");
    });

    it("should parse continuation token", () => {
      // Arrange & Act
      const res = new pb.QueryEntitiesResponse();

      const token = new StringValue();
      token.setValue("next-page-token");
      res.setContinuationtoken(token);

      // Assert
      expect(res.getContinuationtoken()?.getValue()).toBe("next-page-token");
    });
  });

  describe("CleanEntityStorageRequest", () => {
    it("should create request with default options", () => {
      // Act
      const req = new pb.CleanEntityStorageRequest();
      req.setRemoveemptyentities(true);
      req.setReleaseorphanedlocks(true);

      // Assert
      expect(req.getRemoveemptyentities()).toBe(true);
      expect(req.getReleaseorphanedlocks()).toBe(true);
    });

    it("should support continuation token", () => {
      // Act
      const req = new pb.CleanEntityStorageRequest();
      const token = new StringValue();
      token.setValue("continue-token");
      req.setContinuationtoken(token);

      // Assert
      expect(req.getContinuationtoken()?.getValue()).toBe("continue-token");
    });
  });

  describe("CleanEntityStorageResponse", () => {
    it("should parse cleanup results", () => {
      // Act
      const res = new pb.CleanEntityStorageResponse();
      res.setEmptyentitiesremoved(10);
      res.setOrphanedlocksreleased(3);

      // Assert
      expect(res.getEmptyentitiesremoved()).toBe(10);
      expect(res.getOrphanedlocksreleased()).toBe(3);
    });
  });

  describe("EntityMetadata proto conversion", () => {
    it("should parse all metadata fields", () => {
      // Arrange & Act
      const metadata = new pb.EntityMetadata();
      metadata.setInstanceid("@counter@my-counter");
      metadata.setBacklogqueuesize(5);

      const ts = new Timestamp();
      ts.fromDate(new Date("2026-01-27T10:00:00Z"));
      metadata.setLastmodifiedtime(ts);

      const lockedBy = new StringValue();
      lockedBy.setValue("orchestration-123");
      metadata.setLockedby(lockedBy);

      const state = new StringValue();
      state.setValue('{"value":42}');
      metadata.setSerializedstate(state);

      // Assert
      expect(metadata.getInstanceid()).toBe("@counter@my-counter");
      expect(metadata.getBacklogqueuesize()).toBe(5);
      expect(metadata.getLockedby()?.getValue()).toBe("orchestration-123");
      expect(metadata.getSerializedstate()?.getValue()).toBe('{"value":42}');
    });

    it("should handle missing optional fields", () => {
      // Arrange & Act
      const metadata = new pb.EntityMetadata();
      metadata.setInstanceid("@counter@test");
      metadata.setBacklogqueuesize(0);

      const ts = new Timestamp();
      ts.fromDate(new Date());
      metadata.setLastmodifiedtime(ts);
      // No lockedBy or serializedState

      // Assert
      expect(metadata.getLockedby()).toBeUndefined();
      expect(metadata.getSerializedstate()).toBeUndefined();
    });
  });
});

describe("EntityInstanceId.fromString", () => {
  it("should parse valid entity ID", () => {
    // Act
    const entityId = EntityInstanceId.fromString("@counter@my-counter");

    // Assert
    expect(entityId.name).toBe("counter");
    expect(entityId.key).toBe("my-counter");
  });

  it("should handle key with special characters", () => {
    // Act
    const entityId = EntityInstanceId.fromString("@user@user@domain.com");

    // Assert
    expect(entityId.name).toBe("user");
    expect(entityId.key).toBe("user@domain.com");
  });

  it("should throw for invalid format", () => {
    // Assert
    expect(() => EntityInstanceId.fromString("invalid")).toThrow();
    expect(() => EntityInstanceId.fromString("@onlyname")).toThrow();
  });
});
