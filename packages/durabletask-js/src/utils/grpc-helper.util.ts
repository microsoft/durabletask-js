// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";

/**
 * Type for a function that generates gRPC metadata (e.g., for taskhub, auth tokens).
 */
export type MetadataGenerator = () => Promise<grpc.Metadata>;

/**
 * Promisifies a gRPC unary call with metadata support.
 *
 * @param method The gRPC method to call (must be bound to the stub).
 * @param req The request object.
 * @param metadataGenerator Optional function to generate metadata for the call.
 * @param signal Optional signal that cancels waiting for metadata and the call.
 * @returns A promise that resolves with the response or rejects with an error.
 */
export async function callWithMetadata<TReq, TRes>(
  method: (
    req: TReq,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: TRes) => void,
  ) => grpc.ClientUnaryCall,
  req: TReq,
  metadataGenerator?: MetadataGenerator,
  signal?: AbortSignal,
): Promise<TRes> {
  if (signal?.aborted) {
    throw signal.reason;
  }

  let onAbort = () => {};
  try {
    return await new Promise<TRes>((resolve, reject) => {
      let call: grpc.ClientUnaryCall | undefined = undefined;
      onAbort = () => {
        reject(signal?.reason);
        call?.cancel();
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      const invoke = async () => {
        const metadata = metadataGenerator ? await metadataGenerator() : new grpc.Metadata();
        // Metadata generation may finish after cancellation; never start a late RPC.
        if (signal?.aborted) {
          throw signal.reason;
        }
        call = method(req, metadata, (error, response) => {
          if (error) {
            reject(error);
          } else {
            resolve(response);
          }
        });
      };
      invoke().catch(reject);
    });
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }
}
