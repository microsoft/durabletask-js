// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { RetryPolicy } from "@microsoft/durabletask-js";
import { RetryOptions } from "../../src/retry-options";

describe("RetryOptions", () => {
  it("maps the classic (firstRetryInterval, maxAttempts) shape onto a core RetryPolicy", () => {
    const options = new RetryOptions(5000, 3);

    const policy = options.toRetryPolicy();

    expect(policy).toBeInstanceOf(RetryPolicy);
    expect(policy.firstRetryIntervalInMilliseconds).toBe(5000);
    expect(policy.maxNumberOfAttempts).toBe(3);
    expect(policy.backoffCoefficient).toBe(1);
  });

  it("forwards backoff and interval overrides to the core RetryPolicy", () => {
    const options = new RetryOptions(1000, 5);
    options.backoffCoefficient = 2;
    options.maxRetryIntervalInMilliseconds = 60000;
    options.retryTimeoutInMilliseconds = 300000;

    const policy = options.toRetryPolicy();

    expect(policy.backoffCoefficient).toBe(2);
    expect(policy.maxRetryIntervalInMilliseconds).toBe(60000);
    expect(policy.retryTimeoutInMilliseconds).toBe(300000);
  });
});
