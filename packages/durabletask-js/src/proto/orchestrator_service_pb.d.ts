// package: 
// file: orchestrator_service.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_timestamp_pb from "google-protobuf/google/protobuf/timestamp_pb";
import * as google_protobuf_duration_pb from "google-protobuf/google/protobuf/duration_pb";
import * as google_protobuf_wrappers_pb from "google-protobuf/google/protobuf/wrappers_pb";
import * as google_protobuf_empty_pb from "google-protobuf/google/protobuf/empty_pb";
import * as google_protobuf_struct_pb from "google-protobuf/google/protobuf/struct_pb";

export class OrchestrationInstance extends jspb.Message { 
    getInstanceid(): string;
    setInstanceid(value: string): OrchestrationInstance;

    hasExecutionid(): boolean;
    clearExecutionid(): void;
    getExecutionid(): google_protobuf_wrappers_pb.StringValue | undefined;
    setExecutionid(value?: google_protobuf_wrappers_pb.StringValue): OrchestrationInstance;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): OrchestrationInstance.AsObject;
    static toObject(includeInstance: boolean, msg: OrchestrationInstance): OrchestrationInstance.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: OrchestrationInstance, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): OrchestrationInstance;
    static deserializeBinaryFromReader(message: OrchestrationInstance, reader: jspb.BinaryReader): OrchestrationInstance;
}

export namespace OrchestrationInstance {
    export type AsObject = {
        instanceid: string,
        executionid?: google_protobuf_wrappers_pb.StringValue.AsObject,
    }
}

export class ActivityRequest extends jspb.Message { 
    getName(): string;
    setName(value: string): ActivityRequest;

    hasVersion(): boolean;
    clearVersion(): void;
    getVersion(): google_protobuf_wrappers_pb.StringValue | undefined;
    setVersion(value?: google_protobuf_wrappers_pb.StringValue): ActivityRequest;

    hasInput(): boolean;
    clearInput(): void;
    getInput(): google_protobuf_wrappers_pb.StringValue | undefined;
    setInput(value?: google_protobuf_wrappers_pb.StringValue): ActivityRequest;

    hasOrchestrationinstance(): boolean;
    clearOrchestrationinstance(): void;
    getOrchestrationinstance(): OrchestrationInstance | undefined;
    setOrchestrationinstance(value?: OrchestrationInstance): ActivityRequest;
    getTaskid(): number;
    setTaskid(value: number): ActivityRequest;

    hasParenttracecontext(): boolean;
    clearParenttracecontext(): void;
    getParenttracecontext(): TraceContext | undefined;
    setParenttracecontext(value?: TraceContext): ActivityRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ActivityRequest.AsObject;
    static toObject(includeInstance: boolean, msg: ActivityRequest): ActivityRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ActivityRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ActivityRequest;
    static deserializeBinaryFromReader(message: ActivityRequest, reader: jspb.BinaryReader): ActivityRequest;
}

export namespace ActivityRequest {
    export type AsObject = {
        name: string,
        version?: google_protobuf_wrappers_pb.StringValue.AsObject,
        input?: google_protobuf_wrappers_pb.StringValue.AsObject,
        orchestrationinstance?: OrchestrationInstance.AsObject,
        taskid: number,
        parenttracecontext?: TraceContext.AsObject,
    }
}

export class ActivityResponse extends jspb.Message { 
    getInstanceid(): string;
    setInstanceid(value: string): ActivityResponse;
    getTaskid(): number;
    setTaskid(value: number): ActivityResponse;

    hasResult(): boolean;
    clearResult(): void;
    getResult(): google_protobuf_wrappers_pb.StringValue | undefined;
    setResult(value?: google_protobuf_wrappers_pb.StringValue): ActivityResponse;

    hasFailuredetails(): boolean;
    clearFailuredetails(): void;
    getFailuredetails(): TaskFailureDetails | undefined;
    setFailuredetails(value?: TaskFailureDetails): ActivityResponse;
    getCompletiontoken(): string;
    setCompletiontoken(value: string): ActivityResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ActivityResponse.AsObject;
    static toObject(includeInstance: boolean, msg: ActivityResponse): ActivityResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ActivityResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ActivityResponse;
    static deserializeBinaryFromReader(message: ActivityResponse, reader: jspb.BinaryReader): ActivityResponse;
}

export namespace ActivityResponse {
    export type AsObject = {
        instanceid: string,
        taskid: number,
        result?: google_protobuf_wrappers_pb.StringValue.AsObject,
        failuredetails?: TaskFailureDetails.AsObject,
        completiontoken: string,
    }
}

export class TaskFailureDetails extends jspb.Message { 
    getErrortype(): string;
    setErrortype(value: string): TaskFailureDetails;
    getErrormessage(): string;
    setErrormessage(value: string): TaskFailureDetails;

    hasStacktrace(): boolean;
    clearStacktrace(): void;
    getStacktrace(): google_protobuf_wrappers_pb.StringValue | undefined;
    setStacktrace(value?: google_protobuf_wrappers_pb.StringValue): TaskFailureDetails;

    hasInnerfailure(): boolean;
    clearInnerfailure(): void;
    getInnerfailure(): TaskFailureDetails | undefined;
    setInnerfailure(value?: TaskFailureDetails): TaskFailureDetails;
    getIsnonretriable(): boolean;
    setIsnonretriable(value: boolean): TaskFailureDetails;

    getPropertiesMap(): jspb.Map<string, google_protobuf_struct_pb.Value>;
    clearPropertiesMap(): void;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): TaskFailureDetails.AsObject;
    static toObject(includeInstance: boolean, msg: TaskFailureDetails): TaskFailureDetails.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: TaskFailureDetails, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): TaskFailureDetails;
    static deserializeBinaryFromReader(message: TaskFailureDetails, reader: jspb.BinaryReader): TaskFailureDetails;
}

export namespace TaskFailureDetails {
    export type AsObject = {
        errortype: string,
        errormessage: string,
        stacktrace?: google_protobuf_wrappers_pb.StringValue.AsObject,
        innerfailure?: TaskFailureDetails.AsObject,
        isnonretriable: boolean,

        propertiesMap: Array<[string, google_protobuf_struct_pb.Value.AsObject]>,
    }
}

export class ParentInstanceInfo extends jspb.Message { 
    getTaskscheduledid(): number;
    setTaskscheduledid(value: number): ParentInstanceInfo;

    hasName(): boolean;
    clearName(): void;
    getName(): google_protobuf_wrappers_pb.StringValue | undefined;
    setName(value?: google_protobuf_wrappers_pb.StringValue): ParentInstanceInfo;

    hasVersion(): boolean;
    clearVersion(): void;
    getVersion(): google_protobuf_wrappers_pb.StringValue | undefined;
    setVersion(value?: google_protobuf_wrappers_pb.StringValue): ParentInstanceInfo;

    hasOrchestrationinstance(): boolean;
    clearOrchestrationinstance(): void;
    getOrchestrationinstance(): OrchestrationInstance | undefined;
    setOrchestrationinstance(value?: OrchestrationInstance): ParentInstanceInfo;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ParentInstanceInfo.AsObject;
    static toObject(includeInstance: boolean, msg: ParentInstanceInfo): ParentInstanceInfo.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ParentInstanceInfo, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ParentInstanceInfo;
    static deserializeBinaryFromReader(message: ParentInstanceInfo, reader: jspb.BinaryReader): ParentInstanceInfo;
}

export namespace ParentInstanceInfo {
    export type AsObject = {
        taskscheduledid: number,
        name?: google_protobuf_wrappers_pb.StringValue.AsObject,
        version?: google_protobuf_wrappers_pb.StringValue.AsObject,
        orchestrationinstance?: OrchestrationInstance.AsObject,
    }
}

export class TraceContext extends jspb.Message { 
    getTraceparent(): string;
    setTraceparent(value: string): TraceContext;
    getSpanid(): string;
    setSpanid(value: string): TraceContext;

    hasTracestate(): boolean;
    clearTracestate(): void;
    getTracestate(): google_protobuf_wrappers_pb.StringValue | undefined;
    setTracestate(value?: google_protobuf_wrappers_pb.StringValue): TraceContext;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): TraceContext.AsObject;
    static toObject(includeInstance: boolean, msg: TraceContext): TraceContext.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: TraceContext, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): TraceContext;
    static deserializeBinaryFromReader(message: TraceContext, reader: jspb.BinaryReader): TraceContext;
}

export namespace TraceContext {
    export type AsObject = {
        traceparent: string,
        spanid: string,
        tracestate?: google_protobuf_wrappers_pb.StringValue.AsObject,
    }
}

export class ExecutionStartedEvent extends jspb.Message { 
    getName(): string;
    setName(value: string): ExecutionStartedEvent;

    hasVersion(): boolean;
    clearVersion(): void;
    getVersion(): google_protobuf_wrappers_pb.StringValue | undefined;
    setVersion(value?: google_protobuf_wrappers_pb.StringValue): ExecutionStartedEvent;

    hasInput(): boolean;
    clearInput(): void;
    getInput(): google_protobuf_wrappers_pb.StringValue | undefined;
    setInput(value?: google_protobuf_wrappers_pb.StringValue): ExecutionStartedEvent;

    hasOrchestrationinstance(): boolean;
    clearOrchestrationinstance(): void;
    getOrchestrationinstance(): OrchestrationInstance | undefined;
    setOrchestrationinstance(value?: OrchestrationInstance): ExecutionStartedEvent;

    hasParentinstance(): boolean;
    clearParentinstance(): void;
    getParentinstance(): ParentInstanceInfo | undefined;
    setParentinstance(value?: ParentInstanceInfo): ExecutionStartedEvent;

    hasScheduledstarttimestamp(): boolean;
    clearScheduledstarttimestamp(): void;
    getScheduledstarttimestamp(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setScheduledstarttimestamp(value?: google_protobuf_timestamp_pb.Timestamp): ExecutionStartedEvent;

    hasParenttracecontext(): boolean;
    clearParenttracecontext(): void;
    getParenttracecontext(): TraceContext | undefined;
    setParenttracecontext(value?: TraceContext): ExecutionStartedEvent;

    hasOrchestrationspanid(): boolean;
    clearOrchestrationspanid(): void;
    getOrchestrationspanid(): google_protobuf_wrappers_pb.StringValue | undefined;
    setOrchestrationspanid(value?: google_protobuf_wrappers_pb.StringValue): ExecutionStartedEvent;

    getTagsMap(): jspb.Map<string, string>;
    clearTagsMap(): void;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ExecutionStartedEvent.AsObject;
    static toObject(includeInstance: boolean, msg: ExecutionStartedEvent): ExecutionStartedEvent.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ExecutionStartedEvent, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ExecutionStartedEvent;
    static deserializeBinaryFromReader(message: ExecutionStartedEvent, reader: jspb.BinaryReader): ExecutionStartedEvent;
}

export namespace ExecutionStartedEvent {
    export type AsObject = {
        name: string,
        version?: google_protobuf_wrappers_pb.StringValue.AsObject,
        input?: google_protobuf_wrappers_pb.StringValue.AsObject,
        orchestrationinstance?: OrchestrationInstance.AsObject,
        parentinstance?: ParentInstanceInfo.AsObject,
        scheduledstarttimestamp?: google_protobuf_timestamp_pb.Timestamp.AsObject,
        parenttracecontext?: TraceContext.AsObject,
        orchestrationspanid?: google_protobuf_wrappers_pb.StringValue.AsObject,

        tagsMap: Array<[string, string]>,
    }
}

export class ExecutionCompletedEvent extends jspb.Message { 
    getOrchestrationstatus(): OrchestrationStatus;
    setOrchestrationstatus(value: OrchestrationStatus): ExecutionCompletedEvent;

    hasResult(): boolean;
    clearResult(): void;
    getResult(): google_protobuf_wrappers_pb.StringValue | undefined;
    setResult(value?: google_protobuf_wrappers_pb.StringValue): ExecutionCompletedEvent;

    hasFailuredetails(): boolean;
    clearFailuredetails(): void;
    getFailuredetails(): TaskFailureDetails | undefined;
    setFailuredetails(value?: TaskFailureDetails): ExecutionCompletedEvent;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ExecutionCompletedEvent.AsObject;
    static toObject(includeInstance: boolean, msg: ExecutionCompletedEvent): ExecutionCompletedEvent.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ExecutionCompletedEvent, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ExecutionCompletedEvent;
    static deserializeBinaryFromReader(message: ExecutionCompletedEvent, reader: jspb.BinaryReader): ExecutionCompletedEvent;
}

export namespace ExecutionCompletedEvent {
    export type AsObject = {
        orchestrationstatus: OrchestrationStatus,
        result?: google_protobuf_wrappers_pb.StringValue.AsObject,
        failuredetails?: TaskFailureDetails.AsObject,
    }
}

export class ExecutionTerminatedEvent extends jspb.Message { 

    hasInput(): boolean;
    clearInput(): void;
    getInput(): google_protobuf_wrappers_pb.StringValue | undefined;
    setInput(value?: google_protobuf_wrappers_pb.StringValue): ExecutionTerminatedEvent;
    getRecurse(): boolean;
    setRecurse(value: boolean): ExecutionTerminatedEvent;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ExecutionTerminatedEvent.AsObject;
    static toObject(includeInstance: boolean, msg: ExecutionTerminatedEvent): ExecutionTerminatedEvent.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ExecutionTerminatedEvent, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ExecutionTerminatedEvent;
    static deserializeBinaryFromReader(message: ExecutionTerminatedEvent, reader: jspb.BinaryReader): ExecutionTerminatedEvent;
}

export namespace ExecutionTerminatedEvent {
    export type AsObject = {
        input?: google_protobuf_wrappers_pb.StringValue.AsObject,
        recurse: boolean,
    }
}

export class TaskScheduledEvent extends jspb.Message { 
    getName(): string;
    setName(value: string): TaskScheduledEvent;

    hasVersion(): boolean;
    clearVersion(): void;
    getVersion(): google_protobuf_wrappers_pb.StringValue | undefined;
    setVersion(value?: google_protobuf_wrappers_pb.StringValue): TaskScheduledEvent;

    hasInput(): boolean;
    clearInput(): void;
    getInput(): google_protobuf_wrappers_pb.StringValue | undefined;
    setInput(value?: google_protobuf_wrappers_pb.StringValue): TaskScheduledEvent;

    hasParenttracecontext(): boolean;
    clearParenttracecontext(): void;
    getParenttracecontext(): TraceContext | undefined;
    setParenttracecontext(value?: TraceContext): TaskScheduledEvent;

    getTagsMap(): jspb.Map<string, string>;
    clearTagsMap(): void;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): TaskScheduledEvent.AsObject;
    static toObject(includeInstance: boolean, msg: TaskScheduledEvent): TaskScheduledEvent.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: TaskScheduledEvent, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): TaskScheduledEvent;
    static deserializeBinaryFromReader(message: TaskScheduledEvent, reader: jspb.BinaryReader): TaskScheduledEvent;
}

export namespace TaskScheduledEvent {
    export type AsObject = {
        name: string,
        version?: google_protobuf_wrappers_pb.StringValue.AsObject,
        input?: google_protobuf_wrappers_pb.StringValue.AsObject,
        parenttracecontext?: TraceContext.AsObject,

        tagsMap: Array<[string, string]>,
    }
}

export class TaskCompletedEvent extends jspb.Message { 
    getTaskscheduledid(): number;
    setTaskscheduledid(value: number): TaskCompletedEvent;

    hasResult(): boolean;
    clearResult(): void;
    getResult(): google_protobuf_wrappers_pb.StringValue | undefined;
    setResult(value?: google_protobuf_wrappers_pb.StringValue): TaskCompletedEvent;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): TaskCompletedEvent.AsObject;
    static toObject(includeInstance: boolean, msg: TaskCompletedEvent): TaskCompletedEvent.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: TaskCompletedEvent, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): TaskCompletedEvent;
    static deserializeBinaryFromReader(message: TaskCompletedEvent, reader: jspb.BinaryReader): TaskCompletedEvent;
}

export namespace TaskCompletedEvent {
    export type AsObject = {
        taskscheduledid: number,
        result?: google_protobuf_wrappers_pb.StringValue.AsObject,
    }
}

export class TaskFailedEvent extends jspb.Message { 
    getTaskscheduledid(): number;
    setTaskscheduledid(value: number): TaskFailedEvent;

    hasFailuredetails(): boolean;
    clearFailuredetails(): void;
    getFailuredetails(): TaskFailureDetails | undefined;
    setFailuredetails(value?: TaskFailureDetails): TaskFailedEvent;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): TaskFailedEvent.AsObject;
    static toObject(includeInstance: boolean, msg: TaskFailedEvent): TaskFailedEvent.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: TaskFailedEvent, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): TaskFailedEvent;
    static deserializeBinaryFromReader(message: TaskFailedEvent, reader: jspb.BinaryReader): TaskFailedEvent;
}

export namespace TaskFailedEvent {
    export type AsObject = {
        taskscheduledid: number,
        failuredetails?: TaskFailureDetails.AsObject,
    }
}

export class SubOrchestrationInstanceCreatedEvent extends jspb.Message { 
    getInstanceid(): string;
    setInstanceid(value: string): SubOrchestrationInstanceCreatedEvent;
    getName(): string;
    setName(value: string): SubOrchestrationInstanceCreatedEvent;

    hasVersion(): boolean;
    clearVersion(): void;
    getVersion(): google_protobuf_wrappers_pb.StringValue | undefined;
    setVersion(value?: google_protobuf_wrappers_pb.StringValue): SubOrchestrationInstanceCreatedEvent;

    hasInput(): boolean;
    clearInput(): void;
    getInput(): google_protobuf_wrappers_pb.StringValue | undefined;
    setInput(value?: google_protobuf_wrappers_pb.StringValue): SubOrchestrationInstanceCreatedEvent;

    hasParenttracecontext(): boolean;
    clearParenttracecontext(): void;
    getParenttracecontext(): TraceContext | undefined;
    setParenttracecontext(value?: TraceContext): SubOrchestrationInstanceCreatedEvent;

    getTagsMap(): jspb.Map<string, string>;
    clearTagsMap(): void;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SubOrchestrationInstanceCreatedEvent.AsObject;
    static toObject(includeInstance: boolean, msg: SubOrchestrationInstanceCreatedEvent): SubOrchestrationInstanceCreatedEvent.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SubOrchestrationInstanceCreatedEvent, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SubOrchestrationInstanceCreatedEvent;
    static deserializeBinaryFromReader(message: SubOrchestrationInstanceCreatedEvent, reader: jspb.BinaryReader): SubOrchestrationInstanceCreatedEvent;
}

export namespace SubOrchestrationInstanceCreatedEvent {
    export type AsObject = {
        instanceid: string,
        name: string,
        version?: google_protobuf_wrappers_pb.StringValue.AsObject,
        input?: google_protobuf_wrappers_pb.StringValue.AsObject,
        parenttracecontext?: TraceContext.AsObject,

        tagsMap: Array<[string, string]>,
    }
}

export class SubOrchestrationInstanceCompletedEvent extends jspb.Message { 
    getTaskscheduledid(): number;
    setTaskscheduledid(value: number): SubOrchestrationInstanceCompletedEvent;

    hasResult(): boolean;
    clearResult(): void;
    getResult(): google_protobuf_wrappers_pb.StringValue | undefined;
    setResult(value?: google_protobuf_wrappers_pb.StringValue): SubOrchestrationInstanceCompletedEvent;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SubOrchestrationInstanceCompletedEvent.AsObject;
    static toObject(includeInstance: boolean, msg: SubOrchestrationInstanceCompletedEvent): SubOrchestrationInstanceCompletedEvent.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SubOrchestrationInstanceCompletedEvent, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SubOrchestrationInstanceCompletedEvent;
    static deserializeBinaryFromReader(message: SubOrchestrationInstanceCompletedEvent, reader: jspb.BinaryReader): SubOrchestrationInstanceCompletedEvent;
}

export namespace SubOrchestrationInstanceCompletedEvent {
    export type AsObject = {
        taskscheduledid: number,
        result?: google_protobuf_wrappers_pb.StringValue.AsObject,
    }
}

export class SubOrchestrationInstanceFailedEvent extends jspb.Message { 
    getTaskscheduledid(): number;
    setTaskscheduledid(value: number): SubOrchestrationInstanceFailedEvent;

    hasFailuredetails(): boolean;
    clearFailuredetails(): void;
    getFailuredetails(): TaskFailureDetails | undefined;
    setFailuredetails(value?: TaskFailureDetails): SubOrchestrationInstanceFailedEvent;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SubOrchestrationInstanceFailedEvent.AsObject;
    static toObject(includeInstance: boolean, msg: SubOrchestrationInstanceFailedEvent): SubOrchestrationInstanceFailedEvent.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SubOrchestrationInstanceFailedEvent, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SubOrchestrationInstanceFailedEvent;
    static deserializeBinaryFromReader(message: SubOrchestrationInstanceFailedEvent, reader: jspb.BinaryReader): SubOrchestrationInstanceFailedEvent;
}

export namespace SubOrchestrationInstanceFailedEvent {
    export type AsObject = {
        taskscheduledid: number,
        failuredetails?: TaskFailureDetails.AsObject,
    }
}

export class TimerCreatedEvent extends jspb.Message { 

    hasFireat(): boolean;
    clearFireat(): void;
    getFireat(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setFireat(value?: google_protobuf_timestamp_pb.Timestamp): TimerCreatedEvent;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): TimerCreatedEvent.AsObject;
    static toObject(includeInstance: boolean, msg: TimerCreatedEvent): TimerCreatedEvent.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: TimerCreatedEvent, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): TimerCreatedEvent;
    static deserializeBinaryFromReader(message: TimerCreatedEvent, reader: jspb.BinaryReader): TimerCreatedEvent;
}

export namespace TimerCreatedEvent {
    export type AsObject = {
        fireat?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    }
}

export class TimerFiredEvent extends jspb.Message { 

    hasFireat(): boolean;
    clearFireat(): void;
    getFireat(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setFireat(value?: google_protobuf_timestamp_pb.Timestamp): TimerFiredEvent;
    getTimerid(): number;
    setTimerid(value: number): TimerFiredEvent;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): TimerFiredEvent.AsObject;
    static toObject(includeInstance: boolean, msg: TimerFiredEvent): TimerFiredEvent.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: TimerFiredEvent, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): TimerFiredEvent;
    static deserializeBinaryFromReader(message: TimerFiredEvent, reader: jspb.BinaryReader): TimerFiredEvent;
}

export namespace TimerFiredEvent {
    export type AsObject = {
        fireat?: google_protobuf_timestamp_pb.Timestamp.AsObject,
        timerid: number,
    }
}

export class OrchestratorStartedEvent extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): OrchestratorStartedEvent.AsObject;
    static toObject(includeInstance: boolean, msg: OrchestratorStartedEvent): OrchestratorStartedEvent.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: OrchestratorStartedEvent, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): OrchestratorStartedEvent;
    static deserializeBinaryFromReader(message: OrchestratorStartedEvent, reader: jspb.BinaryReader): OrchestratorStartedEvent;
}

export namespace OrchestratorStartedEvent {
    export type AsObject = {
    }
}

export class OrchestratorCompletedEvent extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): OrchestratorCompletedEvent.AsObject;
    static toObject(includeInstance: boolean, msg: OrchestratorCompletedEvent): OrchestratorCompletedEvent.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: OrchestratorCompletedEvent, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): OrchestratorCompletedEvent;
    static deserializeBinaryFromReader(message: OrchestratorCompletedEvent, reader: jspb.BinaryReader): OrchestratorCompletedEvent;
}

export namespace OrchestratorCompletedEvent {
    export type AsObject = {
    }
}

export class EventSentEvent extends jspb.Message { 
    getInstanceid(): string;
    setInstanceid(value: string): EventSentEvent;
    getName(): string;
    setName(value: string): EventSentEvent;

    hasInput(): boolean;
    clearInput(): void;
    getInput(): google_protobuf_wrappers_pb.StringValue | undefined;
    setInput(value?: google_protobuf_wrappers_pb.StringValue): EventSentEvent;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EventSentEvent.AsObject;
    static toObject(includeInstance: boolean, msg: EventSentEvent): EventSentEvent.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EventSentEvent, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EventSentEvent;
    static deserializeBinaryFromReader(message: EventSentEvent, reader: jspb.BinaryReader): EventSentEvent;
}

export namespace EventSentEvent {
    export type AsObject = {
        instanceid: string,
        name: string,
        input?: google_protobuf_wrappers_pb.StringValue.AsObject,
    }
}

export class EventRaisedEvent extends jspb.Message { 
    getName(): string;
    setName(value: string): EventRaisedEvent;

    hasInput(): boolean;
    clearInput(): void;
    getInput(): google_protobuf_wrappers_pb.StringValue | undefined;
    setInput(value?: google_protobuf_wrappers_pb.StringValue): EventRaisedEvent;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EventRaisedEvent.AsObject;
    static toObject(includeInstance: boolean, msg: EventRaisedEvent): EventRaisedEvent.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EventRaisedEvent, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EventRaisedEvent;
    static deserializeBinaryFromReader(message: EventRaisedEvent, reader: jspb.BinaryReader): EventRaisedEvent;
}

export namespace EventRaisedEvent {
    export type AsObject = {
        name: string,
        input?: google_protobuf_wrappers_pb.StringValue.AsObject,
    }
}

export class GenericEvent extends jspb.Message { 

    hasData(): boolean;
    clearData(): void;
    getData(): google_protobuf_wrappers_pb.StringValue | undefined;
    setData(value?: google_protobuf_wrappers_pb.StringValue): GenericEvent;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GenericEvent.AsObject;
    static toObject(includeInstance: boolean, msg: GenericEvent): GenericEvent.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GenericEvent, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GenericEvent;
    static deserializeBinaryFromReader(message: GenericEvent, reader: jspb.BinaryReader): GenericEvent;
}

export namespace GenericEvent {
    export type AsObject = {
        data?: google_protobuf_wrappers_pb.StringValue.AsObject,
    }
}

export class HistoryStateEvent extends jspb.Message { 

    hasOrchestrationstate(): boolean;
    clearOrchestrationstate(): void;
    getOrchestrationstate(): OrchestrationState | undefined;
    setOrchestrationstate(value?: OrchestrationState): HistoryStateEvent;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): HistoryStateEvent.AsObject;
    static toObject(includeInstance: boolean, msg: HistoryStateEvent): HistoryStateEvent.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: HistoryStateEvent, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): HistoryStateEvent;
    static deserializeBinaryFromReader(message: HistoryStateEvent, reader: jspb.BinaryReader): HistoryStateEvent;
}

export namespace HistoryStateEvent {
    export type AsObject = {
        orchestrationstate?: OrchestrationState.AsObject,
    }
}

export class ContinueAsNewEvent extends jspb.Message { 

    hasInput(): boolean;
    clearInput(): void;
    getInput(): google_protobuf_wrappers_pb.StringValue | undefined;
    setInput(value?: google_protobuf_wrappers_pb.StringValue): ContinueAsNewEvent;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ContinueAsNewEvent.AsObject;
    static toObject(includeInstance: boolean, msg: ContinueAsNewEvent): ContinueAsNewEvent.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ContinueAsNewEvent, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ContinueAsNewEvent;
    static deserializeBinaryFromReader(message: ContinueAsNewEvent, reader: jspb.BinaryReader): ContinueAsNewEvent;
}

export namespace ContinueAsNewEvent {
    export type AsObject = {
        input?: google_protobuf_wrappers_pb.StringValue.AsObject,
    }
}

export class ExecutionSuspendedEvent extends jspb.Message { 

    hasInput(): boolean;
    clearInput(): void;
    getInput(): google_protobuf_wrappers_pb.StringValue | undefined;
    setInput(value?: google_protobuf_wrappers_pb.StringValue): ExecutionSuspendedEvent;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ExecutionSuspendedEvent.AsObject;
    static toObject(includeInstance: boolean, msg: ExecutionSuspendedEvent): ExecutionSuspendedEvent.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ExecutionSuspendedEvent, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ExecutionSuspendedEvent;
    static deserializeBinaryFromReader(message: ExecutionSuspendedEvent, reader: jspb.BinaryReader): ExecutionSuspendedEvent;
}

export namespace ExecutionSuspendedEvent {
    export type AsObject = {
        input?: google_protobuf_wrappers_pb.StringValue.AsObject,
    }
}

export class ExecutionResumedEvent extends jspb.Message { 

    hasInput(): boolean;
    clearInput(): void;
    getInput(): google_protobuf_wrappers_pb.StringValue | undefined;
    setInput(value?: google_protobuf_wrappers_pb.StringValue): ExecutionResumedEvent;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ExecutionResumedEvent.AsObject;
    static toObject(includeInstance: boolean, msg: ExecutionResumedEvent): ExecutionResumedEvent.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ExecutionResumedEvent, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ExecutionResumedEvent;
    static deserializeBinaryFromReader(message: ExecutionResumedEvent, reader: jspb.BinaryReader): ExecutionResumedEvent;
}

export namespace ExecutionResumedEvent {
    export type AsObject = {
        input?: google_protobuf_wrappers_pb.StringValue.AsObject,
    }
}

export class EntityOperationSignaledEvent extends jspb.Message { 
    getRequestid(): string;
    setRequestid(value: string): EntityOperationSignaledEvent;
    getOperation(): string;
    setOperation(value: string): EntityOperationSignaledEvent;

    hasScheduledtime(): boolean;
    clearScheduledtime(): void;
    getScheduledtime(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setScheduledtime(value?: google_protobuf_timestamp_pb.Timestamp): EntityOperationSignaledEvent;

    hasInput(): boolean;
    clearInput(): void;
    getInput(): google_protobuf_wrappers_pb.StringValue | undefined;
    setInput(value?: google_protobuf_wrappers_pb.StringValue): EntityOperationSignaledEvent;

    hasTargetinstanceid(): boolean;
    clearTargetinstanceid(): void;
    getTargetinstanceid(): google_protobuf_wrappers_pb.StringValue | undefined;
    setTargetinstanceid(value?: google_protobuf_wrappers_pb.StringValue): EntityOperationSignaledEvent;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EntityOperationSignaledEvent.AsObject;
    static toObject(includeInstance: boolean, msg: EntityOperationSignaledEvent): EntityOperationSignaledEvent.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EntityOperationSignaledEvent, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EntityOperationSignaledEvent;
    static deserializeBinaryFromReader(message: EntityOperationSignaledEvent, reader: jspb.BinaryReader): EntityOperationSignaledEvent;
}

export namespace EntityOperationSignaledEvent {
    export type AsObject = {
        requestid: string,
        operation: string,
        scheduledtime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
        input?: google_protobuf_wrappers_pb.StringValue.AsObject,
        targetinstanceid?: google_protobuf_wrappers_pb.StringValue.AsObject,
    }
}

export class EntityOperationCalledEvent extends jspb.Message { 
    getRequestid(): string;
    setRequestid(value: string): EntityOperationCalledEvent;
    getOperation(): string;
    setOperation(value: string): EntityOperationCalledEvent;

    hasScheduledtime(): boolean;
    clearScheduledtime(): void;
    getScheduledtime(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setScheduledtime(value?: google_protobuf_timestamp_pb.Timestamp): EntityOperationCalledEvent;

    hasInput(): boolean;
    clearInput(): void;
    getInput(): google_protobuf_wrappers_pb.StringValue | undefined;
    setInput(value?: google_protobuf_wrappers_pb.StringValue): EntityOperationCalledEvent;

    hasParentinstanceid(): boolean;
    clearParentinstanceid(): void;
    getParentinstanceid(): google_protobuf_wrappers_pb.StringValue | undefined;
    setParentinstanceid(value?: google_protobuf_wrappers_pb.StringValue): EntityOperationCalledEvent;

    hasParentexecutionid(): boolean;
    clearParentexecutionid(): void;
    getParentexecutionid(): google_protobuf_wrappers_pb.StringValue | undefined;
    setParentexecutionid(value?: google_protobuf_wrappers_pb.StringValue): EntityOperationCalledEvent;

    hasTargetinstanceid(): boolean;
    clearTargetinstanceid(): void;
    getTargetinstanceid(): google_protobuf_wrappers_pb.StringValue | undefined;
    setTargetinstanceid(value?: google_protobuf_wrappers_pb.StringValue): EntityOperationCalledEvent;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EntityOperationCalledEvent.AsObject;
    static toObject(includeInstance: boolean, msg: EntityOperationCalledEvent): EntityOperationCalledEvent.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EntityOperationCalledEvent, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EntityOperationCalledEvent;
    static deserializeBinaryFromReader(message: EntityOperationCalledEvent, reader: jspb.BinaryReader): EntityOperationCalledEvent;
}

export namespace EntityOperationCalledEvent {
    export type AsObject = {
        requestid: string,
        operation: string,
        scheduledtime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
        input?: google_protobuf_wrappers_pb.StringValue.AsObject,
        parentinstanceid?: google_protobuf_wrappers_pb.StringValue.AsObject,
        parentexecutionid?: google_protobuf_wrappers_pb.StringValue.AsObject,
        targetinstanceid?: google_protobuf_wrappers_pb.StringValue.AsObject,
    }
}

export class EntityLockRequestedEvent extends jspb.Message { 
    getCriticalsectionid(): string;
    setCriticalsectionid(value: string): EntityLockRequestedEvent;
    clearLocksetList(): void;
    getLocksetList(): Array<string>;
    setLocksetList(value: Array<string>): EntityLockRequestedEvent;
    addLockset(value: string, index?: number): string;
    getPosition(): number;
    setPosition(value: number): EntityLockRequestedEvent;

    hasParentinstanceid(): boolean;
    clearParentinstanceid(): void;
    getParentinstanceid(): google_protobuf_wrappers_pb.StringValue | undefined;
    setParentinstanceid(value?: google_protobuf_wrappers_pb.StringValue): EntityLockRequestedEvent;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EntityLockRequestedEvent.AsObject;
    static toObject(includeInstance: boolean, msg: EntityLockRequestedEvent): EntityLockRequestedEvent.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EntityLockRequestedEvent, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EntityLockRequestedEvent;
    static deserializeBinaryFromReader(message: EntityLockRequestedEvent, reader: jspb.BinaryReader): EntityLockRequestedEvent;
}

export namespace EntityLockRequestedEvent {
    export type AsObject = {
        criticalsectionid: string,
        locksetList: Array<string>,
        position: number,
        parentinstanceid?: google_protobuf_wrappers_pb.StringValue.AsObject,
    }
}

export class EntityOperationCompletedEvent extends jspb.Message { 
    getRequestid(): string;
    setRequestid(value: string): EntityOperationCompletedEvent;

    hasOutput(): boolean;
    clearOutput(): void;
    getOutput(): google_protobuf_wrappers_pb.StringValue | undefined;
    setOutput(value?: google_protobuf_wrappers_pb.StringValue): EntityOperationCompletedEvent;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EntityOperationCompletedEvent.AsObject;
    static toObject(includeInstance: boolean, msg: EntityOperationCompletedEvent): EntityOperationCompletedEvent.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EntityOperationCompletedEvent, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EntityOperationCompletedEvent;
    static deserializeBinaryFromReader(message: EntityOperationCompletedEvent, reader: jspb.BinaryReader): EntityOperationCompletedEvent;
}

export namespace EntityOperationCompletedEvent {
    export type AsObject = {
        requestid: string,
        output?: google_protobuf_wrappers_pb.StringValue.AsObject,
    }
}

export class EntityOperationFailedEvent extends jspb.Message { 
    getRequestid(): string;
    setRequestid(value: string): EntityOperationFailedEvent;

    hasFailuredetails(): boolean;
    clearFailuredetails(): void;
    getFailuredetails(): TaskFailureDetails | undefined;
    setFailuredetails(value?: TaskFailureDetails): EntityOperationFailedEvent;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EntityOperationFailedEvent.AsObject;
    static toObject(includeInstance: boolean, msg: EntityOperationFailedEvent): EntityOperationFailedEvent.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EntityOperationFailedEvent, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EntityOperationFailedEvent;
    static deserializeBinaryFromReader(message: EntityOperationFailedEvent, reader: jspb.BinaryReader): EntityOperationFailedEvent;
}

export namespace EntityOperationFailedEvent {
    export type AsObject = {
        requestid: string,
        failuredetails?: TaskFailureDetails.AsObject,
    }
}

export class EntityUnlockSentEvent extends jspb.Message { 
    getCriticalsectionid(): string;
    setCriticalsectionid(value: string): EntityUnlockSentEvent;

    hasParentinstanceid(): boolean;
    clearParentinstanceid(): void;
    getParentinstanceid(): google_protobuf_wrappers_pb.StringValue | undefined;
    setParentinstanceid(value?: google_protobuf_wrappers_pb.StringValue): EntityUnlockSentEvent;

    hasTargetinstanceid(): boolean;
    clearTargetinstanceid(): void;
    getTargetinstanceid(): google_protobuf_wrappers_pb.StringValue | undefined;
    setTargetinstanceid(value?: google_protobuf_wrappers_pb.StringValue): EntityUnlockSentEvent;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EntityUnlockSentEvent.AsObject;
    static toObject(includeInstance: boolean, msg: EntityUnlockSentEvent): EntityUnlockSentEvent.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EntityUnlockSentEvent, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EntityUnlockSentEvent;
    static deserializeBinaryFromReader(message: EntityUnlockSentEvent, reader: jspb.BinaryReader): EntityUnlockSentEvent;
}

export namespace EntityUnlockSentEvent {
    export type AsObject = {
        criticalsectionid: string,
        parentinstanceid?: google_protobuf_wrappers_pb.StringValue.AsObject,
        targetinstanceid?: google_protobuf_wrappers_pb.StringValue.AsObject,
    }
}

export class EntityLockGrantedEvent extends jspb.Message { 
    getCriticalsectionid(): string;
    setCriticalsectionid(value: string): EntityLockGrantedEvent;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EntityLockGrantedEvent.AsObject;
    static toObject(includeInstance: boolean, msg: EntityLockGrantedEvent): EntityLockGrantedEvent.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EntityLockGrantedEvent, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EntityLockGrantedEvent;
    static deserializeBinaryFromReader(message: EntityLockGrantedEvent, reader: jspb.BinaryReader): EntityLockGrantedEvent;
}

export namespace EntityLockGrantedEvent {
    export type AsObject = {
        criticalsectionid: string,
    }
}

export class ExecutionRewoundEvent extends jspb.Message { 

    hasReason(): boolean;
    clearReason(): void;
    getReason(): google_protobuf_wrappers_pb.StringValue | undefined;
    setReason(value?: google_protobuf_wrappers_pb.StringValue): ExecutionRewoundEvent;

    hasParentexecutionid(): boolean;
    clearParentexecutionid(): void;
    getParentexecutionid(): google_protobuf_wrappers_pb.StringValue | undefined;
    setParentexecutionid(value?: google_protobuf_wrappers_pb.StringValue): ExecutionRewoundEvent;

    hasInstanceid(): boolean;
    clearInstanceid(): void;
    getInstanceid(): google_protobuf_wrappers_pb.StringValue | undefined;
    setInstanceid(value?: google_protobuf_wrappers_pb.StringValue): ExecutionRewoundEvent;

    hasParenttracecontext(): boolean;
    clearParenttracecontext(): void;
    getParenttracecontext(): TraceContext | undefined;
    setParenttracecontext(value?: TraceContext): ExecutionRewoundEvent;

    hasName(): boolean;
    clearName(): void;
    getName(): google_protobuf_wrappers_pb.StringValue | undefined;
    setName(value?: google_protobuf_wrappers_pb.StringValue): ExecutionRewoundEvent;

    hasVersion(): boolean;
    clearVersion(): void;
    getVersion(): google_protobuf_wrappers_pb.StringValue | undefined;
    setVersion(value?: google_protobuf_wrappers_pb.StringValue): ExecutionRewoundEvent;

    hasInput(): boolean;
    clearInput(): void;
    getInput(): google_protobuf_wrappers_pb.StringValue | undefined;
    setInput(value?: google_protobuf_wrappers_pb.StringValue): ExecutionRewoundEvent;

    hasParentinstance(): boolean;
    clearParentinstance(): void;
    getParentinstance(): ParentInstanceInfo | undefined;
    setParentinstance(value?: ParentInstanceInfo): ExecutionRewoundEvent;

    getTagsMap(): jspb.Map<string, string>;
    clearTagsMap(): void;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ExecutionRewoundEvent.AsObject;
    static toObject(includeInstance: boolean, msg: ExecutionRewoundEvent): ExecutionRewoundEvent.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ExecutionRewoundEvent, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ExecutionRewoundEvent;
    static deserializeBinaryFromReader(message: ExecutionRewoundEvent, reader: jspb.BinaryReader): ExecutionRewoundEvent;
}

export namespace ExecutionRewoundEvent {
    export type AsObject = {
        reason?: google_protobuf_wrappers_pb.StringValue.AsObject,
        parentexecutionid?: google_protobuf_wrappers_pb.StringValue.AsObject,
        instanceid?: google_protobuf_wrappers_pb.StringValue.AsObject,
        parenttracecontext?: TraceContext.AsObject,
        name?: google_protobuf_wrappers_pb.StringValue.AsObject,
        version?: google_protobuf_wrappers_pb.StringValue.AsObject,
        input?: google_protobuf_wrappers_pb.StringValue.AsObject,
        parentinstance?: ParentInstanceInfo.AsObject,

        tagsMap: Array<[string, string]>,
    }
}

export class HistoryEvent extends jspb.Message { 
    getEventid(): number;
    setEventid(value: number): HistoryEvent;

    hasTimestamp(): boolean;
    clearTimestamp(): void;
    getTimestamp(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setTimestamp(value?: google_protobuf_timestamp_pb.Timestamp): HistoryEvent;

    hasExecutionstarted(): boolean;
    clearExecutionstarted(): void;
    getExecutionstarted(): ExecutionStartedEvent | undefined;
    setExecutionstarted(value?: ExecutionStartedEvent): HistoryEvent;

    hasExecutioncompleted(): boolean;
    clearExecutioncompleted(): void;
    getExecutioncompleted(): ExecutionCompletedEvent | undefined;
    setExecutioncompleted(value?: ExecutionCompletedEvent): HistoryEvent;

    hasExecutionterminated(): boolean;
    clearExecutionterminated(): void;
    getExecutionterminated(): ExecutionTerminatedEvent | undefined;
    setExecutionterminated(value?: ExecutionTerminatedEvent): HistoryEvent;

    hasTaskscheduled(): boolean;
    clearTaskscheduled(): void;
    getTaskscheduled(): TaskScheduledEvent | undefined;
    setTaskscheduled(value?: TaskScheduledEvent): HistoryEvent;

    hasTaskcompleted(): boolean;
    clearTaskcompleted(): void;
    getTaskcompleted(): TaskCompletedEvent | undefined;
    setTaskcompleted(value?: TaskCompletedEvent): HistoryEvent;

    hasTaskfailed(): boolean;
    clearTaskfailed(): void;
    getTaskfailed(): TaskFailedEvent | undefined;
    setTaskfailed(value?: TaskFailedEvent): HistoryEvent;

    hasSuborchestrationinstancecreated(): boolean;
    clearSuborchestrationinstancecreated(): void;
    getSuborchestrationinstancecreated(): SubOrchestrationInstanceCreatedEvent | undefined;
    setSuborchestrationinstancecreated(value?: SubOrchestrationInstanceCreatedEvent): HistoryEvent;

    hasSuborchestrationinstancecompleted(): boolean;
    clearSuborchestrationinstancecompleted(): void;
    getSuborchestrationinstancecompleted(): SubOrchestrationInstanceCompletedEvent | undefined;
    setSuborchestrationinstancecompleted(value?: SubOrchestrationInstanceCompletedEvent): HistoryEvent;

    hasSuborchestrationinstancefailed(): boolean;
    clearSuborchestrationinstancefailed(): void;
    getSuborchestrationinstancefailed(): SubOrchestrationInstanceFailedEvent | undefined;
    setSuborchestrationinstancefailed(value?: SubOrchestrationInstanceFailedEvent): HistoryEvent;

    hasTimercreated(): boolean;
    clearTimercreated(): void;
    getTimercreated(): TimerCreatedEvent | undefined;
    setTimercreated(value?: TimerCreatedEvent): HistoryEvent;

    hasTimerfired(): boolean;
    clearTimerfired(): void;
    getTimerfired(): TimerFiredEvent | undefined;
    setTimerfired(value?: TimerFiredEvent): HistoryEvent;

    hasOrchestratorstarted(): boolean;
    clearOrchestratorstarted(): void;
    getOrchestratorstarted(): OrchestratorStartedEvent | undefined;
    setOrchestratorstarted(value?: OrchestratorStartedEvent): HistoryEvent;

    hasOrchestratorcompleted(): boolean;
    clearOrchestratorcompleted(): void;
    getOrchestratorcompleted(): OrchestratorCompletedEvent | undefined;
    setOrchestratorcompleted(value?: OrchestratorCompletedEvent): HistoryEvent;

    hasEventsent(): boolean;
    clearEventsent(): void;
    getEventsent(): EventSentEvent | undefined;
    setEventsent(value?: EventSentEvent): HistoryEvent;

    hasEventraised(): boolean;
    clearEventraised(): void;
    getEventraised(): EventRaisedEvent | undefined;
    setEventraised(value?: EventRaisedEvent): HistoryEvent;

    hasGenericevent(): boolean;
    clearGenericevent(): void;
    getGenericevent(): GenericEvent | undefined;
    setGenericevent(value?: GenericEvent): HistoryEvent;

    hasHistorystate(): boolean;
    clearHistorystate(): void;
    getHistorystate(): HistoryStateEvent | undefined;
    setHistorystate(value?: HistoryStateEvent): HistoryEvent;

    hasContinueasnew(): boolean;
    clearContinueasnew(): void;
    getContinueasnew(): ContinueAsNewEvent | undefined;
    setContinueasnew(value?: ContinueAsNewEvent): HistoryEvent;

    hasExecutionsuspended(): boolean;
    clearExecutionsuspended(): void;
    getExecutionsuspended(): ExecutionSuspendedEvent | undefined;
    setExecutionsuspended(value?: ExecutionSuspendedEvent): HistoryEvent;

    hasExecutionresumed(): boolean;
    clearExecutionresumed(): void;
    getExecutionresumed(): ExecutionResumedEvent | undefined;
    setExecutionresumed(value?: ExecutionResumedEvent): HistoryEvent;

    hasEntityoperationsignaled(): boolean;
    clearEntityoperationsignaled(): void;
    getEntityoperationsignaled(): EntityOperationSignaledEvent | undefined;
    setEntityoperationsignaled(value?: EntityOperationSignaledEvent): HistoryEvent;

    hasEntityoperationcalled(): boolean;
    clearEntityoperationcalled(): void;
    getEntityoperationcalled(): EntityOperationCalledEvent | undefined;
    setEntityoperationcalled(value?: EntityOperationCalledEvent): HistoryEvent;

    hasEntityoperationcompleted(): boolean;
    clearEntityoperationcompleted(): void;
    getEntityoperationcompleted(): EntityOperationCompletedEvent | undefined;
    setEntityoperationcompleted(value?: EntityOperationCompletedEvent): HistoryEvent;

    hasEntityoperationfailed(): boolean;
    clearEntityoperationfailed(): void;
    getEntityoperationfailed(): EntityOperationFailedEvent | undefined;
    setEntityoperationfailed(value?: EntityOperationFailedEvent): HistoryEvent;

    hasEntitylockrequested(): boolean;
    clearEntitylockrequested(): void;
    getEntitylockrequested(): EntityLockRequestedEvent | undefined;
    setEntitylockrequested(value?: EntityLockRequestedEvent): HistoryEvent;

    hasEntitylockgranted(): boolean;
    clearEntitylockgranted(): void;
    getEntitylockgranted(): EntityLockGrantedEvent | undefined;
    setEntitylockgranted(value?: EntityLockGrantedEvent): HistoryEvent;

    hasEntityunlocksent(): boolean;
    clearEntityunlocksent(): void;
    getEntityunlocksent(): EntityUnlockSentEvent | undefined;
    setEntityunlocksent(value?: EntityUnlockSentEvent): HistoryEvent;

    hasExecutionrewound(): boolean;
    clearExecutionrewound(): void;
    getExecutionrewound(): ExecutionRewoundEvent | undefined;
    setExecutionrewound(value?: ExecutionRewoundEvent): HistoryEvent;

    getEventtypeCase(): HistoryEvent.EventtypeCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): HistoryEvent.AsObject;
    static toObject(includeInstance: boolean, msg: HistoryEvent): HistoryEvent.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: HistoryEvent, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): HistoryEvent;
    static deserializeBinaryFromReader(message: HistoryEvent, reader: jspb.BinaryReader): HistoryEvent;
}

export namespace HistoryEvent {
    export type AsObject = {
        eventid: number,
        timestamp?: google_protobuf_timestamp_pb.Timestamp.AsObject,
        executionstarted?: ExecutionStartedEvent.AsObject,
        executioncompleted?: ExecutionCompletedEvent.AsObject,
        executionterminated?: ExecutionTerminatedEvent.AsObject,
        taskscheduled?: TaskScheduledEvent.AsObject,
        taskcompleted?: TaskCompletedEvent.AsObject,
        taskfailed?: TaskFailedEvent.AsObject,
        suborchestrationinstancecreated?: SubOrchestrationInstanceCreatedEvent.AsObject,
        suborchestrationinstancecompleted?: SubOrchestrationInstanceCompletedEvent.AsObject,
        suborchestrationinstancefailed?: SubOrchestrationInstanceFailedEvent.AsObject,
        timercreated?: TimerCreatedEvent.AsObject,
        timerfired?: TimerFiredEvent.AsObject,
        orchestratorstarted?: OrchestratorStartedEvent.AsObject,
        orchestratorcompleted?: OrchestratorCompletedEvent.AsObject,
        eventsent?: EventSentEvent.AsObject,
        eventraised?: EventRaisedEvent.AsObject,
        genericevent?: GenericEvent.AsObject,
        historystate?: HistoryStateEvent.AsObject,
        continueasnew?: ContinueAsNewEvent.AsObject,
        executionsuspended?: ExecutionSuspendedEvent.AsObject,
        executionresumed?: ExecutionResumedEvent.AsObject,
        entityoperationsignaled?: EntityOperationSignaledEvent.AsObject,
        entityoperationcalled?: EntityOperationCalledEvent.AsObject,
        entityoperationcompleted?: EntityOperationCompletedEvent.AsObject,
        entityoperationfailed?: EntityOperationFailedEvent.AsObject,
        entitylockrequested?: EntityLockRequestedEvent.AsObject,
        entitylockgranted?: EntityLockGrantedEvent.AsObject,
        entityunlocksent?: EntityUnlockSentEvent.AsObject,
        executionrewound?: ExecutionRewoundEvent.AsObject,
    }

    export enum EventtypeCase {
        EVENTTYPE_NOT_SET = 0,
        EXECUTIONSTARTED = 3,
        EXECUTIONCOMPLETED = 4,
        EXECUTIONTERMINATED = 5,
        TASKSCHEDULED = 6,
        TASKCOMPLETED = 7,
        TASKFAILED = 8,
        SUBORCHESTRATIONINSTANCECREATED = 9,
        SUBORCHESTRATIONINSTANCECOMPLETED = 10,
        SUBORCHESTRATIONINSTANCEFAILED = 11,
        TIMERCREATED = 12,
        TIMERFIRED = 13,
        ORCHESTRATORSTARTED = 14,
        ORCHESTRATORCOMPLETED = 15,
        EVENTSENT = 16,
        EVENTRAISED = 17,
        GENERICEVENT = 18,
        HISTORYSTATE = 19,
        CONTINUEASNEW = 20,
        EXECUTIONSUSPENDED = 21,
        EXECUTIONRESUMED = 22,
        ENTITYOPERATIONSIGNALED = 23,
        ENTITYOPERATIONCALLED = 24,
        ENTITYOPERATIONCOMPLETED = 25,
        ENTITYOPERATIONFAILED = 26,
        ENTITYLOCKREQUESTED = 27,
        ENTITYLOCKGRANTED = 28,
        ENTITYUNLOCKSENT = 29,
        EXECUTIONREWOUND = 30,
    }

}

export class ScheduleTaskAction extends jspb.Message { 
    getName(): string;
    setName(value: string): ScheduleTaskAction;

    hasVersion(): boolean;
    clearVersion(): void;
    getVersion(): google_protobuf_wrappers_pb.StringValue | undefined;
    setVersion(value?: google_protobuf_wrappers_pb.StringValue): ScheduleTaskAction;

    hasInput(): boolean;
    clearInput(): void;
    getInput(): google_protobuf_wrappers_pb.StringValue | undefined;
    setInput(value?: google_protobuf_wrappers_pb.StringValue): ScheduleTaskAction;

    getTagsMap(): jspb.Map<string, string>;
    clearTagsMap(): void;

    hasParenttracecontext(): boolean;
    clearParenttracecontext(): void;
    getParenttracecontext(): TraceContext | undefined;
    setParenttracecontext(value?: TraceContext): ScheduleTaskAction;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ScheduleTaskAction.AsObject;
    static toObject(includeInstance: boolean, msg: ScheduleTaskAction): ScheduleTaskAction.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ScheduleTaskAction, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ScheduleTaskAction;
    static deserializeBinaryFromReader(message: ScheduleTaskAction, reader: jspb.BinaryReader): ScheduleTaskAction;
}

export namespace ScheduleTaskAction {
    export type AsObject = {
        name: string,
        version?: google_protobuf_wrappers_pb.StringValue.AsObject,
        input?: google_protobuf_wrappers_pb.StringValue.AsObject,

        tagsMap: Array<[string, string]>,
        parenttracecontext?: TraceContext.AsObject,
    }
}

export class CreateSubOrchestrationAction extends jspb.Message { 
    getInstanceid(): string;
    setInstanceid(value: string): CreateSubOrchestrationAction;
    getName(): string;
    setName(value: string): CreateSubOrchestrationAction;

    hasVersion(): boolean;
    clearVersion(): void;
    getVersion(): google_protobuf_wrappers_pb.StringValue | undefined;
    setVersion(value?: google_protobuf_wrappers_pb.StringValue): CreateSubOrchestrationAction;

    hasInput(): boolean;
    clearInput(): void;
    getInput(): google_protobuf_wrappers_pb.StringValue | undefined;
    setInput(value?: google_protobuf_wrappers_pb.StringValue): CreateSubOrchestrationAction;

    hasParenttracecontext(): boolean;
    clearParenttracecontext(): void;
    getParenttracecontext(): TraceContext | undefined;
    setParenttracecontext(value?: TraceContext): CreateSubOrchestrationAction;

    getTagsMap(): jspb.Map<string, string>;
    clearTagsMap(): void;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CreateSubOrchestrationAction.AsObject;
    static toObject(includeInstance: boolean, msg: CreateSubOrchestrationAction): CreateSubOrchestrationAction.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CreateSubOrchestrationAction, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CreateSubOrchestrationAction;
    static deserializeBinaryFromReader(message: CreateSubOrchestrationAction, reader: jspb.BinaryReader): CreateSubOrchestrationAction;
}

export namespace CreateSubOrchestrationAction {
    export type AsObject = {
        instanceid: string,
        name: string,
        version?: google_protobuf_wrappers_pb.StringValue.AsObject,
        input?: google_protobuf_wrappers_pb.StringValue.AsObject,
        parenttracecontext?: TraceContext.AsObject,

        tagsMap: Array<[string, string]>,
    }
}

export class CreateTimerAction extends jspb.Message { 

    hasFireat(): boolean;
    clearFireat(): void;
    getFireat(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setFireat(value?: google_protobuf_timestamp_pb.Timestamp): CreateTimerAction;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CreateTimerAction.AsObject;
    static toObject(includeInstance: boolean, msg: CreateTimerAction): CreateTimerAction.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CreateTimerAction, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CreateTimerAction;
    static deserializeBinaryFromReader(message: CreateTimerAction, reader: jspb.BinaryReader): CreateTimerAction;
}

export namespace CreateTimerAction {
    export type AsObject = {
        fireat?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    }
}

export class SendEventAction extends jspb.Message { 

    hasInstance(): boolean;
    clearInstance(): void;
    getInstance(): OrchestrationInstance | undefined;
    setInstance(value?: OrchestrationInstance): SendEventAction;
    getName(): string;
    setName(value: string): SendEventAction;

    hasData(): boolean;
    clearData(): void;
    getData(): google_protobuf_wrappers_pb.StringValue | undefined;
    setData(value?: google_protobuf_wrappers_pb.StringValue): SendEventAction;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SendEventAction.AsObject;
    static toObject(includeInstance: boolean, msg: SendEventAction): SendEventAction.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SendEventAction, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SendEventAction;
    static deserializeBinaryFromReader(message: SendEventAction, reader: jspb.BinaryReader): SendEventAction;
}

export namespace SendEventAction {
    export type AsObject = {
        instance?: OrchestrationInstance.AsObject,
        name: string,
        data?: google_protobuf_wrappers_pb.StringValue.AsObject,
    }
}

export class CompleteOrchestrationAction extends jspb.Message { 
    getOrchestrationstatus(): OrchestrationStatus;
    setOrchestrationstatus(value: OrchestrationStatus): CompleteOrchestrationAction;

    hasResult(): boolean;
    clearResult(): void;
    getResult(): google_protobuf_wrappers_pb.StringValue | undefined;
    setResult(value?: google_protobuf_wrappers_pb.StringValue): CompleteOrchestrationAction;

    hasDetails(): boolean;
    clearDetails(): void;
    getDetails(): google_protobuf_wrappers_pb.StringValue | undefined;
    setDetails(value?: google_protobuf_wrappers_pb.StringValue): CompleteOrchestrationAction;

    hasNewversion(): boolean;
    clearNewversion(): void;
    getNewversion(): google_protobuf_wrappers_pb.StringValue | undefined;
    setNewversion(value?: google_protobuf_wrappers_pb.StringValue): CompleteOrchestrationAction;
    clearCarryovereventsList(): void;
    getCarryovereventsList(): Array<HistoryEvent>;
    setCarryovereventsList(value: Array<HistoryEvent>): CompleteOrchestrationAction;
    addCarryoverevents(value?: HistoryEvent, index?: number): HistoryEvent;

    hasFailuredetails(): boolean;
    clearFailuredetails(): void;
    getFailuredetails(): TaskFailureDetails | undefined;
    setFailuredetails(value?: TaskFailureDetails): CompleteOrchestrationAction;

    getTagsMap(): jspb.Map<string, string>;
    clearTagsMap(): void;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CompleteOrchestrationAction.AsObject;
    static toObject(includeInstance: boolean, msg: CompleteOrchestrationAction): CompleteOrchestrationAction.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CompleteOrchestrationAction, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CompleteOrchestrationAction;
    static deserializeBinaryFromReader(message: CompleteOrchestrationAction, reader: jspb.BinaryReader): CompleteOrchestrationAction;
}

export namespace CompleteOrchestrationAction {
    export type AsObject = {
        orchestrationstatus: OrchestrationStatus,
        result?: google_protobuf_wrappers_pb.StringValue.AsObject,
        details?: google_protobuf_wrappers_pb.StringValue.AsObject,
        newversion?: google_protobuf_wrappers_pb.StringValue.AsObject,
        carryovereventsList: Array<HistoryEvent.AsObject>,
        failuredetails?: TaskFailureDetails.AsObject,

        tagsMap: Array<[string, string]>,
    }
}

export class TerminateOrchestrationAction extends jspb.Message { 
    getInstanceid(): string;
    setInstanceid(value: string): TerminateOrchestrationAction;

    hasReason(): boolean;
    clearReason(): void;
    getReason(): google_protobuf_wrappers_pb.StringValue | undefined;
    setReason(value?: google_protobuf_wrappers_pb.StringValue): TerminateOrchestrationAction;
    getRecurse(): boolean;
    setRecurse(value: boolean): TerminateOrchestrationAction;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): TerminateOrchestrationAction.AsObject;
    static toObject(includeInstance: boolean, msg: TerminateOrchestrationAction): TerminateOrchestrationAction.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: TerminateOrchestrationAction, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): TerminateOrchestrationAction;
    static deserializeBinaryFromReader(message: TerminateOrchestrationAction, reader: jspb.BinaryReader): TerminateOrchestrationAction;
}

export namespace TerminateOrchestrationAction {
    export type AsObject = {
        instanceid: string,
        reason?: google_protobuf_wrappers_pb.StringValue.AsObject,
        recurse: boolean,
    }
}

export class SendEntityMessageAction extends jspb.Message { 

    hasEntityoperationsignaled(): boolean;
    clearEntityoperationsignaled(): void;
    getEntityoperationsignaled(): EntityOperationSignaledEvent | undefined;
    setEntityoperationsignaled(value?: EntityOperationSignaledEvent): SendEntityMessageAction;

    hasEntityoperationcalled(): boolean;
    clearEntityoperationcalled(): void;
    getEntityoperationcalled(): EntityOperationCalledEvent | undefined;
    setEntityoperationcalled(value?: EntityOperationCalledEvent): SendEntityMessageAction;

    hasEntitylockrequested(): boolean;
    clearEntitylockrequested(): void;
    getEntitylockrequested(): EntityLockRequestedEvent | undefined;
    setEntitylockrequested(value?: EntityLockRequestedEvent): SendEntityMessageAction;

    hasEntityunlocksent(): boolean;
    clearEntityunlocksent(): void;
    getEntityunlocksent(): EntityUnlockSentEvent | undefined;
    setEntityunlocksent(value?: EntityUnlockSentEvent): SendEntityMessageAction;

    getEntitymessagetypeCase(): SendEntityMessageAction.EntitymessagetypeCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SendEntityMessageAction.AsObject;
    static toObject(includeInstance: boolean, msg: SendEntityMessageAction): SendEntityMessageAction.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SendEntityMessageAction, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SendEntityMessageAction;
    static deserializeBinaryFromReader(message: SendEntityMessageAction, reader: jspb.BinaryReader): SendEntityMessageAction;
}

export namespace SendEntityMessageAction {
    export type AsObject = {
        entityoperationsignaled?: EntityOperationSignaledEvent.AsObject,
        entityoperationcalled?: EntityOperationCalledEvent.AsObject,
        entitylockrequested?: EntityLockRequestedEvent.AsObject,
        entityunlocksent?: EntityUnlockSentEvent.AsObject,
    }

    export enum EntitymessagetypeCase {
        ENTITYMESSAGETYPE_NOT_SET = 0,
        ENTITYOPERATIONSIGNALED = 1,
        ENTITYOPERATIONCALLED = 2,
        ENTITYLOCKREQUESTED = 3,
        ENTITYUNLOCKSENT = 4,
    }

}

export class OrchestratorAction extends jspb.Message { 
    getId(): number;
    setId(value: number): OrchestratorAction;

    hasScheduletask(): boolean;
    clearScheduletask(): void;
    getScheduletask(): ScheduleTaskAction | undefined;
    setScheduletask(value?: ScheduleTaskAction): OrchestratorAction;

    hasCreatesuborchestration(): boolean;
    clearCreatesuborchestration(): void;
    getCreatesuborchestration(): CreateSubOrchestrationAction | undefined;
    setCreatesuborchestration(value?: CreateSubOrchestrationAction): OrchestratorAction;

    hasCreatetimer(): boolean;
    clearCreatetimer(): void;
    getCreatetimer(): CreateTimerAction | undefined;
    setCreatetimer(value?: CreateTimerAction): OrchestratorAction;

    hasSendevent(): boolean;
    clearSendevent(): void;
    getSendevent(): SendEventAction | undefined;
    setSendevent(value?: SendEventAction): OrchestratorAction;

    hasCompleteorchestration(): boolean;
    clearCompleteorchestration(): void;
    getCompleteorchestration(): CompleteOrchestrationAction | undefined;
    setCompleteorchestration(value?: CompleteOrchestrationAction): OrchestratorAction;

    hasTerminateorchestration(): boolean;
    clearTerminateorchestration(): void;
    getTerminateorchestration(): TerminateOrchestrationAction | undefined;
    setTerminateorchestration(value?: TerminateOrchestrationAction): OrchestratorAction;

    hasSendentitymessage(): boolean;
    clearSendentitymessage(): void;
    getSendentitymessage(): SendEntityMessageAction | undefined;
    setSendentitymessage(value?: SendEntityMessageAction): OrchestratorAction;

    getOrchestratoractiontypeCase(): OrchestratorAction.OrchestratoractiontypeCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): OrchestratorAction.AsObject;
    static toObject(includeInstance: boolean, msg: OrchestratorAction): OrchestratorAction.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: OrchestratorAction, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): OrchestratorAction;
    static deserializeBinaryFromReader(message: OrchestratorAction, reader: jspb.BinaryReader): OrchestratorAction;
}

export namespace OrchestratorAction {
    export type AsObject = {
        id: number,
        scheduletask?: ScheduleTaskAction.AsObject,
        createsuborchestration?: CreateSubOrchestrationAction.AsObject,
        createtimer?: CreateTimerAction.AsObject,
        sendevent?: SendEventAction.AsObject,
        completeorchestration?: CompleteOrchestrationAction.AsObject,
        terminateorchestration?: TerminateOrchestrationAction.AsObject,
        sendentitymessage?: SendEntityMessageAction.AsObject,
    }

    export enum OrchestratoractiontypeCase {
        ORCHESTRATORACTIONTYPE_NOT_SET = 0,
        SCHEDULETASK = 2,
        CREATESUBORCHESTRATION = 3,
        CREATETIMER = 4,
        SENDEVENT = 5,
        COMPLETEORCHESTRATION = 6,
        TERMINATEORCHESTRATION = 7,
        SENDENTITYMESSAGE = 8,
    }

}

export class OrchestrationTraceContext extends jspb.Message { 

    hasSpanid(): boolean;
    clearSpanid(): void;
    getSpanid(): google_protobuf_wrappers_pb.StringValue | undefined;
    setSpanid(value?: google_protobuf_wrappers_pb.StringValue): OrchestrationTraceContext;

    hasSpanstarttime(): boolean;
    clearSpanstarttime(): void;
    getSpanstarttime(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setSpanstarttime(value?: google_protobuf_timestamp_pb.Timestamp): OrchestrationTraceContext;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): OrchestrationTraceContext.AsObject;
    static toObject(includeInstance: boolean, msg: OrchestrationTraceContext): OrchestrationTraceContext.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: OrchestrationTraceContext, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): OrchestrationTraceContext;
    static deserializeBinaryFromReader(message: OrchestrationTraceContext, reader: jspb.BinaryReader): OrchestrationTraceContext;
}

export namespace OrchestrationTraceContext {
    export type AsObject = {
        spanid?: google_protobuf_wrappers_pb.StringValue.AsObject,
        spanstarttime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    }
}

export class OrchestratorRequest extends jspb.Message { 
    getInstanceid(): string;
    setInstanceid(value: string): OrchestratorRequest;

    hasExecutionid(): boolean;
    clearExecutionid(): void;
    getExecutionid(): google_protobuf_wrappers_pb.StringValue | undefined;
    setExecutionid(value?: google_protobuf_wrappers_pb.StringValue): OrchestratorRequest;
    clearPasteventsList(): void;
    getPasteventsList(): Array<HistoryEvent>;
    setPasteventsList(value: Array<HistoryEvent>): OrchestratorRequest;
    addPastevents(value?: HistoryEvent, index?: number): HistoryEvent;
    clearNeweventsList(): void;
    getNeweventsList(): Array<HistoryEvent>;
    setNeweventsList(value: Array<HistoryEvent>): OrchestratorRequest;
    addNewevents(value?: HistoryEvent, index?: number): HistoryEvent;

    hasEntityparameters(): boolean;
    clearEntityparameters(): void;
    getEntityparameters(): OrchestratorEntityParameters | undefined;
    setEntityparameters(value?: OrchestratorEntityParameters): OrchestratorRequest;
    getRequireshistorystreaming(): boolean;
    setRequireshistorystreaming(value: boolean): OrchestratorRequest;

    getPropertiesMap(): jspb.Map<string, google_protobuf_struct_pb.Value>;
    clearPropertiesMap(): void;

    hasOrchestrationtracecontext(): boolean;
    clearOrchestrationtracecontext(): void;
    getOrchestrationtracecontext(): OrchestrationTraceContext | undefined;
    setOrchestrationtracecontext(value?: OrchestrationTraceContext): OrchestratorRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): OrchestratorRequest.AsObject;
    static toObject(includeInstance: boolean, msg: OrchestratorRequest): OrchestratorRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: OrchestratorRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): OrchestratorRequest;
    static deserializeBinaryFromReader(message: OrchestratorRequest, reader: jspb.BinaryReader): OrchestratorRequest;
}

export namespace OrchestratorRequest {
    export type AsObject = {
        instanceid: string,
        executionid?: google_protobuf_wrappers_pb.StringValue.AsObject,
        pasteventsList: Array<HistoryEvent.AsObject>,
        neweventsList: Array<HistoryEvent.AsObject>,
        entityparameters?: OrchestratorEntityParameters.AsObject,
        requireshistorystreaming: boolean,

        propertiesMap: Array<[string, google_protobuf_struct_pb.Value.AsObject]>,
        orchestrationtracecontext?: OrchestrationTraceContext.AsObject,
    }
}

export class OrchestratorResponse extends jspb.Message { 
    getInstanceid(): string;
    setInstanceid(value: string): OrchestratorResponse;
    clearActionsList(): void;
    getActionsList(): Array<OrchestratorAction>;
    setActionsList(value: Array<OrchestratorAction>): OrchestratorResponse;
    addActions(value?: OrchestratorAction, index?: number): OrchestratorAction;

    hasCustomstatus(): boolean;
    clearCustomstatus(): void;
    getCustomstatus(): google_protobuf_wrappers_pb.StringValue | undefined;
    setCustomstatus(value?: google_protobuf_wrappers_pb.StringValue): OrchestratorResponse;
    getCompletiontoken(): string;
    setCompletiontoken(value: string): OrchestratorResponse;

    hasNumeventsprocessed(): boolean;
    clearNumeventsprocessed(): void;
    getNumeventsprocessed(): google_protobuf_wrappers_pb.Int32Value | undefined;
    setNumeventsprocessed(value?: google_protobuf_wrappers_pb.Int32Value): OrchestratorResponse;

    hasOrchestrationtracecontext(): boolean;
    clearOrchestrationtracecontext(): void;
    getOrchestrationtracecontext(): OrchestrationTraceContext | undefined;
    setOrchestrationtracecontext(value?: OrchestrationTraceContext): OrchestratorResponse;
    getRequireshistory(): boolean;
    setRequireshistory(value: boolean): OrchestratorResponse;
    getIspartial(): boolean;
    setIspartial(value: boolean): OrchestratorResponse;

    hasChunkindex(): boolean;
    clearChunkindex(): void;
    getChunkindex(): google_protobuf_wrappers_pb.Int32Value | undefined;
    setChunkindex(value?: google_protobuf_wrappers_pb.Int32Value): OrchestratorResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): OrchestratorResponse.AsObject;
    static toObject(includeInstance: boolean, msg: OrchestratorResponse): OrchestratorResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: OrchestratorResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): OrchestratorResponse;
    static deserializeBinaryFromReader(message: OrchestratorResponse, reader: jspb.BinaryReader): OrchestratorResponse;
}

export namespace OrchestratorResponse {
    export type AsObject = {
        instanceid: string,
        actionsList: Array<OrchestratorAction.AsObject>,
        customstatus?: google_protobuf_wrappers_pb.StringValue.AsObject,
        completiontoken: string,
        numeventsprocessed?: google_protobuf_wrappers_pb.Int32Value.AsObject,
        orchestrationtracecontext?: OrchestrationTraceContext.AsObject,
        requireshistory: boolean,
        ispartial: boolean,
        chunkindex?: google_protobuf_wrappers_pb.Int32Value.AsObject,
    }
}

export class CreateInstanceRequest extends jspb.Message { 
    getInstanceid(): string;
    setInstanceid(value: string): CreateInstanceRequest;
    getName(): string;
    setName(value: string): CreateInstanceRequest;

    hasVersion(): boolean;
    clearVersion(): void;
    getVersion(): google_protobuf_wrappers_pb.StringValue | undefined;
    setVersion(value?: google_protobuf_wrappers_pb.StringValue): CreateInstanceRequest;

    hasInput(): boolean;
    clearInput(): void;
    getInput(): google_protobuf_wrappers_pb.StringValue | undefined;
    setInput(value?: google_protobuf_wrappers_pb.StringValue): CreateInstanceRequest;

    hasScheduledstarttimestamp(): boolean;
    clearScheduledstarttimestamp(): void;
    getScheduledstarttimestamp(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setScheduledstarttimestamp(value?: google_protobuf_timestamp_pb.Timestamp): CreateInstanceRequest;

    hasOrchestrationidreusepolicy(): boolean;
    clearOrchestrationidreusepolicy(): void;
    getOrchestrationidreusepolicy(): OrchestrationIdReusePolicy | undefined;
    setOrchestrationidreusepolicy(value?: OrchestrationIdReusePolicy): CreateInstanceRequest;

    hasExecutionid(): boolean;
    clearExecutionid(): void;
    getExecutionid(): google_protobuf_wrappers_pb.StringValue | undefined;
    setExecutionid(value?: google_protobuf_wrappers_pb.StringValue): CreateInstanceRequest;

    getTagsMap(): jspb.Map<string, string>;
    clearTagsMap(): void;

    hasParenttracecontext(): boolean;
    clearParenttracecontext(): void;
    getParenttracecontext(): TraceContext | undefined;
    setParenttracecontext(value?: TraceContext): CreateInstanceRequest;

    hasRequesttime(): boolean;
    clearRequesttime(): void;
    getRequesttime(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setRequesttime(value?: google_protobuf_timestamp_pb.Timestamp): CreateInstanceRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CreateInstanceRequest.AsObject;
    static toObject(includeInstance: boolean, msg: CreateInstanceRequest): CreateInstanceRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CreateInstanceRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CreateInstanceRequest;
    static deserializeBinaryFromReader(message: CreateInstanceRequest, reader: jspb.BinaryReader): CreateInstanceRequest;
}

export namespace CreateInstanceRequest {
    export type AsObject = {
        instanceid: string,
        name: string,
        version?: google_protobuf_wrappers_pb.StringValue.AsObject,
        input?: google_protobuf_wrappers_pb.StringValue.AsObject,
        scheduledstarttimestamp?: google_protobuf_timestamp_pb.Timestamp.AsObject,
        orchestrationidreusepolicy?: OrchestrationIdReusePolicy.AsObject,
        executionid?: google_protobuf_wrappers_pb.StringValue.AsObject,

        tagsMap: Array<[string, string]>,
        parenttracecontext?: TraceContext.AsObject,
        requesttime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    }
}

export class OrchestrationIdReusePolicy extends jspb.Message { 
    clearReplaceablestatusList(): void;
    getReplaceablestatusList(): Array<OrchestrationStatus>;
    setReplaceablestatusList(value: Array<OrchestrationStatus>): OrchestrationIdReusePolicy;
    addReplaceablestatus(value: OrchestrationStatus, index?: number): OrchestrationStatus;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): OrchestrationIdReusePolicy.AsObject;
    static toObject(includeInstance: boolean, msg: OrchestrationIdReusePolicy): OrchestrationIdReusePolicy.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: OrchestrationIdReusePolicy, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): OrchestrationIdReusePolicy;
    static deserializeBinaryFromReader(message: OrchestrationIdReusePolicy, reader: jspb.BinaryReader): OrchestrationIdReusePolicy;
}

export namespace OrchestrationIdReusePolicy {
    export type AsObject = {
        replaceablestatusList: Array<OrchestrationStatus>,
    }
}

export class CreateInstanceResponse extends jspb.Message { 
    getInstanceid(): string;
    setInstanceid(value: string): CreateInstanceResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CreateInstanceResponse.AsObject;
    static toObject(includeInstance: boolean, msg: CreateInstanceResponse): CreateInstanceResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CreateInstanceResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CreateInstanceResponse;
    static deserializeBinaryFromReader(message: CreateInstanceResponse, reader: jspb.BinaryReader): CreateInstanceResponse;
}

export namespace CreateInstanceResponse {
    export type AsObject = {
        instanceid: string,
    }
}

export class GetInstanceRequest extends jspb.Message { 
    getInstanceid(): string;
    setInstanceid(value: string): GetInstanceRequest;
    getGetinputsandoutputs(): boolean;
    setGetinputsandoutputs(value: boolean): GetInstanceRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetInstanceRequest.AsObject;
    static toObject(includeInstance: boolean, msg: GetInstanceRequest): GetInstanceRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetInstanceRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetInstanceRequest;
    static deserializeBinaryFromReader(message: GetInstanceRequest, reader: jspb.BinaryReader): GetInstanceRequest;
}

export namespace GetInstanceRequest {
    export type AsObject = {
        instanceid: string,
        getinputsandoutputs: boolean,
    }
}

export class GetInstanceResponse extends jspb.Message { 
    getExists(): boolean;
    setExists(value: boolean): GetInstanceResponse;

    hasOrchestrationstate(): boolean;
    clearOrchestrationstate(): void;
    getOrchestrationstate(): OrchestrationState | undefined;
    setOrchestrationstate(value?: OrchestrationState): GetInstanceResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetInstanceResponse.AsObject;
    static toObject(includeInstance: boolean, msg: GetInstanceResponse): GetInstanceResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetInstanceResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetInstanceResponse;
    static deserializeBinaryFromReader(message: GetInstanceResponse, reader: jspb.BinaryReader): GetInstanceResponse;
}

export namespace GetInstanceResponse {
    export type AsObject = {
        exists: boolean,
        orchestrationstate?: OrchestrationState.AsObject,
    }
}

export class RewindInstanceRequest extends jspb.Message { 
    getInstanceid(): string;
    setInstanceid(value: string): RewindInstanceRequest;

    hasReason(): boolean;
    clearReason(): void;
    getReason(): google_protobuf_wrappers_pb.StringValue | undefined;
    setReason(value?: google_protobuf_wrappers_pb.StringValue): RewindInstanceRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): RewindInstanceRequest.AsObject;
    static toObject(includeInstance: boolean, msg: RewindInstanceRequest): RewindInstanceRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: RewindInstanceRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): RewindInstanceRequest;
    static deserializeBinaryFromReader(message: RewindInstanceRequest, reader: jspb.BinaryReader): RewindInstanceRequest;
}

export namespace RewindInstanceRequest {
    export type AsObject = {
        instanceid: string,
        reason?: google_protobuf_wrappers_pb.StringValue.AsObject,
    }
}

export class RewindInstanceResponse extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): RewindInstanceResponse.AsObject;
    static toObject(includeInstance: boolean, msg: RewindInstanceResponse): RewindInstanceResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: RewindInstanceResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): RewindInstanceResponse;
    static deserializeBinaryFromReader(message: RewindInstanceResponse, reader: jspb.BinaryReader): RewindInstanceResponse;
}

export namespace RewindInstanceResponse {
    export type AsObject = {
    }
}

export class OrchestrationState extends jspb.Message { 
    getInstanceid(): string;
    setInstanceid(value: string): OrchestrationState;
    getName(): string;
    setName(value: string): OrchestrationState;

    hasVersion(): boolean;
    clearVersion(): void;
    getVersion(): google_protobuf_wrappers_pb.StringValue | undefined;
    setVersion(value?: google_protobuf_wrappers_pb.StringValue): OrchestrationState;
    getOrchestrationstatus(): OrchestrationStatus;
    setOrchestrationstatus(value: OrchestrationStatus): OrchestrationState;

    hasScheduledstarttimestamp(): boolean;
    clearScheduledstarttimestamp(): void;
    getScheduledstarttimestamp(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setScheduledstarttimestamp(value?: google_protobuf_timestamp_pb.Timestamp): OrchestrationState;

    hasCreatedtimestamp(): boolean;
    clearCreatedtimestamp(): void;
    getCreatedtimestamp(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setCreatedtimestamp(value?: google_protobuf_timestamp_pb.Timestamp): OrchestrationState;

    hasLastupdatedtimestamp(): boolean;
    clearLastupdatedtimestamp(): void;
    getLastupdatedtimestamp(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setLastupdatedtimestamp(value?: google_protobuf_timestamp_pb.Timestamp): OrchestrationState;

    hasInput(): boolean;
    clearInput(): void;
    getInput(): google_protobuf_wrappers_pb.StringValue | undefined;
    setInput(value?: google_protobuf_wrappers_pb.StringValue): OrchestrationState;

    hasOutput(): boolean;
    clearOutput(): void;
    getOutput(): google_protobuf_wrappers_pb.StringValue | undefined;
    setOutput(value?: google_protobuf_wrappers_pb.StringValue): OrchestrationState;

    hasCustomstatus(): boolean;
    clearCustomstatus(): void;
    getCustomstatus(): google_protobuf_wrappers_pb.StringValue | undefined;
    setCustomstatus(value?: google_protobuf_wrappers_pb.StringValue): OrchestrationState;

    hasFailuredetails(): boolean;
    clearFailuredetails(): void;
    getFailuredetails(): TaskFailureDetails | undefined;
    setFailuredetails(value?: TaskFailureDetails): OrchestrationState;

    hasExecutionid(): boolean;
    clearExecutionid(): void;
    getExecutionid(): google_protobuf_wrappers_pb.StringValue | undefined;
    setExecutionid(value?: google_protobuf_wrappers_pb.StringValue): OrchestrationState;

    hasCompletedtimestamp(): boolean;
    clearCompletedtimestamp(): void;
    getCompletedtimestamp(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setCompletedtimestamp(value?: google_protobuf_timestamp_pb.Timestamp): OrchestrationState;

    hasParentinstanceid(): boolean;
    clearParentinstanceid(): void;
    getParentinstanceid(): google_protobuf_wrappers_pb.StringValue | undefined;
    setParentinstanceid(value?: google_protobuf_wrappers_pb.StringValue): OrchestrationState;

    getTagsMap(): jspb.Map<string, string>;
    clearTagsMap(): void;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): OrchestrationState.AsObject;
    static toObject(includeInstance: boolean, msg: OrchestrationState): OrchestrationState.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: OrchestrationState, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): OrchestrationState;
    static deserializeBinaryFromReader(message: OrchestrationState, reader: jspb.BinaryReader): OrchestrationState;
}

export namespace OrchestrationState {
    export type AsObject = {
        instanceid: string,
        name: string,
        version?: google_protobuf_wrappers_pb.StringValue.AsObject,
        orchestrationstatus: OrchestrationStatus,
        scheduledstarttimestamp?: google_protobuf_timestamp_pb.Timestamp.AsObject,
        createdtimestamp?: google_protobuf_timestamp_pb.Timestamp.AsObject,
        lastupdatedtimestamp?: google_protobuf_timestamp_pb.Timestamp.AsObject,
        input?: google_protobuf_wrappers_pb.StringValue.AsObject,
        output?: google_protobuf_wrappers_pb.StringValue.AsObject,
        customstatus?: google_protobuf_wrappers_pb.StringValue.AsObject,
        failuredetails?: TaskFailureDetails.AsObject,
        executionid?: google_protobuf_wrappers_pb.StringValue.AsObject,
        completedtimestamp?: google_protobuf_timestamp_pb.Timestamp.AsObject,
        parentinstanceid?: google_protobuf_wrappers_pb.StringValue.AsObject,

        tagsMap: Array<[string, string]>,
    }
}

export class RaiseEventRequest extends jspb.Message { 
    getInstanceid(): string;
    setInstanceid(value: string): RaiseEventRequest;
    getName(): string;
    setName(value: string): RaiseEventRequest;

    hasInput(): boolean;
    clearInput(): void;
    getInput(): google_protobuf_wrappers_pb.StringValue | undefined;
    setInput(value?: google_protobuf_wrappers_pb.StringValue): RaiseEventRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): RaiseEventRequest.AsObject;
    static toObject(includeInstance: boolean, msg: RaiseEventRequest): RaiseEventRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: RaiseEventRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): RaiseEventRequest;
    static deserializeBinaryFromReader(message: RaiseEventRequest, reader: jspb.BinaryReader): RaiseEventRequest;
}

export namespace RaiseEventRequest {
    export type AsObject = {
        instanceid: string,
        name: string,
        input?: google_protobuf_wrappers_pb.StringValue.AsObject,
    }
}

export class RaiseEventResponse extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): RaiseEventResponse.AsObject;
    static toObject(includeInstance: boolean, msg: RaiseEventResponse): RaiseEventResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: RaiseEventResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): RaiseEventResponse;
    static deserializeBinaryFromReader(message: RaiseEventResponse, reader: jspb.BinaryReader): RaiseEventResponse;
}

export namespace RaiseEventResponse {
    export type AsObject = {
    }
}

export class TerminateRequest extends jspb.Message { 
    getInstanceid(): string;
    setInstanceid(value: string): TerminateRequest;

    hasOutput(): boolean;
    clearOutput(): void;
    getOutput(): google_protobuf_wrappers_pb.StringValue | undefined;
    setOutput(value?: google_protobuf_wrappers_pb.StringValue): TerminateRequest;
    getRecursive(): boolean;
    setRecursive(value: boolean): TerminateRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): TerminateRequest.AsObject;
    static toObject(includeInstance: boolean, msg: TerminateRequest): TerminateRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: TerminateRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): TerminateRequest;
    static deserializeBinaryFromReader(message: TerminateRequest, reader: jspb.BinaryReader): TerminateRequest;
}

export namespace TerminateRequest {
    export type AsObject = {
        instanceid: string,
        output?: google_protobuf_wrappers_pb.StringValue.AsObject,
        recursive: boolean,
    }
}

export class TerminateResponse extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): TerminateResponse.AsObject;
    static toObject(includeInstance: boolean, msg: TerminateResponse): TerminateResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: TerminateResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): TerminateResponse;
    static deserializeBinaryFromReader(message: TerminateResponse, reader: jspb.BinaryReader): TerminateResponse;
}

export namespace TerminateResponse {
    export type AsObject = {
    }
}

export class SuspendRequest extends jspb.Message { 
    getInstanceid(): string;
    setInstanceid(value: string): SuspendRequest;

    hasReason(): boolean;
    clearReason(): void;
    getReason(): google_protobuf_wrappers_pb.StringValue | undefined;
    setReason(value?: google_protobuf_wrappers_pb.StringValue): SuspendRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SuspendRequest.AsObject;
    static toObject(includeInstance: boolean, msg: SuspendRequest): SuspendRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SuspendRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SuspendRequest;
    static deserializeBinaryFromReader(message: SuspendRequest, reader: jspb.BinaryReader): SuspendRequest;
}

export namespace SuspendRequest {
    export type AsObject = {
        instanceid: string,
        reason?: google_protobuf_wrappers_pb.StringValue.AsObject,
    }
}

export class SuspendResponse extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SuspendResponse.AsObject;
    static toObject(includeInstance: boolean, msg: SuspendResponse): SuspendResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SuspendResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SuspendResponse;
    static deserializeBinaryFromReader(message: SuspendResponse, reader: jspb.BinaryReader): SuspendResponse;
}

export namespace SuspendResponse {
    export type AsObject = {
    }
}

export class ResumeRequest extends jspb.Message { 
    getInstanceid(): string;
    setInstanceid(value: string): ResumeRequest;

    hasReason(): boolean;
    clearReason(): void;
    getReason(): google_protobuf_wrappers_pb.StringValue | undefined;
    setReason(value?: google_protobuf_wrappers_pb.StringValue): ResumeRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ResumeRequest.AsObject;
    static toObject(includeInstance: boolean, msg: ResumeRequest): ResumeRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ResumeRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ResumeRequest;
    static deserializeBinaryFromReader(message: ResumeRequest, reader: jspb.BinaryReader): ResumeRequest;
}

export namespace ResumeRequest {
    export type AsObject = {
        instanceid: string,
        reason?: google_protobuf_wrappers_pb.StringValue.AsObject,
    }
}

export class ResumeResponse extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ResumeResponse.AsObject;
    static toObject(includeInstance: boolean, msg: ResumeResponse): ResumeResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ResumeResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ResumeResponse;
    static deserializeBinaryFromReader(message: ResumeResponse, reader: jspb.BinaryReader): ResumeResponse;
}

export namespace ResumeResponse {
    export type AsObject = {
    }
}

export class QueryInstancesRequest extends jspb.Message { 

    hasQuery(): boolean;
    clearQuery(): void;
    getQuery(): InstanceQuery | undefined;
    setQuery(value?: InstanceQuery): QueryInstancesRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): QueryInstancesRequest.AsObject;
    static toObject(includeInstance: boolean, msg: QueryInstancesRequest): QueryInstancesRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: QueryInstancesRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): QueryInstancesRequest;
    static deserializeBinaryFromReader(message: QueryInstancesRequest, reader: jspb.BinaryReader): QueryInstancesRequest;
}

export namespace QueryInstancesRequest {
    export type AsObject = {
        query?: InstanceQuery.AsObject,
    }
}

export class InstanceQuery extends jspb.Message { 
    clearRuntimestatusList(): void;
    getRuntimestatusList(): Array<OrchestrationStatus>;
    setRuntimestatusList(value: Array<OrchestrationStatus>): InstanceQuery;
    addRuntimestatus(value: OrchestrationStatus, index?: number): OrchestrationStatus;

    hasCreatedtimefrom(): boolean;
    clearCreatedtimefrom(): void;
    getCreatedtimefrom(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setCreatedtimefrom(value?: google_protobuf_timestamp_pb.Timestamp): InstanceQuery;

    hasCreatedtimeto(): boolean;
    clearCreatedtimeto(): void;
    getCreatedtimeto(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setCreatedtimeto(value?: google_protobuf_timestamp_pb.Timestamp): InstanceQuery;
    clearTaskhubnamesList(): void;
    getTaskhubnamesList(): Array<google_protobuf_wrappers_pb.StringValue>;
    setTaskhubnamesList(value: Array<google_protobuf_wrappers_pb.StringValue>): InstanceQuery;
    addTaskhubnames(value?: google_protobuf_wrappers_pb.StringValue, index?: number): google_protobuf_wrappers_pb.StringValue;
    getMaxinstancecount(): number;
    setMaxinstancecount(value: number): InstanceQuery;

    hasContinuationtoken(): boolean;
    clearContinuationtoken(): void;
    getContinuationtoken(): google_protobuf_wrappers_pb.StringValue | undefined;
    setContinuationtoken(value?: google_protobuf_wrappers_pb.StringValue): InstanceQuery;

    hasInstanceidprefix(): boolean;
    clearInstanceidprefix(): void;
    getInstanceidprefix(): google_protobuf_wrappers_pb.StringValue | undefined;
    setInstanceidprefix(value?: google_protobuf_wrappers_pb.StringValue): InstanceQuery;
    getFetchinputsandoutputs(): boolean;
    setFetchinputsandoutputs(value: boolean): InstanceQuery;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): InstanceQuery.AsObject;
    static toObject(includeInstance: boolean, msg: InstanceQuery): InstanceQuery.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: InstanceQuery, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): InstanceQuery;
    static deserializeBinaryFromReader(message: InstanceQuery, reader: jspb.BinaryReader): InstanceQuery;
}

export namespace InstanceQuery {
    export type AsObject = {
        runtimestatusList: Array<OrchestrationStatus>,
        createdtimefrom?: google_protobuf_timestamp_pb.Timestamp.AsObject,
        createdtimeto?: google_protobuf_timestamp_pb.Timestamp.AsObject,
        taskhubnamesList: Array<google_protobuf_wrappers_pb.StringValue.AsObject>,
        maxinstancecount: number,
        continuationtoken?: google_protobuf_wrappers_pb.StringValue.AsObject,
        instanceidprefix?: google_protobuf_wrappers_pb.StringValue.AsObject,
        fetchinputsandoutputs: boolean,
    }
}

export class QueryInstancesResponse extends jspb.Message { 
    clearOrchestrationstateList(): void;
    getOrchestrationstateList(): Array<OrchestrationState>;
    setOrchestrationstateList(value: Array<OrchestrationState>): QueryInstancesResponse;
    addOrchestrationstate(value?: OrchestrationState, index?: number): OrchestrationState;

    hasContinuationtoken(): boolean;
    clearContinuationtoken(): void;
    getContinuationtoken(): google_protobuf_wrappers_pb.StringValue | undefined;
    setContinuationtoken(value?: google_protobuf_wrappers_pb.StringValue): QueryInstancesResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): QueryInstancesResponse.AsObject;
    static toObject(includeInstance: boolean, msg: QueryInstancesResponse): QueryInstancesResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: QueryInstancesResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): QueryInstancesResponse;
    static deserializeBinaryFromReader(message: QueryInstancesResponse, reader: jspb.BinaryReader): QueryInstancesResponse;
}

export namespace QueryInstancesResponse {
    export type AsObject = {
        orchestrationstateList: Array<OrchestrationState.AsObject>,
        continuationtoken?: google_protobuf_wrappers_pb.StringValue.AsObject,
    }
}

export class ListInstanceIdsRequest extends jspb.Message { 
    clearRuntimestatusList(): void;
    getRuntimestatusList(): Array<OrchestrationStatus>;
    setRuntimestatusList(value: Array<OrchestrationStatus>): ListInstanceIdsRequest;
    addRuntimestatus(value: OrchestrationStatus, index?: number): OrchestrationStatus;

    hasCompletedtimefrom(): boolean;
    clearCompletedtimefrom(): void;
    getCompletedtimefrom(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setCompletedtimefrom(value?: google_protobuf_timestamp_pb.Timestamp): ListInstanceIdsRequest;

    hasCompletedtimeto(): boolean;
    clearCompletedtimeto(): void;
    getCompletedtimeto(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setCompletedtimeto(value?: google_protobuf_timestamp_pb.Timestamp): ListInstanceIdsRequest;
    getPagesize(): number;
    setPagesize(value: number): ListInstanceIdsRequest;

    hasLastinstancekey(): boolean;
    clearLastinstancekey(): void;
    getLastinstancekey(): google_protobuf_wrappers_pb.StringValue | undefined;
    setLastinstancekey(value?: google_protobuf_wrappers_pb.StringValue): ListInstanceIdsRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ListInstanceIdsRequest.AsObject;
    static toObject(includeInstance: boolean, msg: ListInstanceIdsRequest): ListInstanceIdsRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ListInstanceIdsRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ListInstanceIdsRequest;
    static deserializeBinaryFromReader(message: ListInstanceIdsRequest, reader: jspb.BinaryReader): ListInstanceIdsRequest;
}

export namespace ListInstanceIdsRequest {
    export type AsObject = {
        runtimestatusList: Array<OrchestrationStatus>,
        completedtimefrom?: google_protobuf_timestamp_pb.Timestamp.AsObject,
        completedtimeto?: google_protobuf_timestamp_pb.Timestamp.AsObject,
        pagesize: number,
        lastinstancekey?: google_protobuf_wrappers_pb.StringValue.AsObject,
    }
}

export class ListInstanceIdsResponse extends jspb.Message { 
    clearInstanceidsList(): void;
    getInstanceidsList(): Array<string>;
    setInstanceidsList(value: Array<string>): ListInstanceIdsResponse;
    addInstanceids(value: string, index?: number): string;

    hasLastinstancekey(): boolean;
    clearLastinstancekey(): void;
    getLastinstancekey(): google_protobuf_wrappers_pb.StringValue | undefined;
    setLastinstancekey(value?: google_protobuf_wrappers_pb.StringValue): ListInstanceIdsResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ListInstanceIdsResponse.AsObject;
    static toObject(includeInstance: boolean, msg: ListInstanceIdsResponse): ListInstanceIdsResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ListInstanceIdsResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ListInstanceIdsResponse;
    static deserializeBinaryFromReader(message: ListInstanceIdsResponse, reader: jspb.BinaryReader): ListInstanceIdsResponse;
}

export namespace ListInstanceIdsResponse {
    export type AsObject = {
        instanceidsList: Array<string>,
        lastinstancekey?: google_protobuf_wrappers_pb.StringValue.AsObject,
    }
}

export class PurgeInstancesRequest extends jspb.Message { 

    hasInstanceid(): boolean;
    clearInstanceid(): void;
    getInstanceid(): string;
    setInstanceid(value: string): PurgeInstancesRequest;

    hasPurgeinstancefilter(): boolean;
    clearPurgeinstancefilter(): void;
    getPurgeinstancefilter(): PurgeInstanceFilter | undefined;
    setPurgeinstancefilter(value?: PurgeInstanceFilter): PurgeInstancesRequest;

    hasInstancebatch(): boolean;
    clearInstancebatch(): void;
    getInstancebatch(): InstanceBatch | undefined;
    setInstancebatch(value?: InstanceBatch): PurgeInstancesRequest;
    getRecursive(): boolean;
    setRecursive(value: boolean): PurgeInstancesRequest;
    getIsorchestration(): boolean;
    setIsorchestration(value: boolean): PurgeInstancesRequest;

    getRequestCase(): PurgeInstancesRequest.RequestCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PurgeInstancesRequest.AsObject;
    static toObject(includeInstance: boolean, msg: PurgeInstancesRequest): PurgeInstancesRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PurgeInstancesRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PurgeInstancesRequest;
    static deserializeBinaryFromReader(message: PurgeInstancesRequest, reader: jspb.BinaryReader): PurgeInstancesRequest;
}

export namespace PurgeInstancesRequest {
    export type AsObject = {
        instanceid: string,
        purgeinstancefilter?: PurgeInstanceFilter.AsObject,
        instancebatch?: InstanceBatch.AsObject,
        recursive: boolean,
        isorchestration: boolean,
    }

    export enum RequestCase {
        REQUEST_NOT_SET = 0,
        INSTANCEID = 1,
        PURGEINSTANCEFILTER = 2,
        INSTANCEBATCH = 4,
    }

}

export class PurgeInstanceFilter extends jspb.Message { 

    hasCreatedtimefrom(): boolean;
    clearCreatedtimefrom(): void;
    getCreatedtimefrom(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setCreatedtimefrom(value?: google_protobuf_timestamp_pb.Timestamp): PurgeInstanceFilter;

    hasCreatedtimeto(): boolean;
    clearCreatedtimeto(): void;
    getCreatedtimeto(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setCreatedtimeto(value?: google_protobuf_timestamp_pb.Timestamp): PurgeInstanceFilter;
    clearRuntimestatusList(): void;
    getRuntimestatusList(): Array<OrchestrationStatus>;
    setRuntimestatusList(value: Array<OrchestrationStatus>): PurgeInstanceFilter;
    addRuntimestatus(value: OrchestrationStatus, index?: number): OrchestrationStatus;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PurgeInstanceFilter.AsObject;
    static toObject(includeInstance: boolean, msg: PurgeInstanceFilter): PurgeInstanceFilter.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PurgeInstanceFilter, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PurgeInstanceFilter;
    static deserializeBinaryFromReader(message: PurgeInstanceFilter, reader: jspb.BinaryReader): PurgeInstanceFilter;
}

export namespace PurgeInstanceFilter {
    export type AsObject = {
        createdtimefrom?: google_protobuf_timestamp_pb.Timestamp.AsObject,
        createdtimeto?: google_protobuf_timestamp_pb.Timestamp.AsObject,
        runtimestatusList: Array<OrchestrationStatus>,
    }
}

export class PurgeInstancesResponse extends jspb.Message { 
    getDeletedinstancecount(): number;
    setDeletedinstancecount(value: number): PurgeInstancesResponse;

    hasIscomplete(): boolean;
    clearIscomplete(): void;
    getIscomplete(): google_protobuf_wrappers_pb.BoolValue | undefined;
    setIscomplete(value?: google_protobuf_wrappers_pb.BoolValue): PurgeInstancesResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PurgeInstancesResponse.AsObject;
    static toObject(includeInstance: boolean, msg: PurgeInstancesResponse): PurgeInstancesResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PurgeInstancesResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PurgeInstancesResponse;
    static deserializeBinaryFromReader(message: PurgeInstancesResponse, reader: jspb.BinaryReader): PurgeInstancesResponse;
}

export namespace PurgeInstancesResponse {
    export type AsObject = {
        deletedinstancecount: number,
        iscomplete?: google_protobuf_wrappers_pb.BoolValue.AsObject,
    }
}

export class RestartInstanceRequest extends jspb.Message { 
    getInstanceid(): string;
    setInstanceid(value: string): RestartInstanceRequest;
    getRestartwithnewinstanceid(): boolean;
    setRestartwithnewinstanceid(value: boolean): RestartInstanceRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): RestartInstanceRequest.AsObject;
    static toObject(includeInstance: boolean, msg: RestartInstanceRequest): RestartInstanceRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: RestartInstanceRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): RestartInstanceRequest;
    static deserializeBinaryFromReader(message: RestartInstanceRequest, reader: jspb.BinaryReader): RestartInstanceRequest;
}

export namespace RestartInstanceRequest {
    export type AsObject = {
        instanceid: string,
        restartwithnewinstanceid: boolean,
    }
}

export class RestartInstanceResponse extends jspb.Message { 
    getInstanceid(): string;
    setInstanceid(value: string): RestartInstanceResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): RestartInstanceResponse.AsObject;
    static toObject(includeInstance: boolean, msg: RestartInstanceResponse): RestartInstanceResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: RestartInstanceResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): RestartInstanceResponse;
    static deserializeBinaryFromReader(message: RestartInstanceResponse, reader: jspb.BinaryReader): RestartInstanceResponse;
}

export namespace RestartInstanceResponse {
    export type AsObject = {
        instanceid: string,
    }
}

export class CreateTaskHubRequest extends jspb.Message { 
    getRecreateifexists(): boolean;
    setRecreateifexists(value: boolean): CreateTaskHubRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CreateTaskHubRequest.AsObject;
    static toObject(includeInstance: boolean, msg: CreateTaskHubRequest): CreateTaskHubRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CreateTaskHubRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CreateTaskHubRequest;
    static deserializeBinaryFromReader(message: CreateTaskHubRequest, reader: jspb.BinaryReader): CreateTaskHubRequest;
}

export namespace CreateTaskHubRequest {
    export type AsObject = {
        recreateifexists: boolean,
    }
}

export class CreateTaskHubResponse extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CreateTaskHubResponse.AsObject;
    static toObject(includeInstance: boolean, msg: CreateTaskHubResponse): CreateTaskHubResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CreateTaskHubResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CreateTaskHubResponse;
    static deserializeBinaryFromReader(message: CreateTaskHubResponse, reader: jspb.BinaryReader): CreateTaskHubResponse;
}

export namespace CreateTaskHubResponse {
    export type AsObject = {
    }
}

export class DeleteTaskHubRequest extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): DeleteTaskHubRequest.AsObject;
    static toObject(includeInstance: boolean, msg: DeleteTaskHubRequest): DeleteTaskHubRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: DeleteTaskHubRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): DeleteTaskHubRequest;
    static deserializeBinaryFromReader(message: DeleteTaskHubRequest, reader: jspb.BinaryReader): DeleteTaskHubRequest;
}

export namespace DeleteTaskHubRequest {
    export type AsObject = {
    }
}

export class DeleteTaskHubResponse extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): DeleteTaskHubResponse.AsObject;
    static toObject(includeInstance: boolean, msg: DeleteTaskHubResponse): DeleteTaskHubResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: DeleteTaskHubResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): DeleteTaskHubResponse;
    static deserializeBinaryFromReader(message: DeleteTaskHubResponse, reader: jspb.BinaryReader): DeleteTaskHubResponse;
}

export namespace DeleteTaskHubResponse {
    export type AsObject = {
    }
}

export class SignalEntityRequest extends jspb.Message { 
    getInstanceid(): string;
    setInstanceid(value: string): SignalEntityRequest;
    getName(): string;
    setName(value: string): SignalEntityRequest;

    hasInput(): boolean;
    clearInput(): void;
    getInput(): google_protobuf_wrappers_pb.StringValue | undefined;
    setInput(value?: google_protobuf_wrappers_pb.StringValue): SignalEntityRequest;
    getRequestid(): string;
    setRequestid(value: string): SignalEntityRequest;

    hasScheduledtime(): boolean;
    clearScheduledtime(): void;
    getScheduledtime(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setScheduledtime(value?: google_protobuf_timestamp_pb.Timestamp): SignalEntityRequest;

    hasParenttracecontext(): boolean;
    clearParenttracecontext(): void;
    getParenttracecontext(): TraceContext | undefined;
    setParenttracecontext(value?: TraceContext): SignalEntityRequest;

    hasRequesttime(): boolean;
    clearRequesttime(): void;
    getRequesttime(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setRequesttime(value?: google_protobuf_timestamp_pb.Timestamp): SignalEntityRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SignalEntityRequest.AsObject;
    static toObject(includeInstance: boolean, msg: SignalEntityRequest): SignalEntityRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SignalEntityRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SignalEntityRequest;
    static deserializeBinaryFromReader(message: SignalEntityRequest, reader: jspb.BinaryReader): SignalEntityRequest;
}

export namespace SignalEntityRequest {
    export type AsObject = {
        instanceid: string,
        name: string,
        input?: google_protobuf_wrappers_pb.StringValue.AsObject,
        requestid: string,
        scheduledtime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
        parenttracecontext?: TraceContext.AsObject,
        requesttime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    }
}

export class SignalEntityResponse extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SignalEntityResponse.AsObject;
    static toObject(includeInstance: boolean, msg: SignalEntityResponse): SignalEntityResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SignalEntityResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SignalEntityResponse;
    static deserializeBinaryFromReader(message: SignalEntityResponse, reader: jspb.BinaryReader): SignalEntityResponse;
}

export namespace SignalEntityResponse {
    export type AsObject = {
    }
}

export class GetEntityRequest extends jspb.Message { 
    getInstanceid(): string;
    setInstanceid(value: string): GetEntityRequest;
    getIncludestate(): boolean;
    setIncludestate(value: boolean): GetEntityRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetEntityRequest.AsObject;
    static toObject(includeInstance: boolean, msg: GetEntityRequest): GetEntityRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetEntityRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetEntityRequest;
    static deserializeBinaryFromReader(message: GetEntityRequest, reader: jspb.BinaryReader): GetEntityRequest;
}

export namespace GetEntityRequest {
    export type AsObject = {
        instanceid: string,
        includestate: boolean,
    }
}

export class GetEntityResponse extends jspb.Message { 
    getExists(): boolean;
    setExists(value: boolean): GetEntityResponse;

    hasEntity(): boolean;
    clearEntity(): void;
    getEntity(): EntityMetadata | undefined;
    setEntity(value?: EntityMetadata): GetEntityResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetEntityResponse.AsObject;
    static toObject(includeInstance: boolean, msg: GetEntityResponse): GetEntityResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetEntityResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetEntityResponse;
    static deserializeBinaryFromReader(message: GetEntityResponse, reader: jspb.BinaryReader): GetEntityResponse;
}

export namespace GetEntityResponse {
    export type AsObject = {
        exists: boolean,
        entity?: EntityMetadata.AsObject,
    }
}

export class EntityQuery extends jspb.Message { 

    hasInstanceidstartswith(): boolean;
    clearInstanceidstartswith(): void;
    getInstanceidstartswith(): google_protobuf_wrappers_pb.StringValue | undefined;
    setInstanceidstartswith(value?: google_protobuf_wrappers_pb.StringValue): EntityQuery;

    hasLastmodifiedfrom(): boolean;
    clearLastmodifiedfrom(): void;
    getLastmodifiedfrom(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setLastmodifiedfrom(value?: google_protobuf_timestamp_pb.Timestamp): EntityQuery;

    hasLastmodifiedto(): boolean;
    clearLastmodifiedto(): void;
    getLastmodifiedto(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setLastmodifiedto(value?: google_protobuf_timestamp_pb.Timestamp): EntityQuery;
    getIncludestate(): boolean;
    setIncludestate(value: boolean): EntityQuery;
    getIncludetransient(): boolean;
    setIncludetransient(value: boolean): EntityQuery;

    hasPagesize(): boolean;
    clearPagesize(): void;
    getPagesize(): google_protobuf_wrappers_pb.Int32Value | undefined;
    setPagesize(value?: google_protobuf_wrappers_pb.Int32Value): EntityQuery;

    hasContinuationtoken(): boolean;
    clearContinuationtoken(): void;
    getContinuationtoken(): google_protobuf_wrappers_pb.StringValue | undefined;
    setContinuationtoken(value?: google_protobuf_wrappers_pb.StringValue): EntityQuery;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EntityQuery.AsObject;
    static toObject(includeInstance: boolean, msg: EntityQuery): EntityQuery.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EntityQuery, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EntityQuery;
    static deserializeBinaryFromReader(message: EntityQuery, reader: jspb.BinaryReader): EntityQuery;
}

export namespace EntityQuery {
    export type AsObject = {
        instanceidstartswith?: google_protobuf_wrappers_pb.StringValue.AsObject,
        lastmodifiedfrom?: google_protobuf_timestamp_pb.Timestamp.AsObject,
        lastmodifiedto?: google_protobuf_timestamp_pb.Timestamp.AsObject,
        includestate: boolean,
        includetransient: boolean,
        pagesize?: google_protobuf_wrappers_pb.Int32Value.AsObject,
        continuationtoken?: google_protobuf_wrappers_pb.StringValue.AsObject,
    }
}

export class QueryEntitiesRequest extends jspb.Message { 

    hasQuery(): boolean;
    clearQuery(): void;
    getQuery(): EntityQuery | undefined;
    setQuery(value?: EntityQuery): QueryEntitiesRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): QueryEntitiesRequest.AsObject;
    static toObject(includeInstance: boolean, msg: QueryEntitiesRequest): QueryEntitiesRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: QueryEntitiesRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): QueryEntitiesRequest;
    static deserializeBinaryFromReader(message: QueryEntitiesRequest, reader: jspb.BinaryReader): QueryEntitiesRequest;
}

export namespace QueryEntitiesRequest {
    export type AsObject = {
        query?: EntityQuery.AsObject,
    }
}

export class QueryEntitiesResponse extends jspb.Message { 
    clearEntitiesList(): void;
    getEntitiesList(): Array<EntityMetadata>;
    setEntitiesList(value: Array<EntityMetadata>): QueryEntitiesResponse;
    addEntities(value?: EntityMetadata, index?: number): EntityMetadata;

    hasContinuationtoken(): boolean;
    clearContinuationtoken(): void;
    getContinuationtoken(): google_protobuf_wrappers_pb.StringValue | undefined;
    setContinuationtoken(value?: google_protobuf_wrappers_pb.StringValue): QueryEntitiesResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): QueryEntitiesResponse.AsObject;
    static toObject(includeInstance: boolean, msg: QueryEntitiesResponse): QueryEntitiesResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: QueryEntitiesResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): QueryEntitiesResponse;
    static deserializeBinaryFromReader(message: QueryEntitiesResponse, reader: jspb.BinaryReader): QueryEntitiesResponse;
}

export namespace QueryEntitiesResponse {
    export type AsObject = {
        entitiesList: Array<EntityMetadata.AsObject>,
        continuationtoken?: google_protobuf_wrappers_pb.StringValue.AsObject,
    }
}

export class EntityMetadata extends jspb.Message { 
    getInstanceid(): string;
    setInstanceid(value: string): EntityMetadata;

    hasLastmodifiedtime(): boolean;
    clearLastmodifiedtime(): void;
    getLastmodifiedtime(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setLastmodifiedtime(value?: google_protobuf_timestamp_pb.Timestamp): EntityMetadata;
    getBacklogqueuesize(): number;
    setBacklogqueuesize(value: number): EntityMetadata;

    hasLockedby(): boolean;
    clearLockedby(): void;
    getLockedby(): google_protobuf_wrappers_pb.StringValue | undefined;
    setLockedby(value?: google_protobuf_wrappers_pb.StringValue): EntityMetadata;

    hasSerializedstate(): boolean;
    clearSerializedstate(): void;
    getSerializedstate(): google_protobuf_wrappers_pb.StringValue | undefined;
    setSerializedstate(value?: google_protobuf_wrappers_pb.StringValue): EntityMetadata;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EntityMetadata.AsObject;
    static toObject(includeInstance: boolean, msg: EntityMetadata): EntityMetadata.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EntityMetadata, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EntityMetadata;
    static deserializeBinaryFromReader(message: EntityMetadata, reader: jspb.BinaryReader): EntityMetadata;
}

export namespace EntityMetadata {
    export type AsObject = {
        instanceid: string,
        lastmodifiedtime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
        backlogqueuesize: number,
        lockedby?: google_protobuf_wrappers_pb.StringValue.AsObject,
        serializedstate?: google_protobuf_wrappers_pb.StringValue.AsObject,
    }
}

export class CleanEntityStorageRequest extends jspb.Message { 

    hasContinuationtoken(): boolean;
    clearContinuationtoken(): void;
    getContinuationtoken(): google_protobuf_wrappers_pb.StringValue | undefined;
    setContinuationtoken(value?: google_protobuf_wrappers_pb.StringValue): CleanEntityStorageRequest;
    getRemoveemptyentities(): boolean;
    setRemoveemptyentities(value: boolean): CleanEntityStorageRequest;
    getReleaseorphanedlocks(): boolean;
    setReleaseorphanedlocks(value: boolean): CleanEntityStorageRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CleanEntityStorageRequest.AsObject;
    static toObject(includeInstance: boolean, msg: CleanEntityStorageRequest): CleanEntityStorageRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CleanEntityStorageRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CleanEntityStorageRequest;
    static deserializeBinaryFromReader(message: CleanEntityStorageRequest, reader: jspb.BinaryReader): CleanEntityStorageRequest;
}

export namespace CleanEntityStorageRequest {
    export type AsObject = {
        continuationtoken?: google_protobuf_wrappers_pb.StringValue.AsObject,
        removeemptyentities: boolean,
        releaseorphanedlocks: boolean,
    }
}

export class CleanEntityStorageResponse extends jspb.Message { 

    hasContinuationtoken(): boolean;
    clearContinuationtoken(): void;
    getContinuationtoken(): google_protobuf_wrappers_pb.StringValue | undefined;
    setContinuationtoken(value?: google_protobuf_wrappers_pb.StringValue): CleanEntityStorageResponse;
    getEmptyentitiesremoved(): number;
    setEmptyentitiesremoved(value: number): CleanEntityStorageResponse;
    getOrphanedlocksreleased(): number;
    setOrphanedlocksreleased(value: number): CleanEntityStorageResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CleanEntityStorageResponse.AsObject;
    static toObject(includeInstance: boolean, msg: CleanEntityStorageResponse): CleanEntityStorageResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CleanEntityStorageResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CleanEntityStorageResponse;
    static deserializeBinaryFromReader(message: CleanEntityStorageResponse, reader: jspb.BinaryReader): CleanEntityStorageResponse;
}

export namespace CleanEntityStorageResponse {
    export type AsObject = {
        continuationtoken?: google_protobuf_wrappers_pb.StringValue.AsObject,
        emptyentitiesremoved: number,
        orphanedlocksreleased: number,
    }
}

export class OrchestratorEntityParameters extends jspb.Message { 

    hasEntitymessagereorderwindow(): boolean;
    clearEntitymessagereorderwindow(): void;
    getEntitymessagereorderwindow(): google_protobuf_duration_pb.Duration | undefined;
    setEntitymessagereorderwindow(value?: google_protobuf_duration_pb.Duration): OrchestratorEntityParameters;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): OrchestratorEntityParameters.AsObject;
    static toObject(includeInstance: boolean, msg: OrchestratorEntityParameters): OrchestratorEntityParameters.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: OrchestratorEntityParameters, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): OrchestratorEntityParameters;
    static deserializeBinaryFromReader(message: OrchestratorEntityParameters, reader: jspb.BinaryReader): OrchestratorEntityParameters;
}

export namespace OrchestratorEntityParameters {
    export type AsObject = {
        entitymessagereorderwindow?: google_protobuf_duration_pb.Duration.AsObject,
    }
}

export class EntityBatchRequest extends jspb.Message { 
    getInstanceid(): string;
    setInstanceid(value: string): EntityBatchRequest;

    hasEntitystate(): boolean;
    clearEntitystate(): void;
    getEntitystate(): google_protobuf_wrappers_pb.StringValue | undefined;
    setEntitystate(value?: google_protobuf_wrappers_pb.StringValue): EntityBatchRequest;
    clearOperationsList(): void;
    getOperationsList(): Array<OperationRequest>;
    setOperationsList(value: Array<OperationRequest>): EntityBatchRequest;
    addOperations(value?: OperationRequest, index?: number): OperationRequest;

    getPropertiesMap(): jspb.Map<string, google_protobuf_struct_pb.Value>;
    clearPropertiesMap(): void;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EntityBatchRequest.AsObject;
    static toObject(includeInstance: boolean, msg: EntityBatchRequest): EntityBatchRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EntityBatchRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EntityBatchRequest;
    static deserializeBinaryFromReader(message: EntityBatchRequest, reader: jspb.BinaryReader): EntityBatchRequest;
}

export namespace EntityBatchRequest {
    export type AsObject = {
        instanceid: string,
        entitystate?: google_protobuf_wrappers_pb.StringValue.AsObject,
        operationsList: Array<OperationRequest.AsObject>,

        propertiesMap: Array<[string, google_protobuf_struct_pb.Value.AsObject]>,
    }
}

export class EntityBatchResult extends jspb.Message { 
    clearResultsList(): void;
    getResultsList(): Array<OperationResult>;
    setResultsList(value: Array<OperationResult>): EntityBatchResult;
    addResults(value?: OperationResult, index?: number): OperationResult;
    clearActionsList(): void;
    getActionsList(): Array<OperationAction>;
    setActionsList(value: Array<OperationAction>): EntityBatchResult;
    addActions(value?: OperationAction, index?: number): OperationAction;

    hasEntitystate(): boolean;
    clearEntitystate(): void;
    getEntitystate(): google_protobuf_wrappers_pb.StringValue | undefined;
    setEntitystate(value?: google_protobuf_wrappers_pb.StringValue): EntityBatchResult;

    hasFailuredetails(): boolean;
    clearFailuredetails(): void;
    getFailuredetails(): TaskFailureDetails | undefined;
    setFailuredetails(value?: TaskFailureDetails): EntityBatchResult;
    getCompletiontoken(): string;
    setCompletiontoken(value: string): EntityBatchResult;
    clearOperationinfosList(): void;
    getOperationinfosList(): Array<OperationInfo>;
    setOperationinfosList(value: Array<OperationInfo>): EntityBatchResult;
    addOperationinfos(value?: OperationInfo, index?: number): OperationInfo;
    getRequiresstate(): boolean;
    setRequiresstate(value: boolean): EntityBatchResult;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EntityBatchResult.AsObject;
    static toObject(includeInstance: boolean, msg: EntityBatchResult): EntityBatchResult.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EntityBatchResult, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EntityBatchResult;
    static deserializeBinaryFromReader(message: EntityBatchResult, reader: jspb.BinaryReader): EntityBatchResult;
}

export namespace EntityBatchResult {
    export type AsObject = {
        resultsList: Array<OperationResult.AsObject>,
        actionsList: Array<OperationAction.AsObject>,
        entitystate?: google_protobuf_wrappers_pb.StringValue.AsObject,
        failuredetails?: TaskFailureDetails.AsObject,
        completiontoken: string,
        operationinfosList: Array<OperationInfo.AsObject>,
        requiresstate: boolean,
    }
}

export class EntityRequest extends jspb.Message { 
    getInstanceid(): string;
    setInstanceid(value: string): EntityRequest;
    getExecutionid(): string;
    setExecutionid(value: string): EntityRequest;

    hasEntitystate(): boolean;
    clearEntitystate(): void;
    getEntitystate(): google_protobuf_wrappers_pb.StringValue | undefined;
    setEntitystate(value?: google_protobuf_wrappers_pb.StringValue): EntityRequest;
    clearOperationrequestsList(): void;
    getOperationrequestsList(): Array<HistoryEvent>;
    setOperationrequestsList(value: Array<HistoryEvent>): EntityRequest;
    addOperationrequests(value?: HistoryEvent, index?: number): HistoryEvent;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EntityRequest.AsObject;
    static toObject(includeInstance: boolean, msg: EntityRequest): EntityRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EntityRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EntityRequest;
    static deserializeBinaryFromReader(message: EntityRequest, reader: jspb.BinaryReader): EntityRequest;
}

export namespace EntityRequest {
    export type AsObject = {
        instanceid: string,
        executionid: string,
        entitystate?: google_protobuf_wrappers_pb.StringValue.AsObject,
        operationrequestsList: Array<HistoryEvent.AsObject>,
    }
}

export class OperationRequest extends jspb.Message { 
    getOperation(): string;
    setOperation(value: string): OperationRequest;
    getRequestid(): string;
    setRequestid(value: string): OperationRequest;

    hasInput(): boolean;
    clearInput(): void;
    getInput(): google_protobuf_wrappers_pb.StringValue | undefined;
    setInput(value?: google_protobuf_wrappers_pb.StringValue): OperationRequest;

    hasTracecontext(): boolean;
    clearTracecontext(): void;
    getTracecontext(): TraceContext | undefined;
    setTracecontext(value?: TraceContext): OperationRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): OperationRequest.AsObject;
    static toObject(includeInstance: boolean, msg: OperationRequest): OperationRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: OperationRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): OperationRequest;
    static deserializeBinaryFromReader(message: OperationRequest, reader: jspb.BinaryReader): OperationRequest;
}

export namespace OperationRequest {
    export type AsObject = {
        operation: string,
        requestid: string,
        input?: google_protobuf_wrappers_pb.StringValue.AsObject,
        tracecontext?: TraceContext.AsObject,
    }
}

export class OperationResult extends jspb.Message { 

    hasSuccess(): boolean;
    clearSuccess(): void;
    getSuccess(): OperationResultSuccess | undefined;
    setSuccess(value?: OperationResultSuccess): OperationResult;

    hasFailure(): boolean;
    clearFailure(): void;
    getFailure(): OperationResultFailure | undefined;
    setFailure(value?: OperationResultFailure): OperationResult;

    getResulttypeCase(): OperationResult.ResulttypeCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): OperationResult.AsObject;
    static toObject(includeInstance: boolean, msg: OperationResult): OperationResult.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: OperationResult, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): OperationResult;
    static deserializeBinaryFromReader(message: OperationResult, reader: jspb.BinaryReader): OperationResult;
}

export namespace OperationResult {
    export type AsObject = {
        success?: OperationResultSuccess.AsObject,
        failure?: OperationResultFailure.AsObject,
    }

    export enum ResulttypeCase {
        RESULTTYPE_NOT_SET = 0,
        SUCCESS = 1,
        FAILURE = 2,
    }

}

export class OperationInfo extends jspb.Message { 
    getRequestid(): string;
    setRequestid(value: string): OperationInfo;

    hasResponsedestination(): boolean;
    clearResponsedestination(): void;
    getResponsedestination(): OrchestrationInstance | undefined;
    setResponsedestination(value?: OrchestrationInstance): OperationInfo;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): OperationInfo.AsObject;
    static toObject(includeInstance: boolean, msg: OperationInfo): OperationInfo.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: OperationInfo, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): OperationInfo;
    static deserializeBinaryFromReader(message: OperationInfo, reader: jspb.BinaryReader): OperationInfo;
}

export namespace OperationInfo {
    export type AsObject = {
        requestid: string,
        responsedestination?: OrchestrationInstance.AsObject,
    }
}

export class OperationResultSuccess extends jspb.Message { 

    hasResult(): boolean;
    clearResult(): void;
    getResult(): google_protobuf_wrappers_pb.StringValue | undefined;
    setResult(value?: google_protobuf_wrappers_pb.StringValue): OperationResultSuccess;

    hasStarttimeutc(): boolean;
    clearStarttimeutc(): void;
    getStarttimeutc(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setStarttimeutc(value?: google_protobuf_timestamp_pb.Timestamp): OperationResultSuccess;

    hasEndtimeutc(): boolean;
    clearEndtimeutc(): void;
    getEndtimeutc(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setEndtimeutc(value?: google_protobuf_timestamp_pb.Timestamp): OperationResultSuccess;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): OperationResultSuccess.AsObject;
    static toObject(includeInstance: boolean, msg: OperationResultSuccess): OperationResultSuccess.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: OperationResultSuccess, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): OperationResultSuccess;
    static deserializeBinaryFromReader(message: OperationResultSuccess, reader: jspb.BinaryReader): OperationResultSuccess;
}

export namespace OperationResultSuccess {
    export type AsObject = {
        result?: google_protobuf_wrappers_pb.StringValue.AsObject,
        starttimeutc?: google_protobuf_timestamp_pb.Timestamp.AsObject,
        endtimeutc?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    }
}

export class OperationResultFailure extends jspb.Message { 

    hasFailuredetails(): boolean;
    clearFailuredetails(): void;
    getFailuredetails(): TaskFailureDetails | undefined;
    setFailuredetails(value?: TaskFailureDetails): OperationResultFailure;

    hasStarttimeutc(): boolean;
    clearStarttimeutc(): void;
    getStarttimeutc(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setStarttimeutc(value?: google_protobuf_timestamp_pb.Timestamp): OperationResultFailure;

    hasEndtimeutc(): boolean;
    clearEndtimeutc(): void;
    getEndtimeutc(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setEndtimeutc(value?: google_protobuf_timestamp_pb.Timestamp): OperationResultFailure;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): OperationResultFailure.AsObject;
    static toObject(includeInstance: boolean, msg: OperationResultFailure): OperationResultFailure.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: OperationResultFailure, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): OperationResultFailure;
    static deserializeBinaryFromReader(message: OperationResultFailure, reader: jspb.BinaryReader): OperationResultFailure;
}

export namespace OperationResultFailure {
    export type AsObject = {
        failuredetails?: TaskFailureDetails.AsObject,
        starttimeutc?: google_protobuf_timestamp_pb.Timestamp.AsObject,
        endtimeutc?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    }
}

export class OperationAction extends jspb.Message { 
    getId(): number;
    setId(value: number): OperationAction;

    hasSendsignal(): boolean;
    clearSendsignal(): void;
    getSendsignal(): SendSignalAction | undefined;
    setSendsignal(value?: SendSignalAction): OperationAction;

    hasStartneworchestration(): boolean;
    clearStartneworchestration(): void;
    getStartneworchestration(): StartNewOrchestrationAction | undefined;
    setStartneworchestration(value?: StartNewOrchestrationAction): OperationAction;

    getOperationactiontypeCase(): OperationAction.OperationactiontypeCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): OperationAction.AsObject;
    static toObject(includeInstance: boolean, msg: OperationAction): OperationAction.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: OperationAction, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): OperationAction;
    static deserializeBinaryFromReader(message: OperationAction, reader: jspb.BinaryReader): OperationAction;
}

export namespace OperationAction {
    export type AsObject = {
        id: number,
        sendsignal?: SendSignalAction.AsObject,
        startneworchestration?: StartNewOrchestrationAction.AsObject,
    }

    export enum OperationactiontypeCase {
        OPERATIONACTIONTYPE_NOT_SET = 0,
        SENDSIGNAL = 2,
        STARTNEWORCHESTRATION = 3,
    }

}

export class SendSignalAction extends jspb.Message { 
    getInstanceid(): string;
    setInstanceid(value: string): SendSignalAction;
    getName(): string;
    setName(value: string): SendSignalAction;

    hasInput(): boolean;
    clearInput(): void;
    getInput(): google_protobuf_wrappers_pb.StringValue | undefined;
    setInput(value?: google_protobuf_wrappers_pb.StringValue): SendSignalAction;

    hasScheduledtime(): boolean;
    clearScheduledtime(): void;
    getScheduledtime(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setScheduledtime(value?: google_protobuf_timestamp_pb.Timestamp): SendSignalAction;

    hasRequesttime(): boolean;
    clearRequesttime(): void;
    getRequesttime(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setRequesttime(value?: google_protobuf_timestamp_pb.Timestamp): SendSignalAction;

    hasParenttracecontext(): boolean;
    clearParenttracecontext(): void;
    getParenttracecontext(): TraceContext | undefined;
    setParenttracecontext(value?: TraceContext): SendSignalAction;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SendSignalAction.AsObject;
    static toObject(includeInstance: boolean, msg: SendSignalAction): SendSignalAction.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SendSignalAction, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SendSignalAction;
    static deserializeBinaryFromReader(message: SendSignalAction, reader: jspb.BinaryReader): SendSignalAction;
}

export namespace SendSignalAction {
    export type AsObject = {
        instanceid: string,
        name: string,
        input?: google_protobuf_wrappers_pb.StringValue.AsObject,
        scheduledtime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
        requesttime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
        parenttracecontext?: TraceContext.AsObject,
    }
}

export class StartNewOrchestrationAction extends jspb.Message { 
    getInstanceid(): string;
    setInstanceid(value: string): StartNewOrchestrationAction;
    getName(): string;
    setName(value: string): StartNewOrchestrationAction;

    hasVersion(): boolean;
    clearVersion(): void;
    getVersion(): google_protobuf_wrappers_pb.StringValue | undefined;
    setVersion(value?: google_protobuf_wrappers_pb.StringValue): StartNewOrchestrationAction;

    hasInput(): boolean;
    clearInput(): void;
    getInput(): google_protobuf_wrappers_pb.StringValue | undefined;
    setInput(value?: google_protobuf_wrappers_pb.StringValue): StartNewOrchestrationAction;

    hasScheduledtime(): boolean;
    clearScheduledtime(): void;
    getScheduledtime(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setScheduledtime(value?: google_protobuf_timestamp_pb.Timestamp): StartNewOrchestrationAction;

    hasRequesttime(): boolean;
    clearRequesttime(): void;
    getRequesttime(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setRequesttime(value?: google_protobuf_timestamp_pb.Timestamp): StartNewOrchestrationAction;

    hasParenttracecontext(): boolean;
    clearParenttracecontext(): void;
    getParenttracecontext(): TraceContext | undefined;
    setParenttracecontext(value?: TraceContext): StartNewOrchestrationAction;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): StartNewOrchestrationAction.AsObject;
    static toObject(includeInstance: boolean, msg: StartNewOrchestrationAction): StartNewOrchestrationAction.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: StartNewOrchestrationAction, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): StartNewOrchestrationAction;
    static deserializeBinaryFromReader(message: StartNewOrchestrationAction, reader: jspb.BinaryReader): StartNewOrchestrationAction;
}

export namespace StartNewOrchestrationAction {
    export type AsObject = {
        instanceid: string,
        name: string,
        version?: google_protobuf_wrappers_pb.StringValue.AsObject,
        input?: google_protobuf_wrappers_pb.StringValue.AsObject,
        scheduledtime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
        requesttime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
        parenttracecontext?: TraceContext.AsObject,
    }
}

export class AbandonActivityTaskRequest extends jspb.Message { 
    getCompletiontoken(): string;
    setCompletiontoken(value: string): AbandonActivityTaskRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AbandonActivityTaskRequest.AsObject;
    static toObject(includeInstance: boolean, msg: AbandonActivityTaskRequest): AbandonActivityTaskRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AbandonActivityTaskRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AbandonActivityTaskRequest;
    static deserializeBinaryFromReader(message: AbandonActivityTaskRequest, reader: jspb.BinaryReader): AbandonActivityTaskRequest;
}

export namespace AbandonActivityTaskRequest {
    export type AsObject = {
        completiontoken: string,
    }
}

export class AbandonActivityTaskResponse extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AbandonActivityTaskResponse.AsObject;
    static toObject(includeInstance: boolean, msg: AbandonActivityTaskResponse): AbandonActivityTaskResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AbandonActivityTaskResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AbandonActivityTaskResponse;
    static deserializeBinaryFromReader(message: AbandonActivityTaskResponse, reader: jspb.BinaryReader): AbandonActivityTaskResponse;
}

export namespace AbandonActivityTaskResponse {
    export type AsObject = {
    }
}

export class AbandonOrchestrationTaskRequest extends jspb.Message { 
    getCompletiontoken(): string;
    setCompletiontoken(value: string): AbandonOrchestrationTaskRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AbandonOrchestrationTaskRequest.AsObject;
    static toObject(includeInstance: boolean, msg: AbandonOrchestrationTaskRequest): AbandonOrchestrationTaskRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AbandonOrchestrationTaskRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AbandonOrchestrationTaskRequest;
    static deserializeBinaryFromReader(message: AbandonOrchestrationTaskRequest, reader: jspb.BinaryReader): AbandonOrchestrationTaskRequest;
}

export namespace AbandonOrchestrationTaskRequest {
    export type AsObject = {
        completiontoken: string,
    }
}

export class AbandonOrchestrationTaskResponse extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AbandonOrchestrationTaskResponse.AsObject;
    static toObject(includeInstance: boolean, msg: AbandonOrchestrationTaskResponse): AbandonOrchestrationTaskResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AbandonOrchestrationTaskResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AbandonOrchestrationTaskResponse;
    static deserializeBinaryFromReader(message: AbandonOrchestrationTaskResponse, reader: jspb.BinaryReader): AbandonOrchestrationTaskResponse;
}

export namespace AbandonOrchestrationTaskResponse {
    export type AsObject = {
    }
}

export class AbandonEntityTaskRequest extends jspb.Message { 
    getCompletiontoken(): string;
    setCompletiontoken(value: string): AbandonEntityTaskRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AbandonEntityTaskRequest.AsObject;
    static toObject(includeInstance: boolean, msg: AbandonEntityTaskRequest): AbandonEntityTaskRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AbandonEntityTaskRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AbandonEntityTaskRequest;
    static deserializeBinaryFromReader(message: AbandonEntityTaskRequest, reader: jspb.BinaryReader): AbandonEntityTaskRequest;
}

export namespace AbandonEntityTaskRequest {
    export type AsObject = {
        completiontoken: string,
    }
}

export class AbandonEntityTaskResponse extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AbandonEntityTaskResponse.AsObject;
    static toObject(includeInstance: boolean, msg: AbandonEntityTaskResponse): AbandonEntityTaskResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AbandonEntityTaskResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AbandonEntityTaskResponse;
    static deserializeBinaryFromReader(message: AbandonEntityTaskResponse, reader: jspb.BinaryReader): AbandonEntityTaskResponse;
}

export namespace AbandonEntityTaskResponse {
    export type AsObject = {
    }
}

export class SkipGracefulOrchestrationTerminationsRequest extends jspb.Message { 

    hasInstancebatch(): boolean;
    clearInstancebatch(): void;
    getInstancebatch(): InstanceBatch | undefined;
    setInstancebatch(value?: InstanceBatch): SkipGracefulOrchestrationTerminationsRequest;

    hasReason(): boolean;
    clearReason(): void;
    getReason(): google_protobuf_wrappers_pb.StringValue | undefined;
    setReason(value?: google_protobuf_wrappers_pb.StringValue): SkipGracefulOrchestrationTerminationsRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SkipGracefulOrchestrationTerminationsRequest.AsObject;
    static toObject(includeInstance: boolean, msg: SkipGracefulOrchestrationTerminationsRequest): SkipGracefulOrchestrationTerminationsRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SkipGracefulOrchestrationTerminationsRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SkipGracefulOrchestrationTerminationsRequest;
    static deserializeBinaryFromReader(message: SkipGracefulOrchestrationTerminationsRequest, reader: jspb.BinaryReader): SkipGracefulOrchestrationTerminationsRequest;
}

export namespace SkipGracefulOrchestrationTerminationsRequest {
    export type AsObject = {
        instancebatch?: InstanceBatch.AsObject,
        reason?: google_protobuf_wrappers_pb.StringValue.AsObject,
    }
}

export class SkipGracefulOrchestrationTerminationsResponse extends jspb.Message { 
    clearUnterminatedinstanceidsList(): void;
    getUnterminatedinstanceidsList(): Array<string>;
    setUnterminatedinstanceidsList(value: Array<string>): SkipGracefulOrchestrationTerminationsResponse;
    addUnterminatedinstanceids(value: string, index?: number): string;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SkipGracefulOrchestrationTerminationsResponse.AsObject;
    static toObject(includeInstance: boolean, msg: SkipGracefulOrchestrationTerminationsResponse): SkipGracefulOrchestrationTerminationsResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SkipGracefulOrchestrationTerminationsResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SkipGracefulOrchestrationTerminationsResponse;
    static deserializeBinaryFromReader(message: SkipGracefulOrchestrationTerminationsResponse, reader: jspb.BinaryReader): SkipGracefulOrchestrationTerminationsResponse;
}

export namespace SkipGracefulOrchestrationTerminationsResponse {
    export type AsObject = {
        unterminatedinstanceidsList: Array<string>,
    }
}

export class GetWorkItemsRequest extends jspb.Message { 
    getMaxconcurrentorchestrationworkitems(): number;
    setMaxconcurrentorchestrationworkitems(value: number): GetWorkItemsRequest;
    getMaxconcurrentactivityworkitems(): number;
    setMaxconcurrentactivityworkitems(value: number): GetWorkItemsRequest;
    getMaxconcurrententityworkitems(): number;
    setMaxconcurrententityworkitems(value: number): GetWorkItemsRequest;
    clearCapabilitiesList(): void;
    getCapabilitiesList(): Array<WorkerCapability>;
    setCapabilitiesList(value: Array<WorkerCapability>): GetWorkItemsRequest;
    addCapabilities(value: WorkerCapability, index?: number): WorkerCapability;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetWorkItemsRequest.AsObject;
    static toObject(includeInstance: boolean, msg: GetWorkItemsRequest): GetWorkItemsRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetWorkItemsRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetWorkItemsRequest;
    static deserializeBinaryFromReader(message: GetWorkItemsRequest, reader: jspb.BinaryReader): GetWorkItemsRequest;
}

export namespace GetWorkItemsRequest {
    export type AsObject = {
        maxconcurrentorchestrationworkitems: number,
        maxconcurrentactivityworkitems: number,
        maxconcurrententityworkitems: number,
        capabilitiesList: Array<WorkerCapability>,
    }
}

export class WorkItem extends jspb.Message { 

    hasOrchestratorrequest(): boolean;
    clearOrchestratorrequest(): void;
    getOrchestratorrequest(): OrchestratorRequest | undefined;
    setOrchestratorrequest(value?: OrchestratorRequest): WorkItem;

    hasActivityrequest(): boolean;
    clearActivityrequest(): void;
    getActivityrequest(): ActivityRequest | undefined;
    setActivityrequest(value?: ActivityRequest): WorkItem;

    hasEntityrequest(): boolean;
    clearEntityrequest(): void;
    getEntityrequest(): EntityBatchRequest | undefined;
    setEntityrequest(value?: EntityBatchRequest): WorkItem;

    hasHealthping(): boolean;
    clearHealthping(): void;
    getHealthping(): HealthPing | undefined;
    setHealthping(value?: HealthPing): WorkItem;

    hasEntityrequestv2(): boolean;
    clearEntityrequestv2(): void;
    getEntityrequestv2(): EntityRequest | undefined;
    setEntityrequestv2(value?: EntityRequest): WorkItem;
    getCompletiontoken(): string;
    setCompletiontoken(value: string): WorkItem;

    getRequestCase(): WorkItem.RequestCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): WorkItem.AsObject;
    static toObject(includeInstance: boolean, msg: WorkItem): WorkItem.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: WorkItem, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): WorkItem;
    static deserializeBinaryFromReader(message: WorkItem, reader: jspb.BinaryReader): WorkItem;
}

export namespace WorkItem {
    export type AsObject = {
        orchestratorrequest?: OrchestratorRequest.AsObject,
        activityrequest?: ActivityRequest.AsObject,
        entityrequest?: EntityBatchRequest.AsObject,
        healthping?: HealthPing.AsObject,
        entityrequestv2?: EntityRequest.AsObject,
        completiontoken: string,
    }

    export enum RequestCase {
        REQUEST_NOT_SET = 0,
        ORCHESTRATORREQUEST = 1,
        ACTIVITYREQUEST = 2,
        ENTITYREQUEST = 3,
        HEALTHPING = 4,
        ENTITYREQUESTV2 = 5,
    }

}

export class CompleteTaskResponse extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CompleteTaskResponse.AsObject;
    static toObject(includeInstance: boolean, msg: CompleteTaskResponse): CompleteTaskResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CompleteTaskResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CompleteTaskResponse;
    static deserializeBinaryFromReader(message: CompleteTaskResponse, reader: jspb.BinaryReader): CompleteTaskResponse;
}

export namespace CompleteTaskResponse {
    export type AsObject = {
    }
}

export class HealthPing extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): HealthPing.AsObject;
    static toObject(includeInstance: boolean, msg: HealthPing): HealthPing.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: HealthPing, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): HealthPing;
    static deserializeBinaryFromReader(message: HealthPing, reader: jspb.BinaryReader): HealthPing;
}

export namespace HealthPing {
    export type AsObject = {
    }
}

export class StreamInstanceHistoryRequest extends jspb.Message { 
    getInstanceid(): string;
    setInstanceid(value: string): StreamInstanceHistoryRequest;

    hasExecutionid(): boolean;
    clearExecutionid(): void;
    getExecutionid(): google_protobuf_wrappers_pb.StringValue | undefined;
    setExecutionid(value?: google_protobuf_wrappers_pb.StringValue): StreamInstanceHistoryRequest;
    getForworkitemprocessing(): boolean;
    setForworkitemprocessing(value: boolean): StreamInstanceHistoryRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): StreamInstanceHistoryRequest.AsObject;
    static toObject(includeInstance: boolean, msg: StreamInstanceHistoryRequest): StreamInstanceHistoryRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: StreamInstanceHistoryRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): StreamInstanceHistoryRequest;
    static deserializeBinaryFromReader(message: StreamInstanceHistoryRequest, reader: jspb.BinaryReader): StreamInstanceHistoryRequest;
}

export namespace StreamInstanceHistoryRequest {
    export type AsObject = {
        instanceid: string,
        executionid?: google_protobuf_wrappers_pb.StringValue.AsObject,
        forworkitemprocessing: boolean,
    }
}

export class HistoryChunk extends jspb.Message { 
    clearEventsList(): void;
    getEventsList(): Array<HistoryEvent>;
    setEventsList(value: Array<HistoryEvent>): HistoryChunk;
    addEvents(value?: HistoryEvent, index?: number): HistoryEvent;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): HistoryChunk.AsObject;
    static toObject(includeInstance: boolean, msg: HistoryChunk): HistoryChunk.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: HistoryChunk, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): HistoryChunk;
    static deserializeBinaryFromReader(message: HistoryChunk, reader: jspb.BinaryReader): HistoryChunk;
}

export namespace HistoryChunk {
    export type AsObject = {
        eventsList: Array<HistoryEvent.AsObject>,
    }
}

export class InstanceBatch extends jspb.Message { 
    clearInstanceidsList(): void;
    getInstanceidsList(): Array<string>;
    setInstanceidsList(value: Array<string>): InstanceBatch;
    addInstanceids(value: string, index?: number): string;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): InstanceBatch.AsObject;
    static toObject(includeInstance: boolean, msg: InstanceBatch): InstanceBatch.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: InstanceBatch, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): InstanceBatch;
    static deserializeBinaryFromReader(message: InstanceBatch, reader: jspb.BinaryReader): InstanceBatch;
}

export namespace InstanceBatch {
    export type AsObject = {
        instanceidsList: Array<string>,
    }
}

export enum OrchestrationStatus {
    ORCHESTRATION_STATUS_RUNNING = 0,
    ORCHESTRATION_STATUS_COMPLETED = 1,
    ORCHESTRATION_STATUS_CONTINUED_AS_NEW = 2,
    ORCHESTRATION_STATUS_FAILED = 3,
    ORCHESTRATION_STATUS_CANCELED = 4,
    ORCHESTRATION_STATUS_TERMINATED = 5,
    ORCHESTRATION_STATUS_PENDING = 6,
    ORCHESTRATION_STATUS_SUSPENDED = 7,
}

export enum WorkerCapability {
    WORKER_CAPABILITY_UNSPECIFIED = 0,
    WORKER_CAPABILITY_HISTORY_STREAMING = 1,
    WORKER_CAPABILITY_SCHEDULED_TASKS = 2,
    WORKER_CAPABILITY_LARGE_PAYLOADS = 3,
}
