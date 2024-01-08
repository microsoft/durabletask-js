import * as stubs from "./proto/orchestrator_service_grpc_pb";
import * as grpc from "@grpc/grpc-js";

export class GrpcClient {
  private _stub: stubs.TaskHubSidecarServiceClient;

  constructor(hostAddress: string) {
    this._stub = this._generateClient(hostAddress);
  }

  get stub(): stubs.TaskHubSidecarServiceClient {
    return this._stub;
  }

  _generateClient(hostAddress: string): stubs.TaskHubSidecarServiceClient {
    const options = this._generateChannelOptions();
    const channelCreds = grpc.credentials.createInsecure();
    return new stubs.TaskHubSidecarServiceClient(hostAddress, channelCreds, options);
  }

  _generateChannelOptions(): grpc.ChannelOptions {
    return {
      "grpc.max_receive_message_length": -1,
      "grpc.max_send_message_length": -1,
      "grpc.primary_user_agent": "dapr-sdk-js/durable-functions",
    };
  }
}
