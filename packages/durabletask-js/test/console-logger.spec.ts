// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ConsoleLogger } from "../src/types/logger.type";

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

  describe("Logger interface", () => {
    it("should implement Logger interface correctly", () => {
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.debug).toBe("function");
    });
  });
});
