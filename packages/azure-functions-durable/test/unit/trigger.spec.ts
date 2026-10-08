// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as input from "../../src/input";
import * as trigger from "../../src/trigger";
import packageJson from "../../package.json";

function flag(binding: Record<string, unknown>): unknown {
  return binding.durableRequiresGrpc;
}

describe("durable triggers and inputs", () => {
  it("orchestration trigger uses the extension type string and opts in to gRPC", () => {
    const orchestration = trigger.orchestration();

    expect(orchestration.type).toBe("orchestrationTrigger");
    expect(flag(orchestration)).toBe(true);
    expect(orchestration).toMatchObject({
      durableSdkName: packageJson.name,
      durableSdkVersion: packageJson.version,
    });
  });

  it("activity trigger uses the extension type string and opts in to gRPC", () => {
    const activity = trigger.activity();

    expect(activity.type).toBe("activityTrigger");
    expect(flag(activity)).toBe(true);
    expect(activity).toMatchObject({
      durableSdkName: packageJson.name,
      durableSdkVersion: packageJson.version,
    });
  });

  it("entity trigger uses the extension type string and opts in to gRPC", () => {
    const entity = trigger.entity();

    expect(entity.type).toBe("entityTrigger");
    expect(flag(entity)).toBe(true);
    expect(entity).toMatchObject({
      durableSdkName: packageJson.name,
      durableSdkVersion: packageJson.version,
    });
  });

  it("durableClient input uses the extension type string and opts in to gRPC", () => {
    const clientInput = input.durableClient();

    expect(clientInput.type).toBe("durableClient");
    expect(flag(clientInput)).toBe(true);
    expect(clientInput).toMatchObject({
      durableSdkName: packageJson.name,
      durableSdkVersion: packageJson.version,
    });
  });
});
