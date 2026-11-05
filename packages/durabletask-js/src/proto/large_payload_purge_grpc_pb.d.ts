// package: microsoft.durabletask.largepayloads
// file: large_payload_purge.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as large_payload_purge_pb from "./large_payload_purge_pb";

interface ILargePayloadPurgeService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    setLargePayloadAutoPurge: ILargePayloadPurgeService_ISetLargePayloadAutoPurge;
    getLargePayloadTombstones: ILargePayloadPurgeService_IGetLargePayloadTombstones;
    reportLargePayloadPurgeResults: ILargePayloadPurgeService_IReportLargePayloadPurgeResults;
}

interface ILargePayloadPurgeService_ISetLargePayloadAutoPurge extends grpc.MethodDefinition<large_payload_purge_pb.SetLargePayloadAutoPurgeRequest, large_payload_purge_pb.SetLargePayloadAutoPurgeResponse> {
    path: "/microsoft.durabletask.largepayloads.LargePayloadPurge/SetLargePayloadAutoPurge";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<large_payload_purge_pb.SetLargePayloadAutoPurgeRequest>;
    requestDeserialize: grpc.deserialize<large_payload_purge_pb.SetLargePayloadAutoPurgeRequest>;
    responseSerialize: grpc.serialize<large_payload_purge_pb.SetLargePayloadAutoPurgeResponse>;
    responseDeserialize: grpc.deserialize<large_payload_purge_pb.SetLargePayloadAutoPurgeResponse>;
}
interface ILargePayloadPurgeService_IGetLargePayloadTombstones extends grpc.MethodDefinition<large_payload_purge_pb.GetLargePayloadTombstonesRequest, large_payload_purge_pb.GetLargePayloadTombstonesResponse> {
    path: "/microsoft.durabletask.largepayloads.LargePayloadPurge/GetLargePayloadTombstones";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<large_payload_purge_pb.GetLargePayloadTombstonesRequest>;
    requestDeserialize: grpc.deserialize<large_payload_purge_pb.GetLargePayloadTombstonesRequest>;
    responseSerialize: grpc.serialize<large_payload_purge_pb.GetLargePayloadTombstonesResponse>;
    responseDeserialize: grpc.deserialize<large_payload_purge_pb.GetLargePayloadTombstonesResponse>;
}
interface ILargePayloadPurgeService_IReportLargePayloadPurgeResults extends grpc.MethodDefinition<large_payload_purge_pb.ReportLargePayloadPurgeResultsRequest, large_payload_purge_pb.ReportLargePayloadPurgeResultsResponse> {
    path: "/microsoft.durabletask.largepayloads.LargePayloadPurge/ReportLargePayloadPurgeResults";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<large_payload_purge_pb.ReportLargePayloadPurgeResultsRequest>;
    requestDeserialize: grpc.deserialize<large_payload_purge_pb.ReportLargePayloadPurgeResultsRequest>;
    responseSerialize: grpc.serialize<large_payload_purge_pb.ReportLargePayloadPurgeResultsResponse>;
    responseDeserialize: grpc.deserialize<large_payload_purge_pb.ReportLargePayloadPurgeResultsResponse>;
}

export const LargePayloadPurgeService: ILargePayloadPurgeService;

export interface ILargePayloadPurgeServer extends grpc.UntypedServiceImplementation {
    setLargePayloadAutoPurge: grpc.handleUnaryCall<large_payload_purge_pb.SetLargePayloadAutoPurgeRequest, large_payload_purge_pb.SetLargePayloadAutoPurgeResponse>;
    getLargePayloadTombstones: grpc.handleUnaryCall<large_payload_purge_pb.GetLargePayloadTombstonesRequest, large_payload_purge_pb.GetLargePayloadTombstonesResponse>;
    reportLargePayloadPurgeResults: grpc.handleUnaryCall<large_payload_purge_pb.ReportLargePayloadPurgeResultsRequest, large_payload_purge_pb.ReportLargePayloadPurgeResultsResponse>;
}

export interface ILargePayloadPurgeClient {
    setLargePayloadAutoPurge(request: large_payload_purge_pb.SetLargePayloadAutoPurgeRequest, callback: (error: grpc.ServiceError | null, response: large_payload_purge_pb.SetLargePayloadAutoPurgeResponse) => void): grpc.ClientUnaryCall;
    setLargePayloadAutoPurge(request: large_payload_purge_pb.SetLargePayloadAutoPurgeRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: large_payload_purge_pb.SetLargePayloadAutoPurgeResponse) => void): grpc.ClientUnaryCall;
    setLargePayloadAutoPurge(request: large_payload_purge_pb.SetLargePayloadAutoPurgeRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: large_payload_purge_pb.SetLargePayloadAutoPurgeResponse) => void): grpc.ClientUnaryCall;
    getLargePayloadTombstones(request: large_payload_purge_pb.GetLargePayloadTombstonesRequest, callback: (error: grpc.ServiceError | null, response: large_payload_purge_pb.GetLargePayloadTombstonesResponse) => void): grpc.ClientUnaryCall;
    getLargePayloadTombstones(request: large_payload_purge_pb.GetLargePayloadTombstonesRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: large_payload_purge_pb.GetLargePayloadTombstonesResponse) => void): grpc.ClientUnaryCall;
    getLargePayloadTombstones(request: large_payload_purge_pb.GetLargePayloadTombstonesRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: large_payload_purge_pb.GetLargePayloadTombstonesResponse) => void): grpc.ClientUnaryCall;
    reportLargePayloadPurgeResults(request: large_payload_purge_pb.ReportLargePayloadPurgeResultsRequest, callback: (error: grpc.ServiceError | null, response: large_payload_purge_pb.ReportLargePayloadPurgeResultsResponse) => void): grpc.ClientUnaryCall;
    reportLargePayloadPurgeResults(request: large_payload_purge_pb.ReportLargePayloadPurgeResultsRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: large_payload_purge_pb.ReportLargePayloadPurgeResultsResponse) => void): grpc.ClientUnaryCall;
    reportLargePayloadPurgeResults(request: large_payload_purge_pb.ReportLargePayloadPurgeResultsRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: large_payload_purge_pb.ReportLargePayloadPurgeResultsResponse) => void): grpc.ClientUnaryCall;
}

export class LargePayloadPurgeClient extends grpc.Client implements ILargePayloadPurgeClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public setLargePayloadAutoPurge(request: large_payload_purge_pb.SetLargePayloadAutoPurgeRequest, callback: (error: grpc.ServiceError | null, response: large_payload_purge_pb.SetLargePayloadAutoPurgeResponse) => void): grpc.ClientUnaryCall;
    public setLargePayloadAutoPurge(request: large_payload_purge_pb.SetLargePayloadAutoPurgeRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: large_payload_purge_pb.SetLargePayloadAutoPurgeResponse) => void): grpc.ClientUnaryCall;
    public setLargePayloadAutoPurge(request: large_payload_purge_pb.SetLargePayloadAutoPurgeRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: large_payload_purge_pb.SetLargePayloadAutoPurgeResponse) => void): grpc.ClientUnaryCall;
    public getLargePayloadTombstones(request: large_payload_purge_pb.GetLargePayloadTombstonesRequest, callback: (error: grpc.ServiceError | null, response: large_payload_purge_pb.GetLargePayloadTombstonesResponse) => void): grpc.ClientUnaryCall;
    public getLargePayloadTombstones(request: large_payload_purge_pb.GetLargePayloadTombstonesRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: large_payload_purge_pb.GetLargePayloadTombstonesResponse) => void): grpc.ClientUnaryCall;
    public getLargePayloadTombstones(request: large_payload_purge_pb.GetLargePayloadTombstonesRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: large_payload_purge_pb.GetLargePayloadTombstonesResponse) => void): grpc.ClientUnaryCall;
    public reportLargePayloadPurgeResults(request: large_payload_purge_pb.ReportLargePayloadPurgeResultsRequest, callback: (error: grpc.ServiceError | null, response: large_payload_purge_pb.ReportLargePayloadPurgeResultsResponse) => void): grpc.ClientUnaryCall;
    public reportLargePayloadPurgeResults(request: large_payload_purge_pb.ReportLargePayloadPurgeResultsRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: large_payload_purge_pb.ReportLargePayloadPurgeResultsResponse) => void): grpc.ClientUnaryCall;
    public reportLargePayloadPurgeResults(request: large_payload_purge_pb.ReportLargePayloadPurgeResultsRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: large_payload_purge_pb.ReportLargePayloadPurgeResultsResponse) => void): grpc.ClientUnaryCall;
}
