// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export function isPromise(fn: any): boolean {
  return fn && typeof fn?.then === "function";
}
