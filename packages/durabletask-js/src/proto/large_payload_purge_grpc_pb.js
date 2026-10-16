// GENERATED CODE -- DO NOT EDIT!

// Original file comments:
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
//
// DTS-only contract from durabletask-dotnet 91739687ff647699079cdadd627daa00562982b7.
//
'use strict';
var grpc = require('@grpc/grpc-js');
var large_payload_purge_pb = require('./large_payload_purge_pb.js');

function serialize_microsoft_durabletask_largepayloads_GetLargePayloadTombstonesRequest(arg) {
  if (!(arg instanceof large_payload_purge_pb.GetLargePayloadTombstonesRequest)) {
    throw new Error('Expected argument of type microsoft.durabletask.largepayloads.GetLargePayloadTombstonesRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_microsoft_durabletask_largepayloads_GetLargePayloadTombstonesRequest(buffer_arg) {
  return large_payload_purge_pb.GetLargePayloadTombstonesRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_microsoft_durabletask_largepayloads_GetLargePayloadTombstonesResponse(arg) {
  if (!(arg instanceof large_payload_purge_pb.GetLargePayloadTombstonesResponse)) {
    throw new Error('Expected argument of type microsoft.durabletask.largepayloads.GetLargePayloadTombstonesResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_microsoft_durabletask_largepayloads_GetLargePayloadTombstonesResponse(buffer_arg) {
  return large_payload_purge_pb.GetLargePayloadTombstonesResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_microsoft_durabletask_largepayloads_ReportLargePayloadPurgeResultsRequest(arg) {
  if (!(arg instanceof large_payload_purge_pb.ReportLargePayloadPurgeResultsRequest)) {
    throw new Error('Expected argument of type microsoft.durabletask.largepayloads.ReportLargePayloadPurgeResultsRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_microsoft_durabletask_largepayloads_ReportLargePayloadPurgeResultsRequest(buffer_arg) {
  return large_payload_purge_pb.ReportLargePayloadPurgeResultsRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_microsoft_durabletask_largepayloads_ReportLargePayloadPurgeResultsResponse(arg) {
  if (!(arg instanceof large_payload_purge_pb.ReportLargePayloadPurgeResultsResponse)) {
    throw new Error('Expected argument of type microsoft.durabletask.largepayloads.ReportLargePayloadPurgeResultsResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_microsoft_durabletask_largepayloads_ReportLargePayloadPurgeResultsResponse(buffer_arg) {
  return large_payload_purge_pb.ReportLargePayloadPurgeResultsResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_microsoft_durabletask_largepayloads_SetLargePayloadAutoPurgeRequest(arg) {
  if (!(arg instanceof large_payload_purge_pb.SetLargePayloadAutoPurgeRequest)) {
    throw new Error('Expected argument of type microsoft.durabletask.largepayloads.SetLargePayloadAutoPurgeRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_microsoft_durabletask_largepayloads_SetLargePayloadAutoPurgeRequest(buffer_arg) {
  return large_payload_purge_pb.SetLargePayloadAutoPurgeRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_microsoft_durabletask_largepayloads_SetLargePayloadAutoPurgeResponse(arg) {
  if (!(arg instanceof large_payload_purge_pb.SetLargePayloadAutoPurgeResponse)) {
    throw new Error('Expected argument of type microsoft.durabletask.largepayloads.SetLargePayloadAutoPurgeResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_microsoft_durabletask_largepayloads_SetLargePayloadAutoPurgeResponse(buffer_arg) {
  return large_payload_purge_pb.SetLargePayloadAutoPurgeResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


// The backend owns the tombstone ledger, task-hub setting, and retry scheduling.
// The credentialed worker performs ownership-checked blob deletes and reports outcomes.
var LargePayloadPurgeService = exports.LargePayloadPurgeService = {
  setLargePayloadAutoPurge: {
    path: '/microsoft.durabletask.largepayloads.LargePayloadPurge/SetLargePayloadAutoPurge',
    requestStream: false,
    responseStream: false,
    requestType: large_payload_purge_pb.SetLargePayloadAutoPurgeRequest,
    responseType: large_payload_purge_pb.SetLargePayloadAutoPurgeResponse,
    requestSerialize: serialize_microsoft_durabletask_largepayloads_SetLargePayloadAutoPurgeRequest,
    requestDeserialize: deserialize_microsoft_durabletask_largepayloads_SetLargePayloadAutoPurgeRequest,
    responseSerialize: serialize_microsoft_durabletask_largepayloads_SetLargePayloadAutoPurgeResponse,
    responseDeserialize: deserialize_microsoft_durabletask_largepayloads_SetLargePayloadAutoPurgeResponse,
  },
  getLargePayloadTombstones: {
    path: '/microsoft.durabletask.largepayloads.LargePayloadPurge/GetLargePayloadTombstones',
    requestStream: false,
    responseStream: false,
    requestType: large_payload_purge_pb.GetLargePayloadTombstonesRequest,
    responseType: large_payload_purge_pb.GetLargePayloadTombstonesResponse,
    requestSerialize: serialize_microsoft_durabletask_largepayloads_GetLargePayloadTombstonesRequest,
    requestDeserialize: deserialize_microsoft_durabletask_largepayloads_GetLargePayloadTombstonesRequest,
    responseSerialize: serialize_microsoft_durabletask_largepayloads_GetLargePayloadTombstonesResponse,
    responseDeserialize: deserialize_microsoft_durabletask_largepayloads_GetLargePayloadTombstonesResponse,
  },
  reportLargePayloadPurgeResults: {
    path: '/microsoft.durabletask.largepayloads.LargePayloadPurge/ReportLargePayloadPurgeResults',
    requestStream: false,
    responseStream: false,
    requestType: large_payload_purge_pb.ReportLargePayloadPurgeResultsRequest,
    responseType: large_payload_purge_pb.ReportLargePayloadPurgeResultsResponse,
    requestSerialize: serialize_microsoft_durabletask_largepayloads_ReportLargePayloadPurgeResultsRequest,
    requestDeserialize: deserialize_microsoft_durabletask_largepayloads_ReportLargePayloadPurgeResultsRequest,
    responseSerialize: serialize_microsoft_durabletask_largepayloads_ReportLargePayloadPurgeResultsResponse,
    responseDeserialize: deserialize_microsoft_durabletask_largepayloads_ReportLargePayloadPurgeResultsResponse,
  },
};

exports.LargePayloadPurgeClient = grpc.makeGenericClientConstructor(LargePayloadPurgeService, 'LargePayloadPurge');
