// package: 
// file: orchestrator_service.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as orchestrator_service_pb from "./orchestrator_service_pb";
import * as google_protobuf_timestamp_pb from "google-protobuf/google/protobuf/timestamp_pb";
import * as google_protobuf_duration_pb from "google-protobuf/google/protobuf/duration_pb";
import * as google_protobuf_wrappers_pb from "google-protobuf/google/protobuf/wrappers_pb";
import * as google_protobuf_empty_pb from "google-protobuf/google/protobuf/empty_pb";
import * as google_protobuf_struct_pb from "google-protobuf/google/protobuf/struct_pb";

interface ITaskHubSidecarServiceService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    hello: ITaskHubSidecarServiceService_IHello;
    startInstance: ITaskHubSidecarServiceService_IStartInstance;
    getInstance: ITaskHubSidecarServiceService_IGetInstance;
    rewindInstance: ITaskHubSidecarServiceService_IRewindInstance;
    restartInstance: ITaskHubSidecarServiceService_IRestartInstance;
    waitForInstanceStart: ITaskHubSidecarServiceService_IWaitForInstanceStart;
    waitForInstanceCompletion: ITaskHubSidecarServiceService_IWaitForInstanceCompletion;
    raiseEvent: ITaskHubSidecarServiceService_IRaiseEvent;
    terminateInstance: ITaskHubSidecarServiceService_ITerminateInstance;
    suspendInstance: ITaskHubSidecarServiceService_ISuspendInstance;
    resumeInstance: ITaskHubSidecarServiceService_IResumeInstance;
    queryInstances: ITaskHubSidecarServiceService_IQueryInstances;
    listInstanceIds: ITaskHubSidecarServiceService_IListInstanceIds;
    purgeInstances: ITaskHubSidecarServiceService_IPurgeInstances;
    getWorkItems: ITaskHubSidecarServiceService_IGetWorkItems;
    completeActivityTask: ITaskHubSidecarServiceService_ICompleteActivityTask;
    completeOrchestratorTask: ITaskHubSidecarServiceService_ICompleteOrchestratorTask;
    completeEntityTask: ITaskHubSidecarServiceService_ICompleteEntityTask;
    streamInstanceHistory: ITaskHubSidecarServiceService_IStreamInstanceHistory;
    createTaskHub: ITaskHubSidecarServiceService_ICreateTaskHub;
    deleteTaskHub: ITaskHubSidecarServiceService_IDeleteTaskHub;
    signalEntity: ITaskHubSidecarServiceService_ISignalEntity;
    getEntity: ITaskHubSidecarServiceService_IGetEntity;
    queryEntities: ITaskHubSidecarServiceService_IQueryEntities;
    cleanEntityStorage: ITaskHubSidecarServiceService_ICleanEntityStorage;
    abandonTaskActivityWorkItem: ITaskHubSidecarServiceService_IAbandonTaskActivityWorkItem;
    abandonTaskOrchestratorWorkItem: ITaskHubSidecarServiceService_IAbandonTaskOrchestratorWorkItem;
    abandonTaskEntityWorkItem: ITaskHubSidecarServiceService_IAbandonTaskEntityWorkItem;
    skipGracefulOrchestrationTerminations: ITaskHubSidecarServiceService_ISkipGracefulOrchestrationTerminations;
}

interface ITaskHubSidecarServiceService_IHello extends grpc.MethodDefinition<google_protobuf_empty_pb.Empty, google_protobuf_empty_pb.Empty> {
    path: "/TaskHubSidecarService/Hello";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<google_protobuf_empty_pb.Empty>;
    requestDeserialize: grpc.deserialize<google_protobuf_empty_pb.Empty>;
    responseSerialize: grpc.serialize<google_protobuf_empty_pb.Empty>;
    responseDeserialize: grpc.deserialize<google_protobuf_empty_pb.Empty>;
}
interface ITaskHubSidecarServiceService_IStartInstance extends grpc.MethodDefinition<orchestrator_service_pb.CreateInstanceRequest, orchestrator_service_pb.CreateInstanceResponse> {
    path: "/TaskHubSidecarService/StartInstance";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<orchestrator_service_pb.CreateInstanceRequest>;
    requestDeserialize: grpc.deserialize<orchestrator_service_pb.CreateInstanceRequest>;
    responseSerialize: grpc.serialize<orchestrator_service_pb.CreateInstanceResponse>;
    responseDeserialize: grpc.deserialize<orchestrator_service_pb.CreateInstanceResponse>;
}
interface ITaskHubSidecarServiceService_IGetInstance extends grpc.MethodDefinition<orchestrator_service_pb.GetInstanceRequest, orchestrator_service_pb.GetInstanceResponse> {
    path: "/TaskHubSidecarService/GetInstance";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<orchestrator_service_pb.GetInstanceRequest>;
    requestDeserialize: grpc.deserialize<orchestrator_service_pb.GetInstanceRequest>;
    responseSerialize: grpc.serialize<orchestrator_service_pb.GetInstanceResponse>;
    responseDeserialize: grpc.deserialize<orchestrator_service_pb.GetInstanceResponse>;
}
interface ITaskHubSidecarServiceService_IRewindInstance extends grpc.MethodDefinition<orchestrator_service_pb.RewindInstanceRequest, orchestrator_service_pb.RewindInstanceResponse> {
    path: "/TaskHubSidecarService/RewindInstance";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<orchestrator_service_pb.RewindInstanceRequest>;
    requestDeserialize: grpc.deserialize<orchestrator_service_pb.RewindInstanceRequest>;
    responseSerialize: grpc.serialize<orchestrator_service_pb.RewindInstanceResponse>;
    responseDeserialize: grpc.deserialize<orchestrator_service_pb.RewindInstanceResponse>;
}
interface ITaskHubSidecarServiceService_IRestartInstance extends grpc.MethodDefinition<orchestrator_service_pb.RestartInstanceRequest, orchestrator_service_pb.RestartInstanceResponse> {
    path: "/TaskHubSidecarService/RestartInstance";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<orchestrator_service_pb.RestartInstanceRequest>;
    requestDeserialize: grpc.deserialize<orchestrator_service_pb.RestartInstanceRequest>;
    responseSerialize: grpc.serialize<orchestrator_service_pb.RestartInstanceResponse>;
    responseDeserialize: grpc.deserialize<orchestrator_service_pb.RestartInstanceResponse>;
}
interface ITaskHubSidecarServiceService_IWaitForInstanceStart extends grpc.MethodDefinition<orchestrator_service_pb.GetInstanceRequest, orchestrator_service_pb.GetInstanceResponse> {
    path: "/TaskHubSidecarService/WaitForInstanceStart";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<orchestrator_service_pb.GetInstanceRequest>;
    requestDeserialize: grpc.deserialize<orchestrator_service_pb.GetInstanceRequest>;
    responseSerialize: grpc.serialize<orchestrator_service_pb.GetInstanceResponse>;
    responseDeserialize: grpc.deserialize<orchestrator_service_pb.GetInstanceResponse>;
}
interface ITaskHubSidecarServiceService_IWaitForInstanceCompletion extends grpc.MethodDefinition<orchestrator_service_pb.GetInstanceRequest, orchestrator_service_pb.GetInstanceResponse> {
    path: "/TaskHubSidecarService/WaitForInstanceCompletion";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<orchestrator_service_pb.GetInstanceRequest>;
    requestDeserialize: grpc.deserialize<orchestrator_service_pb.GetInstanceRequest>;
    responseSerialize: grpc.serialize<orchestrator_service_pb.GetInstanceResponse>;
    responseDeserialize: grpc.deserialize<orchestrator_service_pb.GetInstanceResponse>;
}
interface ITaskHubSidecarServiceService_IRaiseEvent extends grpc.MethodDefinition<orchestrator_service_pb.RaiseEventRequest, orchestrator_service_pb.RaiseEventResponse> {
    path: "/TaskHubSidecarService/RaiseEvent";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<orchestrator_service_pb.RaiseEventRequest>;
    requestDeserialize: grpc.deserialize<orchestrator_service_pb.RaiseEventRequest>;
    responseSerialize: grpc.serialize<orchestrator_service_pb.RaiseEventResponse>;
    responseDeserialize: grpc.deserialize<orchestrator_service_pb.RaiseEventResponse>;
}
interface ITaskHubSidecarServiceService_ITerminateInstance extends grpc.MethodDefinition<orchestrator_service_pb.TerminateRequest, orchestrator_service_pb.TerminateResponse> {
    path: "/TaskHubSidecarService/TerminateInstance";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<orchestrator_service_pb.TerminateRequest>;
    requestDeserialize: grpc.deserialize<orchestrator_service_pb.TerminateRequest>;
    responseSerialize: grpc.serialize<orchestrator_service_pb.TerminateResponse>;
    responseDeserialize: grpc.deserialize<orchestrator_service_pb.TerminateResponse>;
}
interface ITaskHubSidecarServiceService_ISuspendInstance extends grpc.MethodDefinition<orchestrator_service_pb.SuspendRequest, orchestrator_service_pb.SuspendResponse> {
    path: "/TaskHubSidecarService/SuspendInstance";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<orchestrator_service_pb.SuspendRequest>;
    requestDeserialize: grpc.deserialize<orchestrator_service_pb.SuspendRequest>;
    responseSerialize: grpc.serialize<orchestrator_service_pb.SuspendResponse>;
    responseDeserialize: grpc.deserialize<orchestrator_service_pb.SuspendResponse>;
}
interface ITaskHubSidecarServiceService_IResumeInstance extends grpc.MethodDefinition<orchestrator_service_pb.ResumeRequest, orchestrator_service_pb.ResumeResponse> {
    path: "/TaskHubSidecarService/ResumeInstance";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<orchestrator_service_pb.ResumeRequest>;
    requestDeserialize: grpc.deserialize<orchestrator_service_pb.ResumeRequest>;
    responseSerialize: grpc.serialize<orchestrator_service_pb.ResumeResponse>;
    responseDeserialize: grpc.deserialize<orchestrator_service_pb.ResumeResponse>;
}
interface ITaskHubSidecarServiceService_IQueryInstances extends grpc.MethodDefinition<orchestrator_service_pb.QueryInstancesRequest, orchestrator_service_pb.QueryInstancesResponse> {
    path: "/TaskHubSidecarService/QueryInstances";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<orchestrator_service_pb.QueryInstancesRequest>;
    requestDeserialize: grpc.deserialize<orchestrator_service_pb.QueryInstancesRequest>;
    responseSerialize: grpc.serialize<orchestrator_service_pb.QueryInstancesResponse>;
    responseDeserialize: grpc.deserialize<orchestrator_service_pb.QueryInstancesResponse>;
}
interface ITaskHubSidecarServiceService_IListInstanceIds extends grpc.MethodDefinition<orchestrator_service_pb.ListInstanceIdsRequest, orchestrator_service_pb.ListInstanceIdsResponse> {
    path: "/TaskHubSidecarService/ListInstanceIds";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<orchestrator_service_pb.ListInstanceIdsRequest>;
    requestDeserialize: grpc.deserialize<orchestrator_service_pb.ListInstanceIdsRequest>;
    responseSerialize: grpc.serialize<orchestrator_service_pb.ListInstanceIdsResponse>;
    responseDeserialize: grpc.deserialize<orchestrator_service_pb.ListInstanceIdsResponse>;
}
interface ITaskHubSidecarServiceService_IPurgeInstances extends grpc.MethodDefinition<orchestrator_service_pb.PurgeInstancesRequest, orchestrator_service_pb.PurgeInstancesResponse> {
    path: "/TaskHubSidecarService/PurgeInstances";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<orchestrator_service_pb.PurgeInstancesRequest>;
    requestDeserialize: grpc.deserialize<orchestrator_service_pb.PurgeInstancesRequest>;
    responseSerialize: grpc.serialize<orchestrator_service_pb.PurgeInstancesResponse>;
    responseDeserialize: grpc.deserialize<orchestrator_service_pb.PurgeInstancesResponse>;
}
interface ITaskHubSidecarServiceService_IGetWorkItems extends grpc.MethodDefinition<orchestrator_service_pb.GetWorkItemsRequest, orchestrator_service_pb.WorkItem> {
    path: "/TaskHubSidecarService/GetWorkItems";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<orchestrator_service_pb.GetWorkItemsRequest>;
    requestDeserialize: grpc.deserialize<orchestrator_service_pb.GetWorkItemsRequest>;
    responseSerialize: grpc.serialize<orchestrator_service_pb.WorkItem>;
    responseDeserialize: grpc.deserialize<orchestrator_service_pb.WorkItem>;
}
interface ITaskHubSidecarServiceService_ICompleteActivityTask extends grpc.MethodDefinition<orchestrator_service_pb.ActivityResponse, orchestrator_service_pb.CompleteTaskResponse> {
    path: "/TaskHubSidecarService/CompleteActivityTask";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<orchestrator_service_pb.ActivityResponse>;
    requestDeserialize: grpc.deserialize<orchestrator_service_pb.ActivityResponse>;
    responseSerialize: grpc.serialize<orchestrator_service_pb.CompleteTaskResponse>;
    responseDeserialize: grpc.deserialize<orchestrator_service_pb.CompleteTaskResponse>;
}
interface ITaskHubSidecarServiceService_ICompleteOrchestratorTask extends grpc.MethodDefinition<orchestrator_service_pb.OrchestratorResponse, orchestrator_service_pb.CompleteTaskResponse> {
    path: "/TaskHubSidecarService/CompleteOrchestratorTask";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<orchestrator_service_pb.OrchestratorResponse>;
    requestDeserialize: grpc.deserialize<orchestrator_service_pb.OrchestratorResponse>;
    responseSerialize: grpc.serialize<orchestrator_service_pb.CompleteTaskResponse>;
    responseDeserialize: grpc.deserialize<orchestrator_service_pb.CompleteTaskResponse>;
}
interface ITaskHubSidecarServiceService_ICompleteEntityTask extends grpc.MethodDefinition<orchestrator_service_pb.EntityBatchResult, orchestrator_service_pb.CompleteTaskResponse> {
    path: "/TaskHubSidecarService/CompleteEntityTask";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<orchestrator_service_pb.EntityBatchResult>;
    requestDeserialize: grpc.deserialize<orchestrator_service_pb.EntityBatchResult>;
    responseSerialize: grpc.serialize<orchestrator_service_pb.CompleteTaskResponse>;
    responseDeserialize: grpc.deserialize<orchestrator_service_pb.CompleteTaskResponse>;
}
interface ITaskHubSidecarServiceService_IStreamInstanceHistory extends grpc.MethodDefinition<orchestrator_service_pb.StreamInstanceHistoryRequest, orchestrator_service_pb.HistoryChunk> {
    path: "/TaskHubSidecarService/StreamInstanceHistory";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<orchestrator_service_pb.StreamInstanceHistoryRequest>;
    requestDeserialize: grpc.deserialize<orchestrator_service_pb.StreamInstanceHistoryRequest>;
    responseSerialize: grpc.serialize<orchestrator_service_pb.HistoryChunk>;
    responseDeserialize: grpc.deserialize<orchestrator_service_pb.HistoryChunk>;
}
interface ITaskHubSidecarServiceService_ICreateTaskHub extends grpc.MethodDefinition<orchestrator_service_pb.CreateTaskHubRequest, orchestrator_service_pb.CreateTaskHubResponse> {
    path: "/TaskHubSidecarService/CreateTaskHub";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<orchestrator_service_pb.CreateTaskHubRequest>;
    requestDeserialize: grpc.deserialize<orchestrator_service_pb.CreateTaskHubRequest>;
    responseSerialize: grpc.serialize<orchestrator_service_pb.CreateTaskHubResponse>;
    responseDeserialize: grpc.deserialize<orchestrator_service_pb.CreateTaskHubResponse>;
}
interface ITaskHubSidecarServiceService_IDeleteTaskHub extends grpc.MethodDefinition<orchestrator_service_pb.DeleteTaskHubRequest, orchestrator_service_pb.DeleteTaskHubResponse> {
    path: "/TaskHubSidecarService/DeleteTaskHub";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<orchestrator_service_pb.DeleteTaskHubRequest>;
    requestDeserialize: grpc.deserialize<orchestrator_service_pb.DeleteTaskHubRequest>;
    responseSerialize: grpc.serialize<orchestrator_service_pb.DeleteTaskHubResponse>;
    responseDeserialize: grpc.deserialize<orchestrator_service_pb.DeleteTaskHubResponse>;
}
interface ITaskHubSidecarServiceService_ISignalEntity extends grpc.MethodDefinition<orchestrator_service_pb.SignalEntityRequest, orchestrator_service_pb.SignalEntityResponse> {
    path: "/TaskHubSidecarService/SignalEntity";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<orchestrator_service_pb.SignalEntityRequest>;
    requestDeserialize: grpc.deserialize<orchestrator_service_pb.SignalEntityRequest>;
    responseSerialize: grpc.serialize<orchestrator_service_pb.SignalEntityResponse>;
    responseDeserialize: grpc.deserialize<orchestrator_service_pb.SignalEntityResponse>;
}
interface ITaskHubSidecarServiceService_IGetEntity extends grpc.MethodDefinition<orchestrator_service_pb.GetEntityRequest, orchestrator_service_pb.GetEntityResponse> {
    path: "/TaskHubSidecarService/GetEntity";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<orchestrator_service_pb.GetEntityRequest>;
    requestDeserialize: grpc.deserialize<orchestrator_service_pb.GetEntityRequest>;
    responseSerialize: grpc.serialize<orchestrator_service_pb.GetEntityResponse>;
    responseDeserialize: grpc.deserialize<orchestrator_service_pb.GetEntityResponse>;
}
interface ITaskHubSidecarServiceService_IQueryEntities extends grpc.MethodDefinition<orchestrator_service_pb.QueryEntitiesRequest, orchestrator_service_pb.QueryEntitiesResponse> {
    path: "/TaskHubSidecarService/QueryEntities";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<orchestrator_service_pb.QueryEntitiesRequest>;
    requestDeserialize: grpc.deserialize<orchestrator_service_pb.QueryEntitiesRequest>;
    responseSerialize: grpc.serialize<orchestrator_service_pb.QueryEntitiesResponse>;
    responseDeserialize: grpc.deserialize<orchestrator_service_pb.QueryEntitiesResponse>;
}
interface ITaskHubSidecarServiceService_ICleanEntityStorage extends grpc.MethodDefinition<orchestrator_service_pb.CleanEntityStorageRequest, orchestrator_service_pb.CleanEntityStorageResponse> {
    path: "/TaskHubSidecarService/CleanEntityStorage";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<orchestrator_service_pb.CleanEntityStorageRequest>;
    requestDeserialize: grpc.deserialize<orchestrator_service_pb.CleanEntityStorageRequest>;
    responseSerialize: grpc.serialize<orchestrator_service_pb.CleanEntityStorageResponse>;
    responseDeserialize: grpc.deserialize<orchestrator_service_pb.CleanEntityStorageResponse>;
}
interface ITaskHubSidecarServiceService_IAbandonTaskActivityWorkItem extends grpc.MethodDefinition<orchestrator_service_pb.AbandonActivityTaskRequest, orchestrator_service_pb.AbandonActivityTaskResponse> {
    path: "/TaskHubSidecarService/AbandonTaskActivityWorkItem";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<orchestrator_service_pb.AbandonActivityTaskRequest>;
    requestDeserialize: grpc.deserialize<orchestrator_service_pb.AbandonActivityTaskRequest>;
    responseSerialize: grpc.serialize<orchestrator_service_pb.AbandonActivityTaskResponse>;
    responseDeserialize: grpc.deserialize<orchestrator_service_pb.AbandonActivityTaskResponse>;
}
interface ITaskHubSidecarServiceService_IAbandonTaskOrchestratorWorkItem extends grpc.MethodDefinition<orchestrator_service_pb.AbandonOrchestrationTaskRequest, orchestrator_service_pb.AbandonOrchestrationTaskResponse> {
    path: "/TaskHubSidecarService/AbandonTaskOrchestratorWorkItem";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<orchestrator_service_pb.AbandonOrchestrationTaskRequest>;
    requestDeserialize: grpc.deserialize<orchestrator_service_pb.AbandonOrchestrationTaskRequest>;
    responseSerialize: grpc.serialize<orchestrator_service_pb.AbandonOrchestrationTaskResponse>;
    responseDeserialize: grpc.deserialize<orchestrator_service_pb.AbandonOrchestrationTaskResponse>;
}
interface ITaskHubSidecarServiceService_IAbandonTaskEntityWorkItem extends grpc.MethodDefinition<orchestrator_service_pb.AbandonEntityTaskRequest, orchestrator_service_pb.AbandonEntityTaskResponse> {
    path: "/TaskHubSidecarService/AbandonTaskEntityWorkItem";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<orchestrator_service_pb.AbandonEntityTaskRequest>;
    requestDeserialize: grpc.deserialize<orchestrator_service_pb.AbandonEntityTaskRequest>;
    responseSerialize: grpc.serialize<orchestrator_service_pb.AbandonEntityTaskResponse>;
    responseDeserialize: grpc.deserialize<orchestrator_service_pb.AbandonEntityTaskResponse>;
}
interface ITaskHubSidecarServiceService_ISkipGracefulOrchestrationTerminations extends grpc.MethodDefinition<orchestrator_service_pb.SkipGracefulOrchestrationTerminationsRequest, orchestrator_service_pb.SkipGracefulOrchestrationTerminationsResponse> {
    path: "/TaskHubSidecarService/SkipGracefulOrchestrationTerminations";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<orchestrator_service_pb.SkipGracefulOrchestrationTerminationsRequest>;
    requestDeserialize: grpc.deserialize<orchestrator_service_pb.SkipGracefulOrchestrationTerminationsRequest>;
    responseSerialize: grpc.serialize<orchestrator_service_pb.SkipGracefulOrchestrationTerminationsResponse>;
    responseDeserialize: grpc.deserialize<orchestrator_service_pb.SkipGracefulOrchestrationTerminationsResponse>;
}

export const TaskHubSidecarServiceService: ITaskHubSidecarServiceService;

export interface ITaskHubSidecarServiceServer extends grpc.UntypedServiceImplementation {
    hello: grpc.handleUnaryCall<google_protobuf_empty_pb.Empty, google_protobuf_empty_pb.Empty>;
    startInstance: grpc.handleUnaryCall<orchestrator_service_pb.CreateInstanceRequest, orchestrator_service_pb.CreateInstanceResponse>;
    getInstance: grpc.handleUnaryCall<orchestrator_service_pb.GetInstanceRequest, orchestrator_service_pb.GetInstanceResponse>;
    rewindInstance: grpc.handleUnaryCall<orchestrator_service_pb.RewindInstanceRequest, orchestrator_service_pb.RewindInstanceResponse>;
    restartInstance: grpc.handleUnaryCall<orchestrator_service_pb.RestartInstanceRequest, orchestrator_service_pb.RestartInstanceResponse>;
    waitForInstanceStart: grpc.handleUnaryCall<orchestrator_service_pb.GetInstanceRequest, orchestrator_service_pb.GetInstanceResponse>;
    waitForInstanceCompletion: grpc.handleUnaryCall<orchestrator_service_pb.GetInstanceRequest, orchestrator_service_pb.GetInstanceResponse>;
    raiseEvent: grpc.handleUnaryCall<orchestrator_service_pb.RaiseEventRequest, orchestrator_service_pb.RaiseEventResponse>;
    terminateInstance: grpc.handleUnaryCall<orchestrator_service_pb.TerminateRequest, orchestrator_service_pb.TerminateResponse>;
    suspendInstance: grpc.handleUnaryCall<orchestrator_service_pb.SuspendRequest, orchestrator_service_pb.SuspendResponse>;
    resumeInstance: grpc.handleUnaryCall<orchestrator_service_pb.ResumeRequest, orchestrator_service_pb.ResumeResponse>;
    queryInstances: grpc.handleUnaryCall<orchestrator_service_pb.QueryInstancesRequest, orchestrator_service_pb.QueryInstancesResponse>;
    listInstanceIds: grpc.handleUnaryCall<orchestrator_service_pb.ListInstanceIdsRequest, orchestrator_service_pb.ListInstanceIdsResponse>;
    purgeInstances: grpc.handleUnaryCall<orchestrator_service_pb.PurgeInstancesRequest, orchestrator_service_pb.PurgeInstancesResponse>;
    getWorkItems: grpc.handleServerStreamingCall<orchestrator_service_pb.GetWorkItemsRequest, orchestrator_service_pb.WorkItem>;
    completeActivityTask: grpc.handleUnaryCall<orchestrator_service_pb.ActivityResponse, orchestrator_service_pb.CompleteTaskResponse>;
    completeOrchestratorTask: grpc.handleUnaryCall<orchestrator_service_pb.OrchestratorResponse, orchestrator_service_pb.CompleteTaskResponse>;
    completeEntityTask: grpc.handleUnaryCall<orchestrator_service_pb.EntityBatchResult, orchestrator_service_pb.CompleteTaskResponse>;
    streamInstanceHistory: grpc.handleServerStreamingCall<orchestrator_service_pb.StreamInstanceHistoryRequest, orchestrator_service_pb.HistoryChunk>;
    createTaskHub: grpc.handleUnaryCall<orchestrator_service_pb.CreateTaskHubRequest, orchestrator_service_pb.CreateTaskHubResponse>;
    deleteTaskHub: grpc.handleUnaryCall<orchestrator_service_pb.DeleteTaskHubRequest, orchestrator_service_pb.DeleteTaskHubResponse>;
    signalEntity: grpc.handleUnaryCall<orchestrator_service_pb.SignalEntityRequest, orchestrator_service_pb.SignalEntityResponse>;
    getEntity: grpc.handleUnaryCall<orchestrator_service_pb.GetEntityRequest, orchestrator_service_pb.GetEntityResponse>;
    queryEntities: grpc.handleUnaryCall<orchestrator_service_pb.QueryEntitiesRequest, orchestrator_service_pb.QueryEntitiesResponse>;
    cleanEntityStorage: grpc.handleUnaryCall<orchestrator_service_pb.CleanEntityStorageRequest, orchestrator_service_pb.CleanEntityStorageResponse>;
    abandonTaskActivityWorkItem: grpc.handleUnaryCall<orchestrator_service_pb.AbandonActivityTaskRequest, orchestrator_service_pb.AbandonActivityTaskResponse>;
    abandonTaskOrchestratorWorkItem: grpc.handleUnaryCall<orchestrator_service_pb.AbandonOrchestrationTaskRequest, orchestrator_service_pb.AbandonOrchestrationTaskResponse>;
    abandonTaskEntityWorkItem: grpc.handleUnaryCall<orchestrator_service_pb.AbandonEntityTaskRequest, orchestrator_service_pb.AbandonEntityTaskResponse>;
    skipGracefulOrchestrationTerminations: grpc.handleUnaryCall<orchestrator_service_pb.SkipGracefulOrchestrationTerminationsRequest, orchestrator_service_pb.SkipGracefulOrchestrationTerminationsResponse>;
}

export interface ITaskHubSidecarServiceClient {
    hello(request: google_protobuf_empty_pb.Empty, callback: (error: grpc.ServiceError | null, response: google_protobuf_empty_pb.Empty) => void): grpc.ClientUnaryCall;
    hello(request: google_protobuf_empty_pb.Empty, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: google_protobuf_empty_pb.Empty) => void): grpc.ClientUnaryCall;
    hello(request: google_protobuf_empty_pb.Empty, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: google_protobuf_empty_pb.Empty) => void): grpc.ClientUnaryCall;
    startInstance(request: orchestrator_service_pb.CreateInstanceRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CreateInstanceResponse) => void): grpc.ClientUnaryCall;
    startInstance(request: orchestrator_service_pb.CreateInstanceRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CreateInstanceResponse) => void): grpc.ClientUnaryCall;
    startInstance(request: orchestrator_service_pb.CreateInstanceRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CreateInstanceResponse) => void): grpc.ClientUnaryCall;
    getInstance(request: orchestrator_service_pb.GetInstanceRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.GetInstanceResponse) => void): grpc.ClientUnaryCall;
    getInstance(request: orchestrator_service_pb.GetInstanceRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.GetInstanceResponse) => void): grpc.ClientUnaryCall;
    getInstance(request: orchestrator_service_pb.GetInstanceRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.GetInstanceResponse) => void): grpc.ClientUnaryCall;
    rewindInstance(request: orchestrator_service_pb.RewindInstanceRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.RewindInstanceResponse) => void): grpc.ClientUnaryCall;
    rewindInstance(request: orchestrator_service_pb.RewindInstanceRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.RewindInstanceResponse) => void): grpc.ClientUnaryCall;
    rewindInstance(request: orchestrator_service_pb.RewindInstanceRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.RewindInstanceResponse) => void): grpc.ClientUnaryCall;
    restartInstance(request: orchestrator_service_pb.RestartInstanceRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.RestartInstanceResponse) => void): grpc.ClientUnaryCall;
    restartInstance(request: orchestrator_service_pb.RestartInstanceRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.RestartInstanceResponse) => void): grpc.ClientUnaryCall;
    restartInstance(request: orchestrator_service_pb.RestartInstanceRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.RestartInstanceResponse) => void): grpc.ClientUnaryCall;
    waitForInstanceStart(request: orchestrator_service_pb.GetInstanceRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.GetInstanceResponse) => void): grpc.ClientUnaryCall;
    waitForInstanceStart(request: orchestrator_service_pb.GetInstanceRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.GetInstanceResponse) => void): grpc.ClientUnaryCall;
    waitForInstanceStart(request: orchestrator_service_pb.GetInstanceRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.GetInstanceResponse) => void): grpc.ClientUnaryCall;
    waitForInstanceCompletion(request: orchestrator_service_pb.GetInstanceRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.GetInstanceResponse) => void): grpc.ClientUnaryCall;
    waitForInstanceCompletion(request: orchestrator_service_pb.GetInstanceRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.GetInstanceResponse) => void): grpc.ClientUnaryCall;
    waitForInstanceCompletion(request: orchestrator_service_pb.GetInstanceRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.GetInstanceResponse) => void): grpc.ClientUnaryCall;
    raiseEvent(request: orchestrator_service_pb.RaiseEventRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.RaiseEventResponse) => void): grpc.ClientUnaryCall;
    raiseEvent(request: orchestrator_service_pb.RaiseEventRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.RaiseEventResponse) => void): grpc.ClientUnaryCall;
    raiseEvent(request: orchestrator_service_pb.RaiseEventRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.RaiseEventResponse) => void): grpc.ClientUnaryCall;
    terminateInstance(request: orchestrator_service_pb.TerminateRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.TerminateResponse) => void): grpc.ClientUnaryCall;
    terminateInstance(request: orchestrator_service_pb.TerminateRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.TerminateResponse) => void): grpc.ClientUnaryCall;
    terminateInstance(request: orchestrator_service_pb.TerminateRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.TerminateResponse) => void): grpc.ClientUnaryCall;
    suspendInstance(request: orchestrator_service_pb.SuspendRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.SuspendResponse) => void): grpc.ClientUnaryCall;
    suspendInstance(request: orchestrator_service_pb.SuspendRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.SuspendResponse) => void): grpc.ClientUnaryCall;
    suspendInstance(request: orchestrator_service_pb.SuspendRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.SuspendResponse) => void): grpc.ClientUnaryCall;
    resumeInstance(request: orchestrator_service_pb.ResumeRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.ResumeResponse) => void): grpc.ClientUnaryCall;
    resumeInstance(request: orchestrator_service_pb.ResumeRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.ResumeResponse) => void): grpc.ClientUnaryCall;
    resumeInstance(request: orchestrator_service_pb.ResumeRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.ResumeResponse) => void): grpc.ClientUnaryCall;
    queryInstances(request: orchestrator_service_pb.QueryInstancesRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.QueryInstancesResponse) => void): grpc.ClientUnaryCall;
    queryInstances(request: orchestrator_service_pb.QueryInstancesRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.QueryInstancesResponse) => void): grpc.ClientUnaryCall;
    queryInstances(request: orchestrator_service_pb.QueryInstancesRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.QueryInstancesResponse) => void): grpc.ClientUnaryCall;
    listInstanceIds(request: orchestrator_service_pb.ListInstanceIdsRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.ListInstanceIdsResponse) => void): grpc.ClientUnaryCall;
    listInstanceIds(request: orchestrator_service_pb.ListInstanceIdsRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.ListInstanceIdsResponse) => void): grpc.ClientUnaryCall;
    listInstanceIds(request: orchestrator_service_pb.ListInstanceIdsRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.ListInstanceIdsResponse) => void): grpc.ClientUnaryCall;
    purgeInstances(request: orchestrator_service_pb.PurgeInstancesRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.PurgeInstancesResponse) => void): grpc.ClientUnaryCall;
    purgeInstances(request: orchestrator_service_pb.PurgeInstancesRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.PurgeInstancesResponse) => void): grpc.ClientUnaryCall;
    purgeInstances(request: orchestrator_service_pb.PurgeInstancesRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.PurgeInstancesResponse) => void): grpc.ClientUnaryCall;
    getWorkItems(request: orchestrator_service_pb.GetWorkItemsRequest, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<orchestrator_service_pb.WorkItem>;
    getWorkItems(request: orchestrator_service_pb.GetWorkItemsRequest, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<orchestrator_service_pb.WorkItem>;
    completeActivityTask(request: orchestrator_service_pb.ActivityResponse, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CompleteTaskResponse) => void): grpc.ClientUnaryCall;
    completeActivityTask(request: orchestrator_service_pb.ActivityResponse, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CompleteTaskResponse) => void): grpc.ClientUnaryCall;
    completeActivityTask(request: orchestrator_service_pb.ActivityResponse, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CompleteTaskResponse) => void): grpc.ClientUnaryCall;
    completeOrchestratorTask(request: orchestrator_service_pb.OrchestratorResponse, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CompleteTaskResponse) => void): grpc.ClientUnaryCall;
    completeOrchestratorTask(request: orchestrator_service_pb.OrchestratorResponse, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CompleteTaskResponse) => void): grpc.ClientUnaryCall;
    completeOrchestratorTask(request: orchestrator_service_pb.OrchestratorResponse, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CompleteTaskResponse) => void): grpc.ClientUnaryCall;
    completeEntityTask(request: orchestrator_service_pb.EntityBatchResult, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CompleteTaskResponse) => void): grpc.ClientUnaryCall;
    completeEntityTask(request: orchestrator_service_pb.EntityBatchResult, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CompleteTaskResponse) => void): grpc.ClientUnaryCall;
    completeEntityTask(request: orchestrator_service_pb.EntityBatchResult, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CompleteTaskResponse) => void): grpc.ClientUnaryCall;
    streamInstanceHistory(request: orchestrator_service_pb.StreamInstanceHistoryRequest, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<orchestrator_service_pb.HistoryChunk>;
    streamInstanceHistory(request: orchestrator_service_pb.StreamInstanceHistoryRequest, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<orchestrator_service_pb.HistoryChunk>;
    createTaskHub(request: orchestrator_service_pb.CreateTaskHubRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CreateTaskHubResponse) => void): grpc.ClientUnaryCall;
    createTaskHub(request: orchestrator_service_pb.CreateTaskHubRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CreateTaskHubResponse) => void): grpc.ClientUnaryCall;
    createTaskHub(request: orchestrator_service_pb.CreateTaskHubRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CreateTaskHubResponse) => void): grpc.ClientUnaryCall;
    deleteTaskHub(request: orchestrator_service_pb.DeleteTaskHubRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.DeleteTaskHubResponse) => void): grpc.ClientUnaryCall;
    deleteTaskHub(request: orchestrator_service_pb.DeleteTaskHubRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.DeleteTaskHubResponse) => void): grpc.ClientUnaryCall;
    deleteTaskHub(request: orchestrator_service_pb.DeleteTaskHubRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.DeleteTaskHubResponse) => void): grpc.ClientUnaryCall;
    signalEntity(request: orchestrator_service_pb.SignalEntityRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.SignalEntityResponse) => void): grpc.ClientUnaryCall;
    signalEntity(request: orchestrator_service_pb.SignalEntityRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.SignalEntityResponse) => void): grpc.ClientUnaryCall;
    signalEntity(request: orchestrator_service_pb.SignalEntityRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.SignalEntityResponse) => void): grpc.ClientUnaryCall;
    getEntity(request: orchestrator_service_pb.GetEntityRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.GetEntityResponse) => void): grpc.ClientUnaryCall;
    getEntity(request: orchestrator_service_pb.GetEntityRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.GetEntityResponse) => void): grpc.ClientUnaryCall;
    getEntity(request: orchestrator_service_pb.GetEntityRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.GetEntityResponse) => void): grpc.ClientUnaryCall;
    queryEntities(request: orchestrator_service_pb.QueryEntitiesRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.QueryEntitiesResponse) => void): grpc.ClientUnaryCall;
    queryEntities(request: orchestrator_service_pb.QueryEntitiesRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.QueryEntitiesResponse) => void): grpc.ClientUnaryCall;
    queryEntities(request: orchestrator_service_pb.QueryEntitiesRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.QueryEntitiesResponse) => void): grpc.ClientUnaryCall;
    cleanEntityStorage(request: orchestrator_service_pb.CleanEntityStorageRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CleanEntityStorageResponse) => void): grpc.ClientUnaryCall;
    cleanEntityStorage(request: orchestrator_service_pb.CleanEntityStorageRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CleanEntityStorageResponse) => void): grpc.ClientUnaryCall;
    cleanEntityStorage(request: orchestrator_service_pb.CleanEntityStorageRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CleanEntityStorageResponse) => void): grpc.ClientUnaryCall;
    abandonTaskActivityWorkItem(request: orchestrator_service_pb.AbandonActivityTaskRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.AbandonActivityTaskResponse) => void): grpc.ClientUnaryCall;
    abandonTaskActivityWorkItem(request: orchestrator_service_pb.AbandonActivityTaskRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.AbandonActivityTaskResponse) => void): grpc.ClientUnaryCall;
    abandonTaskActivityWorkItem(request: orchestrator_service_pb.AbandonActivityTaskRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.AbandonActivityTaskResponse) => void): grpc.ClientUnaryCall;
    abandonTaskOrchestratorWorkItem(request: orchestrator_service_pb.AbandonOrchestrationTaskRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.AbandonOrchestrationTaskResponse) => void): grpc.ClientUnaryCall;
    abandonTaskOrchestratorWorkItem(request: orchestrator_service_pb.AbandonOrchestrationTaskRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.AbandonOrchestrationTaskResponse) => void): grpc.ClientUnaryCall;
    abandonTaskOrchestratorWorkItem(request: orchestrator_service_pb.AbandonOrchestrationTaskRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.AbandonOrchestrationTaskResponse) => void): grpc.ClientUnaryCall;
    abandonTaskEntityWorkItem(request: orchestrator_service_pb.AbandonEntityTaskRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.AbandonEntityTaskResponse) => void): grpc.ClientUnaryCall;
    abandonTaskEntityWorkItem(request: orchestrator_service_pb.AbandonEntityTaskRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.AbandonEntityTaskResponse) => void): grpc.ClientUnaryCall;
    abandonTaskEntityWorkItem(request: orchestrator_service_pb.AbandonEntityTaskRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.AbandonEntityTaskResponse) => void): grpc.ClientUnaryCall;
    skipGracefulOrchestrationTerminations(request: orchestrator_service_pb.SkipGracefulOrchestrationTerminationsRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.SkipGracefulOrchestrationTerminationsResponse) => void): grpc.ClientUnaryCall;
    skipGracefulOrchestrationTerminations(request: orchestrator_service_pb.SkipGracefulOrchestrationTerminationsRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.SkipGracefulOrchestrationTerminationsResponse) => void): grpc.ClientUnaryCall;
    skipGracefulOrchestrationTerminations(request: orchestrator_service_pb.SkipGracefulOrchestrationTerminationsRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.SkipGracefulOrchestrationTerminationsResponse) => void): grpc.ClientUnaryCall;
}

export class TaskHubSidecarServiceClient extends grpc.Client implements ITaskHubSidecarServiceClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public hello(request: google_protobuf_empty_pb.Empty, callback: (error: grpc.ServiceError | null, response: google_protobuf_empty_pb.Empty) => void): grpc.ClientUnaryCall;
    public hello(request: google_protobuf_empty_pb.Empty, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: google_protobuf_empty_pb.Empty) => void): grpc.ClientUnaryCall;
    public hello(request: google_protobuf_empty_pb.Empty, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: google_protobuf_empty_pb.Empty) => void): grpc.ClientUnaryCall;
    public startInstance(request: orchestrator_service_pb.CreateInstanceRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CreateInstanceResponse) => void): grpc.ClientUnaryCall;
    public startInstance(request: orchestrator_service_pb.CreateInstanceRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CreateInstanceResponse) => void): grpc.ClientUnaryCall;
    public startInstance(request: orchestrator_service_pb.CreateInstanceRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CreateInstanceResponse) => void): grpc.ClientUnaryCall;
    public getInstance(request: orchestrator_service_pb.GetInstanceRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.GetInstanceResponse) => void): grpc.ClientUnaryCall;
    public getInstance(request: orchestrator_service_pb.GetInstanceRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.GetInstanceResponse) => void): grpc.ClientUnaryCall;
    public getInstance(request: orchestrator_service_pb.GetInstanceRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.GetInstanceResponse) => void): grpc.ClientUnaryCall;
    public rewindInstance(request: orchestrator_service_pb.RewindInstanceRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.RewindInstanceResponse) => void): grpc.ClientUnaryCall;
    public rewindInstance(request: orchestrator_service_pb.RewindInstanceRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.RewindInstanceResponse) => void): grpc.ClientUnaryCall;
    public rewindInstance(request: orchestrator_service_pb.RewindInstanceRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.RewindInstanceResponse) => void): grpc.ClientUnaryCall;
    public restartInstance(request: orchestrator_service_pb.RestartInstanceRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.RestartInstanceResponse) => void): grpc.ClientUnaryCall;
    public restartInstance(request: orchestrator_service_pb.RestartInstanceRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.RestartInstanceResponse) => void): grpc.ClientUnaryCall;
    public restartInstance(request: orchestrator_service_pb.RestartInstanceRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.RestartInstanceResponse) => void): grpc.ClientUnaryCall;
    public waitForInstanceStart(request: orchestrator_service_pb.GetInstanceRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.GetInstanceResponse) => void): grpc.ClientUnaryCall;
    public waitForInstanceStart(request: orchestrator_service_pb.GetInstanceRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.GetInstanceResponse) => void): grpc.ClientUnaryCall;
    public waitForInstanceStart(request: orchestrator_service_pb.GetInstanceRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.GetInstanceResponse) => void): grpc.ClientUnaryCall;
    public waitForInstanceCompletion(request: orchestrator_service_pb.GetInstanceRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.GetInstanceResponse) => void): grpc.ClientUnaryCall;
    public waitForInstanceCompletion(request: orchestrator_service_pb.GetInstanceRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.GetInstanceResponse) => void): grpc.ClientUnaryCall;
    public waitForInstanceCompletion(request: orchestrator_service_pb.GetInstanceRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.GetInstanceResponse) => void): grpc.ClientUnaryCall;
    public raiseEvent(request: orchestrator_service_pb.RaiseEventRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.RaiseEventResponse) => void): grpc.ClientUnaryCall;
    public raiseEvent(request: orchestrator_service_pb.RaiseEventRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.RaiseEventResponse) => void): grpc.ClientUnaryCall;
    public raiseEvent(request: orchestrator_service_pb.RaiseEventRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.RaiseEventResponse) => void): grpc.ClientUnaryCall;
    public terminateInstance(request: orchestrator_service_pb.TerminateRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.TerminateResponse) => void): grpc.ClientUnaryCall;
    public terminateInstance(request: orchestrator_service_pb.TerminateRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.TerminateResponse) => void): grpc.ClientUnaryCall;
    public terminateInstance(request: orchestrator_service_pb.TerminateRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.TerminateResponse) => void): grpc.ClientUnaryCall;
    public suspendInstance(request: orchestrator_service_pb.SuspendRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.SuspendResponse) => void): grpc.ClientUnaryCall;
    public suspendInstance(request: orchestrator_service_pb.SuspendRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.SuspendResponse) => void): grpc.ClientUnaryCall;
    public suspendInstance(request: orchestrator_service_pb.SuspendRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.SuspendResponse) => void): grpc.ClientUnaryCall;
    public resumeInstance(request: orchestrator_service_pb.ResumeRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.ResumeResponse) => void): grpc.ClientUnaryCall;
    public resumeInstance(request: orchestrator_service_pb.ResumeRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.ResumeResponse) => void): grpc.ClientUnaryCall;
    public resumeInstance(request: orchestrator_service_pb.ResumeRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.ResumeResponse) => void): grpc.ClientUnaryCall;
    public queryInstances(request: orchestrator_service_pb.QueryInstancesRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.QueryInstancesResponse) => void): grpc.ClientUnaryCall;
    public queryInstances(request: orchestrator_service_pb.QueryInstancesRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.QueryInstancesResponse) => void): grpc.ClientUnaryCall;
    public queryInstances(request: orchestrator_service_pb.QueryInstancesRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.QueryInstancesResponse) => void): grpc.ClientUnaryCall;
    public listInstanceIds(request: orchestrator_service_pb.ListInstanceIdsRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.ListInstanceIdsResponse) => void): grpc.ClientUnaryCall;
    public listInstanceIds(request: orchestrator_service_pb.ListInstanceIdsRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.ListInstanceIdsResponse) => void): grpc.ClientUnaryCall;
    public listInstanceIds(request: orchestrator_service_pb.ListInstanceIdsRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.ListInstanceIdsResponse) => void): grpc.ClientUnaryCall;
    public purgeInstances(request: orchestrator_service_pb.PurgeInstancesRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.PurgeInstancesResponse) => void): grpc.ClientUnaryCall;
    public purgeInstances(request: orchestrator_service_pb.PurgeInstancesRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.PurgeInstancesResponse) => void): grpc.ClientUnaryCall;
    public purgeInstances(request: orchestrator_service_pb.PurgeInstancesRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.PurgeInstancesResponse) => void): grpc.ClientUnaryCall;
    public getWorkItems(request: orchestrator_service_pb.GetWorkItemsRequest, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<orchestrator_service_pb.WorkItem>;
    public getWorkItems(request: orchestrator_service_pb.GetWorkItemsRequest, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<orchestrator_service_pb.WorkItem>;
    public completeActivityTask(request: orchestrator_service_pb.ActivityResponse, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CompleteTaskResponse) => void): grpc.ClientUnaryCall;
    public completeActivityTask(request: orchestrator_service_pb.ActivityResponse, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CompleteTaskResponse) => void): grpc.ClientUnaryCall;
    public completeActivityTask(request: orchestrator_service_pb.ActivityResponse, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CompleteTaskResponse) => void): grpc.ClientUnaryCall;
    public completeOrchestratorTask(request: orchestrator_service_pb.OrchestratorResponse, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CompleteTaskResponse) => void): grpc.ClientUnaryCall;
    public completeOrchestratorTask(request: orchestrator_service_pb.OrchestratorResponse, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CompleteTaskResponse) => void): grpc.ClientUnaryCall;
    public completeOrchestratorTask(request: orchestrator_service_pb.OrchestratorResponse, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CompleteTaskResponse) => void): grpc.ClientUnaryCall;
    public completeEntityTask(request: orchestrator_service_pb.EntityBatchResult, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CompleteTaskResponse) => void): grpc.ClientUnaryCall;
    public completeEntityTask(request: orchestrator_service_pb.EntityBatchResult, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CompleteTaskResponse) => void): grpc.ClientUnaryCall;
    public completeEntityTask(request: orchestrator_service_pb.EntityBatchResult, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CompleteTaskResponse) => void): grpc.ClientUnaryCall;
    public streamInstanceHistory(request: orchestrator_service_pb.StreamInstanceHistoryRequest, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<orchestrator_service_pb.HistoryChunk>;
    public streamInstanceHistory(request: orchestrator_service_pb.StreamInstanceHistoryRequest, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<orchestrator_service_pb.HistoryChunk>;
    public createTaskHub(request: orchestrator_service_pb.CreateTaskHubRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CreateTaskHubResponse) => void): grpc.ClientUnaryCall;
    public createTaskHub(request: orchestrator_service_pb.CreateTaskHubRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CreateTaskHubResponse) => void): grpc.ClientUnaryCall;
    public createTaskHub(request: orchestrator_service_pb.CreateTaskHubRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CreateTaskHubResponse) => void): grpc.ClientUnaryCall;
    public deleteTaskHub(request: orchestrator_service_pb.DeleteTaskHubRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.DeleteTaskHubResponse) => void): grpc.ClientUnaryCall;
    public deleteTaskHub(request: orchestrator_service_pb.DeleteTaskHubRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.DeleteTaskHubResponse) => void): grpc.ClientUnaryCall;
    public deleteTaskHub(request: orchestrator_service_pb.DeleteTaskHubRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.DeleteTaskHubResponse) => void): grpc.ClientUnaryCall;
    public signalEntity(request: orchestrator_service_pb.SignalEntityRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.SignalEntityResponse) => void): grpc.ClientUnaryCall;
    public signalEntity(request: orchestrator_service_pb.SignalEntityRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.SignalEntityResponse) => void): grpc.ClientUnaryCall;
    public signalEntity(request: orchestrator_service_pb.SignalEntityRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.SignalEntityResponse) => void): grpc.ClientUnaryCall;
    public getEntity(request: orchestrator_service_pb.GetEntityRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.GetEntityResponse) => void): grpc.ClientUnaryCall;
    public getEntity(request: orchestrator_service_pb.GetEntityRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.GetEntityResponse) => void): grpc.ClientUnaryCall;
    public getEntity(request: orchestrator_service_pb.GetEntityRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.GetEntityResponse) => void): grpc.ClientUnaryCall;
    public queryEntities(request: orchestrator_service_pb.QueryEntitiesRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.QueryEntitiesResponse) => void): grpc.ClientUnaryCall;
    public queryEntities(request: orchestrator_service_pb.QueryEntitiesRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.QueryEntitiesResponse) => void): grpc.ClientUnaryCall;
    public queryEntities(request: orchestrator_service_pb.QueryEntitiesRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.QueryEntitiesResponse) => void): grpc.ClientUnaryCall;
    public cleanEntityStorage(request: orchestrator_service_pb.CleanEntityStorageRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CleanEntityStorageResponse) => void): grpc.ClientUnaryCall;
    public cleanEntityStorage(request: orchestrator_service_pb.CleanEntityStorageRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CleanEntityStorageResponse) => void): grpc.ClientUnaryCall;
    public cleanEntityStorage(request: orchestrator_service_pb.CleanEntityStorageRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.CleanEntityStorageResponse) => void): grpc.ClientUnaryCall;
    public abandonTaskActivityWorkItem(request: orchestrator_service_pb.AbandonActivityTaskRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.AbandonActivityTaskResponse) => void): grpc.ClientUnaryCall;
    public abandonTaskActivityWorkItem(request: orchestrator_service_pb.AbandonActivityTaskRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.AbandonActivityTaskResponse) => void): grpc.ClientUnaryCall;
    public abandonTaskActivityWorkItem(request: orchestrator_service_pb.AbandonActivityTaskRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.AbandonActivityTaskResponse) => void): grpc.ClientUnaryCall;
    public abandonTaskOrchestratorWorkItem(request: orchestrator_service_pb.AbandonOrchestrationTaskRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.AbandonOrchestrationTaskResponse) => void): grpc.ClientUnaryCall;
    public abandonTaskOrchestratorWorkItem(request: orchestrator_service_pb.AbandonOrchestrationTaskRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.AbandonOrchestrationTaskResponse) => void): grpc.ClientUnaryCall;
    public abandonTaskOrchestratorWorkItem(request: orchestrator_service_pb.AbandonOrchestrationTaskRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.AbandonOrchestrationTaskResponse) => void): grpc.ClientUnaryCall;
    public abandonTaskEntityWorkItem(request: orchestrator_service_pb.AbandonEntityTaskRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.AbandonEntityTaskResponse) => void): grpc.ClientUnaryCall;
    public abandonTaskEntityWorkItem(request: orchestrator_service_pb.AbandonEntityTaskRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.AbandonEntityTaskResponse) => void): grpc.ClientUnaryCall;
    public abandonTaskEntityWorkItem(request: orchestrator_service_pb.AbandonEntityTaskRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.AbandonEntityTaskResponse) => void): grpc.ClientUnaryCall;
    public skipGracefulOrchestrationTerminations(request: orchestrator_service_pb.SkipGracefulOrchestrationTerminationsRequest, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.SkipGracefulOrchestrationTerminationsResponse) => void): grpc.ClientUnaryCall;
    public skipGracefulOrchestrationTerminations(request: orchestrator_service_pb.SkipGracefulOrchestrationTerminationsRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.SkipGracefulOrchestrationTerminationsResponse) => void): grpc.ClientUnaryCall;
    public skipGracefulOrchestrationTerminations(request: orchestrator_service_pb.SkipGracefulOrchestrationTerminationsRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: orchestrator_service_pb.SkipGracefulOrchestrationTerminationsResponse) => void): grpc.ClientUnaryCall;
}
