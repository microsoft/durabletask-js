// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ReplaySafeLogger, ReplayContext } from "../src/types/replay-safe-logger";
import { Logger, StructuredLogger, LogEvent, isStructuredLogger } from "../src/types/logger.type";

describe("ReplaySafeLogger", () => {
  let mockLogger: jest.Mocked<Logger>;
  let mockStructuredLogger: jest.Mocked<StructuredLogger>;
  let mockContext: ReplayContext;

  beforeEach(() => {
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    };
    mockStructuredLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      logEvent: jest.fn(),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should throw error when context is null", () => {
      expect(() => new ReplaySafeLogger(null as any, mockLogger)).toThrow("context is required");
    });

    it("should throw error when context is undefined", () => {
      expect(() => new ReplaySafeLogger(undefined as any, mockLogger)).toThrow("context is required");
    });

    it("should throw error when logger is null", () => {
      mockContext = { isReplaying: false };
      expect(() => new ReplaySafeLogger(mockContext, null as any)).toThrow("logger is required");
    });

    it("should throw error when logger is undefined", () => {
      mockContext = { isReplaying: false };
      expect(() => new ReplaySafeLogger(mockContext, undefined as any)).toThrow("logger is required");
    });

    it("should create instance successfully with valid arguments", () => {
      mockContext = { isReplaying: false };
      const logger = new ReplaySafeLogger(mockContext, mockLogger);
      expect(logger).toBeInstanceOf(ReplaySafeLogger);
    });
  });

  describe("when not replaying", () => {
    beforeEach(() => {
      mockContext = { isReplaying: false };
    });

    it("should call inner logger.error when not replaying", () => {
      const logger = new ReplaySafeLogger(mockContext, mockLogger);

      logger.error("test error message", { instanceId: "123" });

      expect(mockLogger.error).toHaveBeenCalledWith("test error message", { instanceId: "123" });
    });

    it("should call inner logger.warn when not replaying", () => {
      const logger = new ReplaySafeLogger(mockContext, mockLogger);

      logger.warn("test warning message", 42);

      expect(mockLogger.warn).toHaveBeenCalledWith("test warning message", 42);
    });

    it("should call inner logger.info when not replaying", () => {
      const logger = new ReplaySafeLogger(mockContext, mockLogger);

      logger.info("test info message");

      expect(mockLogger.info).toHaveBeenCalledWith("test info message");
    });

    it("should call inner logger.debug when not replaying", () => {
      const logger = new ReplaySafeLogger(mockContext, mockLogger);

      logger.debug("test debug message", ["array", "data"]);

      expect(mockLogger.debug).toHaveBeenCalledWith("test debug message", ["array", "data"]);
    });
  });

  describe("when replaying", () => {
    beforeEach(() => {
      mockContext = { isReplaying: true };
    });

    it("should NOT call inner logger.error when replaying", () => {
      const logger = new ReplaySafeLogger(mockContext, mockLogger);

      logger.error("test error message");

      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it("should NOT call inner logger.warn when replaying", () => {
      const logger = new ReplaySafeLogger(mockContext, mockLogger);

      logger.warn("test warning message");

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it("should NOT call inner logger.info when replaying", () => {
      const logger = new ReplaySafeLogger(mockContext, mockLogger);

      logger.info("test info message");

      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should NOT call inner logger.debug when replaying", () => {
      const logger = new ReplaySafeLogger(mockContext, mockLogger);

      logger.debug("test debug message");

      expect(mockLogger.debug).not.toHaveBeenCalled();
    });
  });

  describe("logEvent (StructuredLogger)", () => {
    const testEvent: LogEvent = {
      eventId: 600,
      category: "Microsoft.DurableTask.Worker.Orchestrations",
      properties: { instanceId: "abc123", name: "MyOrch" },
    };

    it("should be recognized as a StructuredLogger", () => {
      mockContext = { isReplaying: false };
      const logger = new ReplaySafeLogger(mockContext, mockLogger);
      expect(isStructuredLogger(logger)).toBe(true);
    });

    it("should delegate logEvent to inner StructuredLogger when not replaying", () => {
      mockContext = { isReplaying: false };
      const logger = new ReplaySafeLogger(mockContext, mockStructuredLogger);

      logger.logEvent("info", testEvent, "test structured message");

      expect(mockStructuredLogger.logEvent).toHaveBeenCalledWith("info", testEvent, "test structured message");
    });

    it("should NOT delegate logEvent when replaying", () => {
      mockContext = { isReplaying: true };
      const logger = new ReplaySafeLogger(mockContext, mockStructuredLogger);

      logger.logEvent("info", testEvent, "test structured message");

      expect(mockStructuredLogger.logEvent).not.toHaveBeenCalled();
    });

    it("should fall back to plain log method if inner logger is not a StructuredLogger", () => {
      mockContext = { isReplaying: false };
      const logger = new ReplaySafeLogger(mockContext, mockLogger);

      logger.logEvent("info", testEvent, "test fallback message");

      // Should call the plain info method on the non-structured logger
      expect(mockLogger.info).toHaveBeenCalledWith("test fallback message");
    });

    it("should fall back to correct level for each log level", () => {
      mockContext = { isReplaying: false };
      const logger = new ReplaySafeLogger(mockContext, mockLogger);

      logger.logEvent("error", testEvent, "error msg");
      expect(mockLogger.error).toHaveBeenCalledWith("error msg");

      logger.logEvent("warn", testEvent, "warn msg");
      expect(mockLogger.warn).toHaveBeenCalledWith("warn msg");

      logger.logEvent("debug", testEvent, "debug msg");
      expect(mockLogger.debug).toHaveBeenCalledWith("debug msg");
    });
  });

  describe("dynamic replay state changes", () => {
    it("should respect changes in isReplaying state", () => {
      // Start with replaying = true
      const dynamicContext = { isReplaying: true };
      const logger = new ReplaySafeLogger(dynamicContext, mockLogger);

      // Should not log while replaying
      logger.info("message during replay");
      expect(mockLogger.info).not.toHaveBeenCalled();

      // Change to not replaying
      dynamicContext.isReplaying = false;

      // Should now log
      logger.info("message after replay");
      expect(mockLogger.info).toHaveBeenCalledWith("message after replay");
    });
  });

  describe("Logger interface implementation", () => {
    it("should implement Logger interface correctly", () => {
      mockContext = { isReplaying: false };
      const logger = new ReplaySafeLogger(mockContext, mockLogger);

      expect(typeof logger.error).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.debug).toBe("function");
    });

    it("should implement StructuredLogger interface correctly", () => {
      mockContext = { isReplaying: false };
      const logger = new ReplaySafeLogger(mockContext, mockLogger);

      expect(typeof logger.logEvent).toBe("function");
    });
  });
});
