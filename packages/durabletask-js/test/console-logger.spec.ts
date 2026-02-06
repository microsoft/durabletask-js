// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ConsoleLogger, isStructuredLogger, LogEvent } from "../src/types/logger.type";

describe("ConsoleLogger", () => {
  let logger: ConsoleLogger;

  beforeEach(() => {
    logger = new ConsoleLogger();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("error", () => {
    it("should call console.error with message", () => {
      const spy = jest.spyOn(console, "error").mockImplementation();

      logger.error("test error message");

      expect(spy).toHaveBeenCalledWith("test error message");
    });

    it("should call console.error with message and additional args", () => {
      const spy = jest.spyOn(console, "error").mockImplementation();

      logger.error("test error", { instanceId: "123" }, "extra");

      expect(spy).toHaveBeenCalledWith("test error", { instanceId: "123" }, "extra");
    });
  });

  describe("warn", () => {
    it("should call console.warn with message", () => {
      const spy = jest.spyOn(console, "warn").mockImplementation();

      logger.warn("test warning message");

      expect(spy).toHaveBeenCalledWith("test warning message");
    });

    it("should call console.warn with message and additional args", () => {
      const spy = jest.spyOn(console, "warn").mockImplementation();

      logger.warn("test warning", 42, { key: "value" });

      expect(spy).toHaveBeenCalledWith("test warning", 42, { key: "value" });
    });
  });

  describe("info", () => {
    it("should call console.info with message", () => {
      const spy = jest.spyOn(console, "info").mockImplementation();

      logger.info("test info message");

      expect(spy).toHaveBeenCalledWith("test info message");
    });

    it("should call console.info with message and additional args", () => {
      const spy = jest.spyOn(console, "info").mockImplementation();

      logger.info("test info", ["array", "data"]);

      expect(spy).toHaveBeenCalledWith("test info", ["array", "data"]);
    });
  });

  describe("debug", () => {
    it("should call console.debug with message", () => {
      const spy = jest.spyOn(console, "debug").mockImplementation();

      logger.debug("test debug message");

      expect(spy).toHaveBeenCalledWith("test debug message");
    });

    it("should call console.debug with message and additional args", () => {
      const spy = jest.spyOn(console, "debug").mockImplementation();

      logger.debug("debug data", { nested: { value: true } });

      expect(spy).toHaveBeenCalledWith("debug data", { nested: { value: true } });
    });
  });

  describe("logEvent (StructuredLogger)", () => {
    it("should be recognized as a StructuredLogger", () => {
      expect(isStructuredLogger(logger)).toBe(true);
    });

    it("should call console.info with formatted prefix for info level", () => {
      const spy = jest.spyOn(console, "info").mockImplementation();
      const event: LogEvent = {
        eventId: 600,
        category: "Microsoft.DurableTask.Worker.Orchestrations",
        properties: { instanceId: "abc123", name: "MyOrch" },
      };

      logger.logEvent("info", event, "'MyOrch' orchestration with ID 'abc123' started.");

      expect(spy).toHaveBeenCalledWith(
        "[600] [Microsoft.DurableTask.Worker.Orchestrations] 'MyOrch' orchestration with ID 'abc123' started.",
        { instanceId: "abc123", name: "MyOrch" },
      );
    });

    it("should call console.error with formatted prefix for error level", () => {
      const spy = jest.spyOn(console, "error").mockImplementation();
      const event: LogEvent = {
        eventId: 602,
        category: "Microsoft.DurableTask.Worker.Orchestrations",
        properties: { instanceId: "abc123" },
      };

      logger.logEvent("error", event, "Orchestration failed.");

      expect(spy).toHaveBeenCalledWith(
        "[602] [Microsoft.DurableTask.Worker.Orchestrations] Orchestration failed.",
        { instanceId: "abc123" },
      );
    });

    it("should call console.warn for warn level", () => {
      const spy = jest.spyOn(console, "warn").mockImplementation();
      const event: LogEvent = {
        eventId: 730,
        category: "Microsoft.DurableTask.Worker",
      };

      logger.logEvent("warn", event, "Version mismatch.");

      expect(spy).toHaveBeenCalledWith(
        "[730] [Microsoft.DurableTask.Worker] Version mismatch.",
      );
    });

    it("should call console.debug for debug level", () => {
      const spy = jest.spyOn(console, "debug").mockImplementation();
      const event: LogEvent = {
        eventId: 719,
        category: "Microsoft.DurableTask.Worker.Orchestrations",
        properties: { eventTypeName: "TaskCompleted" },
      };

      logger.logEvent("debug", event, "Processing event.");

      expect(spy).toHaveBeenCalledWith(
        "[719] [Microsoft.DurableTask.Worker.Orchestrations] Processing event.",
        { eventTypeName: "TaskCompleted" },
      );
    });
  });

  describe("Logger interface", () => {
    it("should implement Logger interface correctly", () => {
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.debug).toBe("function");
    });

    it("should implement StructuredLogger interface correctly", () => {
      expect(typeof logger.logEvent).toBe("function");
    });
  });
});
