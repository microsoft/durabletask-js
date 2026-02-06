// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { emitLog } from "../src/utils/emit-log";
import { Logger, StructuredLogger, LogEvent } from "../src/types/logger.type";

describe("emitLog", () => {
  const event: LogEvent = {
    eventId: 600,
    category: "Microsoft.DurableTask.Worker.Orchestrations",
    properties: { instanceId: "abc123", name: "MyOrch" },
  };

  const message = "Test message";

  describe("with StructuredLogger", () => {
    let logger: StructuredLogger;

    beforeEach(() => {
      logger = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        logEvent: jest.fn(),
      };
    });

    it.each(["error", "warn", "info", "debug"] as const)(
      "should call logEvent for %s level",
      (level) => {
        emitLog(logger, level, event, message);

        expect(logger.logEvent).toHaveBeenCalledWith(level, event, message);
        expect(logger[level]).not.toHaveBeenCalled();
      },
    );
  });

  describe("with plain Logger", () => {
    let logger: Logger;

    beforeEach(() => {
      logger = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
      };
    });

    it.each(["error", "warn", "info", "debug"] as const)(
      "should fall back to plain %s method",
      (level) => {
        emitLog(logger, level, event, message);

        expect(logger[level]).toHaveBeenCalledWith(message);
      },
    );

    it("should not call other log levels", () => {
      emitLog(logger, "error", event, message);

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.info).not.toHaveBeenCalled();
      expect(logger.debug).not.toHaveBeenCalled();
    });
  });
});
