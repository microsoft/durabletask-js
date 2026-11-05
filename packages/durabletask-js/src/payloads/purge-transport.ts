// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import { callWithMetadata, MetadataGenerator } from "../utils/grpc-helper.util";

/** Reuses the effective sidecar's authenticated channel, including after worker channel recreation. */
export async function callPayloadPurge<TReq, TRes>(
  client: grpc.Client,
  definition: grpc.MethodDefinition<TReq, TRes>,
  request: TReq,
  metadataGenerator?: MetadataGenerator,
  signal?: AbortSignal,
  deadline?: Date,
): Promise<TRes> {
  const response = await callWithMetadata<TReq, TRes | undefined>(
    (req, metadata, callback) =>
      client.makeUnaryRequest(
        definition.path,
        definition.requestSerialize,
        definition.responseDeserialize,
        req,
        metadata,
        { deadline },
        callback,
      ),
    request,
    metadataGenerator,
    signal,
  );
  if (response === undefined) throw new Error("The large-payload purge RPC returned no response.");
  return response;
}
