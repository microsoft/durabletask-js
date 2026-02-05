// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ReplaySafeLogger, ReplayContext } from "../src/types/replay-safe-logger";
import { Logger } from "../src/types/logger.type";

describe("ReplaySafeLogger", () => {
  let mockLogger: jest.Mocked<Logger>;
  let mockContext: ReplayContext;

  beforeEach(() => {
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
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
  });
});
