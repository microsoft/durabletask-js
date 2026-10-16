// package: microsoft.durabletask.largepayloads
// file: large_payload_purge.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class SetLargePayloadAutoPurgeRequest extends jspb.Message {
    getEnabled(): boolean;
    setEnabled(value: boolean): SetLargePayloadAutoPurgeRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SetLargePayloadAutoPurgeRequest.AsObject;
    static toObject(includeInstance: boolean, msg: SetLargePayloadAutoPurgeRequest): SetLargePayloadAutoPurgeRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SetLargePayloadAutoPurgeRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SetLargePayloadAutoPurgeRequest;
    static deserializeBinaryFromReader(message: SetLargePayloadAutoPurgeRequest, reader: jspb.BinaryReader): SetLargePayloadAutoPurgeRequest;
}

export namespace SetLargePayloadAutoPurgeRequest {
    export type AsObject = {
        enabled: boolean,
    }
}

export class SetLargePayloadAutoPurgeResponse extends jspb.Message {

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SetLargePayloadAutoPurgeResponse.AsObject;
    static toObject(includeInstance: boolean, msg: SetLargePayloadAutoPurgeResponse): SetLargePayloadAutoPurgeResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SetLargePayloadAutoPurgeResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SetLargePayloadAutoPurgeResponse;
    static deserializeBinaryFromReader(message: SetLargePayloadAutoPurgeResponse, reader: jspb.BinaryReader): SetLargePayloadAutoPurgeResponse;
}

export namespace SetLargePayloadAutoPurgeResponse {
    export type AsObject = {
    }
}

export class LargePayloadTombstone extends jspb.Message {
    getTombstoneToken(): string;
    setTombstoneToken(value: string): LargePayloadTombstone;
    getPayloadToken(): string;
    setPayloadToken(value: string): LargePayloadTombstone;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): LargePayloadTombstone.AsObject;
    static toObject(includeInstance: boolean, msg: LargePayloadTombstone): LargePayloadTombstone.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: LargePayloadTombstone, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): LargePayloadTombstone;
    static deserializeBinaryFromReader(message: LargePayloadTombstone, reader: jspb.BinaryReader): LargePayloadTombstone;
}

export namespace LargePayloadTombstone {
    export type AsObject = {
        tombstoneToken: string,
        payloadToken: string,
    }
}

export class LargePayloadPurgeResult extends jspb.Message {
    getTombstoneToken(): string;
    setTombstoneToken(value: string): LargePayloadPurgeResult;
    getDisposition(): LargePayloadPurgeDisposition;
    setDisposition(value: LargePayloadPurgeDisposition): LargePayloadPurgeResult;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): LargePayloadPurgeResult.AsObject;
    static toObject(includeInstance: boolean, msg: LargePayloadPurgeResult): LargePayloadPurgeResult.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: LargePayloadPurgeResult, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): LargePayloadPurgeResult;
    static deserializeBinaryFromReader(message: LargePayloadPurgeResult, reader: jspb.BinaryReader): LargePayloadPurgeResult;
}

export namespace LargePayloadPurgeResult {
    export type AsObject = {
        tombstoneToken: string,
        disposition: LargePayloadPurgeDisposition,
    }
}

export class GetLargePayloadTombstonesRequest extends jspb.Message {
    getLimit(): number;
    setLimit(value: number): GetLargePayloadTombstonesRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetLargePayloadTombstonesRequest.AsObject;
    static toObject(includeInstance: boolean, msg: GetLargePayloadTombstonesRequest): GetLargePayloadTombstonesRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetLargePayloadTombstonesRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetLargePayloadTombstonesRequest;
    static deserializeBinaryFromReader(message: GetLargePayloadTombstonesRequest, reader: jspb.BinaryReader): GetLargePayloadTombstonesRequest;
}

export namespace GetLargePayloadTombstonesRequest {
    export type AsObject = {
        limit: number,
    }
}

export class GetLargePayloadTombstonesResponse extends jspb.Message {
    clearTombstonesList(): void;
    getTombstonesList(): Array<LargePayloadTombstone>;
    setTombstonesList(value: Array<LargePayloadTombstone>): GetLargePayloadTombstonesResponse;
    addTombstones(value?: LargePayloadTombstone, index?: number): LargePayloadTombstone;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetLargePayloadTombstonesResponse.AsObject;
    static toObject(includeInstance: boolean, msg: GetLargePayloadTombstonesResponse): GetLargePayloadTombstonesResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetLargePayloadTombstonesResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetLargePayloadTombstonesResponse;
    static deserializeBinaryFromReader(message: GetLargePayloadTombstonesResponse, reader: jspb.BinaryReader): GetLargePayloadTombstonesResponse;
}

export namespace GetLargePayloadTombstonesResponse {
    export type AsObject = {
        tombstonesList: Array<LargePayloadTombstone.AsObject>,
    }
}

export class ReportLargePayloadPurgeResultsRequest extends jspb.Message {
    clearResultsList(): void;
    getResultsList(): Array<LargePayloadPurgeResult>;
    setResultsList(value: Array<LargePayloadPurgeResult>): ReportLargePayloadPurgeResultsRequest;
    addResults(value?: LargePayloadPurgeResult, index?: number): LargePayloadPurgeResult;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ReportLargePayloadPurgeResultsRequest.AsObject;
    static toObject(includeInstance: boolean, msg: ReportLargePayloadPurgeResultsRequest): ReportLargePayloadPurgeResultsRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ReportLargePayloadPurgeResultsRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ReportLargePayloadPurgeResultsRequest;
    static deserializeBinaryFromReader(message: ReportLargePayloadPurgeResultsRequest, reader: jspb.BinaryReader): ReportLargePayloadPurgeResultsRequest;
}

export namespace ReportLargePayloadPurgeResultsRequest {
    export type AsObject = {
        resultsList: Array<LargePayloadPurgeResult.AsObject>,
    }
}

export class ReportLargePayloadPurgeResultsResponse extends jspb.Message {

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ReportLargePayloadPurgeResultsResponse.AsObject;
    static toObject(includeInstance: boolean, msg: ReportLargePayloadPurgeResultsResponse): ReportLargePayloadPurgeResultsResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ReportLargePayloadPurgeResultsResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ReportLargePayloadPurgeResultsResponse;
    static deserializeBinaryFromReader(message: ReportLargePayloadPurgeResultsResponse, reader: jspb.BinaryReader): ReportLargePayloadPurgeResultsResponse;
}

export namespace ReportLargePayloadPurgeResultsResponse {
    export type AsObject = {
    }
}

export enum LargePayloadPurgeDisposition {
    LARGE_PAYLOAD_PURGE_DISPOSITION_UNSPECIFIED = 0,
    LARGE_PAYLOAD_PURGE_DISPOSITION_DELETED = 1,
    LARGE_PAYLOAD_PURGE_DISPOSITION_RETRY = 2,
    LARGE_PAYLOAD_PURGE_DISPOSITION_QUARANTINED = 3,
}
