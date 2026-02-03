// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { NoOpLogger } from "../src/types/logger.type";

describe("NoOpLogger", () => {
  let logger: NoOpLogger;

  beforeEach(() => {
    logger = new NoOpLogger();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("error", () => {
    it("should not throw when called", () => {
      expect(() => logger.error("test error")).not.toThrow();
    });

    it("should not call console.error", () => {
      const spy = jest.spyOn(console, "error").mockImplementation();

      logger.error("test error", { instanceId: "123" });

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("warn", () => {
    it("should not throw when called", () => {
      expect(() => logger.warn("test warning")).not.toThrow();
    });

    it("should not call console.warn", () => {
      const spy = jest.spyOn(console, "warn").mockImplementation();

      logger.warn("test warning", 42);

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("info", () => {
    it("should not throw when called", () => {
      expect(() => logger.info("test info")).not.toThrow();
    });

    it("should not call console.info", () => {
      const spy = jest.spyOn(console, "info").mockImplementation();

      logger.info("test info", ["data"]);

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("debug", () => {
    it("should not throw when called", () => {
      expect(() => logger.debug("test debug")).not.toThrow();
    });

    it("should not call console.debug", () => {
      const spy = jest.spyOn(console, "debug").mockImplementation();

      logger.debug("test debug", { nested: true });

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("Logger interface", () => {
    it("should implement Logger interface correctly", () => {
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.debug).toBe("function");
    });
  });

  describe("use case", () => {
    it("should be usable as a silent logger for testing", () => {
      const silentLogger = new NoOpLogger();

      // All these should execute without any side effects
      silentLogger.error("This error is silently discarded");
      silentLogger.warn("This warning is silently discarded");
      silentLogger.info("This info is silently discarded");
      silentLogger.debug("This debug is silently discarded");

      // If we got here, the test passes
      expect(true).toBe(true);
    });
  });
});
