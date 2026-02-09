// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { SignalEntityOptions, CallEntityOptions } from "../src/entities/signal-entity-options";

describe("SignalEntityOptions", () => {
  describe("interface structure", () => {
    it("should have optional signalTime property", () => {
      const options: SignalEntityOptions = {};
      expect(options.signalTime).toBeUndefined();
    });

    it("should accept Date for signalTime", () => {
      const futureDate = new Date("2026-02-01T10:00:00Z");
      const options: SignalEntityOptions = { signalTime: futureDate };
      expect(options.signalTime).toEqual(futureDate);
    });

    it("should be usable without any properties", () => {
      const options: SignalEntityOptions = {};
      expect(Object.keys(options)).toHaveLength(0);
    });
  });
});

describe("CallEntityOptions", () => {
  describe("interface structure", () => {
    it("should be an empty interface (placeholder for future options)", () => {
      const options: CallEntityOptions = {};
      expect(Object.keys(options)).toHaveLength(0);
    });

    it("should be usable as a type constraint", () => {
      function acceptOptions(_options: CallEntityOptions): void {
        // Just a type check
      }
      expect(() => acceptOptions({})).not.toThrow();
    });
  });
});
