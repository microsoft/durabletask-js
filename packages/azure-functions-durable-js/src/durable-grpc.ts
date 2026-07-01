// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export type DurableBindingMetadata = Record<string, unknown>;

export function addDurableGrpcMetadata<TBinding extends DurableBindingMetadata>(
  binding: TBinding,
): TBinding & { durableRequiresGrpc: true } {
  return {
    ...binding,
    durableRequiresGrpc: true,
  };
}
