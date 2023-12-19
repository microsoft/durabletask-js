import * as stubs from "../proto/orchestrator_service_grpc_pb";
import * as grpc from "@grpc/grpc-js";

export class GrpcClient {
  private readonly _hostAddress: string;
  private readonly _options: grpc.ChannelOptions;
  private _stub: stubs.TaskHubSidecarServiceClient;

  constructor(hostAddress: string = "localhost:4001", options: grpc.ChannelOptions = {}) {
    this._hostAddress = hostAddress;
    this._options = this._generateChannelOptions(options);
    this._stub = this._generateClient();
  }

  get stub(): stubs.TaskHubSidecarServiceClient {
    return this._stub;
  }

  _generateClient(): stubs.TaskHubSidecarServiceClient {
    const channelCreds = grpc.credentials.createInsecure();
    return new stubs.TaskHubSidecarServiceClient(this._hostAddress, channelCreds, this._options);
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
