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
 * @param options Optional gRPC call options.
 * @param signal Optional signal that cancels the call.
 * @returns A promise that resolves with the response or rejects with an error.
 */
export async function callWithMetadata<TReq, TRes>(
  method: (
    req: TReq,
    metadata: grpc.Metadata,
    options: Partial<grpc.CallOptions>,
    callback: (error: grpc.ServiceError | null, response: TRes) => void,
  ) => grpc.ClientUnaryCall,
  req: TReq,
  metadataGenerator?: MetadataGenerator,
  options: Partial<grpc.CallOptions> = {},
  signal?: AbortSignal,
): Promise<TRes> {
  const metadata = metadataGenerator ? await metadataGenerator() : new grpc.Metadata();
  if (signal?.aborted) {
    throw signal.reason;
  }

  return new Promise<TRes>((resolve, reject) => {
    let call: grpc.ClientUnaryCall | undefined;
    let aborted = false;
    let settled = false;
    const finish = (settle: () => void) => {
      if (settled) {
        return false;
      }
      settled = true;
      signal?.removeEventListener("abort", onAbort);
      settle();
      return true;
    };
    const onAbort = () => {
      aborted = true;
      if (finish(() => reject(signal!.reason))) {
        call?.cancel();
      }
    };

    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      call = method(req, metadata, options, (error, response) => {
        finish(() => (error ? reject(error) : resolve(response)));
      });
      if (aborted) {
        call.cancel();
      }
    } catch (error) {
      finish(() => reject(error));
    }
  });
}
