// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { SDK_PACKAGE_NAME, SDK_VERSION } from "./version";

export type DurableBindingMetadata = Record<string, unknown>;

export function addDurableGrpcMetadata<TBinding extends DurableBindingMetadata>(
  binding: TBinding,
): TBinding & {
  durableRequiresGrpc: true;
  durableSdkName: string;
  durableSdkVersion: string;
} {
  return {
    ...binding,
    durableRequiresGrpc: true,
    durableSdkName: SDK_PACKAGE_NAME,
    durableSdkVersion: SDK_VERSION,
  };
}
