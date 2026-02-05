// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Define Logger interface locally for testing (matches @microsoft/durabletask-js Logger)
interface Logger {
  error(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

// Mock @azure/logger
jest.mock("@azure/logger", () => {
  const mockLogger = {
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    verbose: jest.fn(),
  };

  return {
    createClientLogger: jest.fn().mockReturnValue(mockLogger),
    AzureLogger: jest.fn(),
  };
});

// Require after jest.mock to ensure the mocked module is used.
const { createClientLogger } = require("@azure/logger") as typeof import("@azure/logger");
const { AzureLoggerAdapter, createAzureLogger } =
  require("../../src/azure-logger-adapter") as typeof import("../../src/azure-logger-adapter");

describe("AzureLoggerAdapter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("AzureLoggerAdapter constant", () => {
    it("should be a valid Logger instance", () => {
      expect(AzureLoggerAdapter).toBeDefined();
      expect(typeof AzureLoggerAdapter.error).toBe("function");
      expect(typeof AzureLoggerAdapter.warn).toBe("function");
      expect(typeof AzureLoggerAdapter.info).toBe("function");
      expect(typeof AzureLoggerAdapter.debug).toBe("function");
    });

    it("should implement Logger interface", () => {
      const logger: Logger = AzureLoggerAdapter;
      expect(logger).toBe(AzureLoggerAdapter);
    });
  });

  describe("createAzureLogger", () => {
    it("should create a logger with default namespace", () => {
      const logger = createAzureLogger();

      expect(createClientLogger).toHaveBeenCalledWith("durabletask");
      expect(logger).toBeDefined();
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.debug).toBe("function");
    });

    it("should create a logger with custom namespace", () => {
      createAzureLogger("client");

      expect(createClientLogger).toHaveBeenCalledWith("durabletask:client");
    });

    it("should create a logger with worker namespace", () => {
      createAzureLogger("worker");

      expect(createClientLogger).toHaveBeenCalledWith("durabletask:worker");
    });
  });

  describe("method mapping", () => {
    let mockAzureLogger: {
      error: jest.Mock;
      warning: jest.Mock;
      info: jest.Mock;
      verbose: jest.Mock;
    };

    beforeEach(() => {
      mockAzureLogger = {
        error: jest.fn(),
        warning: jest.fn(),
        info: jest.fn(),
        verbose: jest.fn(),
      };
      (createClientLogger as jest.Mock).mockReturnValue(mockAzureLogger);
    });

    it("should map error() to azureLogger.error()", () => {
      const logger = createAzureLogger();
      logger.error("test error", { data: "value" });

      expect(mockAzureLogger.error).toHaveBeenCalledWith("test error", { data: "value" });
    });

    it("should map warn() to azureLogger.warning()", () => {
      const logger = createAzureLogger();
      logger.warn("test warning", 42);

      expect(mockAzureLogger.warning).toHaveBeenCalledWith("test warning", 42);
    });

    it("should map info() to azureLogger.info()", () => {
      const logger = createAzureLogger();
      logger.info("test info");

      expect(mockAzureLogger.info).toHaveBeenCalledWith("test info");
    });

    it("should map debug() to azureLogger.verbose()", () => {
      const logger = createAzureLogger();
      logger.debug("test debug", ["array"]);

      expect(mockAzureLogger.verbose).toHaveBeenCalledWith("test debug", ["array"]);
    });
  });

  describe("Logger interface compliance", () => {
    it("should be usable as Logger type", () => {
      const loggerFromAdapter: Logger = AzureLoggerAdapter;
      const loggerFromFactory: Logger = createAzureLogger();

      expect(loggerFromAdapter).toBeDefined();
      expect(loggerFromFactory).toBeDefined();
    });
  });
});
