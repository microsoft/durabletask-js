// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as stubs from "../proto/orchestrator_service_grpc_pb";
import * as grpc from "@grpc/grpc-js";

export class GrpcClient {
  private readonly _hostAddress: string;
  private readonly _tls: boolean;
  private readonly _options: grpc.ChannelOptions;
  private readonly _credentials?: grpc.ChannelCredentials;
  private _stub: stubs.TaskHubSidecarServiceClient;

  /**
   * Creates a new GrpcClient instance.
   *
   * @param hostAddress The host address to connect to. Defaults to "localhost:4001".
   * @param options gRPC channel options.
   * @param useTLS Whether to use TLS. Defaults to false.
   * @param credentials Optional pre-configured channel credentials. If provided, useTLS is ignored.
   */
  constructor(
    hostAddress: string = "localhost:4001",
    options: grpc.ChannelOptions = {},
    useTLS: boolean = false,
    credentials?: grpc.ChannelCredentials,
  ) {
    this._hostAddress = hostAddress;
    this._tls = useTLS;
    this._options = this._generateChannelOptions(options);
    this._credentials = credentials;
    this._stub = this._generateClient();
  }

  get stub(): stubs.TaskHubSidecarServiceClient {
    return this._stub;
  }

  _generateClient(): stubs.TaskHubSidecarServiceClient {
    const channelCreds = this._credentials ?? this._generateCredentials();
    return new stubs.TaskHubSidecarServiceClient(this._hostAddress, channelCreds, this._options);
  }

  _generateCredentials(): grpc.ChannelCredentials {
    if (this._tls) {
      return grpc.ChannelCredentials.createSsl();
    }
    return grpc.ChannelCredentials.createInsecure();
  }

  _generateChannelOptions(options: grpc.ChannelOptions = {}): grpc.ChannelOptions {
    const defaultOptions: Partial<grpc.ClientOptions> = {
      "grpc.max_receive_message_length": -1,
      "grpc.max_send_message_length": -1,
      "grpc.primary_user_agent": "durabletask-js",
    };
    return {
      ...options,
      ...defaultOptions,
    };
  }
}
