// source: orchestrator_service.proto
/**
 * @fileoverview
 * @enhanceable
 * @suppress {missingRequire} reports error on implicit type usages.
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!
/* eslint-disable */
// @ts-nocheck

var jspb = require('google-protobuf');
var goog = jspb;
var global = (function() {
  if (this) { return this; }
  if (typeof window !== 'undefined') { return window; }
  if (typeof global !== 'undefined') { return global; }
  if (typeof self !== 'undefined') { return self; }
  return Function('return this')();
}.call(null));

var google_protobuf_timestamp_pb = require('google-protobuf/google/protobuf/timestamp_pb.js');
goog.object.extend(proto, google_protobuf_timestamp_pb);
var google_protobuf_duration_pb = require('google-protobuf/google/protobuf/duration_pb.js');
goog.object.extend(proto, google_protobuf_duration_pb);
var google_protobuf_wrappers_pb = require('google-protobuf/google/protobuf/wrappers_pb.js');
goog.object.extend(proto, google_protobuf_wrappers_pb);
var google_protobuf_empty_pb = require('google-protobuf/google/protobuf/empty_pb.js');
goog.object.extend(proto, google_protobuf_empty_pb);
var google_protobuf_struct_pb = require('google-protobuf/google/protobuf/struct_pb.js');
goog.object.extend(proto, google_protobuf_struct_pb);
goog.exportSymbol('proto.AbandonActivityTaskRequest', null, global);
goog.exportSymbol('proto.AbandonActivityTaskResponse', null, global);
goog.exportSymbol('proto.AbandonEntityTaskRequest', null, global);
goog.exportSymbol('proto.AbandonEntityTaskResponse', null, global);
goog.exportSymbol('proto.AbandonOrchestrationTaskRequest', null, global);
goog.exportSymbol('proto.AbandonOrchestrationTaskResponse', null, global);
goog.exportSymbol('proto.ActivityRequest', null, global);
goog.exportSymbol('proto.ActivityResponse', null, global);
goog.exportSymbol('proto.CleanEntityStorageRequest', null, global);
goog.exportSymbol('proto.CleanEntityStorageResponse', null, global);
goog.exportSymbol('proto.CompleteOrchestrationAction', null, global);
goog.exportSymbol('proto.CompleteTaskResponse', null, global);
goog.exportSymbol('proto.ContinueAsNewEvent', null, global);
goog.exportSymbol('proto.CreateInstanceRequest', null, global);
goog.exportSymbol('proto.CreateInstanceResponse', null, global);
goog.exportSymbol('proto.CreateSubOrchestrationAction', null, global);
goog.exportSymbol('proto.CreateTaskHubRequest', null, global);
goog.exportSymbol('proto.CreateTaskHubResponse', null, global);
goog.exportSymbol('proto.CreateTimerAction', null, global);
goog.exportSymbol('proto.DeleteTaskHubRequest', null, global);
goog.exportSymbol('proto.DeleteTaskHubResponse', null, global);
goog.exportSymbol('proto.EntityBatchRequest', null, global);
goog.exportSymbol('proto.EntityBatchResult', null, global);
goog.exportSymbol('proto.EntityLockGrantedEvent', null, global);
goog.exportSymbol('proto.EntityLockRequestedEvent', null, global);
goog.exportSymbol('proto.EntityMetadata', null, global);
goog.exportSymbol('proto.EntityOperationCalledEvent', null, global);
goog.exportSymbol('proto.EntityOperationCompletedEvent', null, global);
goog.exportSymbol('proto.EntityOperationFailedEvent', null, global);
goog.exportSymbol('proto.EntityOperationSignaledEvent', null, global);
goog.exportSymbol('proto.EntityQuery', null, global);
goog.exportSymbol('proto.EntityRequest', null, global);
goog.exportSymbol('proto.EntityUnlockSentEvent', null, global);
goog.exportSymbol('proto.EventRaisedEvent', null, global);
goog.exportSymbol('proto.EventSentEvent', null, global);
goog.exportSymbol('proto.ExecutionCompletedEvent', null, global);
goog.exportSymbol('proto.ExecutionResumedEvent', null, global);
goog.exportSymbol('proto.ExecutionRewoundEvent', null, global);
goog.exportSymbol('proto.ExecutionStartedEvent', null, global);
goog.exportSymbol('proto.ExecutionSuspendedEvent', null, global);
goog.exportSymbol('proto.ExecutionTerminatedEvent', null, global);
goog.exportSymbol('proto.GenericEvent', null, global);
goog.exportSymbol('proto.GetEntityRequest', null, global);
goog.exportSymbol('proto.GetEntityResponse', null, global);
goog.exportSymbol('proto.GetInstanceRequest', null, global);
goog.exportSymbol('proto.GetInstanceResponse', null, global);
goog.exportSymbol('proto.GetWorkItemsRequest', null, global);
goog.exportSymbol('proto.HealthPing', null, global);
goog.exportSymbol('proto.HistoryChunk', null, global);
goog.exportSymbol('proto.HistoryEvent', null, global);
goog.exportSymbol('proto.HistoryEvent.EventtypeCase', null, global);
goog.exportSymbol('proto.HistoryStateEvent', null, global);
goog.exportSymbol('proto.InstanceBatch', null, global);
goog.exportSymbol('proto.InstanceQuery', null, global);
goog.exportSymbol('proto.ListInstanceIdsRequest', null, global);
goog.exportSymbol('proto.ListInstanceIdsResponse', null, global);
goog.exportSymbol('proto.OperationAction', null, global);
goog.exportSymbol('proto.OperationAction.OperationactiontypeCase', null, global);
goog.exportSymbol('proto.OperationInfo', null, global);
goog.exportSymbol('proto.OperationRequest', null, global);
goog.exportSymbol('proto.OperationResult', null, global);
goog.exportSymbol('proto.OperationResult.ResulttypeCase', null, global);
goog.exportSymbol('proto.OperationResultFailure', null, global);
goog.exportSymbol('proto.OperationResultSuccess', null, global);
goog.exportSymbol('proto.OrchestrationIdReusePolicy', null, global);
goog.exportSymbol('proto.OrchestrationInstance', null, global);
goog.exportSymbol('proto.OrchestrationState', null, global);
goog.exportSymbol('proto.OrchestrationStatus', null, global);
goog.exportSymbol('proto.OrchestrationTraceContext', null, global);
goog.exportSymbol('proto.OrchestratorAction', null, global);
goog.exportSymbol('proto.OrchestratorAction.OrchestratoractiontypeCase', null, global);
goog.exportSymbol('proto.OrchestratorCompletedEvent', null, global);
goog.exportSymbol('proto.OrchestratorEntityParameters', null, global);
goog.exportSymbol('proto.OrchestratorRequest', null, global);
goog.exportSymbol('proto.OrchestratorResponse', null, global);
goog.exportSymbol('proto.OrchestratorStartedEvent', null, global);
goog.exportSymbol('proto.ParentInstanceInfo', null, global);
goog.exportSymbol('proto.PurgeInstanceFilter', null, global);
goog.exportSymbol('proto.PurgeInstancesRequest', null, global);
goog.exportSymbol('proto.PurgeInstancesRequest.RequestCase', null, global);
goog.exportSymbol('proto.PurgeInstancesResponse', null, global);
goog.exportSymbol('proto.QueryEntitiesRequest', null, global);
goog.exportSymbol('proto.QueryEntitiesResponse', null, global);
goog.exportSymbol('proto.QueryInstancesRequest', null, global);
goog.exportSymbol('proto.QueryInstancesResponse', null, global);
goog.exportSymbol('proto.RaiseEventRequest', null, global);
goog.exportSymbol('proto.RaiseEventResponse', null, global);
goog.exportSymbol('proto.RestartInstanceRequest', null, global);
goog.exportSymbol('proto.RestartInstanceResponse', null, global);
goog.exportSymbol('proto.ResumeRequest', null, global);
goog.exportSymbol('proto.ResumeResponse', null, global);
goog.exportSymbol('proto.RewindInstanceRequest', null, global);
goog.exportSymbol('proto.RewindInstanceResponse', null, global);
goog.exportSymbol('proto.ScheduleTaskAction', null, global);
goog.exportSymbol('proto.SendEntityMessageAction', null, global);
goog.exportSymbol('proto.SendEntityMessageAction.EntitymessagetypeCase', null, global);
goog.exportSymbol('proto.SendEventAction', null, global);
goog.exportSymbol('proto.SendSignalAction', null, global);
goog.exportSymbol('proto.SignalEntityRequest', null, global);
goog.exportSymbol('proto.SignalEntityResponse', null, global);
goog.exportSymbol('proto.SkipGracefulOrchestrationTerminationsRequest', null, global);
goog.exportSymbol('proto.SkipGracefulOrchestrationTerminationsResponse', null, global);
goog.exportSymbol('proto.StartNewOrchestrationAction', null, global);
goog.exportSymbol('proto.StreamInstanceHistoryRequest', null, global);
goog.exportSymbol('proto.SubOrchestrationInstanceCompletedEvent', null, global);
goog.exportSymbol('proto.SubOrchestrationInstanceCreatedEvent', null, global);
goog.exportSymbol('proto.SubOrchestrationInstanceFailedEvent', null, global);
goog.exportSymbol('proto.SuspendRequest', null, global);
goog.exportSymbol('proto.SuspendResponse', null, global);
goog.exportSymbol('proto.TaskCompletedEvent', null, global);
goog.exportSymbol('proto.TaskFailedEvent', null, global);
goog.exportSymbol('proto.TaskFailureDetails', null, global);
goog.exportSymbol('proto.TaskScheduledEvent', null, global);
goog.exportSymbol('proto.TerminateOrchestrationAction', null, global);
goog.exportSymbol('proto.TerminateRequest', null, global);
goog.exportSymbol('proto.TerminateResponse', null, global);
goog.exportSymbol('proto.TimerCreatedEvent', null, global);
goog.exportSymbol('proto.TimerFiredEvent', null, global);
goog.exportSymbol('proto.TraceContext', null, global);
goog.exportSymbol('proto.WorkItem', null, global);
goog.exportSymbol('proto.WorkItem.RequestCase', null, global);
goog.exportSymbol('proto.WorkerCapability', null, global);
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.OrchestrationInstance = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.OrchestrationInstance, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.OrchestrationInstance.displayName = 'proto.OrchestrationInstance';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.ActivityRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.ActivityRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.ActivityRequest.displayName = 'proto.ActivityRequest';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.ActivityResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.ActivityResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.ActivityResponse.displayName = 'proto.ActivityResponse';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.TaskFailureDetails = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.TaskFailureDetails, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.TaskFailureDetails.displayName = 'proto.TaskFailureDetails';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.ParentInstanceInfo = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.ParentInstanceInfo, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.ParentInstanceInfo.displayName = 'proto.ParentInstanceInfo';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.TraceContext = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.TraceContext, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.TraceContext.displayName = 'proto.TraceContext';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.ExecutionStartedEvent = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.ExecutionStartedEvent, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.ExecutionStartedEvent.displayName = 'proto.ExecutionStartedEvent';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.ExecutionCompletedEvent = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.ExecutionCompletedEvent, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.ExecutionCompletedEvent.displayName = 'proto.ExecutionCompletedEvent';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.ExecutionTerminatedEvent = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.ExecutionTerminatedEvent, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.ExecutionTerminatedEvent.displayName = 'proto.ExecutionTerminatedEvent';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.TaskScheduledEvent = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.TaskScheduledEvent, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.TaskScheduledEvent.displayName = 'proto.TaskScheduledEvent';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.TaskCompletedEvent = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.TaskCompletedEvent, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.TaskCompletedEvent.displayName = 'proto.TaskCompletedEvent';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.TaskFailedEvent = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.TaskFailedEvent, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.TaskFailedEvent.displayName = 'proto.TaskFailedEvent';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.SubOrchestrationInstanceCreatedEvent = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.SubOrchestrationInstanceCreatedEvent, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.SubOrchestrationInstanceCreatedEvent.displayName = 'proto.SubOrchestrationInstanceCreatedEvent';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.SubOrchestrationInstanceCompletedEvent = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.SubOrchestrationInstanceCompletedEvent, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.SubOrchestrationInstanceCompletedEvent.displayName = 'proto.SubOrchestrationInstanceCompletedEvent';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.SubOrchestrationInstanceFailedEvent = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.SubOrchestrationInstanceFailedEvent, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.SubOrchestrationInstanceFailedEvent.displayName = 'proto.SubOrchestrationInstanceFailedEvent';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.TimerCreatedEvent = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.TimerCreatedEvent, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.TimerCreatedEvent.displayName = 'proto.TimerCreatedEvent';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.TimerFiredEvent = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.TimerFiredEvent, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.TimerFiredEvent.displayName = 'proto.TimerFiredEvent';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.OrchestratorStartedEvent = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.OrchestratorStartedEvent, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.OrchestratorStartedEvent.displayName = 'proto.OrchestratorStartedEvent';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.OrchestratorCompletedEvent = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.OrchestratorCompletedEvent, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.OrchestratorCompletedEvent.displayName = 'proto.OrchestratorCompletedEvent';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.EventSentEvent = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.EventSentEvent, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.EventSentEvent.displayName = 'proto.EventSentEvent';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.EventRaisedEvent = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.EventRaisedEvent, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.EventRaisedEvent.displayName = 'proto.EventRaisedEvent';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.GenericEvent = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.GenericEvent, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.GenericEvent.displayName = 'proto.GenericEvent';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.HistoryStateEvent = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.HistoryStateEvent, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.HistoryStateEvent.displayName = 'proto.HistoryStateEvent';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.ContinueAsNewEvent = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.ContinueAsNewEvent, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.ContinueAsNewEvent.displayName = 'proto.ContinueAsNewEvent';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.ExecutionSuspendedEvent = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.ExecutionSuspendedEvent, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.ExecutionSuspendedEvent.displayName = 'proto.ExecutionSuspendedEvent';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.ExecutionResumedEvent = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.ExecutionResumedEvent, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.ExecutionResumedEvent.displayName = 'proto.ExecutionResumedEvent';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.EntityOperationSignaledEvent = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.EntityOperationSignaledEvent, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.EntityOperationSignaledEvent.displayName = 'proto.EntityOperationSignaledEvent';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.EntityOperationCalledEvent = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.EntityOperationCalledEvent, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.EntityOperationCalledEvent.displayName = 'proto.EntityOperationCalledEvent';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.EntityLockRequestedEvent = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.EntityLockRequestedEvent.repeatedFields_, null);
};
goog.inherits(proto.EntityLockRequestedEvent, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.EntityLockRequestedEvent.displayName = 'proto.EntityLockRequestedEvent';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.EntityOperationCompletedEvent = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.EntityOperationCompletedEvent, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.EntityOperationCompletedEvent.displayName = 'proto.EntityOperationCompletedEvent';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.EntityOperationFailedEvent = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.EntityOperationFailedEvent, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.EntityOperationFailedEvent.displayName = 'proto.EntityOperationFailedEvent';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.EntityUnlockSentEvent = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.EntityUnlockSentEvent, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.EntityUnlockSentEvent.displayName = 'proto.EntityUnlockSentEvent';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.EntityLockGrantedEvent = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.EntityLockGrantedEvent, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.EntityLockGrantedEvent.displayName = 'proto.EntityLockGrantedEvent';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.ExecutionRewoundEvent = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.ExecutionRewoundEvent, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.ExecutionRewoundEvent.displayName = 'proto.ExecutionRewoundEvent';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.HistoryEvent = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, proto.HistoryEvent.oneofGroups_);
};
goog.inherits(proto.HistoryEvent, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.HistoryEvent.displayName = 'proto.HistoryEvent';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.ScheduleTaskAction = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.ScheduleTaskAction, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.ScheduleTaskAction.displayName = 'proto.ScheduleTaskAction';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.CreateSubOrchestrationAction = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.CreateSubOrchestrationAction, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.CreateSubOrchestrationAction.displayName = 'proto.CreateSubOrchestrationAction';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.CreateTimerAction = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.CreateTimerAction, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.CreateTimerAction.displayName = 'proto.CreateTimerAction';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.SendEventAction = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.SendEventAction, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.SendEventAction.displayName = 'proto.SendEventAction';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.CompleteOrchestrationAction = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.CompleteOrchestrationAction.repeatedFields_, null);
};
goog.inherits(proto.CompleteOrchestrationAction, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.CompleteOrchestrationAction.displayName = 'proto.CompleteOrchestrationAction';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.TerminateOrchestrationAction = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.TerminateOrchestrationAction, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.TerminateOrchestrationAction.displayName = 'proto.TerminateOrchestrationAction';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.SendEntityMessageAction = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, proto.SendEntityMessageAction.oneofGroups_);
};
goog.inherits(proto.SendEntityMessageAction, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.SendEntityMessageAction.displayName = 'proto.SendEntityMessageAction';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.OrchestratorAction = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, proto.OrchestratorAction.oneofGroups_);
};
goog.inherits(proto.OrchestratorAction, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.OrchestratorAction.displayName = 'proto.OrchestratorAction';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.OrchestrationTraceContext = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.OrchestrationTraceContext, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.OrchestrationTraceContext.displayName = 'proto.OrchestrationTraceContext';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.OrchestratorRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.OrchestratorRequest.repeatedFields_, null);
};
goog.inherits(proto.OrchestratorRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.OrchestratorRequest.displayName = 'proto.OrchestratorRequest';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.OrchestratorResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.OrchestratorResponse.repeatedFields_, null);
};
goog.inherits(proto.OrchestratorResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.OrchestratorResponse.displayName = 'proto.OrchestratorResponse';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.CreateInstanceRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.CreateInstanceRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.CreateInstanceRequest.displayName = 'proto.CreateInstanceRequest';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.OrchestrationIdReusePolicy = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.OrchestrationIdReusePolicy.repeatedFields_, null);
};
goog.inherits(proto.OrchestrationIdReusePolicy, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.OrchestrationIdReusePolicy.displayName = 'proto.OrchestrationIdReusePolicy';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.CreateInstanceResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.CreateInstanceResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.CreateInstanceResponse.displayName = 'proto.CreateInstanceResponse';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.GetInstanceRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.GetInstanceRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.GetInstanceRequest.displayName = 'proto.GetInstanceRequest';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.GetInstanceResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.GetInstanceResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.GetInstanceResponse.displayName = 'proto.GetInstanceResponse';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.RewindInstanceRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.RewindInstanceRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.RewindInstanceRequest.displayName = 'proto.RewindInstanceRequest';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.RewindInstanceResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.RewindInstanceResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.RewindInstanceResponse.displayName = 'proto.RewindInstanceResponse';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.OrchestrationState = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.OrchestrationState, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.OrchestrationState.displayName = 'proto.OrchestrationState';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.RaiseEventRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.RaiseEventRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.RaiseEventRequest.displayName = 'proto.RaiseEventRequest';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.RaiseEventResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.RaiseEventResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.RaiseEventResponse.displayName = 'proto.RaiseEventResponse';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.TerminateRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.TerminateRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.TerminateRequest.displayName = 'proto.TerminateRequest';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.TerminateResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.TerminateResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.TerminateResponse.displayName = 'proto.TerminateResponse';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.SuspendRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.SuspendRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.SuspendRequest.displayName = 'proto.SuspendRequest';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.SuspendResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.SuspendResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.SuspendResponse.displayName = 'proto.SuspendResponse';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.ResumeRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.ResumeRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.ResumeRequest.displayName = 'proto.ResumeRequest';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.ResumeResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.ResumeResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.ResumeResponse.displayName = 'proto.ResumeResponse';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.QueryInstancesRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.QueryInstancesRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.QueryInstancesRequest.displayName = 'proto.QueryInstancesRequest';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.InstanceQuery = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.InstanceQuery.repeatedFields_, null);
};
goog.inherits(proto.InstanceQuery, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.InstanceQuery.displayName = 'proto.InstanceQuery';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.QueryInstancesResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.QueryInstancesResponse.repeatedFields_, null);
};
goog.inherits(proto.QueryInstancesResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.QueryInstancesResponse.displayName = 'proto.QueryInstancesResponse';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.ListInstanceIdsRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.ListInstanceIdsRequest.repeatedFields_, null);
};
goog.inherits(proto.ListInstanceIdsRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.ListInstanceIdsRequest.displayName = 'proto.ListInstanceIdsRequest';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.ListInstanceIdsResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.ListInstanceIdsResponse.repeatedFields_, null);
};
goog.inherits(proto.ListInstanceIdsResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.ListInstanceIdsResponse.displayName = 'proto.ListInstanceIdsResponse';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.PurgeInstancesRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, proto.PurgeInstancesRequest.oneofGroups_);
};
goog.inherits(proto.PurgeInstancesRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.PurgeInstancesRequest.displayName = 'proto.PurgeInstancesRequest';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.PurgeInstanceFilter = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.PurgeInstanceFilter.repeatedFields_, null);
};
goog.inherits(proto.PurgeInstanceFilter, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.PurgeInstanceFilter.displayName = 'proto.PurgeInstanceFilter';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.PurgeInstancesResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.PurgeInstancesResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.PurgeInstancesResponse.displayName = 'proto.PurgeInstancesResponse';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.RestartInstanceRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.RestartInstanceRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.RestartInstanceRequest.displayName = 'proto.RestartInstanceRequest';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.RestartInstanceResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.RestartInstanceResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.RestartInstanceResponse.displayName = 'proto.RestartInstanceResponse';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.CreateTaskHubRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.CreateTaskHubRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.CreateTaskHubRequest.displayName = 'proto.CreateTaskHubRequest';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.CreateTaskHubResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.CreateTaskHubResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.CreateTaskHubResponse.displayName = 'proto.CreateTaskHubResponse';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.DeleteTaskHubRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.DeleteTaskHubRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.DeleteTaskHubRequest.displayName = 'proto.DeleteTaskHubRequest';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.DeleteTaskHubResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.DeleteTaskHubResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.DeleteTaskHubResponse.displayName = 'proto.DeleteTaskHubResponse';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.SignalEntityRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.SignalEntityRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.SignalEntityRequest.displayName = 'proto.SignalEntityRequest';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.SignalEntityResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.SignalEntityResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.SignalEntityResponse.displayName = 'proto.SignalEntityResponse';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.GetEntityRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.GetEntityRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.GetEntityRequest.displayName = 'proto.GetEntityRequest';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.GetEntityResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.GetEntityResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.GetEntityResponse.displayName = 'proto.GetEntityResponse';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.EntityQuery = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.EntityQuery, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.EntityQuery.displayName = 'proto.EntityQuery';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.QueryEntitiesRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.QueryEntitiesRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.QueryEntitiesRequest.displayName = 'proto.QueryEntitiesRequest';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.QueryEntitiesResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.QueryEntitiesResponse.repeatedFields_, null);
};
goog.inherits(proto.QueryEntitiesResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.QueryEntitiesResponse.displayName = 'proto.QueryEntitiesResponse';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.EntityMetadata = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.EntityMetadata, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.EntityMetadata.displayName = 'proto.EntityMetadata';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.CleanEntityStorageRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.CleanEntityStorageRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.CleanEntityStorageRequest.displayName = 'proto.CleanEntityStorageRequest';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.CleanEntityStorageResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.CleanEntityStorageResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.CleanEntityStorageResponse.displayName = 'proto.CleanEntityStorageResponse';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.OrchestratorEntityParameters = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.OrchestratorEntityParameters, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.OrchestratorEntityParameters.displayName = 'proto.OrchestratorEntityParameters';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.EntityBatchRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.EntityBatchRequest.repeatedFields_, null);
};
goog.inherits(proto.EntityBatchRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.EntityBatchRequest.displayName = 'proto.EntityBatchRequest';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.EntityBatchResult = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.EntityBatchResult.repeatedFields_, null);
};
goog.inherits(proto.EntityBatchResult, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.EntityBatchResult.displayName = 'proto.EntityBatchResult';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.EntityRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.EntityRequest.repeatedFields_, null);
};
goog.inherits(proto.EntityRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.EntityRequest.displayName = 'proto.EntityRequest';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.OperationRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.OperationRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.OperationRequest.displayName = 'proto.OperationRequest';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.OperationResult = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, proto.OperationResult.oneofGroups_);
};
goog.inherits(proto.OperationResult, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.OperationResult.displayName = 'proto.OperationResult';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.OperationInfo = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.OperationInfo, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.OperationInfo.displayName = 'proto.OperationInfo';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.OperationResultSuccess = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.OperationResultSuccess, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.OperationResultSuccess.displayName = 'proto.OperationResultSuccess';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.OperationResultFailure = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.OperationResultFailure, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.OperationResultFailure.displayName = 'proto.OperationResultFailure';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.OperationAction = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, proto.OperationAction.oneofGroups_);
};
goog.inherits(proto.OperationAction, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.OperationAction.displayName = 'proto.OperationAction';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.SendSignalAction = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.SendSignalAction, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.SendSignalAction.displayName = 'proto.SendSignalAction';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.StartNewOrchestrationAction = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.StartNewOrchestrationAction, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.StartNewOrchestrationAction.displayName = 'proto.StartNewOrchestrationAction';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.AbandonActivityTaskRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.AbandonActivityTaskRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.AbandonActivityTaskRequest.displayName = 'proto.AbandonActivityTaskRequest';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.AbandonActivityTaskResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.AbandonActivityTaskResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.AbandonActivityTaskResponse.displayName = 'proto.AbandonActivityTaskResponse';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.AbandonOrchestrationTaskRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.AbandonOrchestrationTaskRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.AbandonOrchestrationTaskRequest.displayName = 'proto.AbandonOrchestrationTaskRequest';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.AbandonOrchestrationTaskResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.AbandonOrchestrationTaskResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.AbandonOrchestrationTaskResponse.displayName = 'proto.AbandonOrchestrationTaskResponse';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.AbandonEntityTaskRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.AbandonEntityTaskRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.AbandonEntityTaskRequest.displayName = 'proto.AbandonEntityTaskRequest';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.AbandonEntityTaskResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.AbandonEntityTaskResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.AbandonEntityTaskResponse.displayName = 'proto.AbandonEntityTaskResponse';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.SkipGracefulOrchestrationTerminationsRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.SkipGracefulOrchestrationTerminationsRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.SkipGracefulOrchestrationTerminationsRequest.displayName = 'proto.SkipGracefulOrchestrationTerminationsRequest';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.SkipGracefulOrchestrationTerminationsResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.SkipGracefulOrchestrationTerminationsResponse.repeatedFields_, null);
};
goog.inherits(proto.SkipGracefulOrchestrationTerminationsResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.SkipGracefulOrchestrationTerminationsResponse.displayName = 'proto.SkipGracefulOrchestrationTerminationsResponse';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.GetWorkItemsRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.GetWorkItemsRequest.repeatedFields_, null);
};
goog.inherits(proto.GetWorkItemsRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.GetWorkItemsRequest.displayName = 'proto.GetWorkItemsRequest';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.WorkItem = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, proto.WorkItem.oneofGroups_);
};
goog.inherits(proto.WorkItem, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.WorkItem.displayName = 'proto.WorkItem';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.CompleteTaskResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.CompleteTaskResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.CompleteTaskResponse.displayName = 'proto.CompleteTaskResponse';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.HealthPing = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.HealthPing, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.HealthPing.displayName = 'proto.HealthPing';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.StreamInstanceHistoryRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.StreamInstanceHistoryRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.StreamInstanceHistoryRequest.displayName = 'proto.StreamInstanceHistoryRequest';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.HistoryChunk = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.HistoryChunk.repeatedFields_, null);
};
goog.inherits(proto.HistoryChunk, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.HistoryChunk.displayName = 'proto.HistoryChunk';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.InstanceBatch = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.InstanceBatch.repeatedFields_, null);
};
goog.inherits(proto.InstanceBatch, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.InstanceBatch.displayName = 'proto.InstanceBatch';
}



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.OrchestrationInstance.prototype.toObject = function(opt_includeInstance) {
  return proto.OrchestrationInstance.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.OrchestrationInstance} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OrchestrationInstance.toObject = function(includeInstance, msg) {
  var f, obj = {
    instanceid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    executionid: (f = msg.getExecutionid()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.OrchestrationInstance}
 */
proto.OrchestrationInstance.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.OrchestrationInstance;
  return proto.OrchestrationInstance.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.OrchestrationInstance} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.OrchestrationInstance}
 */
proto.OrchestrationInstance.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setInstanceid(value);
      break;
    case 2:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setExecutionid(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.OrchestrationInstance.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.OrchestrationInstance.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.OrchestrationInstance} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OrchestrationInstance.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstanceid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getExecutionid();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
};


/**
 * optional string instanceId = 1;
 * @return {string}
 */
proto.OrchestrationInstance.prototype.getInstanceid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.OrchestrationInstance} returns this
 */
proto.OrchestrationInstance.prototype.setInstanceid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional google.protobuf.StringValue executionId = 2;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.OrchestrationInstance.prototype.getExecutionid = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 2));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.OrchestrationInstance} returns this
*/
proto.OrchestrationInstance.prototype.setExecutionid = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OrchestrationInstance} returns this
 */
proto.OrchestrationInstance.prototype.clearExecutionid = function() {
  return this.setExecutionid(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OrchestrationInstance.prototype.hasExecutionid = function() {
  return jspb.Message.getField(this, 2) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.ActivityRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.ActivityRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.ActivityRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.ActivityRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    name: jspb.Message.getFieldWithDefault(msg, 1, ""),
    version: (f = msg.getVersion()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    input: (f = msg.getInput()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    orchestrationinstance: (f = msg.getOrchestrationinstance()) && proto.OrchestrationInstance.toObject(includeInstance, f),
    taskid: jspb.Message.getFieldWithDefault(msg, 5, 0),
    parenttracecontext: (f = msg.getParenttracecontext()) && proto.TraceContext.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.ActivityRequest}
 */
proto.ActivityRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.ActivityRequest;
  return proto.ActivityRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.ActivityRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.ActivityRequest}
 */
proto.ActivityRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setName(value);
      break;
    case 2:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setVersion(value);
      break;
    case 3:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setInput(value);
      break;
    case 4:
      var value = new proto.OrchestrationInstance;
      reader.readMessage(value,proto.OrchestrationInstance.deserializeBinaryFromReader);
      msg.setOrchestrationinstance(value);
      break;
    case 5:
      var value = /** @type {number} */ (reader.readInt32());
      msg.setTaskid(value);
      break;
    case 6:
      var value = new proto.TraceContext;
      reader.readMessage(value,proto.TraceContext.deserializeBinaryFromReader);
      msg.setParenttracecontext(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.ActivityRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.ActivityRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.ActivityRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.ActivityRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getName();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getVersion();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getInput();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getOrchestrationinstance();
  if (f != null) {
    writer.writeMessage(
      4,
      f,
      proto.OrchestrationInstance.serializeBinaryToWriter
    );
  }
  f = message.getTaskid();
  if (f !== 0) {
    writer.writeInt32(
      5,
      f
    );
  }
  f = message.getParenttracecontext();
  if (f != null) {
    writer.writeMessage(
      6,
      f,
      proto.TraceContext.serializeBinaryToWriter
    );
  }
};


/**
 * optional string name = 1;
 * @return {string}
 */
proto.ActivityRequest.prototype.getName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.ActivityRequest} returns this
 */
proto.ActivityRequest.prototype.setName = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional google.protobuf.StringValue version = 2;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.ActivityRequest.prototype.getVersion = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 2));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.ActivityRequest} returns this
*/
proto.ActivityRequest.prototype.setVersion = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ActivityRequest} returns this
 */
proto.ActivityRequest.prototype.clearVersion = function() {
  return this.setVersion(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ActivityRequest.prototype.hasVersion = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional google.protobuf.StringValue input = 3;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.ActivityRequest.prototype.getInput = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 3));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.ActivityRequest} returns this
*/
proto.ActivityRequest.prototype.setInput = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ActivityRequest} returns this
 */
proto.ActivityRequest.prototype.clearInput = function() {
  return this.setInput(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ActivityRequest.prototype.hasInput = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional OrchestrationInstance orchestrationInstance = 4;
 * @return {?proto.OrchestrationInstance}
 */
proto.ActivityRequest.prototype.getOrchestrationinstance = function() {
  return /** @type{?proto.OrchestrationInstance} */ (
    jspb.Message.getWrapperField(this, proto.OrchestrationInstance, 4));
};


/**
 * @param {?proto.OrchestrationInstance|undefined} value
 * @return {!proto.ActivityRequest} returns this
*/
proto.ActivityRequest.prototype.setOrchestrationinstance = function(value) {
  return jspb.Message.setWrapperField(this, 4, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ActivityRequest} returns this
 */
proto.ActivityRequest.prototype.clearOrchestrationinstance = function() {
  return this.setOrchestrationinstance(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ActivityRequest.prototype.hasOrchestrationinstance = function() {
  return jspb.Message.getField(this, 4) != null;
};


/**
 * optional int32 taskId = 5;
 * @return {number}
 */
proto.ActivityRequest.prototype.getTaskid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 5, 0));
};


/**
 * @param {number} value
 * @return {!proto.ActivityRequest} returns this
 */
proto.ActivityRequest.prototype.setTaskid = function(value) {
  return jspb.Message.setProto3IntField(this, 5, value);
};


/**
 * optional TraceContext parentTraceContext = 6;
 * @return {?proto.TraceContext}
 */
proto.ActivityRequest.prototype.getParenttracecontext = function() {
  return /** @type{?proto.TraceContext} */ (
    jspb.Message.getWrapperField(this, proto.TraceContext, 6));
};


/**
 * @param {?proto.TraceContext|undefined} value
 * @return {!proto.ActivityRequest} returns this
*/
proto.ActivityRequest.prototype.setParenttracecontext = function(value) {
  return jspb.Message.setWrapperField(this, 6, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ActivityRequest} returns this
 */
proto.ActivityRequest.prototype.clearParenttracecontext = function() {
  return this.setParenttracecontext(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ActivityRequest.prototype.hasParenttracecontext = function() {
  return jspb.Message.getField(this, 6) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.ActivityResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.ActivityResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.ActivityResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.ActivityResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    instanceid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    taskid: jspb.Message.getFieldWithDefault(msg, 2, 0),
    result: (f = msg.getResult()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    failuredetails: (f = msg.getFailuredetails()) && proto.TaskFailureDetails.toObject(includeInstance, f),
    completiontoken: jspb.Message.getFieldWithDefault(msg, 5, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.ActivityResponse}
 */
proto.ActivityResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.ActivityResponse;
  return proto.ActivityResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.ActivityResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.ActivityResponse}
 */
proto.ActivityResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setInstanceid(value);
      break;
    case 2:
      var value = /** @type {number} */ (reader.readInt32());
      msg.setTaskid(value);
      break;
    case 3:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setResult(value);
      break;
    case 4:
      var value = new proto.TaskFailureDetails;
      reader.readMessage(value,proto.TaskFailureDetails.deserializeBinaryFromReader);
      msg.setFailuredetails(value);
      break;
    case 5:
      var value = /** @type {string} */ (reader.readString());
      msg.setCompletiontoken(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.ActivityResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.ActivityResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.ActivityResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.ActivityResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstanceid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getTaskid();
  if (f !== 0) {
    writer.writeInt32(
      2,
      f
    );
  }
  f = message.getResult();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getFailuredetails();
  if (f != null) {
    writer.writeMessage(
      4,
      f,
      proto.TaskFailureDetails.serializeBinaryToWriter
    );
  }
  f = message.getCompletiontoken();
  if (f.length > 0) {
    writer.writeString(
      5,
      f
    );
  }
};


/**
 * optional string instanceId = 1;
 * @return {string}
 */
proto.ActivityResponse.prototype.getInstanceid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.ActivityResponse} returns this
 */
proto.ActivityResponse.prototype.setInstanceid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional int32 taskId = 2;
 * @return {number}
 */
proto.ActivityResponse.prototype.getTaskid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 2, 0));
};


/**
 * @param {number} value
 * @return {!proto.ActivityResponse} returns this
 */
proto.ActivityResponse.prototype.setTaskid = function(value) {
  return jspb.Message.setProto3IntField(this, 2, value);
};


/**
 * optional google.protobuf.StringValue result = 3;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.ActivityResponse.prototype.getResult = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 3));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.ActivityResponse} returns this
*/
proto.ActivityResponse.prototype.setResult = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ActivityResponse} returns this
 */
proto.ActivityResponse.prototype.clearResult = function() {
  return this.setResult(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ActivityResponse.prototype.hasResult = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional TaskFailureDetails failureDetails = 4;
 * @return {?proto.TaskFailureDetails}
 */
proto.ActivityResponse.prototype.getFailuredetails = function() {
  return /** @type{?proto.TaskFailureDetails} */ (
    jspb.Message.getWrapperField(this, proto.TaskFailureDetails, 4));
};


/**
 * @param {?proto.TaskFailureDetails|undefined} value
 * @return {!proto.ActivityResponse} returns this
*/
proto.ActivityResponse.prototype.setFailuredetails = function(value) {
  return jspb.Message.setWrapperField(this, 4, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ActivityResponse} returns this
 */
proto.ActivityResponse.prototype.clearFailuredetails = function() {
  return this.setFailuredetails(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ActivityResponse.prototype.hasFailuredetails = function() {
  return jspb.Message.getField(this, 4) != null;
};


/**
 * optional string completionToken = 5;
 * @return {string}
 */
proto.ActivityResponse.prototype.getCompletiontoken = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 5, ""));
};


/**
 * @param {string} value
 * @return {!proto.ActivityResponse} returns this
 */
proto.ActivityResponse.prototype.setCompletiontoken = function(value) {
  return jspb.Message.setProto3StringField(this, 5, value);
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.TaskFailureDetails.prototype.toObject = function(opt_includeInstance) {
  return proto.TaskFailureDetails.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.TaskFailureDetails} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.TaskFailureDetails.toObject = function(includeInstance, msg) {
  var f, obj = {
    errortype: jspb.Message.getFieldWithDefault(msg, 1, ""),
    errormessage: jspb.Message.getFieldWithDefault(msg, 2, ""),
    stacktrace: (f = msg.getStacktrace()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    innerfailure: (f = msg.getInnerfailure()) && proto.TaskFailureDetails.toObject(includeInstance, f),
    isnonretriable: jspb.Message.getBooleanFieldWithDefault(msg, 5, false),
    propertiesMap: (f = msg.getPropertiesMap()) ? f.toObject(includeInstance, proto.google.protobuf.Value.toObject) : []
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.TaskFailureDetails}
 */
proto.TaskFailureDetails.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.TaskFailureDetails;
  return proto.TaskFailureDetails.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.TaskFailureDetails} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.TaskFailureDetails}
 */
proto.TaskFailureDetails.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setErrortype(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setErrormessage(value);
      break;
    case 3:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setStacktrace(value);
      break;
    case 4:
      var value = new proto.TaskFailureDetails;
      reader.readMessage(value,proto.TaskFailureDetails.deserializeBinaryFromReader);
      msg.setInnerfailure(value);
      break;
    case 5:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setIsnonretriable(value);
      break;
    case 6:
      var value = msg.getPropertiesMap();
      reader.readMessage(value, function(message, reader) {
        jspb.Map.deserializeBinary(message, reader, jspb.BinaryReader.prototype.readString, jspb.BinaryReader.prototype.readMessage, proto.google.protobuf.Value.deserializeBinaryFromReader, "", new proto.google.protobuf.Value());
         });
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.TaskFailureDetails.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.TaskFailureDetails.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.TaskFailureDetails} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.TaskFailureDetails.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getErrortype();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getErrormessage();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getStacktrace();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getInnerfailure();
  if (f != null) {
    writer.writeMessage(
      4,
      f,
      proto.TaskFailureDetails.serializeBinaryToWriter
    );
  }
  f = message.getIsnonretriable();
  if (f) {
    writer.writeBool(
      5,
      f
    );
  }
  f = message.getPropertiesMap(true);
  if (f && f.getLength() > 0) {
    f.serializeBinary(6, writer, jspb.BinaryWriter.prototype.writeString, jspb.BinaryWriter.prototype.writeMessage, proto.google.protobuf.Value.serializeBinaryToWriter);
  }
};


/**
 * optional string errorType = 1;
 * @return {string}
 */
proto.TaskFailureDetails.prototype.getErrortype = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.TaskFailureDetails} returns this
 */
proto.TaskFailureDetails.prototype.setErrortype = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string errorMessage = 2;
 * @return {string}
 */
proto.TaskFailureDetails.prototype.getErrormessage = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/**
 * @param {string} value
 * @return {!proto.TaskFailureDetails} returns this
 */
proto.TaskFailureDetails.prototype.setErrormessage = function(value) {
  return jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional google.protobuf.StringValue stackTrace = 3;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.TaskFailureDetails.prototype.getStacktrace = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 3));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.TaskFailureDetails} returns this
*/
proto.TaskFailureDetails.prototype.setStacktrace = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.TaskFailureDetails} returns this
 */
proto.TaskFailureDetails.prototype.clearStacktrace = function() {
  return this.setStacktrace(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.TaskFailureDetails.prototype.hasStacktrace = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional TaskFailureDetails innerFailure = 4;
 * @return {?proto.TaskFailureDetails}
 */
proto.TaskFailureDetails.prototype.getInnerfailure = function() {
  return /** @type{?proto.TaskFailureDetails} */ (
    jspb.Message.getWrapperField(this, proto.TaskFailureDetails, 4));
};


/**
 * @param {?proto.TaskFailureDetails|undefined} value
 * @return {!proto.TaskFailureDetails} returns this
*/
proto.TaskFailureDetails.prototype.setInnerfailure = function(value) {
  return jspb.Message.setWrapperField(this, 4, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.TaskFailureDetails} returns this
 */
proto.TaskFailureDetails.prototype.clearInnerfailure = function() {
  return this.setInnerfailure(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.TaskFailureDetails.prototype.hasInnerfailure = function() {
  return jspb.Message.getField(this, 4) != null;
};


/**
 * optional bool isNonRetriable = 5;
 * @return {boolean}
 */
proto.TaskFailureDetails.prototype.getIsnonretriable = function() {
  return /** @type {boolean} */ (jspb.Message.getBooleanFieldWithDefault(this, 5, false));
};


/**
 * @param {boolean} value
 * @return {!proto.TaskFailureDetails} returns this
 */
proto.TaskFailureDetails.prototype.setIsnonretriable = function(value) {
  return jspb.Message.setProto3BooleanField(this, 5, value);
};


/**
 * map<string, google.protobuf.Value> properties = 6;
 * @param {boolean=} opt_noLazyCreate Do not create the map if
 * empty, instead returning `undefined`
 * @return {!jspb.Map<string,!proto.google.protobuf.Value>}
 */
proto.TaskFailureDetails.prototype.getPropertiesMap = function(opt_noLazyCreate) {
  return /** @type {!jspb.Map<string,!proto.google.protobuf.Value>} */ (
      jspb.Message.getMapField(this, 6, opt_noLazyCreate,
      proto.google.protobuf.Value));
};


/**
 * Clears values from the map. The map will be non-null.
 * @return {!proto.TaskFailureDetails} returns this
 */
proto.TaskFailureDetails.prototype.clearPropertiesMap = function() {
  this.getPropertiesMap().clear();
  return this;};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.ParentInstanceInfo.prototype.toObject = function(opt_includeInstance) {
  return proto.ParentInstanceInfo.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.ParentInstanceInfo} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.ParentInstanceInfo.toObject = function(includeInstance, msg) {
  var f, obj = {
    taskscheduledid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    name: (f = msg.getName()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    version: (f = msg.getVersion()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    orchestrationinstance: (f = msg.getOrchestrationinstance()) && proto.OrchestrationInstance.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.ParentInstanceInfo}
 */
proto.ParentInstanceInfo.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.ParentInstanceInfo;
  return proto.ParentInstanceInfo.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.ParentInstanceInfo} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.ParentInstanceInfo}
 */
proto.ParentInstanceInfo.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readInt32());
      msg.setTaskscheduledid(value);
      break;
    case 2:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setName(value);
      break;
    case 3:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setVersion(value);
      break;
    case 4:
      var value = new proto.OrchestrationInstance;
      reader.readMessage(value,proto.OrchestrationInstance.deserializeBinaryFromReader);
      msg.setOrchestrationinstance(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.ParentInstanceInfo.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.ParentInstanceInfo.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.ParentInstanceInfo} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.ParentInstanceInfo.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getTaskscheduledid();
  if (f !== 0) {
    writer.writeInt32(
      1,
      f
    );
  }
  f = message.getName();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getVersion();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getOrchestrationinstance();
  if (f != null) {
    writer.writeMessage(
      4,
      f,
      proto.OrchestrationInstance.serializeBinaryToWriter
    );
  }
};


/**
 * optional int32 taskScheduledId = 1;
 * @return {number}
 */
proto.ParentInstanceInfo.prototype.getTaskscheduledid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/**
 * @param {number} value
 * @return {!proto.ParentInstanceInfo} returns this
 */
proto.ParentInstanceInfo.prototype.setTaskscheduledid = function(value) {
  return jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional google.protobuf.StringValue name = 2;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.ParentInstanceInfo.prototype.getName = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 2));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.ParentInstanceInfo} returns this
*/
proto.ParentInstanceInfo.prototype.setName = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ParentInstanceInfo} returns this
 */
proto.ParentInstanceInfo.prototype.clearName = function() {
  return this.setName(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ParentInstanceInfo.prototype.hasName = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional google.protobuf.StringValue version = 3;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.ParentInstanceInfo.prototype.getVersion = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 3));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.ParentInstanceInfo} returns this
*/
proto.ParentInstanceInfo.prototype.setVersion = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ParentInstanceInfo} returns this
 */
proto.ParentInstanceInfo.prototype.clearVersion = function() {
  return this.setVersion(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ParentInstanceInfo.prototype.hasVersion = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional OrchestrationInstance orchestrationInstance = 4;
 * @return {?proto.OrchestrationInstance}
 */
proto.ParentInstanceInfo.prototype.getOrchestrationinstance = function() {
  return /** @type{?proto.OrchestrationInstance} */ (
    jspb.Message.getWrapperField(this, proto.OrchestrationInstance, 4));
};


/**
 * @param {?proto.OrchestrationInstance|undefined} value
 * @return {!proto.ParentInstanceInfo} returns this
*/
proto.ParentInstanceInfo.prototype.setOrchestrationinstance = function(value) {
  return jspb.Message.setWrapperField(this, 4, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ParentInstanceInfo} returns this
 */
proto.ParentInstanceInfo.prototype.clearOrchestrationinstance = function() {
  return this.setOrchestrationinstance(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ParentInstanceInfo.prototype.hasOrchestrationinstance = function() {
  return jspb.Message.getField(this, 4) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.TraceContext.prototype.toObject = function(opt_includeInstance) {
  return proto.TraceContext.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.TraceContext} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.TraceContext.toObject = function(includeInstance, msg) {
  var f, obj = {
    traceparent: jspb.Message.getFieldWithDefault(msg, 1, ""),
    spanid: jspb.Message.getFieldWithDefault(msg, 2, ""),
    tracestate: (f = msg.getTracestate()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.TraceContext}
 */
proto.TraceContext.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.TraceContext;
  return proto.TraceContext.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.TraceContext} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.TraceContext}
 */
proto.TraceContext.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setTraceparent(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setSpanid(value);
      break;
    case 3:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setTracestate(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.TraceContext.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.TraceContext.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.TraceContext} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.TraceContext.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getTraceparent();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getSpanid();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getTracestate();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
};


/**
 * optional string traceParent = 1;
 * @return {string}
 */
proto.TraceContext.prototype.getTraceparent = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.TraceContext} returns this
 */
proto.TraceContext.prototype.setTraceparent = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string spanID = 2;
 * @return {string}
 */
proto.TraceContext.prototype.getSpanid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/**
 * @param {string} value
 * @return {!proto.TraceContext} returns this
 */
proto.TraceContext.prototype.setSpanid = function(value) {
  return jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional google.protobuf.StringValue traceState = 3;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.TraceContext.prototype.getTracestate = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 3));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.TraceContext} returns this
*/
proto.TraceContext.prototype.setTracestate = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.TraceContext} returns this
 */
proto.TraceContext.prototype.clearTracestate = function() {
  return this.setTracestate(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.TraceContext.prototype.hasTracestate = function() {
  return jspb.Message.getField(this, 3) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.ExecutionStartedEvent.prototype.toObject = function(opt_includeInstance) {
  return proto.ExecutionStartedEvent.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.ExecutionStartedEvent} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.ExecutionStartedEvent.toObject = function(includeInstance, msg) {
  var f, obj = {
    name: jspb.Message.getFieldWithDefault(msg, 1, ""),
    version: (f = msg.getVersion()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    input: (f = msg.getInput()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    orchestrationinstance: (f = msg.getOrchestrationinstance()) && proto.OrchestrationInstance.toObject(includeInstance, f),
    parentinstance: (f = msg.getParentinstance()) && proto.ParentInstanceInfo.toObject(includeInstance, f),
    scheduledstarttimestamp: (f = msg.getScheduledstarttimestamp()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f),
    parenttracecontext: (f = msg.getParenttracecontext()) && proto.TraceContext.toObject(includeInstance, f),
    orchestrationspanid: (f = msg.getOrchestrationspanid()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    tagsMap: (f = msg.getTagsMap()) ? f.toObject(includeInstance, undefined) : []
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.ExecutionStartedEvent}
 */
proto.ExecutionStartedEvent.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.ExecutionStartedEvent;
  return proto.ExecutionStartedEvent.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.ExecutionStartedEvent} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.ExecutionStartedEvent}
 */
proto.ExecutionStartedEvent.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setName(value);
      break;
    case 2:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setVersion(value);
      break;
    case 3:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setInput(value);
      break;
    case 4:
      var value = new proto.OrchestrationInstance;
      reader.readMessage(value,proto.OrchestrationInstance.deserializeBinaryFromReader);
      msg.setOrchestrationinstance(value);
      break;
    case 5:
      var value = new proto.ParentInstanceInfo;
      reader.readMessage(value,proto.ParentInstanceInfo.deserializeBinaryFromReader);
      msg.setParentinstance(value);
      break;
    case 6:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setScheduledstarttimestamp(value);
      break;
    case 7:
      var value = new proto.TraceContext;
      reader.readMessage(value,proto.TraceContext.deserializeBinaryFromReader);
      msg.setParenttracecontext(value);
      break;
    case 8:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setOrchestrationspanid(value);
      break;
    case 9:
      var value = msg.getTagsMap();
      reader.readMessage(value, function(message, reader) {
        jspb.Map.deserializeBinary(message, reader, jspb.BinaryReader.prototype.readString, jspb.BinaryReader.prototype.readString, null, "", "");
         });
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.ExecutionStartedEvent.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.ExecutionStartedEvent.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.ExecutionStartedEvent} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.ExecutionStartedEvent.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getName();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getVersion();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getInput();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getOrchestrationinstance();
  if (f != null) {
    writer.writeMessage(
      4,
      f,
      proto.OrchestrationInstance.serializeBinaryToWriter
    );
  }
  f = message.getParentinstance();
  if (f != null) {
    writer.writeMessage(
      5,
      f,
      proto.ParentInstanceInfo.serializeBinaryToWriter
    );
  }
  f = message.getScheduledstarttimestamp();
  if (f != null) {
    writer.writeMessage(
      6,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
  f = message.getParenttracecontext();
  if (f != null) {
    writer.writeMessage(
      7,
      f,
      proto.TraceContext.serializeBinaryToWriter
    );
  }
  f = message.getOrchestrationspanid();
  if (f != null) {
    writer.writeMessage(
      8,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getTagsMap(true);
  if (f && f.getLength() > 0) {
    f.serializeBinary(9, writer, jspb.BinaryWriter.prototype.writeString, jspb.BinaryWriter.prototype.writeString);
  }
};


/**
 * optional string name = 1;
 * @return {string}
 */
proto.ExecutionStartedEvent.prototype.getName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.ExecutionStartedEvent} returns this
 */
proto.ExecutionStartedEvent.prototype.setName = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional google.protobuf.StringValue version = 2;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.ExecutionStartedEvent.prototype.getVersion = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 2));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.ExecutionStartedEvent} returns this
*/
proto.ExecutionStartedEvent.prototype.setVersion = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ExecutionStartedEvent} returns this
 */
proto.ExecutionStartedEvent.prototype.clearVersion = function() {
  return this.setVersion(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ExecutionStartedEvent.prototype.hasVersion = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional google.protobuf.StringValue input = 3;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.ExecutionStartedEvent.prototype.getInput = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 3));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.ExecutionStartedEvent} returns this
*/
proto.ExecutionStartedEvent.prototype.setInput = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ExecutionStartedEvent} returns this
 */
proto.ExecutionStartedEvent.prototype.clearInput = function() {
  return this.setInput(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ExecutionStartedEvent.prototype.hasInput = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional OrchestrationInstance orchestrationInstance = 4;
 * @return {?proto.OrchestrationInstance}
 */
proto.ExecutionStartedEvent.prototype.getOrchestrationinstance = function() {
  return /** @type{?proto.OrchestrationInstance} */ (
    jspb.Message.getWrapperField(this, proto.OrchestrationInstance, 4));
};


/**
 * @param {?proto.OrchestrationInstance|undefined} value
 * @return {!proto.ExecutionStartedEvent} returns this
*/
proto.ExecutionStartedEvent.prototype.setOrchestrationinstance = function(value) {
  return jspb.Message.setWrapperField(this, 4, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ExecutionStartedEvent} returns this
 */
proto.ExecutionStartedEvent.prototype.clearOrchestrationinstance = function() {
  return this.setOrchestrationinstance(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ExecutionStartedEvent.prototype.hasOrchestrationinstance = function() {
  return jspb.Message.getField(this, 4) != null;
};


/**
 * optional ParentInstanceInfo parentInstance = 5;
 * @return {?proto.ParentInstanceInfo}
 */
proto.ExecutionStartedEvent.prototype.getParentinstance = function() {
  return /** @type{?proto.ParentInstanceInfo} */ (
    jspb.Message.getWrapperField(this, proto.ParentInstanceInfo, 5));
};


/**
 * @param {?proto.ParentInstanceInfo|undefined} value
 * @return {!proto.ExecutionStartedEvent} returns this
*/
proto.ExecutionStartedEvent.prototype.setParentinstance = function(value) {
  return jspb.Message.setWrapperField(this, 5, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ExecutionStartedEvent} returns this
 */
proto.ExecutionStartedEvent.prototype.clearParentinstance = function() {
  return this.setParentinstance(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ExecutionStartedEvent.prototype.hasParentinstance = function() {
  return jspb.Message.getField(this, 5) != null;
};


/**
 * optional google.protobuf.Timestamp scheduledStartTimestamp = 6;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.ExecutionStartedEvent.prototype.getScheduledstarttimestamp = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 6));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.ExecutionStartedEvent} returns this
*/
proto.ExecutionStartedEvent.prototype.setScheduledstarttimestamp = function(value) {
  return jspb.Message.setWrapperField(this, 6, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ExecutionStartedEvent} returns this
 */
proto.ExecutionStartedEvent.prototype.clearScheduledstarttimestamp = function() {
  return this.setScheduledstarttimestamp(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ExecutionStartedEvent.prototype.hasScheduledstarttimestamp = function() {
  return jspb.Message.getField(this, 6) != null;
};


/**
 * optional TraceContext parentTraceContext = 7;
 * @return {?proto.TraceContext}
 */
proto.ExecutionStartedEvent.prototype.getParenttracecontext = function() {
  return /** @type{?proto.TraceContext} */ (
    jspb.Message.getWrapperField(this, proto.TraceContext, 7));
};


/**
 * @param {?proto.TraceContext|undefined} value
 * @return {!proto.ExecutionStartedEvent} returns this
*/
proto.ExecutionStartedEvent.prototype.setParenttracecontext = function(value) {
  return jspb.Message.setWrapperField(this, 7, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ExecutionStartedEvent} returns this
 */
proto.ExecutionStartedEvent.prototype.clearParenttracecontext = function() {
  return this.setParenttracecontext(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ExecutionStartedEvent.prototype.hasParenttracecontext = function() {
  return jspb.Message.getField(this, 7) != null;
};


/**
 * optional google.protobuf.StringValue orchestrationSpanID = 8;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.ExecutionStartedEvent.prototype.getOrchestrationspanid = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 8));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.ExecutionStartedEvent} returns this
*/
proto.ExecutionStartedEvent.prototype.setOrchestrationspanid = function(value) {
  return jspb.Message.setWrapperField(this, 8, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ExecutionStartedEvent} returns this
 */
proto.ExecutionStartedEvent.prototype.clearOrchestrationspanid = function() {
  return this.setOrchestrationspanid(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ExecutionStartedEvent.prototype.hasOrchestrationspanid = function() {
  return jspb.Message.getField(this, 8) != null;
};


/**
 * map<string, string> tags = 9;
 * @param {boolean=} opt_noLazyCreate Do not create the map if
 * empty, instead returning `undefined`
 * @return {!jspb.Map<string,string>}
 */
proto.ExecutionStartedEvent.prototype.getTagsMap = function(opt_noLazyCreate) {
  return /** @type {!jspb.Map<string,string>} */ (
      jspb.Message.getMapField(this, 9, opt_noLazyCreate,
      null));
};


/**
 * Clears values from the map. The map will be non-null.
 * @return {!proto.ExecutionStartedEvent} returns this
 */
proto.ExecutionStartedEvent.prototype.clearTagsMap = function() {
  this.getTagsMap().clear();
  return this;};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.ExecutionCompletedEvent.prototype.toObject = function(opt_includeInstance) {
  return proto.ExecutionCompletedEvent.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.ExecutionCompletedEvent} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.ExecutionCompletedEvent.toObject = function(includeInstance, msg) {
  var f, obj = {
    orchestrationstatus: jspb.Message.getFieldWithDefault(msg, 1, 0),
    result: (f = msg.getResult()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    failuredetails: (f = msg.getFailuredetails()) && proto.TaskFailureDetails.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.ExecutionCompletedEvent}
 */
proto.ExecutionCompletedEvent.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.ExecutionCompletedEvent;
  return proto.ExecutionCompletedEvent.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.ExecutionCompletedEvent} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.ExecutionCompletedEvent}
 */
proto.ExecutionCompletedEvent.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {!proto.OrchestrationStatus} */ (reader.readEnum());
      msg.setOrchestrationstatus(value);
      break;
    case 2:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setResult(value);
      break;
    case 3:
      var value = new proto.TaskFailureDetails;
      reader.readMessage(value,proto.TaskFailureDetails.deserializeBinaryFromReader);
      msg.setFailuredetails(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.ExecutionCompletedEvent.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.ExecutionCompletedEvent.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.ExecutionCompletedEvent} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.ExecutionCompletedEvent.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getOrchestrationstatus();
  if (f !== 0.0) {
    writer.writeEnum(
      1,
      f
    );
  }
  f = message.getResult();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getFailuredetails();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      proto.TaskFailureDetails.serializeBinaryToWriter
    );
  }
};


/**
 * optional OrchestrationStatus orchestrationStatus = 1;
 * @return {!proto.OrchestrationStatus}
 */
proto.ExecutionCompletedEvent.prototype.getOrchestrationstatus = function() {
  return /** @type {!proto.OrchestrationStatus} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/**
 * @param {!proto.OrchestrationStatus} value
 * @return {!proto.ExecutionCompletedEvent} returns this
 */
proto.ExecutionCompletedEvent.prototype.setOrchestrationstatus = function(value) {
  return jspb.Message.setProto3EnumField(this, 1, value);
};


/**
 * optional google.protobuf.StringValue result = 2;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.ExecutionCompletedEvent.prototype.getResult = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 2));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.ExecutionCompletedEvent} returns this
*/
proto.ExecutionCompletedEvent.prototype.setResult = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ExecutionCompletedEvent} returns this
 */
proto.ExecutionCompletedEvent.prototype.clearResult = function() {
  return this.setResult(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ExecutionCompletedEvent.prototype.hasResult = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional TaskFailureDetails failureDetails = 3;
 * @return {?proto.TaskFailureDetails}
 */
proto.ExecutionCompletedEvent.prototype.getFailuredetails = function() {
  return /** @type{?proto.TaskFailureDetails} */ (
    jspb.Message.getWrapperField(this, proto.TaskFailureDetails, 3));
};


/**
 * @param {?proto.TaskFailureDetails|undefined} value
 * @return {!proto.ExecutionCompletedEvent} returns this
*/
proto.ExecutionCompletedEvent.prototype.setFailuredetails = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ExecutionCompletedEvent} returns this
 */
proto.ExecutionCompletedEvent.prototype.clearFailuredetails = function() {
  return this.setFailuredetails(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ExecutionCompletedEvent.prototype.hasFailuredetails = function() {
  return jspb.Message.getField(this, 3) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.ExecutionTerminatedEvent.prototype.toObject = function(opt_includeInstance) {
  return proto.ExecutionTerminatedEvent.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.ExecutionTerminatedEvent} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.ExecutionTerminatedEvent.toObject = function(includeInstance, msg) {
  var f, obj = {
    input: (f = msg.getInput()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    recurse: jspb.Message.getBooleanFieldWithDefault(msg, 2, false)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.ExecutionTerminatedEvent}
 */
proto.ExecutionTerminatedEvent.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.ExecutionTerminatedEvent;
  return proto.ExecutionTerminatedEvent.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.ExecutionTerminatedEvent} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.ExecutionTerminatedEvent}
 */
proto.ExecutionTerminatedEvent.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setInput(value);
      break;
    case 2:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setRecurse(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.ExecutionTerminatedEvent.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.ExecutionTerminatedEvent.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.ExecutionTerminatedEvent} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.ExecutionTerminatedEvent.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInput();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getRecurse();
  if (f) {
    writer.writeBool(
      2,
      f
    );
  }
};


/**
 * optional google.protobuf.StringValue input = 1;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.ExecutionTerminatedEvent.prototype.getInput = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 1));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.ExecutionTerminatedEvent} returns this
*/
proto.ExecutionTerminatedEvent.prototype.setInput = function(value) {
  return jspb.Message.setWrapperField(this, 1, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ExecutionTerminatedEvent} returns this
 */
proto.ExecutionTerminatedEvent.prototype.clearInput = function() {
  return this.setInput(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ExecutionTerminatedEvent.prototype.hasInput = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * optional bool recurse = 2;
 * @return {boolean}
 */
proto.ExecutionTerminatedEvent.prototype.getRecurse = function() {
  return /** @type {boolean} */ (jspb.Message.getBooleanFieldWithDefault(this, 2, false));
};


/**
 * @param {boolean} value
 * @return {!proto.ExecutionTerminatedEvent} returns this
 */
proto.ExecutionTerminatedEvent.prototype.setRecurse = function(value) {
  return jspb.Message.setProto3BooleanField(this, 2, value);
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.TaskScheduledEvent.prototype.toObject = function(opt_includeInstance) {
  return proto.TaskScheduledEvent.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.TaskScheduledEvent} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.TaskScheduledEvent.toObject = function(includeInstance, msg) {
  var f, obj = {
    name: jspb.Message.getFieldWithDefault(msg, 1, ""),
    version: (f = msg.getVersion()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    input: (f = msg.getInput()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    parenttracecontext: (f = msg.getParenttracecontext()) && proto.TraceContext.toObject(includeInstance, f),
    tagsMap: (f = msg.getTagsMap()) ? f.toObject(includeInstance, undefined) : []
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.TaskScheduledEvent}
 */
proto.TaskScheduledEvent.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.TaskScheduledEvent;
  return proto.TaskScheduledEvent.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.TaskScheduledEvent} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.TaskScheduledEvent}
 */
proto.TaskScheduledEvent.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setName(value);
      break;
    case 2:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setVersion(value);
      break;
    case 3:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setInput(value);
      break;
    case 4:
      var value = new proto.TraceContext;
      reader.readMessage(value,proto.TraceContext.deserializeBinaryFromReader);
      msg.setParenttracecontext(value);
      break;
    case 5:
      var value = msg.getTagsMap();
      reader.readMessage(value, function(message, reader) {
        jspb.Map.deserializeBinary(message, reader, jspb.BinaryReader.prototype.readString, jspb.BinaryReader.prototype.readString, null, "", "");
         });
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.TaskScheduledEvent.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.TaskScheduledEvent.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.TaskScheduledEvent} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.TaskScheduledEvent.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getName();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getVersion();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getInput();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getParenttracecontext();
  if (f != null) {
    writer.writeMessage(
      4,
      f,
      proto.TraceContext.serializeBinaryToWriter
    );
  }
  f = message.getTagsMap(true);
  if (f && f.getLength() > 0) {
    f.serializeBinary(5, writer, jspb.BinaryWriter.prototype.writeString, jspb.BinaryWriter.prototype.writeString);
  }
};


/**
 * optional string name = 1;
 * @return {string}
 */
proto.TaskScheduledEvent.prototype.getName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.TaskScheduledEvent} returns this
 */
proto.TaskScheduledEvent.prototype.setName = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional google.protobuf.StringValue version = 2;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.TaskScheduledEvent.prototype.getVersion = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 2));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.TaskScheduledEvent} returns this
*/
proto.TaskScheduledEvent.prototype.setVersion = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.TaskScheduledEvent} returns this
 */
proto.TaskScheduledEvent.prototype.clearVersion = function() {
  return this.setVersion(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.TaskScheduledEvent.prototype.hasVersion = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional google.protobuf.StringValue input = 3;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.TaskScheduledEvent.prototype.getInput = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 3));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.TaskScheduledEvent} returns this
*/
proto.TaskScheduledEvent.prototype.setInput = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.TaskScheduledEvent} returns this
 */
proto.TaskScheduledEvent.prototype.clearInput = function() {
  return this.setInput(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.TaskScheduledEvent.prototype.hasInput = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional TraceContext parentTraceContext = 4;
 * @return {?proto.TraceContext}
 */
proto.TaskScheduledEvent.prototype.getParenttracecontext = function() {
  return /** @type{?proto.TraceContext} */ (
    jspb.Message.getWrapperField(this, proto.TraceContext, 4));
};


/**
 * @param {?proto.TraceContext|undefined} value
 * @return {!proto.TaskScheduledEvent} returns this
*/
proto.TaskScheduledEvent.prototype.setParenttracecontext = function(value) {
  return jspb.Message.setWrapperField(this, 4, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.TaskScheduledEvent} returns this
 */
proto.TaskScheduledEvent.prototype.clearParenttracecontext = function() {
  return this.setParenttracecontext(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.TaskScheduledEvent.prototype.hasParenttracecontext = function() {
  return jspb.Message.getField(this, 4) != null;
};


/**
 * map<string, string> tags = 5;
 * @param {boolean=} opt_noLazyCreate Do not create the map if
 * empty, instead returning `undefined`
 * @return {!jspb.Map<string,string>}
 */
proto.TaskScheduledEvent.prototype.getTagsMap = function(opt_noLazyCreate) {
  return /** @type {!jspb.Map<string,string>} */ (
      jspb.Message.getMapField(this, 5, opt_noLazyCreate,
      null));
};


/**
 * Clears values from the map. The map will be non-null.
 * @return {!proto.TaskScheduledEvent} returns this
 */
proto.TaskScheduledEvent.prototype.clearTagsMap = function() {
  this.getTagsMap().clear();
  return this;};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.TaskCompletedEvent.prototype.toObject = function(opt_includeInstance) {
  return proto.TaskCompletedEvent.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.TaskCompletedEvent} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.TaskCompletedEvent.toObject = function(includeInstance, msg) {
  var f, obj = {
    taskscheduledid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    result: (f = msg.getResult()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.TaskCompletedEvent}
 */
proto.TaskCompletedEvent.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.TaskCompletedEvent;
  return proto.TaskCompletedEvent.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.TaskCompletedEvent} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.TaskCompletedEvent}
 */
proto.TaskCompletedEvent.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readInt32());
      msg.setTaskscheduledid(value);
      break;
    case 2:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setResult(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.TaskCompletedEvent.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.TaskCompletedEvent.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.TaskCompletedEvent} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.TaskCompletedEvent.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getTaskscheduledid();
  if (f !== 0) {
    writer.writeInt32(
      1,
      f
    );
  }
  f = message.getResult();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
};


/**
 * optional int32 taskScheduledId = 1;
 * @return {number}
 */
proto.TaskCompletedEvent.prototype.getTaskscheduledid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/**
 * @param {number} value
 * @return {!proto.TaskCompletedEvent} returns this
 */
proto.TaskCompletedEvent.prototype.setTaskscheduledid = function(value) {
  return jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional google.protobuf.StringValue result = 2;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.TaskCompletedEvent.prototype.getResult = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 2));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.TaskCompletedEvent} returns this
*/
proto.TaskCompletedEvent.prototype.setResult = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.TaskCompletedEvent} returns this
 */
proto.TaskCompletedEvent.prototype.clearResult = function() {
  return this.setResult(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.TaskCompletedEvent.prototype.hasResult = function() {
  return jspb.Message.getField(this, 2) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.TaskFailedEvent.prototype.toObject = function(opt_includeInstance) {
  return proto.TaskFailedEvent.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.TaskFailedEvent} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.TaskFailedEvent.toObject = function(includeInstance, msg) {
  var f, obj = {
    taskscheduledid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    failuredetails: (f = msg.getFailuredetails()) && proto.TaskFailureDetails.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.TaskFailedEvent}
 */
proto.TaskFailedEvent.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.TaskFailedEvent;
  return proto.TaskFailedEvent.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.TaskFailedEvent} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.TaskFailedEvent}
 */
proto.TaskFailedEvent.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readInt32());
      msg.setTaskscheduledid(value);
      break;
    case 2:
      var value = new proto.TaskFailureDetails;
      reader.readMessage(value,proto.TaskFailureDetails.deserializeBinaryFromReader);
      msg.setFailuredetails(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.TaskFailedEvent.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.TaskFailedEvent.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.TaskFailedEvent} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.TaskFailedEvent.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getTaskscheduledid();
  if (f !== 0) {
    writer.writeInt32(
      1,
      f
    );
  }
  f = message.getFailuredetails();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      proto.TaskFailureDetails.serializeBinaryToWriter
    );
  }
};


/**
 * optional int32 taskScheduledId = 1;
 * @return {number}
 */
proto.TaskFailedEvent.prototype.getTaskscheduledid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/**
 * @param {number} value
 * @return {!proto.TaskFailedEvent} returns this
 */
proto.TaskFailedEvent.prototype.setTaskscheduledid = function(value) {
  return jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional TaskFailureDetails failureDetails = 2;
 * @return {?proto.TaskFailureDetails}
 */
proto.TaskFailedEvent.prototype.getFailuredetails = function() {
  return /** @type{?proto.TaskFailureDetails} */ (
    jspb.Message.getWrapperField(this, proto.TaskFailureDetails, 2));
};


/**
 * @param {?proto.TaskFailureDetails|undefined} value
 * @return {!proto.TaskFailedEvent} returns this
*/
proto.TaskFailedEvent.prototype.setFailuredetails = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.TaskFailedEvent} returns this
 */
proto.TaskFailedEvent.prototype.clearFailuredetails = function() {
  return this.setFailuredetails(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.TaskFailedEvent.prototype.hasFailuredetails = function() {
  return jspb.Message.getField(this, 2) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.SubOrchestrationInstanceCreatedEvent.prototype.toObject = function(opt_includeInstance) {
  return proto.SubOrchestrationInstanceCreatedEvent.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.SubOrchestrationInstanceCreatedEvent} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.SubOrchestrationInstanceCreatedEvent.toObject = function(includeInstance, msg) {
  var f, obj = {
    instanceid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    name: jspb.Message.getFieldWithDefault(msg, 2, ""),
    version: (f = msg.getVersion()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    input: (f = msg.getInput()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    parenttracecontext: (f = msg.getParenttracecontext()) && proto.TraceContext.toObject(includeInstance, f),
    tagsMap: (f = msg.getTagsMap()) ? f.toObject(includeInstance, undefined) : []
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.SubOrchestrationInstanceCreatedEvent}
 */
proto.SubOrchestrationInstanceCreatedEvent.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.SubOrchestrationInstanceCreatedEvent;
  return proto.SubOrchestrationInstanceCreatedEvent.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.SubOrchestrationInstanceCreatedEvent} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.SubOrchestrationInstanceCreatedEvent}
 */
proto.SubOrchestrationInstanceCreatedEvent.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setInstanceid(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setName(value);
      break;
    case 3:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setVersion(value);
      break;
    case 4:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setInput(value);
      break;
    case 5:
      var value = new proto.TraceContext;
      reader.readMessage(value,proto.TraceContext.deserializeBinaryFromReader);
      msg.setParenttracecontext(value);
      break;
    case 6:
      var value = msg.getTagsMap();
      reader.readMessage(value, function(message, reader) {
        jspb.Map.deserializeBinary(message, reader, jspb.BinaryReader.prototype.readString, jspb.BinaryReader.prototype.readString, null, "", "");
         });
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.SubOrchestrationInstanceCreatedEvent.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.SubOrchestrationInstanceCreatedEvent.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.SubOrchestrationInstanceCreatedEvent} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.SubOrchestrationInstanceCreatedEvent.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstanceid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getName();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getVersion();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getInput();
  if (f != null) {
    writer.writeMessage(
      4,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getParenttracecontext();
  if (f != null) {
    writer.writeMessage(
      5,
      f,
      proto.TraceContext.serializeBinaryToWriter
    );
  }
  f = message.getTagsMap(true);
  if (f && f.getLength() > 0) {
    f.serializeBinary(6, writer, jspb.BinaryWriter.prototype.writeString, jspb.BinaryWriter.prototype.writeString);
  }
};


/**
 * optional string instanceId = 1;
 * @return {string}
 */
proto.SubOrchestrationInstanceCreatedEvent.prototype.getInstanceid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.SubOrchestrationInstanceCreatedEvent} returns this
 */
proto.SubOrchestrationInstanceCreatedEvent.prototype.setInstanceid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string name = 2;
 * @return {string}
 */
proto.SubOrchestrationInstanceCreatedEvent.prototype.getName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/**
 * @param {string} value
 * @return {!proto.SubOrchestrationInstanceCreatedEvent} returns this
 */
proto.SubOrchestrationInstanceCreatedEvent.prototype.setName = function(value) {
  return jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional google.protobuf.StringValue version = 3;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.SubOrchestrationInstanceCreatedEvent.prototype.getVersion = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 3));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.SubOrchestrationInstanceCreatedEvent} returns this
*/
proto.SubOrchestrationInstanceCreatedEvent.prototype.setVersion = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.SubOrchestrationInstanceCreatedEvent} returns this
 */
proto.SubOrchestrationInstanceCreatedEvent.prototype.clearVersion = function() {
  return this.setVersion(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.SubOrchestrationInstanceCreatedEvent.prototype.hasVersion = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional google.protobuf.StringValue input = 4;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.SubOrchestrationInstanceCreatedEvent.prototype.getInput = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 4));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.SubOrchestrationInstanceCreatedEvent} returns this
*/
proto.SubOrchestrationInstanceCreatedEvent.prototype.setInput = function(value) {
  return jspb.Message.setWrapperField(this, 4, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.SubOrchestrationInstanceCreatedEvent} returns this
 */
proto.SubOrchestrationInstanceCreatedEvent.prototype.clearInput = function() {
  return this.setInput(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.SubOrchestrationInstanceCreatedEvent.prototype.hasInput = function() {
  return jspb.Message.getField(this, 4) != null;
};


/**
 * optional TraceContext parentTraceContext = 5;
 * @return {?proto.TraceContext}
 */
proto.SubOrchestrationInstanceCreatedEvent.prototype.getParenttracecontext = function() {
  return /** @type{?proto.TraceContext} */ (
    jspb.Message.getWrapperField(this, proto.TraceContext, 5));
};


/**
 * @param {?proto.TraceContext|undefined} value
 * @return {!proto.SubOrchestrationInstanceCreatedEvent} returns this
*/
proto.SubOrchestrationInstanceCreatedEvent.prototype.setParenttracecontext = function(value) {
  return jspb.Message.setWrapperField(this, 5, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.SubOrchestrationInstanceCreatedEvent} returns this
 */
proto.SubOrchestrationInstanceCreatedEvent.prototype.clearParenttracecontext = function() {
  return this.setParenttracecontext(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.SubOrchestrationInstanceCreatedEvent.prototype.hasParenttracecontext = function() {
  return jspb.Message.getField(this, 5) != null;
};


/**
 * map<string, string> tags = 6;
 * @param {boolean=} opt_noLazyCreate Do not create the map if
 * empty, instead returning `undefined`
 * @return {!jspb.Map<string,string>}
 */
proto.SubOrchestrationInstanceCreatedEvent.prototype.getTagsMap = function(opt_noLazyCreate) {
  return /** @type {!jspb.Map<string,string>} */ (
      jspb.Message.getMapField(this, 6, opt_noLazyCreate,
      null));
};


/**
 * Clears values from the map. The map will be non-null.
 * @return {!proto.SubOrchestrationInstanceCreatedEvent} returns this
 */
proto.SubOrchestrationInstanceCreatedEvent.prototype.clearTagsMap = function() {
  this.getTagsMap().clear();
  return this;};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.SubOrchestrationInstanceCompletedEvent.prototype.toObject = function(opt_includeInstance) {
  return proto.SubOrchestrationInstanceCompletedEvent.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.SubOrchestrationInstanceCompletedEvent} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.SubOrchestrationInstanceCompletedEvent.toObject = function(includeInstance, msg) {
  var f, obj = {
    taskscheduledid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    result: (f = msg.getResult()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.SubOrchestrationInstanceCompletedEvent}
 */
proto.SubOrchestrationInstanceCompletedEvent.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.SubOrchestrationInstanceCompletedEvent;
  return proto.SubOrchestrationInstanceCompletedEvent.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.SubOrchestrationInstanceCompletedEvent} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.SubOrchestrationInstanceCompletedEvent}
 */
proto.SubOrchestrationInstanceCompletedEvent.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readInt32());
      msg.setTaskscheduledid(value);
      break;
    case 2:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setResult(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.SubOrchestrationInstanceCompletedEvent.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.SubOrchestrationInstanceCompletedEvent.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.SubOrchestrationInstanceCompletedEvent} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.SubOrchestrationInstanceCompletedEvent.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getTaskscheduledid();
  if (f !== 0) {
    writer.writeInt32(
      1,
      f
    );
  }
  f = message.getResult();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
};


/**
 * optional int32 taskScheduledId = 1;
 * @return {number}
 */
proto.SubOrchestrationInstanceCompletedEvent.prototype.getTaskscheduledid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/**
 * @param {number} value
 * @return {!proto.SubOrchestrationInstanceCompletedEvent} returns this
 */
proto.SubOrchestrationInstanceCompletedEvent.prototype.setTaskscheduledid = function(value) {
  return jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional google.protobuf.StringValue result = 2;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.SubOrchestrationInstanceCompletedEvent.prototype.getResult = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 2));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.SubOrchestrationInstanceCompletedEvent} returns this
*/
proto.SubOrchestrationInstanceCompletedEvent.prototype.setResult = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.SubOrchestrationInstanceCompletedEvent} returns this
 */
proto.SubOrchestrationInstanceCompletedEvent.prototype.clearResult = function() {
  return this.setResult(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.SubOrchestrationInstanceCompletedEvent.prototype.hasResult = function() {
  return jspb.Message.getField(this, 2) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.SubOrchestrationInstanceFailedEvent.prototype.toObject = function(opt_includeInstance) {
  return proto.SubOrchestrationInstanceFailedEvent.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.SubOrchestrationInstanceFailedEvent} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.SubOrchestrationInstanceFailedEvent.toObject = function(includeInstance, msg) {
  var f, obj = {
    taskscheduledid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    failuredetails: (f = msg.getFailuredetails()) && proto.TaskFailureDetails.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.SubOrchestrationInstanceFailedEvent}
 */
proto.SubOrchestrationInstanceFailedEvent.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.SubOrchestrationInstanceFailedEvent;
  return proto.SubOrchestrationInstanceFailedEvent.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.SubOrchestrationInstanceFailedEvent} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.SubOrchestrationInstanceFailedEvent}
 */
proto.SubOrchestrationInstanceFailedEvent.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readInt32());
      msg.setTaskscheduledid(value);
      break;
    case 2:
      var value = new proto.TaskFailureDetails;
      reader.readMessage(value,proto.TaskFailureDetails.deserializeBinaryFromReader);
      msg.setFailuredetails(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.SubOrchestrationInstanceFailedEvent.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.SubOrchestrationInstanceFailedEvent.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.SubOrchestrationInstanceFailedEvent} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.SubOrchestrationInstanceFailedEvent.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getTaskscheduledid();
  if (f !== 0) {
    writer.writeInt32(
      1,
      f
    );
  }
  f = message.getFailuredetails();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      proto.TaskFailureDetails.serializeBinaryToWriter
    );
  }
};


/**
 * optional int32 taskScheduledId = 1;
 * @return {number}
 */
proto.SubOrchestrationInstanceFailedEvent.prototype.getTaskscheduledid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/**
 * @param {number} value
 * @return {!proto.SubOrchestrationInstanceFailedEvent} returns this
 */
proto.SubOrchestrationInstanceFailedEvent.prototype.setTaskscheduledid = function(value) {
  return jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional TaskFailureDetails failureDetails = 2;
 * @return {?proto.TaskFailureDetails}
 */
proto.SubOrchestrationInstanceFailedEvent.prototype.getFailuredetails = function() {
  return /** @type{?proto.TaskFailureDetails} */ (
    jspb.Message.getWrapperField(this, proto.TaskFailureDetails, 2));
};


/**
 * @param {?proto.TaskFailureDetails|undefined} value
 * @return {!proto.SubOrchestrationInstanceFailedEvent} returns this
*/
proto.SubOrchestrationInstanceFailedEvent.prototype.setFailuredetails = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.SubOrchestrationInstanceFailedEvent} returns this
 */
proto.SubOrchestrationInstanceFailedEvent.prototype.clearFailuredetails = function() {
  return this.setFailuredetails(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.SubOrchestrationInstanceFailedEvent.prototype.hasFailuredetails = function() {
  return jspb.Message.getField(this, 2) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.TimerCreatedEvent.prototype.toObject = function(opt_includeInstance) {
  return proto.TimerCreatedEvent.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.TimerCreatedEvent} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.TimerCreatedEvent.toObject = function(includeInstance, msg) {
  var f, obj = {
    fireat: (f = msg.getFireat()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.TimerCreatedEvent}
 */
proto.TimerCreatedEvent.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.TimerCreatedEvent;
  return proto.TimerCreatedEvent.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.TimerCreatedEvent} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.TimerCreatedEvent}
 */
proto.TimerCreatedEvent.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setFireat(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.TimerCreatedEvent.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.TimerCreatedEvent.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.TimerCreatedEvent} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.TimerCreatedEvent.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getFireat();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
};


/**
 * optional google.protobuf.Timestamp fireAt = 1;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.TimerCreatedEvent.prototype.getFireat = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 1));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.TimerCreatedEvent} returns this
*/
proto.TimerCreatedEvent.prototype.setFireat = function(value) {
  return jspb.Message.setWrapperField(this, 1, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.TimerCreatedEvent} returns this
 */
proto.TimerCreatedEvent.prototype.clearFireat = function() {
  return this.setFireat(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.TimerCreatedEvent.prototype.hasFireat = function() {
  return jspb.Message.getField(this, 1) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.TimerFiredEvent.prototype.toObject = function(opt_includeInstance) {
  return proto.TimerFiredEvent.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.TimerFiredEvent} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.TimerFiredEvent.toObject = function(includeInstance, msg) {
  var f, obj = {
    fireat: (f = msg.getFireat()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f),
    timerid: jspb.Message.getFieldWithDefault(msg, 2, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.TimerFiredEvent}
 */
proto.TimerFiredEvent.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.TimerFiredEvent;
  return proto.TimerFiredEvent.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.TimerFiredEvent} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.TimerFiredEvent}
 */
proto.TimerFiredEvent.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setFireat(value);
      break;
    case 2:
      var value = /** @type {number} */ (reader.readInt32());
      msg.setTimerid(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.TimerFiredEvent.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.TimerFiredEvent.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.TimerFiredEvent} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.TimerFiredEvent.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getFireat();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
  f = message.getTimerid();
  if (f !== 0) {
    writer.writeInt32(
      2,
      f
    );
  }
};


/**
 * optional google.protobuf.Timestamp fireAt = 1;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.TimerFiredEvent.prototype.getFireat = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 1));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.TimerFiredEvent} returns this
*/
proto.TimerFiredEvent.prototype.setFireat = function(value) {
  return jspb.Message.setWrapperField(this, 1, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.TimerFiredEvent} returns this
 */
proto.TimerFiredEvent.prototype.clearFireat = function() {
  return this.setFireat(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.TimerFiredEvent.prototype.hasFireat = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * optional int32 timerId = 2;
 * @return {number}
 */
proto.TimerFiredEvent.prototype.getTimerid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 2, 0));
};


/**
 * @param {number} value
 * @return {!proto.TimerFiredEvent} returns this
 */
proto.TimerFiredEvent.prototype.setTimerid = function(value) {
  return jspb.Message.setProto3IntField(this, 2, value);
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.OrchestratorStartedEvent.prototype.toObject = function(opt_includeInstance) {
  return proto.OrchestratorStartedEvent.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.OrchestratorStartedEvent} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OrchestratorStartedEvent.toObject = function(includeInstance, msg) {
  var f, obj = {

  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.OrchestratorStartedEvent}
 */
proto.OrchestratorStartedEvent.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.OrchestratorStartedEvent;
  return proto.OrchestratorStartedEvent.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.OrchestratorStartedEvent} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.OrchestratorStartedEvent}
 */
proto.OrchestratorStartedEvent.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.OrchestratorStartedEvent.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.OrchestratorStartedEvent.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.OrchestratorStartedEvent} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OrchestratorStartedEvent.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.OrchestratorCompletedEvent.prototype.toObject = function(opt_includeInstance) {
  return proto.OrchestratorCompletedEvent.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.OrchestratorCompletedEvent} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OrchestratorCompletedEvent.toObject = function(includeInstance, msg) {
  var f, obj = {

  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.OrchestratorCompletedEvent}
 */
proto.OrchestratorCompletedEvent.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.OrchestratorCompletedEvent;
  return proto.OrchestratorCompletedEvent.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.OrchestratorCompletedEvent} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.OrchestratorCompletedEvent}
 */
proto.OrchestratorCompletedEvent.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.OrchestratorCompletedEvent.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.OrchestratorCompletedEvent.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.OrchestratorCompletedEvent} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OrchestratorCompletedEvent.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.EventSentEvent.prototype.toObject = function(opt_includeInstance) {
  return proto.EventSentEvent.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.EventSentEvent} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.EventSentEvent.toObject = function(includeInstance, msg) {
  var f, obj = {
    instanceid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    name: jspb.Message.getFieldWithDefault(msg, 2, ""),
    input: (f = msg.getInput()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.EventSentEvent}
 */
proto.EventSentEvent.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.EventSentEvent;
  return proto.EventSentEvent.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.EventSentEvent} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.EventSentEvent}
 */
proto.EventSentEvent.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setInstanceid(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setName(value);
      break;
    case 3:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setInput(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.EventSentEvent.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.EventSentEvent.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.EventSentEvent} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.EventSentEvent.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstanceid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getName();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getInput();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
};


/**
 * optional string instanceId = 1;
 * @return {string}
 */
proto.EventSentEvent.prototype.getInstanceid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.EventSentEvent} returns this
 */
proto.EventSentEvent.prototype.setInstanceid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string name = 2;
 * @return {string}
 */
proto.EventSentEvent.prototype.getName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/**
 * @param {string} value
 * @return {!proto.EventSentEvent} returns this
 */
proto.EventSentEvent.prototype.setName = function(value) {
  return jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional google.protobuf.StringValue input = 3;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.EventSentEvent.prototype.getInput = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 3));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.EventSentEvent} returns this
*/
proto.EventSentEvent.prototype.setInput = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.EventSentEvent} returns this
 */
proto.EventSentEvent.prototype.clearInput = function() {
  return this.setInput(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.EventSentEvent.prototype.hasInput = function() {
  return jspb.Message.getField(this, 3) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.EventRaisedEvent.prototype.toObject = function(opt_includeInstance) {
  return proto.EventRaisedEvent.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.EventRaisedEvent} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.EventRaisedEvent.toObject = function(includeInstance, msg) {
  var f, obj = {
    name: jspb.Message.getFieldWithDefault(msg, 1, ""),
    input: (f = msg.getInput()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.EventRaisedEvent}
 */
proto.EventRaisedEvent.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.EventRaisedEvent;
  return proto.EventRaisedEvent.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.EventRaisedEvent} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.EventRaisedEvent}
 */
proto.EventRaisedEvent.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setName(value);
      break;
    case 2:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setInput(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.EventRaisedEvent.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.EventRaisedEvent.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.EventRaisedEvent} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.EventRaisedEvent.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getName();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getInput();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
};


/**
 * optional string name = 1;
 * @return {string}
 */
proto.EventRaisedEvent.prototype.getName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.EventRaisedEvent} returns this
 */
proto.EventRaisedEvent.prototype.setName = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional google.protobuf.StringValue input = 2;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.EventRaisedEvent.prototype.getInput = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 2));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.EventRaisedEvent} returns this
*/
proto.EventRaisedEvent.prototype.setInput = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.EventRaisedEvent} returns this
 */
proto.EventRaisedEvent.prototype.clearInput = function() {
  return this.setInput(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.EventRaisedEvent.prototype.hasInput = function() {
  return jspb.Message.getField(this, 2) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.GenericEvent.prototype.toObject = function(opt_includeInstance) {
  return proto.GenericEvent.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.GenericEvent} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.GenericEvent.toObject = function(includeInstance, msg) {
  var f, obj = {
    data: (f = msg.getData()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.GenericEvent}
 */
proto.GenericEvent.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.GenericEvent;
  return proto.GenericEvent.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.GenericEvent} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.GenericEvent}
 */
proto.GenericEvent.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setData(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.GenericEvent.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.GenericEvent.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.GenericEvent} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.GenericEvent.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getData();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
};


/**
 * optional google.protobuf.StringValue data = 1;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.GenericEvent.prototype.getData = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 1));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.GenericEvent} returns this
*/
proto.GenericEvent.prototype.setData = function(value) {
  return jspb.Message.setWrapperField(this, 1, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.GenericEvent} returns this
 */
proto.GenericEvent.prototype.clearData = function() {
  return this.setData(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.GenericEvent.prototype.hasData = function() {
  return jspb.Message.getField(this, 1) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.HistoryStateEvent.prototype.toObject = function(opt_includeInstance) {
  return proto.HistoryStateEvent.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.HistoryStateEvent} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.HistoryStateEvent.toObject = function(includeInstance, msg) {
  var f, obj = {
    orchestrationstate: (f = msg.getOrchestrationstate()) && proto.OrchestrationState.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.HistoryStateEvent}
 */
proto.HistoryStateEvent.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.HistoryStateEvent;
  return proto.HistoryStateEvent.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.HistoryStateEvent} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.HistoryStateEvent}
 */
proto.HistoryStateEvent.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.OrchestrationState;
      reader.readMessage(value,proto.OrchestrationState.deserializeBinaryFromReader);
      msg.setOrchestrationstate(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.HistoryStateEvent.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.HistoryStateEvent.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.HistoryStateEvent} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.HistoryStateEvent.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getOrchestrationstate();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      proto.OrchestrationState.serializeBinaryToWriter
    );
  }
};


/**
 * optional OrchestrationState orchestrationState = 1;
 * @return {?proto.OrchestrationState}
 */
proto.HistoryStateEvent.prototype.getOrchestrationstate = function() {
  return /** @type{?proto.OrchestrationState} */ (
    jspb.Message.getWrapperField(this, proto.OrchestrationState, 1));
};


/**
 * @param {?proto.OrchestrationState|undefined} value
 * @return {!proto.HistoryStateEvent} returns this
*/
proto.HistoryStateEvent.prototype.setOrchestrationstate = function(value) {
  return jspb.Message.setWrapperField(this, 1, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.HistoryStateEvent} returns this
 */
proto.HistoryStateEvent.prototype.clearOrchestrationstate = function() {
  return this.setOrchestrationstate(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.HistoryStateEvent.prototype.hasOrchestrationstate = function() {
  return jspb.Message.getField(this, 1) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.ContinueAsNewEvent.prototype.toObject = function(opt_includeInstance) {
  return proto.ContinueAsNewEvent.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.ContinueAsNewEvent} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.ContinueAsNewEvent.toObject = function(includeInstance, msg) {
  var f, obj = {
    input: (f = msg.getInput()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.ContinueAsNewEvent}
 */
proto.ContinueAsNewEvent.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.ContinueAsNewEvent;
  return proto.ContinueAsNewEvent.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.ContinueAsNewEvent} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.ContinueAsNewEvent}
 */
proto.ContinueAsNewEvent.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setInput(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.ContinueAsNewEvent.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.ContinueAsNewEvent.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.ContinueAsNewEvent} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.ContinueAsNewEvent.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInput();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
};


/**
 * optional google.protobuf.StringValue input = 1;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.ContinueAsNewEvent.prototype.getInput = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 1));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.ContinueAsNewEvent} returns this
*/
proto.ContinueAsNewEvent.prototype.setInput = function(value) {
  return jspb.Message.setWrapperField(this, 1, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ContinueAsNewEvent} returns this
 */
proto.ContinueAsNewEvent.prototype.clearInput = function() {
  return this.setInput(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ContinueAsNewEvent.prototype.hasInput = function() {
  return jspb.Message.getField(this, 1) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.ExecutionSuspendedEvent.prototype.toObject = function(opt_includeInstance) {
  return proto.ExecutionSuspendedEvent.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.ExecutionSuspendedEvent} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.ExecutionSuspendedEvent.toObject = function(includeInstance, msg) {
  var f, obj = {
    input: (f = msg.getInput()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.ExecutionSuspendedEvent}
 */
proto.ExecutionSuspendedEvent.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.ExecutionSuspendedEvent;
  return proto.ExecutionSuspendedEvent.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.ExecutionSuspendedEvent} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.ExecutionSuspendedEvent}
 */
proto.ExecutionSuspendedEvent.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setInput(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.ExecutionSuspendedEvent.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.ExecutionSuspendedEvent.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.ExecutionSuspendedEvent} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.ExecutionSuspendedEvent.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInput();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
};


/**
 * optional google.protobuf.StringValue input = 1;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.ExecutionSuspendedEvent.prototype.getInput = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 1));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.ExecutionSuspendedEvent} returns this
*/
proto.ExecutionSuspendedEvent.prototype.setInput = function(value) {
  return jspb.Message.setWrapperField(this, 1, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ExecutionSuspendedEvent} returns this
 */
proto.ExecutionSuspendedEvent.prototype.clearInput = function() {
  return this.setInput(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ExecutionSuspendedEvent.prototype.hasInput = function() {
  return jspb.Message.getField(this, 1) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.ExecutionResumedEvent.prototype.toObject = function(opt_includeInstance) {
  return proto.ExecutionResumedEvent.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.ExecutionResumedEvent} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.ExecutionResumedEvent.toObject = function(includeInstance, msg) {
  var f, obj = {
    input: (f = msg.getInput()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.ExecutionResumedEvent}
 */
proto.ExecutionResumedEvent.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.ExecutionResumedEvent;
  return proto.ExecutionResumedEvent.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.ExecutionResumedEvent} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.ExecutionResumedEvent}
 */
proto.ExecutionResumedEvent.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setInput(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.ExecutionResumedEvent.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.ExecutionResumedEvent.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.ExecutionResumedEvent} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.ExecutionResumedEvent.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInput();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
};


/**
 * optional google.protobuf.StringValue input = 1;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.ExecutionResumedEvent.prototype.getInput = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 1));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.ExecutionResumedEvent} returns this
*/
proto.ExecutionResumedEvent.prototype.setInput = function(value) {
  return jspb.Message.setWrapperField(this, 1, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ExecutionResumedEvent} returns this
 */
proto.ExecutionResumedEvent.prototype.clearInput = function() {
  return this.setInput(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ExecutionResumedEvent.prototype.hasInput = function() {
  return jspb.Message.getField(this, 1) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.EntityOperationSignaledEvent.prototype.toObject = function(opt_includeInstance) {
  return proto.EntityOperationSignaledEvent.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.EntityOperationSignaledEvent} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.EntityOperationSignaledEvent.toObject = function(includeInstance, msg) {
  var f, obj = {
    requestid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    operation: jspb.Message.getFieldWithDefault(msg, 2, ""),
    scheduledtime: (f = msg.getScheduledtime()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f),
    input: (f = msg.getInput()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    targetinstanceid: (f = msg.getTargetinstanceid()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.EntityOperationSignaledEvent}
 */
proto.EntityOperationSignaledEvent.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.EntityOperationSignaledEvent;
  return proto.EntityOperationSignaledEvent.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.EntityOperationSignaledEvent} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.EntityOperationSignaledEvent}
 */
proto.EntityOperationSignaledEvent.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setRequestid(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setOperation(value);
      break;
    case 3:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setScheduledtime(value);
      break;
    case 4:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setInput(value);
      break;
    case 5:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setTargetinstanceid(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.EntityOperationSignaledEvent.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.EntityOperationSignaledEvent.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.EntityOperationSignaledEvent} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.EntityOperationSignaledEvent.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getRequestid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getOperation();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getScheduledtime();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
  f = message.getInput();
  if (f != null) {
    writer.writeMessage(
      4,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getTargetinstanceid();
  if (f != null) {
    writer.writeMessage(
      5,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
};


/**
 * optional string requestId = 1;
 * @return {string}
 */
proto.EntityOperationSignaledEvent.prototype.getRequestid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.EntityOperationSignaledEvent} returns this
 */
proto.EntityOperationSignaledEvent.prototype.setRequestid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string operation = 2;
 * @return {string}
 */
proto.EntityOperationSignaledEvent.prototype.getOperation = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/**
 * @param {string} value
 * @return {!proto.EntityOperationSignaledEvent} returns this
 */
proto.EntityOperationSignaledEvent.prototype.setOperation = function(value) {
  return jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional google.protobuf.Timestamp scheduledTime = 3;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.EntityOperationSignaledEvent.prototype.getScheduledtime = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 3));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.EntityOperationSignaledEvent} returns this
*/
proto.EntityOperationSignaledEvent.prototype.setScheduledtime = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.EntityOperationSignaledEvent} returns this
 */
proto.EntityOperationSignaledEvent.prototype.clearScheduledtime = function() {
  return this.setScheduledtime(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.EntityOperationSignaledEvent.prototype.hasScheduledtime = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional google.protobuf.StringValue input = 4;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.EntityOperationSignaledEvent.prototype.getInput = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 4));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.EntityOperationSignaledEvent} returns this
*/
proto.EntityOperationSignaledEvent.prototype.setInput = function(value) {
  return jspb.Message.setWrapperField(this, 4, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.EntityOperationSignaledEvent} returns this
 */
proto.EntityOperationSignaledEvent.prototype.clearInput = function() {
  return this.setInput(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.EntityOperationSignaledEvent.prototype.hasInput = function() {
  return jspb.Message.getField(this, 4) != null;
};


/**
 * optional google.protobuf.StringValue targetInstanceId = 5;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.EntityOperationSignaledEvent.prototype.getTargetinstanceid = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 5));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.EntityOperationSignaledEvent} returns this
*/
proto.EntityOperationSignaledEvent.prototype.setTargetinstanceid = function(value) {
  return jspb.Message.setWrapperField(this, 5, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.EntityOperationSignaledEvent} returns this
 */
proto.EntityOperationSignaledEvent.prototype.clearTargetinstanceid = function() {
  return this.setTargetinstanceid(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.EntityOperationSignaledEvent.prototype.hasTargetinstanceid = function() {
  return jspb.Message.getField(this, 5) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.EntityOperationCalledEvent.prototype.toObject = function(opt_includeInstance) {
  return proto.EntityOperationCalledEvent.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.EntityOperationCalledEvent} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.EntityOperationCalledEvent.toObject = function(includeInstance, msg) {
  var f, obj = {
    requestid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    operation: jspb.Message.getFieldWithDefault(msg, 2, ""),
    scheduledtime: (f = msg.getScheduledtime()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f),
    input: (f = msg.getInput()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    parentinstanceid: (f = msg.getParentinstanceid()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    parentexecutionid: (f = msg.getParentexecutionid()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    targetinstanceid: (f = msg.getTargetinstanceid()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.EntityOperationCalledEvent}
 */
proto.EntityOperationCalledEvent.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.EntityOperationCalledEvent;
  return proto.EntityOperationCalledEvent.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.EntityOperationCalledEvent} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.EntityOperationCalledEvent}
 */
proto.EntityOperationCalledEvent.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setRequestid(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setOperation(value);
      break;
    case 3:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setScheduledtime(value);
      break;
    case 4:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setInput(value);
      break;
    case 5:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setParentinstanceid(value);
      break;
    case 6:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setParentexecutionid(value);
      break;
    case 7:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setTargetinstanceid(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.EntityOperationCalledEvent.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.EntityOperationCalledEvent.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.EntityOperationCalledEvent} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.EntityOperationCalledEvent.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getRequestid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getOperation();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getScheduledtime();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
  f = message.getInput();
  if (f != null) {
    writer.writeMessage(
      4,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getParentinstanceid();
  if (f != null) {
    writer.writeMessage(
      5,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getParentexecutionid();
  if (f != null) {
    writer.writeMessage(
      6,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getTargetinstanceid();
  if (f != null) {
    writer.writeMessage(
      7,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
};


/**
 * optional string requestId = 1;
 * @return {string}
 */
proto.EntityOperationCalledEvent.prototype.getRequestid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.EntityOperationCalledEvent} returns this
 */
proto.EntityOperationCalledEvent.prototype.setRequestid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string operation = 2;
 * @return {string}
 */
proto.EntityOperationCalledEvent.prototype.getOperation = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/**
 * @param {string} value
 * @return {!proto.EntityOperationCalledEvent} returns this
 */
proto.EntityOperationCalledEvent.prototype.setOperation = function(value) {
  return jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional google.protobuf.Timestamp scheduledTime = 3;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.EntityOperationCalledEvent.prototype.getScheduledtime = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 3));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.EntityOperationCalledEvent} returns this
*/
proto.EntityOperationCalledEvent.prototype.setScheduledtime = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.EntityOperationCalledEvent} returns this
 */
proto.EntityOperationCalledEvent.prototype.clearScheduledtime = function() {
  return this.setScheduledtime(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.EntityOperationCalledEvent.prototype.hasScheduledtime = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional google.protobuf.StringValue input = 4;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.EntityOperationCalledEvent.prototype.getInput = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 4));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.EntityOperationCalledEvent} returns this
*/
proto.EntityOperationCalledEvent.prototype.setInput = function(value) {
  return jspb.Message.setWrapperField(this, 4, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.EntityOperationCalledEvent} returns this
 */
proto.EntityOperationCalledEvent.prototype.clearInput = function() {
  return this.setInput(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.EntityOperationCalledEvent.prototype.hasInput = function() {
  return jspb.Message.getField(this, 4) != null;
};


/**
 * optional google.protobuf.StringValue parentInstanceId = 5;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.EntityOperationCalledEvent.prototype.getParentinstanceid = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 5));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.EntityOperationCalledEvent} returns this
*/
proto.EntityOperationCalledEvent.prototype.setParentinstanceid = function(value) {
  return jspb.Message.setWrapperField(this, 5, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.EntityOperationCalledEvent} returns this
 */
proto.EntityOperationCalledEvent.prototype.clearParentinstanceid = function() {
  return this.setParentinstanceid(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.EntityOperationCalledEvent.prototype.hasParentinstanceid = function() {
  return jspb.Message.getField(this, 5) != null;
};


/**
 * optional google.protobuf.StringValue parentExecutionId = 6;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.EntityOperationCalledEvent.prototype.getParentexecutionid = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 6));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.EntityOperationCalledEvent} returns this
*/
proto.EntityOperationCalledEvent.prototype.setParentexecutionid = function(value) {
  return jspb.Message.setWrapperField(this, 6, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.EntityOperationCalledEvent} returns this
 */
proto.EntityOperationCalledEvent.prototype.clearParentexecutionid = function() {
  return this.setParentexecutionid(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.EntityOperationCalledEvent.prototype.hasParentexecutionid = function() {
  return jspb.Message.getField(this, 6) != null;
};


/**
 * optional google.protobuf.StringValue targetInstanceId = 7;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.EntityOperationCalledEvent.prototype.getTargetinstanceid = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 7));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.EntityOperationCalledEvent} returns this
*/
proto.EntityOperationCalledEvent.prototype.setTargetinstanceid = function(value) {
  return jspb.Message.setWrapperField(this, 7, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.EntityOperationCalledEvent} returns this
 */
proto.EntityOperationCalledEvent.prototype.clearTargetinstanceid = function() {
  return this.setTargetinstanceid(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.EntityOperationCalledEvent.prototype.hasTargetinstanceid = function() {
  return jspb.Message.getField(this, 7) != null;
};



/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.EntityLockRequestedEvent.repeatedFields_ = [2];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.EntityLockRequestedEvent.prototype.toObject = function(opt_includeInstance) {
  return proto.EntityLockRequestedEvent.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.EntityLockRequestedEvent} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.EntityLockRequestedEvent.toObject = function(includeInstance, msg) {
  var f, obj = {
    criticalsectionid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    locksetList: (f = jspb.Message.getRepeatedField(msg, 2)) == null ? undefined : f,
    position: jspb.Message.getFieldWithDefault(msg, 3, 0),
    parentinstanceid: (f = msg.getParentinstanceid()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.EntityLockRequestedEvent}
 */
proto.EntityLockRequestedEvent.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.EntityLockRequestedEvent;
  return proto.EntityLockRequestedEvent.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.EntityLockRequestedEvent} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.EntityLockRequestedEvent}
 */
proto.EntityLockRequestedEvent.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setCriticalsectionid(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.addLockset(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readInt32());
      msg.setPosition(value);
      break;
    case 4:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setParentinstanceid(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.EntityLockRequestedEvent.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.EntityLockRequestedEvent.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.EntityLockRequestedEvent} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.EntityLockRequestedEvent.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getCriticalsectionid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getLocksetList();
  if (f.length > 0) {
    writer.writeRepeatedString(
      2,
      f
    );
  }
  f = message.getPosition();
  if (f !== 0) {
    writer.writeInt32(
      3,
      f
    );
  }
  f = message.getParentinstanceid();
  if (f != null) {
    writer.writeMessage(
      4,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
};


/**
 * optional string criticalSectionId = 1;
 * @return {string}
 */
proto.EntityLockRequestedEvent.prototype.getCriticalsectionid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.EntityLockRequestedEvent} returns this
 */
proto.EntityLockRequestedEvent.prototype.setCriticalsectionid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * repeated string lockSet = 2;
 * @return {!Array<string>}
 */
proto.EntityLockRequestedEvent.prototype.getLocksetList = function() {
  return /** @type {!Array<string>} */ (jspb.Message.getRepeatedField(this, 2));
};


/**
 * @param {!Array<string>} value
 * @return {!proto.EntityLockRequestedEvent} returns this
 */
proto.EntityLockRequestedEvent.prototype.setLocksetList = function(value) {
  return jspb.Message.setField(this, 2, value || []);
};


/**
 * @param {string} value
 * @param {number=} opt_index
 * @return {!proto.EntityLockRequestedEvent} returns this
 */
proto.EntityLockRequestedEvent.prototype.addLockset = function(value, opt_index) {
  return jspb.Message.addToRepeatedField(this, 2, value, opt_index);
};


/**
 * Clears the list making it empty but non-null.
 * @return {!proto.EntityLockRequestedEvent} returns this
 */
proto.EntityLockRequestedEvent.prototype.clearLocksetList = function() {
  return this.setLocksetList([]);
};


/**
 * optional int32 position = 3;
 * @return {number}
 */
proto.EntityLockRequestedEvent.prototype.getPosition = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/**
 * @param {number} value
 * @return {!proto.EntityLockRequestedEvent} returns this
 */
proto.EntityLockRequestedEvent.prototype.setPosition = function(value) {
  return jspb.Message.setProto3IntField(this, 3, value);
};


/**
 * optional google.protobuf.StringValue parentInstanceId = 4;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.EntityLockRequestedEvent.prototype.getParentinstanceid = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 4));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.EntityLockRequestedEvent} returns this
*/
proto.EntityLockRequestedEvent.prototype.setParentinstanceid = function(value) {
  return jspb.Message.setWrapperField(this, 4, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.EntityLockRequestedEvent} returns this
 */
proto.EntityLockRequestedEvent.prototype.clearParentinstanceid = function() {
  return this.setParentinstanceid(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.EntityLockRequestedEvent.prototype.hasParentinstanceid = function() {
  return jspb.Message.getField(this, 4) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.EntityOperationCompletedEvent.prototype.toObject = function(opt_includeInstance) {
  return proto.EntityOperationCompletedEvent.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.EntityOperationCompletedEvent} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.EntityOperationCompletedEvent.toObject = function(includeInstance, msg) {
  var f, obj = {
    requestid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    output: (f = msg.getOutput()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.EntityOperationCompletedEvent}
 */
proto.EntityOperationCompletedEvent.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.EntityOperationCompletedEvent;
  return proto.EntityOperationCompletedEvent.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.EntityOperationCompletedEvent} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.EntityOperationCompletedEvent}
 */
proto.EntityOperationCompletedEvent.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setRequestid(value);
      break;
    case 2:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setOutput(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.EntityOperationCompletedEvent.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.EntityOperationCompletedEvent.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.EntityOperationCompletedEvent} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.EntityOperationCompletedEvent.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getRequestid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getOutput();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
};


/**
 * optional string requestId = 1;
 * @return {string}
 */
proto.EntityOperationCompletedEvent.prototype.getRequestid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.EntityOperationCompletedEvent} returns this
 */
proto.EntityOperationCompletedEvent.prototype.setRequestid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional google.protobuf.StringValue output = 2;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.EntityOperationCompletedEvent.prototype.getOutput = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 2));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.EntityOperationCompletedEvent} returns this
*/
proto.EntityOperationCompletedEvent.prototype.setOutput = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.EntityOperationCompletedEvent} returns this
 */
proto.EntityOperationCompletedEvent.prototype.clearOutput = function() {
  return this.setOutput(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.EntityOperationCompletedEvent.prototype.hasOutput = function() {
  return jspb.Message.getField(this, 2) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.EntityOperationFailedEvent.prototype.toObject = function(opt_includeInstance) {
  return proto.EntityOperationFailedEvent.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.EntityOperationFailedEvent} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.EntityOperationFailedEvent.toObject = function(includeInstance, msg) {
  var f, obj = {
    requestid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    failuredetails: (f = msg.getFailuredetails()) && proto.TaskFailureDetails.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.EntityOperationFailedEvent}
 */
proto.EntityOperationFailedEvent.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.EntityOperationFailedEvent;
  return proto.EntityOperationFailedEvent.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.EntityOperationFailedEvent} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.EntityOperationFailedEvent}
 */
proto.EntityOperationFailedEvent.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setRequestid(value);
      break;
    case 2:
      var value = new proto.TaskFailureDetails;
      reader.readMessage(value,proto.TaskFailureDetails.deserializeBinaryFromReader);
      msg.setFailuredetails(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.EntityOperationFailedEvent.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.EntityOperationFailedEvent.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.EntityOperationFailedEvent} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.EntityOperationFailedEvent.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getRequestid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getFailuredetails();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      proto.TaskFailureDetails.serializeBinaryToWriter
    );
  }
};


/**
 * optional string requestId = 1;
 * @return {string}
 */
proto.EntityOperationFailedEvent.prototype.getRequestid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.EntityOperationFailedEvent} returns this
 */
proto.EntityOperationFailedEvent.prototype.setRequestid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional TaskFailureDetails failureDetails = 2;
 * @return {?proto.TaskFailureDetails}
 */
proto.EntityOperationFailedEvent.prototype.getFailuredetails = function() {
  return /** @type{?proto.TaskFailureDetails} */ (
    jspb.Message.getWrapperField(this, proto.TaskFailureDetails, 2));
};


/**
 * @param {?proto.TaskFailureDetails|undefined} value
 * @return {!proto.EntityOperationFailedEvent} returns this
*/
proto.EntityOperationFailedEvent.prototype.setFailuredetails = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.EntityOperationFailedEvent} returns this
 */
proto.EntityOperationFailedEvent.prototype.clearFailuredetails = function() {
  return this.setFailuredetails(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.EntityOperationFailedEvent.prototype.hasFailuredetails = function() {
  return jspb.Message.getField(this, 2) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.EntityUnlockSentEvent.prototype.toObject = function(opt_includeInstance) {
  return proto.EntityUnlockSentEvent.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.EntityUnlockSentEvent} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.EntityUnlockSentEvent.toObject = function(includeInstance, msg) {
  var f, obj = {
    criticalsectionid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    parentinstanceid: (f = msg.getParentinstanceid()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    targetinstanceid: (f = msg.getTargetinstanceid()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.EntityUnlockSentEvent}
 */
proto.EntityUnlockSentEvent.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.EntityUnlockSentEvent;
  return proto.EntityUnlockSentEvent.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.EntityUnlockSentEvent} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.EntityUnlockSentEvent}
 */
proto.EntityUnlockSentEvent.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setCriticalsectionid(value);
      break;
    case 2:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setParentinstanceid(value);
      break;
    case 3:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setTargetinstanceid(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.EntityUnlockSentEvent.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.EntityUnlockSentEvent.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.EntityUnlockSentEvent} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.EntityUnlockSentEvent.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getCriticalsectionid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getParentinstanceid();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getTargetinstanceid();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
};


/**
 * optional string criticalSectionId = 1;
 * @return {string}
 */
proto.EntityUnlockSentEvent.prototype.getCriticalsectionid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.EntityUnlockSentEvent} returns this
 */
proto.EntityUnlockSentEvent.prototype.setCriticalsectionid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional google.protobuf.StringValue parentInstanceId = 2;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.EntityUnlockSentEvent.prototype.getParentinstanceid = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 2));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.EntityUnlockSentEvent} returns this
*/
proto.EntityUnlockSentEvent.prototype.setParentinstanceid = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.EntityUnlockSentEvent} returns this
 */
proto.EntityUnlockSentEvent.prototype.clearParentinstanceid = function() {
  return this.setParentinstanceid(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.EntityUnlockSentEvent.prototype.hasParentinstanceid = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional google.protobuf.StringValue targetInstanceId = 3;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.EntityUnlockSentEvent.prototype.getTargetinstanceid = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 3));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.EntityUnlockSentEvent} returns this
*/
proto.EntityUnlockSentEvent.prototype.setTargetinstanceid = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.EntityUnlockSentEvent} returns this
 */
proto.EntityUnlockSentEvent.prototype.clearTargetinstanceid = function() {
  return this.setTargetinstanceid(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.EntityUnlockSentEvent.prototype.hasTargetinstanceid = function() {
  return jspb.Message.getField(this, 3) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.EntityLockGrantedEvent.prototype.toObject = function(opt_includeInstance) {
  return proto.EntityLockGrantedEvent.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.EntityLockGrantedEvent} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.EntityLockGrantedEvent.toObject = function(includeInstance, msg) {
  var f, obj = {
    criticalsectionid: jspb.Message.getFieldWithDefault(msg, 1, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.EntityLockGrantedEvent}
 */
proto.EntityLockGrantedEvent.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.EntityLockGrantedEvent;
  return proto.EntityLockGrantedEvent.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.EntityLockGrantedEvent} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.EntityLockGrantedEvent}
 */
proto.EntityLockGrantedEvent.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setCriticalsectionid(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.EntityLockGrantedEvent.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.EntityLockGrantedEvent.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.EntityLockGrantedEvent} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.EntityLockGrantedEvent.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getCriticalsectionid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
};


/**
 * optional string criticalSectionId = 1;
 * @return {string}
 */
proto.EntityLockGrantedEvent.prototype.getCriticalsectionid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.EntityLockGrantedEvent} returns this
 */
proto.EntityLockGrantedEvent.prototype.setCriticalsectionid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.ExecutionRewoundEvent.prototype.toObject = function(opt_includeInstance) {
  return proto.ExecutionRewoundEvent.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.ExecutionRewoundEvent} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.ExecutionRewoundEvent.toObject = function(includeInstance, msg) {
  var f, obj = {
    reason: (f = msg.getReason()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    parentexecutionid: (f = msg.getParentexecutionid()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    instanceid: (f = msg.getInstanceid()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    parenttracecontext: (f = msg.getParenttracecontext()) && proto.TraceContext.toObject(includeInstance, f),
    name: (f = msg.getName()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    version: (f = msg.getVersion()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    input: (f = msg.getInput()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    parentinstance: (f = msg.getParentinstance()) && proto.ParentInstanceInfo.toObject(includeInstance, f),
    tagsMap: (f = msg.getTagsMap()) ? f.toObject(includeInstance, undefined) : []
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.ExecutionRewoundEvent}
 */
proto.ExecutionRewoundEvent.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.ExecutionRewoundEvent;
  return proto.ExecutionRewoundEvent.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.ExecutionRewoundEvent} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.ExecutionRewoundEvent}
 */
proto.ExecutionRewoundEvent.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setReason(value);
      break;
    case 2:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setParentexecutionid(value);
      break;
    case 3:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setInstanceid(value);
      break;
    case 4:
      var value = new proto.TraceContext;
      reader.readMessage(value,proto.TraceContext.deserializeBinaryFromReader);
      msg.setParenttracecontext(value);
      break;
    case 5:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setName(value);
      break;
    case 6:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setVersion(value);
      break;
    case 7:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setInput(value);
      break;
    case 8:
      var value = new proto.ParentInstanceInfo;
      reader.readMessage(value,proto.ParentInstanceInfo.deserializeBinaryFromReader);
      msg.setParentinstance(value);
      break;
    case 9:
      var value = msg.getTagsMap();
      reader.readMessage(value, function(message, reader) {
        jspb.Map.deserializeBinary(message, reader, jspb.BinaryReader.prototype.readString, jspb.BinaryReader.prototype.readString, null, "", "");
         });
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.ExecutionRewoundEvent.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.ExecutionRewoundEvent.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.ExecutionRewoundEvent} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.ExecutionRewoundEvent.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getReason();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getParentexecutionid();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getInstanceid();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getParenttracecontext();
  if (f != null) {
    writer.writeMessage(
      4,
      f,
      proto.TraceContext.serializeBinaryToWriter
    );
  }
  f = message.getName();
  if (f != null) {
    writer.writeMessage(
      5,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getVersion();
  if (f != null) {
    writer.writeMessage(
      6,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getInput();
  if (f != null) {
    writer.writeMessage(
      7,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getParentinstance();
  if (f != null) {
    writer.writeMessage(
      8,
      f,
      proto.ParentInstanceInfo.serializeBinaryToWriter
    );
  }
  f = message.getTagsMap(true);
  if (f && f.getLength() > 0) {
    f.serializeBinary(9, writer, jspb.BinaryWriter.prototype.writeString, jspb.BinaryWriter.prototype.writeString);
  }
};


/**
 * optional google.protobuf.StringValue reason = 1;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.ExecutionRewoundEvent.prototype.getReason = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 1));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.ExecutionRewoundEvent} returns this
*/
proto.ExecutionRewoundEvent.prototype.setReason = function(value) {
  return jspb.Message.setWrapperField(this, 1, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ExecutionRewoundEvent} returns this
 */
proto.ExecutionRewoundEvent.prototype.clearReason = function() {
  return this.setReason(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ExecutionRewoundEvent.prototype.hasReason = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * optional google.protobuf.StringValue parentExecutionId = 2;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.ExecutionRewoundEvent.prototype.getParentexecutionid = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 2));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.ExecutionRewoundEvent} returns this
*/
proto.ExecutionRewoundEvent.prototype.setParentexecutionid = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ExecutionRewoundEvent} returns this
 */
proto.ExecutionRewoundEvent.prototype.clearParentexecutionid = function() {
  return this.setParentexecutionid(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ExecutionRewoundEvent.prototype.hasParentexecutionid = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional google.protobuf.StringValue instanceId = 3;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.ExecutionRewoundEvent.prototype.getInstanceid = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 3));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.ExecutionRewoundEvent} returns this
*/
proto.ExecutionRewoundEvent.prototype.setInstanceid = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ExecutionRewoundEvent} returns this
 */
proto.ExecutionRewoundEvent.prototype.clearInstanceid = function() {
  return this.setInstanceid(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ExecutionRewoundEvent.prototype.hasInstanceid = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional TraceContext parentTraceContext = 4;
 * @return {?proto.TraceContext}
 */
proto.ExecutionRewoundEvent.prototype.getParenttracecontext = function() {
  return /** @type{?proto.TraceContext} */ (
    jspb.Message.getWrapperField(this, proto.TraceContext, 4));
};


/**
 * @param {?proto.TraceContext|undefined} value
 * @return {!proto.ExecutionRewoundEvent} returns this
*/
proto.ExecutionRewoundEvent.prototype.setParenttracecontext = function(value) {
  return jspb.Message.setWrapperField(this, 4, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ExecutionRewoundEvent} returns this
 */
proto.ExecutionRewoundEvent.prototype.clearParenttracecontext = function() {
  return this.setParenttracecontext(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ExecutionRewoundEvent.prototype.hasParenttracecontext = function() {
  return jspb.Message.getField(this, 4) != null;
};


/**
 * optional google.protobuf.StringValue name = 5;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.ExecutionRewoundEvent.prototype.getName = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 5));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.ExecutionRewoundEvent} returns this
*/
proto.ExecutionRewoundEvent.prototype.setName = function(value) {
  return jspb.Message.setWrapperField(this, 5, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ExecutionRewoundEvent} returns this
 */
proto.ExecutionRewoundEvent.prototype.clearName = function() {
  return this.setName(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ExecutionRewoundEvent.prototype.hasName = function() {
  return jspb.Message.getField(this, 5) != null;
};


/**
 * optional google.protobuf.StringValue version = 6;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.ExecutionRewoundEvent.prototype.getVersion = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 6));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.ExecutionRewoundEvent} returns this
*/
proto.ExecutionRewoundEvent.prototype.setVersion = function(value) {
  return jspb.Message.setWrapperField(this, 6, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ExecutionRewoundEvent} returns this
 */
proto.ExecutionRewoundEvent.prototype.clearVersion = function() {
  return this.setVersion(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ExecutionRewoundEvent.prototype.hasVersion = function() {
  return jspb.Message.getField(this, 6) != null;
};


/**
 * optional google.protobuf.StringValue input = 7;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.ExecutionRewoundEvent.prototype.getInput = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 7));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.ExecutionRewoundEvent} returns this
*/
proto.ExecutionRewoundEvent.prototype.setInput = function(value) {
  return jspb.Message.setWrapperField(this, 7, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ExecutionRewoundEvent} returns this
 */
proto.ExecutionRewoundEvent.prototype.clearInput = function() {
  return this.setInput(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ExecutionRewoundEvent.prototype.hasInput = function() {
  return jspb.Message.getField(this, 7) != null;
};


/**
 * optional ParentInstanceInfo parentInstance = 8;
 * @return {?proto.ParentInstanceInfo}
 */
proto.ExecutionRewoundEvent.prototype.getParentinstance = function() {
  return /** @type{?proto.ParentInstanceInfo} */ (
    jspb.Message.getWrapperField(this, proto.ParentInstanceInfo, 8));
};


/**
 * @param {?proto.ParentInstanceInfo|undefined} value
 * @return {!proto.ExecutionRewoundEvent} returns this
*/
proto.ExecutionRewoundEvent.prototype.setParentinstance = function(value) {
  return jspb.Message.setWrapperField(this, 8, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ExecutionRewoundEvent} returns this
 */
proto.ExecutionRewoundEvent.prototype.clearParentinstance = function() {
  return this.setParentinstance(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ExecutionRewoundEvent.prototype.hasParentinstance = function() {
  return jspb.Message.getField(this, 8) != null;
};


/**
 * map<string, string> tags = 9;
 * @param {boolean=} opt_noLazyCreate Do not create the map if
 * empty, instead returning `undefined`
 * @return {!jspb.Map<string,string>}
 */
proto.ExecutionRewoundEvent.prototype.getTagsMap = function(opt_noLazyCreate) {
  return /** @type {!jspb.Map<string,string>} */ (
      jspb.Message.getMapField(this, 9, opt_noLazyCreate,
      null));
};


/**
 * Clears values from the map. The map will be non-null.
 * @return {!proto.ExecutionRewoundEvent} returns this
 */
proto.ExecutionRewoundEvent.prototype.clearTagsMap = function() {
  this.getTagsMap().clear();
  return this;};



/**
 * Oneof group definitions for this message. Each group defines the field
 * numbers belonging to that group. When of these fields' value is set, all
 * other fields in the group are cleared. During deserialization, if multiple
 * fields are encountered for a group, only the last value seen will be kept.
 * @private {!Array<!Array<number>>}
 * @const
 */
proto.HistoryEvent.oneofGroups_ = [[3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30]];

/**
 * @enum {number}
 */
proto.HistoryEvent.EventtypeCase = {
  EVENTTYPE_NOT_SET: 0,
  EXECUTIONSTARTED: 3,
  EXECUTIONCOMPLETED: 4,
  EXECUTIONTERMINATED: 5,
  TASKSCHEDULED: 6,
  TASKCOMPLETED: 7,
  TASKFAILED: 8,
  SUBORCHESTRATIONINSTANCECREATED: 9,
  SUBORCHESTRATIONINSTANCECOMPLETED: 10,
  SUBORCHESTRATIONINSTANCEFAILED: 11,
  TIMERCREATED: 12,
  TIMERFIRED: 13,
  ORCHESTRATORSTARTED: 14,
  ORCHESTRATORCOMPLETED: 15,
  EVENTSENT: 16,
  EVENTRAISED: 17,
  GENERICEVENT: 18,
  HISTORYSTATE: 19,
  CONTINUEASNEW: 20,
  EXECUTIONSUSPENDED: 21,
  EXECUTIONRESUMED: 22,
  ENTITYOPERATIONSIGNALED: 23,
  ENTITYOPERATIONCALLED: 24,
  ENTITYOPERATIONCOMPLETED: 25,
  ENTITYOPERATIONFAILED: 26,
  ENTITYLOCKREQUESTED: 27,
  ENTITYLOCKGRANTED: 28,
  ENTITYUNLOCKSENT: 29,
  EXECUTIONREWOUND: 30
};

/**
 * @return {proto.HistoryEvent.EventtypeCase}
 */
proto.HistoryEvent.prototype.getEventtypeCase = function() {
  return /** @type {proto.HistoryEvent.EventtypeCase} */(jspb.Message.computeOneofCase(this, proto.HistoryEvent.oneofGroups_[0]));
};



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.HistoryEvent.prototype.toObject = function(opt_includeInstance) {
  return proto.HistoryEvent.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.HistoryEvent} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.HistoryEvent.toObject = function(includeInstance, msg) {
  var f, obj = {
    eventid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    timestamp: (f = msg.getTimestamp()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f),
    executionstarted: (f = msg.getExecutionstarted()) && proto.ExecutionStartedEvent.toObject(includeInstance, f),
    executioncompleted: (f = msg.getExecutioncompleted()) && proto.ExecutionCompletedEvent.toObject(includeInstance, f),
    executionterminated: (f = msg.getExecutionterminated()) && proto.ExecutionTerminatedEvent.toObject(includeInstance, f),
    taskscheduled: (f = msg.getTaskscheduled()) && proto.TaskScheduledEvent.toObject(includeInstance, f),
    taskcompleted: (f = msg.getTaskcompleted()) && proto.TaskCompletedEvent.toObject(includeInstance, f),
    taskfailed: (f = msg.getTaskfailed()) && proto.TaskFailedEvent.toObject(includeInstance, f),
    suborchestrationinstancecreated: (f = msg.getSuborchestrationinstancecreated()) && proto.SubOrchestrationInstanceCreatedEvent.toObject(includeInstance, f),
    suborchestrationinstancecompleted: (f = msg.getSuborchestrationinstancecompleted()) && proto.SubOrchestrationInstanceCompletedEvent.toObject(includeInstance, f),
    suborchestrationinstancefailed: (f = msg.getSuborchestrationinstancefailed()) && proto.SubOrchestrationInstanceFailedEvent.toObject(includeInstance, f),
    timercreated: (f = msg.getTimercreated()) && proto.TimerCreatedEvent.toObject(includeInstance, f),
    timerfired: (f = msg.getTimerfired()) && proto.TimerFiredEvent.toObject(includeInstance, f),
    orchestratorstarted: (f = msg.getOrchestratorstarted()) && proto.OrchestratorStartedEvent.toObject(includeInstance, f),
    orchestratorcompleted: (f = msg.getOrchestratorcompleted()) && proto.OrchestratorCompletedEvent.toObject(includeInstance, f),
    eventsent: (f = msg.getEventsent()) && proto.EventSentEvent.toObject(includeInstance, f),
    eventraised: (f = msg.getEventraised()) && proto.EventRaisedEvent.toObject(includeInstance, f),
    genericevent: (f = msg.getGenericevent()) && proto.GenericEvent.toObject(includeInstance, f),
    historystate: (f = msg.getHistorystate()) && proto.HistoryStateEvent.toObject(includeInstance, f),
    continueasnew: (f = msg.getContinueasnew()) && proto.ContinueAsNewEvent.toObject(includeInstance, f),
    executionsuspended: (f = msg.getExecutionsuspended()) && proto.ExecutionSuspendedEvent.toObject(includeInstance, f),
    executionresumed: (f = msg.getExecutionresumed()) && proto.ExecutionResumedEvent.toObject(includeInstance, f),
    entityoperationsignaled: (f = msg.getEntityoperationsignaled()) && proto.EntityOperationSignaledEvent.toObject(includeInstance, f),
    entityoperationcalled: (f = msg.getEntityoperationcalled()) && proto.EntityOperationCalledEvent.toObject(includeInstance, f),
    entityoperationcompleted: (f = msg.getEntityoperationcompleted()) && proto.EntityOperationCompletedEvent.toObject(includeInstance, f),
    entityoperationfailed: (f = msg.getEntityoperationfailed()) && proto.EntityOperationFailedEvent.toObject(includeInstance, f),
    entitylockrequested: (f = msg.getEntitylockrequested()) && proto.EntityLockRequestedEvent.toObject(includeInstance, f),
    entitylockgranted: (f = msg.getEntitylockgranted()) && proto.EntityLockGrantedEvent.toObject(includeInstance, f),
    entityunlocksent: (f = msg.getEntityunlocksent()) && proto.EntityUnlockSentEvent.toObject(includeInstance, f),
    executionrewound: (f = msg.getExecutionrewound()) && proto.ExecutionRewoundEvent.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.HistoryEvent}
 */
proto.HistoryEvent.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.HistoryEvent;
  return proto.HistoryEvent.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.HistoryEvent} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.HistoryEvent}
 */
proto.HistoryEvent.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readInt32());
      msg.setEventid(value);
      break;
    case 2:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setTimestamp(value);
      break;
    case 3:
      var value = new proto.ExecutionStartedEvent;
      reader.readMessage(value,proto.ExecutionStartedEvent.deserializeBinaryFromReader);
      msg.setExecutionstarted(value);
      break;
    case 4:
      var value = new proto.ExecutionCompletedEvent;
      reader.readMessage(value,proto.ExecutionCompletedEvent.deserializeBinaryFromReader);
      msg.setExecutioncompleted(value);
      break;
    case 5:
      var value = new proto.ExecutionTerminatedEvent;
      reader.readMessage(value,proto.ExecutionTerminatedEvent.deserializeBinaryFromReader);
      msg.setExecutionterminated(value);
      break;
    case 6:
      var value = new proto.TaskScheduledEvent;
      reader.readMessage(value,proto.TaskScheduledEvent.deserializeBinaryFromReader);
      msg.setTaskscheduled(value);
      break;
    case 7:
      var value = new proto.TaskCompletedEvent;
      reader.readMessage(value,proto.TaskCompletedEvent.deserializeBinaryFromReader);
      msg.setTaskcompleted(value);
      break;
    case 8:
      var value = new proto.TaskFailedEvent;
      reader.readMessage(value,proto.TaskFailedEvent.deserializeBinaryFromReader);
      msg.setTaskfailed(value);
      break;
    case 9:
      var value = new proto.SubOrchestrationInstanceCreatedEvent;
      reader.readMessage(value,proto.SubOrchestrationInstanceCreatedEvent.deserializeBinaryFromReader);
      msg.setSuborchestrationinstancecreated(value);
      break;
    case 10:
      var value = new proto.SubOrchestrationInstanceCompletedEvent;
      reader.readMessage(value,proto.SubOrchestrationInstanceCompletedEvent.deserializeBinaryFromReader);
      msg.setSuborchestrationinstancecompleted(value);
      break;
    case 11:
      var value = new proto.SubOrchestrationInstanceFailedEvent;
      reader.readMessage(value,proto.SubOrchestrationInstanceFailedEvent.deserializeBinaryFromReader);
      msg.setSuborchestrationinstancefailed(value);
      break;
    case 12:
      var value = new proto.TimerCreatedEvent;
      reader.readMessage(value,proto.TimerCreatedEvent.deserializeBinaryFromReader);
      msg.setTimercreated(value);
      break;
    case 13:
      var value = new proto.TimerFiredEvent;
      reader.readMessage(value,proto.TimerFiredEvent.deserializeBinaryFromReader);
      msg.setTimerfired(value);
      break;
    case 14:
      var value = new proto.OrchestratorStartedEvent;
      reader.readMessage(value,proto.OrchestratorStartedEvent.deserializeBinaryFromReader);
      msg.setOrchestratorstarted(value);
      break;
    case 15:
      var value = new proto.OrchestratorCompletedEvent;
      reader.readMessage(value,proto.OrchestratorCompletedEvent.deserializeBinaryFromReader);
      msg.setOrchestratorcompleted(value);
      break;
    case 16:
      var value = new proto.EventSentEvent;
      reader.readMessage(value,proto.EventSentEvent.deserializeBinaryFromReader);
      msg.setEventsent(value);
      break;
    case 17:
      var value = new proto.EventRaisedEvent;
      reader.readMessage(value,proto.EventRaisedEvent.deserializeBinaryFromReader);
      msg.setEventraised(value);
      break;
    case 18:
      var value = new proto.GenericEvent;
      reader.readMessage(value,proto.GenericEvent.deserializeBinaryFromReader);
      msg.setGenericevent(value);
      break;
    case 19:
      var value = new proto.HistoryStateEvent;
      reader.readMessage(value,proto.HistoryStateEvent.deserializeBinaryFromReader);
      msg.setHistorystate(value);
      break;
    case 20:
      var value = new proto.ContinueAsNewEvent;
      reader.readMessage(value,proto.ContinueAsNewEvent.deserializeBinaryFromReader);
      msg.setContinueasnew(value);
      break;
    case 21:
      var value = new proto.ExecutionSuspendedEvent;
      reader.readMessage(value,proto.ExecutionSuspendedEvent.deserializeBinaryFromReader);
      msg.setExecutionsuspended(value);
      break;
    case 22:
      var value = new proto.ExecutionResumedEvent;
      reader.readMessage(value,proto.ExecutionResumedEvent.deserializeBinaryFromReader);
      msg.setExecutionresumed(value);
      break;
    case 23:
      var value = new proto.EntityOperationSignaledEvent;
      reader.readMessage(value,proto.EntityOperationSignaledEvent.deserializeBinaryFromReader);
      msg.setEntityoperationsignaled(value);
      break;
    case 24:
      var value = new proto.EntityOperationCalledEvent;
      reader.readMessage(value,proto.EntityOperationCalledEvent.deserializeBinaryFromReader);
      msg.setEntityoperationcalled(value);
      break;
    case 25:
      var value = new proto.EntityOperationCompletedEvent;
      reader.readMessage(value,proto.EntityOperationCompletedEvent.deserializeBinaryFromReader);
      msg.setEntityoperationcompleted(value);
      break;
    case 26:
      var value = new proto.EntityOperationFailedEvent;
      reader.readMessage(value,proto.EntityOperationFailedEvent.deserializeBinaryFromReader);
      msg.setEntityoperationfailed(value);
      break;
    case 27:
      var value = new proto.EntityLockRequestedEvent;
      reader.readMessage(value,proto.EntityLockRequestedEvent.deserializeBinaryFromReader);
      msg.setEntitylockrequested(value);
      break;
    case 28:
      var value = new proto.EntityLockGrantedEvent;
      reader.readMessage(value,proto.EntityLockGrantedEvent.deserializeBinaryFromReader);
      msg.setEntitylockgranted(value);
      break;
    case 29:
      var value = new proto.EntityUnlockSentEvent;
      reader.readMessage(value,proto.EntityUnlockSentEvent.deserializeBinaryFromReader);
      msg.setEntityunlocksent(value);
      break;
    case 30:
      var value = new proto.ExecutionRewoundEvent;
      reader.readMessage(value,proto.ExecutionRewoundEvent.deserializeBinaryFromReader);
      msg.setExecutionrewound(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.HistoryEvent.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.HistoryEvent.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.HistoryEvent} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.HistoryEvent.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getEventid();
  if (f !== 0) {
    writer.writeInt32(
      1,
      f
    );
  }
  f = message.getTimestamp();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
  f = message.getExecutionstarted();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      proto.ExecutionStartedEvent.serializeBinaryToWriter
    );
  }
  f = message.getExecutioncompleted();
  if (f != null) {
    writer.writeMessage(
      4,
      f,
      proto.ExecutionCompletedEvent.serializeBinaryToWriter
    );
  }
  f = message.getExecutionterminated();
  if (f != null) {
    writer.writeMessage(
      5,
      f,
      proto.ExecutionTerminatedEvent.serializeBinaryToWriter
    );
  }
  f = message.getTaskscheduled();
  if (f != null) {
    writer.writeMessage(
      6,
      f,
      proto.TaskScheduledEvent.serializeBinaryToWriter
    );
  }
  f = message.getTaskcompleted();
  if (f != null) {
    writer.writeMessage(
      7,
      f,
      proto.TaskCompletedEvent.serializeBinaryToWriter
    );
  }
  f = message.getTaskfailed();
  if (f != null) {
    writer.writeMessage(
      8,
      f,
      proto.TaskFailedEvent.serializeBinaryToWriter
    );
  }
  f = message.getSuborchestrationinstancecreated();
  if (f != null) {
    writer.writeMessage(
      9,
      f,
      proto.SubOrchestrationInstanceCreatedEvent.serializeBinaryToWriter
    );
  }
  f = message.getSuborchestrationinstancecompleted();
  if (f != null) {
    writer.writeMessage(
      10,
      f,
      proto.SubOrchestrationInstanceCompletedEvent.serializeBinaryToWriter
    );
  }
  f = message.getSuborchestrationinstancefailed();
  if (f != null) {
    writer.writeMessage(
      11,
      f,
      proto.SubOrchestrationInstanceFailedEvent.serializeBinaryToWriter
    );
  }
  f = message.getTimercreated();
  if (f != null) {
    writer.writeMessage(
      12,
      f,
      proto.TimerCreatedEvent.serializeBinaryToWriter
    );
  }
  f = message.getTimerfired();
  if (f != null) {
    writer.writeMessage(
      13,
      f,
      proto.TimerFiredEvent.serializeBinaryToWriter
    );
  }
  f = message.getOrchestratorstarted();
  if (f != null) {
    writer.writeMessage(
      14,
      f,
      proto.OrchestratorStartedEvent.serializeBinaryToWriter
    );
  }
  f = message.getOrchestratorcompleted();
  if (f != null) {
    writer.writeMessage(
      15,
      f,
      proto.OrchestratorCompletedEvent.serializeBinaryToWriter
    );
  }
  f = message.getEventsent();
  if (f != null) {
    writer.writeMessage(
      16,
      f,
      proto.EventSentEvent.serializeBinaryToWriter
    );
  }
  f = message.getEventraised();
  if (f != null) {
    writer.writeMessage(
      17,
      f,
      proto.EventRaisedEvent.serializeBinaryToWriter
    );
  }
  f = message.getGenericevent();
  if (f != null) {
    writer.writeMessage(
      18,
      f,
      proto.GenericEvent.serializeBinaryToWriter
    );
  }
  f = message.getHistorystate();
  if (f != null) {
    writer.writeMessage(
      19,
      f,
      proto.HistoryStateEvent.serializeBinaryToWriter
    );
  }
  f = message.getContinueasnew();
  if (f != null) {
    writer.writeMessage(
      20,
      f,
      proto.ContinueAsNewEvent.serializeBinaryToWriter
    );
  }
  f = message.getExecutionsuspended();
  if (f != null) {
    writer.writeMessage(
      21,
      f,
      proto.ExecutionSuspendedEvent.serializeBinaryToWriter
    );
  }
  f = message.getExecutionresumed();
  if (f != null) {
    writer.writeMessage(
      22,
      f,
      proto.ExecutionResumedEvent.serializeBinaryToWriter
    );
  }
  f = message.getEntityoperationsignaled();
  if (f != null) {
    writer.writeMessage(
      23,
      f,
      proto.EntityOperationSignaledEvent.serializeBinaryToWriter
    );
  }
  f = message.getEntityoperationcalled();
  if (f != null) {
    writer.writeMessage(
      24,
      f,
      proto.EntityOperationCalledEvent.serializeBinaryToWriter
    );
  }
  f = message.getEntityoperationcompleted();
  if (f != null) {
    writer.writeMessage(
      25,
      f,
      proto.EntityOperationCompletedEvent.serializeBinaryToWriter
    );
  }
  f = message.getEntityoperationfailed();
  if (f != null) {
    writer.writeMessage(
      26,
      f,
      proto.EntityOperationFailedEvent.serializeBinaryToWriter
    );
  }
  f = message.getEntitylockrequested();
  if (f != null) {
    writer.writeMessage(
      27,
      f,
      proto.EntityLockRequestedEvent.serializeBinaryToWriter
    );
  }
  f = message.getEntitylockgranted();
  if (f != null) {
    writer.writeMessage(
      28,
      f,
      proto.EntityLockGrantedEvent.serializeBinaryToWriter
    );
  }
  f = message.getEntityunlocksent();
  if (f != null) {
    writer.writeMessage(
      29,
      f,
      proto.EntityUnlockSentEvent.serializeBinaryToWriter
    );
  }
  f = message.getExecutionrewound();
  if (f != null) {
    writer.writeMessage(
      30,
      f,
      proto.ExecutionRewoundEvent.serializeBinaryToWriter
    );
  }
};


/**
 * optional int32 eventId = 1;
 * @return {number}
 */
proto.HistoryEvent.prototype.getEventid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/**
 * @param {number} value
 * @return {!proto.HistoryEvent} returns this
 */
proto.HistoryEvent.prototype.setEventid = function(value) {
  return jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional google.protobuf.Timestamp timestamp = 2;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.HistoryEvent.prototype.getTimestamp = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 2));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.HistoryEvent} returns this
*/
proto.HistoryEvent.prototype.setTimestamp = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.HistoryEvent} returns this
 */
proto.HistoryEvent.prototype.clearTimestamp = function() {
  return this.setTimestamp(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.HistoryEvent.prototype.hasTimestamp = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional ExecutionStartedEvent executionStarted = 3;
 * @return {?proto.ExecutionStartedEvent}
 */
proto.HistoryEvent.prototype.getExecutionstarted = function() {
  return /** @type{?proto.ExecutionStartedEvent} */ (
    jspb.Message.getWrapperField(this, proto.ExecutionStartedEvent, 3));
};


/**
 * @param {?proto.ExecutionStartedEvent|undefined} value
 * @return {!proto.HistoryEvent} returns this
*/
proto.HistoryEvent.prototype.setExecutionstarted = function(value) {
  return jspb.Message.setOneofWrapperField(this, 3, proto.HistoryEvent.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.HistoryEvent} returns this
 */
proto.HistoryEvent.prototype.clearExecutionstarted = function() {
  return this.setExecutionstarted(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.HistoryEvent.prototype.hasExecutionstarted = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional ExecutionCompletedEvent executionCompleted = 4;
 * @return {?proto.ExecutionCompletedEvent}
 */
proto.HistoryEvent.prototype.getExecutioncompleted = function() {
  return /** @type{?proto.ExecutionCompletedEvent} */ (
    jspb.Message.getWrapperField(this, proto.ExecutionCompletedEvent, 4));
};


/**
 * @param {?proto.ExecutionCompletedEvent|undefined} value
 * @return {!proto.HistoryEvent} returns this
*/
proto.HistoryEvent.prototype.setExecutioncompleted = function(value) {
  return jspb.Message.setOneofWrapperField(this, 4, proto.HistoryEvent.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.HistoryEvent} returns this
 */
proto.HistoryEvent.prototype.clearExecutioncompleted = function() {
  return this.setExecutioncompleted(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.HistoryEvent.prototype.hasExecutioncompleted = function() {
  return jspb.Message.getField(this, 4) != null;
};


/**
 * optional ExecutionTerminatedEvent executionTerminated = 5;
 * @return {?proto.ExecutionTerminatedEvent}
 */
proto.HistoryEvent.prototype.getExecutionterminated = function() {
  return /** @type{?proto.ExecutionTerminatedEvent} */ (
    jspb.Message.getWrapperField(this, proto.ExecutionTerminatedEvent, 5));
};


/**
 * @param {?proto.ExecutionTerminatedEvent|undefined} value
 * @return {!proto.HistoryEvent} returns this
*/
proto.HistoryEvent.prototype.setExecutionterminated = function(value) {
  return jspb.Message.setOneofWrapperField(this, 5, proto.HistoryEvent.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.HistoryEvent} returns this
 */
proto.HistoryEvent.prototype.clearExecutionterminated = function() {
  return this.setExecutionterminated(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.HistoryEvent.prototype.hasExecutionterminated = function() {
  return jspb.Message.getField(this, 5) != null;
};


/**
 * optional TaskScheduledEvent taskScheduled = 6;
 * @return {?proto.TaskScheduledEvent}
 */
proto.HistoryEvent.prototype.getTaskscheduled = function() {
  return /** @type{?proto.TaskScheduledEvent} */ (
    jspb.Message.getWrapperField(this, proto.TaskScheduledEvent, 6));
};


/**
 * @param {?proto.TaskScheduledEvent|undefined} value
 * @return {!proto.HistoryEvent} returns this
*/
proto.HistoryEvent.prototype.setTaskscheduled = function(value) {
  return jspb.Message.setOneofWrapperField(this, 6, proto.HistoryEvent.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.HistoryEvent} returns this
 */
proto.HistoryEvent.prototype.clearTaskscheduled = function() {
  return this.setTaskscheduled(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.HistoryEvent.prototype.hasTaskscheduled = function() {
  return jspb.Message.getField(this, 6) != null;
};


/**
 * optional TaskCompletedEvent taskCompleted = 7;
 * @return {?proto.TaskCompletedEvent}
 */
proto.HistoryEvent.prototype.getTaskcompleted = function() {
  return /** @type{?proto.TaskCompletedEvent} */ (
    jspb.Message.getWrapperField(this, proto.TaskCompletedEvent, 7));
};


/**
 * @param {?proto.TaskCompletedEvent|undefined} value
 * @return {!proto.HistoryEvent} returns this
*/
proto.HistoryEvent.prototype.setTaskcompleted = function(value) {
  return jspb.Message.setOneofWrapperField(this, 7, proto.HistoryEvent.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.HistoryEvent} returns this
 */
proto.HistoryEvent.prototype.clearTaskcompleted = function() {
  return this.setTaskcompleted(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.HistoryEvent.prototype.hasTaskcompleted = function() {
  return jspb.Message.getField(this, 7) != null;
};


/**
 * optional TaskFailedEvent taskFailed = 8;
 * @return {?proto.TaskFailedEvent}
 */
proto.HistoryEvent.prototype.getTaskfailed = function() {
  return /** @type{?proto.TaskFailedEvent} */ (
    jspb.Message.getWrapperField(this, proto.TaskFailedEvent, 8));
};


/**
 * @param {?proto.TaskFailedEvent|undefined} value
 * @return {!proto.HistoryEvent} returns this
*/
proto.HistoryEvent.prototype.setTaskfailed = function(value) {
  return jspb.Message.setOneofWrapperField(this, 8, proto.HistoryEvent.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.HistoryEvent} returns this
 */
proto.HistoryEvent.prototype.clearTaskfailed = function() {
  return this.setTaskfailed(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.HistoryEvent.prototype.hasTaskfailed = function() {
  return jspb.Message.getField(this, 8) != null;
};


/**
 * optional SubOrchestrationInstanceCreatedEvent subOrchestrationInstanceCreated = 9;
 * @return {?proto.SubOrchestrationInstanceCreatedEvent}
 */
proto.HistoryEvent.prototype.getSuborchestrationinstancecreated = function() {
  return /** @type{?proto.SubOrchestrationInstanceCreatedEvent} */ (
    jspb.Message.getWrapperField(this, proto.SubOrchestrationInstanceCreatedEvent, 9));
};


/**
 * @param {?proto.SubOrchestrationInstanceCreatedEvent|undefined} value
 * @return {!proto.HistoryEvent} returns this
*/
proto.HistoryEvent.prototype.setSuborchestrationinstancecreated = function(value) {
  return jspb.Message.setOneofWrapperField(this, 9, proto.HistoryEvent.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.HistoryEvent} returns this
 */
proto.HistoryEvent.prototype.clearSuborchestrationinstancecreated = function() {
  return this.setSuborchestrationinstancecreated(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.HistoryEvent.prototype.hasSuborchestrationinstancecreated = function() {
  return jspb.Message.getField(this, 9) != null;
};


/**
 * optional SubOrchestrationInstanceCompletedEvent subOrchestrationInstanceCompleted = 10;
 * @return {?proto.SubOrchestrationInstanceCompletedEvent}
 */
proto.HistoryEvent.prototype.getSuborchestrationinstancecompleted = function() {
  return /** @type{?proto.SubOrchestrationInstanceCompletedEvent} */ (
    jspb.Message.getWrapperField(this, proto.SubOrchestrationInstanceCompletedEvent, 10));
};


/**
 * @param {?proto.SubOrchestrationInstanceCompletedEvent|undefined} value
 * @return {!proto.HistoryEvent} returns this
*/
proto.HistoryEvent.prototype.setSuborchestrationinstancecompleted = function(value) {
  return jspb.Message.setOneofWrapperField(this, 10, proto.HistoryEvent.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.HistoryEvent} returns this
 */
proto.HistoryEvent.prototype.clearSuborchestrationinstancecompleted = function() {
  return this.setSuborchestrationinstancecompleted(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.HistoryEvent.prototype.hasSuborchestrationinstancecompleted = function() {
  return jspb.Message.getField(this, 10) != null;
};


/**
 * optional SubOrchestrationInstanceFailedEvent subOrchestrationInstanceFailed = 11;
 * @return {?proto.SubOrchestrationInstanceFailedEvent}
 */
proto.HistoryEvent.prototype.getSuborchestrationinstancefailed = function() {
  return /** @type{?proto.SubOrchestrationInstanceFailedEvent} */ (
    jspb.Message.getWrapperField(this, proto.SubOrchestrationInstanceFailedEvent, 11));
};


/**
 * @param {?proto.SubOrchestrationInstanceFailedEvent|undefined} value
 * @return {!proto.HistoryEvent} returns this
*/
proto.HistoryEvent.prototype.setSuborchestrationinstancefailed = function(value) {
  return jspb.Message.setOneofWrapperField(this, 11, proto.HistoryEvent.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.HistoryEvent} returns this
 */
proto.HistoryEvent.prototype.clearSuborchestrationinstancefailed = function() {
  return this.setSuborchestrationinstancefailed(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.HistoryEvent.prototype.hasSuborchestrationinstancefailed = function() {
  return jspb.Message.getField(this, 11) != null;
};


/**
 * optional TimerCreatedEvent timerCreated = 12;
 * @return {?proto.TimerCreatedEvent}
 */
proto.HistoryEvent.prototype.getTimercreated = function() {
  return /** @type{?proto.TimerCreatedEvent} */ (
    jspb.Message.getWrapperField(this, proto.TimerCreatedEvent, 12));
};


/**
 * @param {?proto.TimerCreatedEvent|undefined} value
 * @return {!proto.HistoryEvent} returns this
*/
proto.HistoryEvent.prototype.setTimercreated = function(value) {
  return jspb.Message.setOneofWrapperField(this, 12, proto.HistoryEvent.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.HistoryEvent} returns this
 */
proto.HistoryEvent.prototype.clearTimercreated = function() {
  return this.setTimercreated(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.HistoryEvent.prototype.hasTimercreated = function() {
  return jspb.Message.getField(this, 12) != null;
};


/**
 * optional TimerFiredEvent timerFired = 13;
 * @return {?proto.TimerFiredEvent}
 */
proto.HistoryEvent.prototype.getTimerfired = function() {
  return /** @type{?proto.TimerFiredEvent} */ (
    jspb.Message.getWrapperField(this, proto.TimerFiredEvent, 13));
};


/**
 * @param {?proto.TimerFiredEvent|undefined} value
 * @return {!proto.HistoryEvent} returns this
*/
proto.HistoryEvent.prototype.setTimerfired = function(value) {
  return jspb.Message.setOneofWrapperField(this, 13, proto.HistoryEvent.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.HistoryEvent} returns this
 */
proto.HistoryEvent.prototype.clearTimerfired = function() {
  return this.setTimerfired(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.HistoryEvent.prototype.hasTimerfired = function() {
  return jspb.Message.getField(this, 13) != null;
};


/**
 * optional OrchestratorStartedEvent orchestratorStarted = 14;
 * @return {?proto.OrchestratorStartedEvent}
 */
proto.HistoryEvent.prototype.getOrchestratorstarted = function() {
  return /** @type{?proto.OrchestratorStartedEvent} */ (
    jspb.Message.getWrapperField(this, proto.OrchestratorStartedEvent, 14));
};


/**
 * @param {?proto.OrchestratorStartedEvent|undefined} value
 * @return {!proto.HistoryEvent} returns this
*/
proto.HistoryEvent.prototype.setOrchestratorstarted = function(value) {
  return jspb.Message.setOneofWrapperField(this, 14, proto.HistoryEvent.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.HistoryEvent} returns this
 */
proto.HistoryEvent.prototype.clearOrchestratorstarted = function() {
  return this.setOrchestratorstarted(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.HistoryEvent.prototype.hasOrchestratorstarted = function() {
  return jspb.Message.getField(this, 14) != null;
};


/**
 * optional OrchestratorCompletedEvent orchestratorCompleted = 15;
 * @return {?proto.OrchestratorCompletedEvent}
 */
proto.HistoryEvent.prototype.getOrchestratorcompleted = function() {
  return /** @type{?proto.OrchestratorCompletedEvent} */ (
    jspb.Message.getWrapperField(this, proto.OrchestratorCompletedEvent, 15));
};


/**
 * @param {?proto.OrchestratorCompletedEvent|undefined} value
 * @return {!proto.HistoryEvent} returns this
*/
proto.HistoryEvent.prototype.setOrchestratorcompleted = function(value) {
  return jspb.Message.setOneofWrapperField(this, 15, proto.HistoryEvent.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.HistoryEvent} returns this
 */
proto.HistoryEvent.prototype.clearOrchestratorcompleted = function() {
  return this.setOrchestratorcompleted(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.HistoryEvent.prototype.hasOrchestratorcompleted = function() {
  return jspb.Message.getField(this, 15) != null;
};


/**
 * optional EventSentEvent eventSent = 16;
 * @return {?proto.EventSentEvent}
 */
proto.HistoryEvent.prototype.getEventsent = function() {
  return /** @type{?proto.EventSentEvent} */ (
    jspb.Message.getWrapperField(this, proto.EventSentEvent, 16));
};


/**
 * @param {?proto.EventSentEvent|undefined} value
 * @return {!proto.HistoryEvent} returns this
*/
proto.HistoryEvent.prototype.setEventsent = function(value) {
  return jspb.Message.setOneofWrapperField(this, 16, proto.HistoryEvent.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.HistoryEvent} returns this
 */
proto.HistoryEvent.prototype.clearEventsent = function() {
  return this.setEventsent(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.HistoryEvent.prototype.hasEventsent = function() {
  return jspb.Message.getField(this, 16) != null;
};


/**
 * optional EventRaisedEvent eventRaised = 17;
 * @return {?proto.EventRaisedEvent}
 */
proto.HistoryEvent.prototype.getEventraised = function() {
  return /** @type{?proto.EventRaisedEvent} */ (
    jspb.Message.getWrapperField(this, proto.EventRaisedEvent, 17));
};


/**
 * @param {?proto.EventRaisedEvent|undefined} value
 * @return {!proto.HistoryEvent} returns this
*/
proto.HistoryEvent.prototype.setEventraised = function(value) {
  return jspb.Message.setOneofWrapperField(this, 17, proto.HistoryEvent.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.HistoryEvent} returns this
 */
proto.HistoryEvent.prototype.clearEventraised = function() {
  return this.setEventraised(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.HistoryEvent.prototype.hasEventraised = function() {
  return jspb.Message.getField(this, 17) != null;
};


/**
 * optional GenericEvent genericEvent = 18;
 * @return {?proto.GenericEvent}
 */
proto.HistoryEvent.prototype.getGenericevent = function() {
  return /** @type{?proto.GenericEvent} */ (
    jspb.Message.getWrapperField(this, proto.GenericEvent, 18));
};


/**
 * @param {?proto.GenericEvent|undefined} value
 * @return {!proto.HistoryEvent} returns this
*/
proto.HistoryEvent.prototype.setGenericevent = function(value) {
  return jspb.Message.setOneofWrapperField(this, 18, proto.HistoryEvent.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.HistoryEvent} returns this
 */
proto.HistoryEvent.prototype.clearGenericevent = function() {
  return this.setGenericevent(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.HistoryEvent.prototype.hasGenericevent = function() {
  return jspb.Message.getField(this, 18) != null;
};


/**
 * optional HistoryStateEvent historyState = 19;
 * @return {?proto.HistoryStateEvent}
 */
proto.HistoryEvent.prototype.getHistorystate = function() {
  return /** @type{?proto.HistoryStateEvent} */ (
    jspb.Message.getWrapperField(this, proto.HistoryStateEvent, 19));
};


/**
 * @param {?proto.HistoryStateEvent|undefined} value
 * @return {!proto.HistoryEvent} returns this
*/
proto.HistoryEvent.prototype.setHistorystate = function(value) {
  return jspb.Message.setOneofWrapperField(this, 19, proto.HistoryEvent.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.HistoryEvent} returns this
 */
proto.HistoryEvent.prototype.clearHistorystate = function() {
  return this.setHistorystate(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.HistoryEvent.prototype.hasHistorystate = function() {
  return jspb.Message.getField(this, 19) != null;
};


/**
 * optional ContinueAsNewEvent continueAsNew = 20;
 * @return {?proto.ContinueAsNewEvent}
 */
proto.HistoryEvent.prototype.getContinueasnew = function() {
  return /** @type{?proto.ContinueAsNewEvent} */ (
    jspb.Message.getWrapperField(this, proto.ContinueAsNewEvent, 20));
};


/**
 * @param {?proto.ContinueAsNewEvent|undefined} value
 * @return {!proto.HistoryEvent} returns this
*/
proto.HistoryEvent.prototype.setContinueasnew = function(value) {
  return jspb.Message.setOneofWrapperField(this, 20, proto.HistoryEvent.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.HistoryEvent} returns this
 */
proto.HistoryEvent.prototype.clearContinueasnew = function() {
  return this.setContinueasnew(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.HistoryEvent.prototype.hasContinueasnew = function() {
  return jspb.Message.getField(this, 20) != null;
};


/**
 * optional ExecutionSuspendedEvent executionSuspended = 21;
 * @return {?proto.ExecutionSuspendedEvent}
 */
proto.HistoryEvent.prototype.getExecutionsuspended = function() {
  return /** @type{?proto.ExecutionSuspendedEvent} */ (
    jspb.Message.getWrapperField(this, proto.ExecutionSuspendedEvent, 21));
};


/**
 * @param {?proto.ExecutionSuspendedEvent|undefined} value
 * @return {!proto.HistoryEvent} returns this
*/
proto.HistoryEvent.prototype.setExecutionsuspended = function(value) {
  return jspb.Message.setOneofWrapperField(this, 21, proto.HistoryEvent.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.HistoryEvent} returns this
 */
proto.HistoryEvent.prototype.clearExecutionsuspended = function() {
  return this.setExecutionsuspended(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.HistoryEvent.prototype.hasExecutionsuspended = function() {
  return jspb.Message.getField(this, 21) != null;
};


/**
 * optional ExecutionResumedEvent executionResumed = 22;
 * @return {?proto.ExecutionResumedEvent}
 */
proto.HistoryEvent.prototype.getExecutionresumed = function() {
  return /** @type{?proto.ExecutionResumedEvent} */ (
    jspb.Message.getWrapperField(this, proto.ExecutionResumedEvent, 22));
};


/**
 * @param {?proto.ExecutionResumedEvent|undefined} value
 * @return {!proto.HistoryEvent} returns this
*/
proto.HistoryEvent.prototype.setExecutionresumed = function(value) {
  return jspb.Message.setOneofWrapperField(this, 22, proto.HistoryEvent.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.HistoryEvent} returns this
 */
proto.HistoryEvent.prototype.clearExecutionresumed = function() {
  return this.setExecutionresumed(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.HistoryEvent.prototype.hasExecutionresumed = function() {
  return jspb.Message.getField(this, 22) != null;
};


/**
 * optional EntityOperationSignaledEvent entityOperationSignaled = 23;
 * @return {?proto.EntityOperationSignaledEvent}
 */
proto.HistoryEvent.prototype.getEntityoperationsignaled = function() {
  return /** @type{?proto.EntityOperationSignaledEvent} */ (
    jspb.Message.getWrapperField(this, proto.EntityOperationSignaledEvent, 23));
};


/**
 * @param {?proto.EntityOperationSignaledEvent|undefined} value
 * @return {!proto.HistoryEvent} returns this
*/
proto.HistoryEvent.prototype.setEntityoperationsignaled = function(value) {
  return jspb.Message.setOneofWrapperField(this, 23, proto.HistoryEvent.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.HistoryEvent} returns this
 */
proto.HistoryEvent.prototype.clearEntityoperationsignaled = function() {
  return this.setEntityoperationsignaled(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.HistoryEvent.prototype.hasEntityoperationsignaled = function() {
  return jspb.Message.getField(this, 23) != null;
};


/**
 * optional EntityOperationCalledEvent entityOperationCalled = 24;
 * @return {?proto.EntityOperationCalledEvent}
 */
proto.HistoryEvent.prototype.getEntityoperationcalled = function() {
  return /** @type{?proto.EntityOperationCalledEvent} */ (
    jspb.Message.getWrapperField(this, proto.EntityOperationCalledEvent, 24));
};


/**
 * @param {?proto.EntityOperationCalledEvent|undefined} value
 * @return {!proto.HistoryEvent} returns this
*/
proto.HistoryEvent.prototype.setEntityoperationcalled = function(value) {
  return jspb.Message.setOneofWrapperField(this, 24, proto.HistoryEvent.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.HistoryEvent} returns this
 */
proto.HistoryEvent.prototype.clearEntityoperationcalled = function() {
  return this.setEntityoperationcalled(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.HistoryEvent.prototype.hasEntityoperationcalled = function() {
  return jspb.Message.getField(this, 24) != null;
};


/**
 * optional EntityOperationCompletedEvent entityOperationCompleted = 25;
 * @return {?proto.EntityOperationCompletedEvent}
 */
proto.HistoryEvent.prototype.getEntityoperationcompleted = function() {
  return /** @type{?proto.EntityOperationCompletedEvent} */ (
    jspb.Message.getWrapperField(this, proto.EntityOperationCompletedEvent, 25));
};


/**
 * @param {?proto.EntityOperationCompletedEvent|undefined} value
 * @return {!proto.HistoryEvent} returns this
*/
proto.HistoryEvent.prototype.setEntityoperationcompleted = function(value) {
  return jspb.Message.setOneofWrapperField(this, 25, proto.HistoryEvent.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.HistoryEvent} returns this
 */
proto.HistoryEvent.prototype.clearEntityoperationcompleted = function() {
  return this.setEntityoperationcompleted(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.HistoryEvent.prototype.hasEntityoperationcompleted = function() {
  return jspb.Message.getField(this, 25) != null;
};


/**
 * optional EntityOperationFailedEvent entityOperationFailed = 26;
 * @return {?proto.EntityOperationFailedEvent}
 */
proto.HistoryEvent.prototype.getEntityoperationfailed = function() {
  return /** @type{?proto.EntityOperationFailedEvent} */ (
    jspb.Message.getWrapperField(this, proto.EntityOperationFailedEvent, 26));
};


/**
 * @param {?proto.EntityOperationFailedEvent|undefined} value
 * @return {!proto.HistoryEvent} returns this
*/
proto.HistoryEvent.prototype.setEntityoperationfailed = function(value) {
  return jspb.Message.setOneofWrapperField(this, 26, proto.HistoryEvent.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.HistoryEvent} returns this
 */
proto.HistoryEvent.prototype.clearEntityoperationfailed = function() {
  return this.setEntityoperationfailed(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.HistoryEvent.prototype.hasEntityoperationfailed = function() {
  return jspb.Message.getField(this, 26) != null;
};


/**
 * optional EntityLockRequestedEvent entityLockRequested = 27;
 * @return {?proto.EntityLockRequestedEvent}
 */
proto.HistoryEvent.prototype.getEntitylockrequested = function() {
  return /** @type{?proto.EntityLockRequestedEvent} */ (
    jspb.Message.getWrapperField(this, proto.EntityLockRequestedEvent, 27));
};


/**
 * @param {?proto.EntityLockRequestedEvent|undefined} value
 * @return {!proto.HistoryEvent} returns this
*/
proto.HistoryEvent.prototype.setEntitylockrequested = function(value) {
  return jspb.Message.setOneofWrapperField(this, 27, proto.HistoryEvent.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.HistoryEvent} returns this
 */
proto.HistoryEvent.prototype.clearEntitylockrequested = function() {
  return this.setEntitylockrequested(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.HistoryEvent.prototype.hasEntitylockrequested = function() {
  return jspb.Message.getField(this, 27) != null;
};


/**
 * optional EntityLockGrantedEvent entityLockGranted = 28;
 * @return {?proto.EntityLockGrantedEvent}
 */
proto.HistoryEvent.prototype.getEntitylockgranted = function() {
  return /** @type{?proto.EntityLockGrantedEvent} */ (
    jspb.Message.getWrapperField(this, proto.EntityLockGrantedEvent, 28));
};


/**
 * @param {?proto.EntityLockGrantedEvent|undefined} value
 * @return {!proto.HistoryEvent} returns this
*/
proto.HistoryEvent.prototype.setEntitylockgranted = function(value) {
  return jspb.Message.setOneofWrapperField(this, 28, proto.HistoryEvent.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.HistoryEvent} returns this
 */
proto.HistoryEvent.prototype.clearEntitylockgranted = function() {
  return this.setEntitylockgranted(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.HistoryEvent.prototype.hasEntitylockgranted = function() {
  return jspb.Message.getField(this, 28) != null;
};


/**
 * optional EntityUnlockSentEvent entityUnlockSent = 29;
 * @return {?proto.EntityUnlockSentEvent}
 */
proto.HistoryEvent.prototype.getEntityunlocksent = function() {
  return /** @type{?proto.EntityUnlockSentEvent} */ (
    jspb.Message.getWrapperField(this, proto.EntityUnlockSentEvent, 29));
};


/**
 * @param {?proto.EntityUnlockSentEvent|undefined} value
 * @return {!proto.HistoryEvent} returns this
*/
proto.HistoryEvent.prototype.setEntityunlocksent = function(value) {
  return jspb.Message.setOneofWrapperField(this, 29, proto.HistoryEvent.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.HistoryEvent} returns this
 */
proto.HistoryEvent.prototype.clearEntityunlocksent = function() {
  return this.setEntityunlocksent(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.HistoryEvent.prototype.hasEntityunlocksent = function() {
  return jspb.Message.getField(this, 29) != null;
};


/**
 * optional ExecutionRewoundEvent executionRewound = 30;
 * @return {?proto.ExecutionRewoundEvent}
 */
proto.HistoryEvent.prototype.getExecutionrewound = function() {
  return /** @type{?proto.ExecutionRewoundEvent} */ (
    jspb.Message.getWrapperField(this, proto.ExecutionRewoundEvent, 30));
};


/**
 * @param {?proto.ExecutionRewoundEvent|undefined} value
 * @return {!proto.HistoryEvent} returns this
*/
proto.HistoryEvent.prototype.setExecutionrewound = function(value) {
  return jspb.Message.setOneofWrapperField(this, 30, proto.HistoryEvent.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.HistoryEvent} returns this
 */
proto.HistoryEvent.prototype.clearExecutionrewound = function() {
  return this.setExecutionrewound(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.HistoryEvent.prototype.hasExecutionrewound = function() {
  return jspb.Message.getField(this, 30) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.ScheduleTaskAction.prototype.toObject = function(opt_includeInstance) {
  return proto.ScheduleTaskAction.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.ScheduleTaskAction} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.ScheduleTaskAction.toObject = function(includeInstance, msg) {
  var f, obj = {
    name: jspb.Message.getFieldWithDefault(msg, 1, ""),
    version: (f = msg.getVersion()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    input: (f = msg.getInput()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    tagsMap: (f = msg.getTagsMap()) ? f.toObject(includeInstance, undefined) : [],
    parenttracecontext: (f = msg.getParenttracecontext()) && proto.TraceContext.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.ScheduleTaskAction}
 */
proto.ScheduleTaskAction.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.ScheduleTaskAction;
  return proto.ScheduleTaskAction.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.ScheduleTaskAction} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.ScheduleTaskAction}
 */
proto.ScheduleTaskAction.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setName(value);
      break;
    case 2:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setVersion(value);
      break;
    case 3:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setInput(value);
      break;
    case 4:
      var value = msg.getTagsMap();
      reader.readMessage(value, function(message, reader) {
        jspb.Map.deserializeBinary(message, reader, jspb.BinaryReader.prototype.readString, jspb.BinaryReader.prototype.readString, null, "", "");
         });
      break;
    case 5:
      var value = new proto.TraceContext;
      reader.readMessage(value,proto.TraceContext.deserializeBinaryFromReader);
      msg.setParenttracecontext(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.ScheduleTaskAction.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.ScheduleTaskAction.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.ScheduleTaskAction} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.ScheduleTaskAction.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getName();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getVersion();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getInput();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getTagsMap(true);
  if (f && f.getLength() > 0) {
    f.serializeBinary(4, writer, jspb.BinaryWriter.prototype.writeString, jspb.BinaryWriter.prototype.writeString);
  }
  f = message.getParenttracecontext();
  if (f != null) {
    writer.writeMessage(
      5,
      f,
      proto.TraceContext.serializeBinaryToWriter
    );
  }
};


/**
 * optional string name = 1;
 * @return {string}
 */
proto.ScheduleTaskAction.prototype.getName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.ScheduleTaskAction} returns this
 */
proto.ScheduleTaskAction.prototype.setName = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional google.protobuf.StringValue version = 2;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.ScheduleTaskAction.prototype.getVersion = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 2));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.ScheduleTaskAction} returns this
*/
proto.ScheduleTaskAction.prototype.setVersion = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ScheduleTaskAction} returns this
 */
proto.ScheduleTaskAction.prototype.clearVersion = function() {
  return this.setVersion(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ScheduleTaskAction.prototype.hasVersion = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional google.protobuf.StringValue input = 3;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.ScheduleTaskAction.prototype.getInput = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 3));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.ScheduleTaskAction} returns this
*/
proto.ScheduleTaskAction.prototype.setInput = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ScheduleTaskAction} returns this
 */
proto.ScheduleTaskAction.prototype.clearInput = function() {
  return this.setInput(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ScheduleTaskAction.prototype.hasInput = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * map<string, string> tags = 4;
 * @param {boolean=} opt_noLazyCreate Do not create the map if
 * empty, instead returning `undefined`
 * @return {!jspb.Map<string,string>}
 */
proto.ScheduleTaskAction.prototype.getTagsMap = function(opt_noLazyCreate) {
  return /** @type {!jspb.Map<string,string>} */ (
      jspb.Message.getMapField(this, 4, opt_noLazyCreate,
      null));
};


/**
 * Clears values from the map. The map will be non-null.
 * @return {!proto.ScheduleTaskAction} returns this
 */
proto.ScheduleTaskAction.prototype.clearTagsMap = function() {
  this.getTagsMap().clear();
  return this;};


/**
 * optional TraceContext parentTraceContext = 5;
 * @return {?proto.TraceContext}
 */
proto.ScheduleTaskAction.prototype.getParenttracecontext = function() {
  return /** @type{?proto.TraceContext} */ (
    jspb.Message.getWrapperField(this, proto.TraceContext, 5));
};


/**
 * @param {?proto.TraceContext|undefined} value
 * @return {!proto.ScheduleTaskAction} returns this
*/
proto.ScheduleTaskAction.prototype.setParenttracecontext = function(value) {
  return jspb.Message.setWrapperField(this, 5, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ScheduleTaskAction} returns this
 */
proto.ScheduleTaskAction.prototype.clearParenttracecontext = function() {
  return this.setParenttracecontext(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ScheduleTaskAction.prototype.hasParenttracecontext = function() {
  return jspb.Message.getField(this, 5) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.CreateSubOrchestrationAction.prototype.toObject = function(opt_includeInstance) {
  return proto.CreateSubOrchestrationAction.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.CreateSubOrchestrationAction} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.CreateSubOrchestrationAction.toObject = function(includeInstance, msg) {
  var f, obj = {
    instanceid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    name: jspb.Message.getFieldWithDefault(msg, 2, ""),
    version: (f = msg.getVersion()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    input: (f = msg.getInput()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    parenttracecontext: (f = msg.getParenttracecontext()) && proto.TraceContext.toObject(includeInstance, f),
    tagsMap: (f = msg.getTagsMap()) ? f.toObject(includeInstance, undefined) : []
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.CreateSubOrchestrationAction}
 */
proto.CreateSubOrchestrationAction.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.CreateSubOrchestrationAction;
  return proto.CreateSubOrchestrationAction.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.CreateSubOrchestrationAction} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.CreateSubOrchestrationAction}
 */
proto.CreateSubOrchestrationAction.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setInstanceid(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setName(value);
      break;
    case 3:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setVersion(value);
      break;
    case 4:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setInput(value);
      break;
    case 5:
      var value = new proto.TraceContext;
      reader.readMessage(value,proto.TraceContext.deserializeBinaryFromReader);
      msg.setParenttracecontext(value);
      break;
    case 6:
      var value = msg.getTagsMap();
      reader.readMessage(value, function(message, reader) {
        jspb.Map.deserializeBinary(message, reader, jspb.BinaryReader.prototype.readString, jspb.BinaryReader.prototype.readString, null, "", "");
         });
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.CreateSubOrchestrationAction.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.CreateSubOrchestrationAction.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.CreateSubOrchestrationAction} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.CreateSubOrchestrationAction.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstanceid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getName();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getVersion();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getInput();
  if (f != null) {
    writer.writeMessage(
      4,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getParenttracecontext();
  if (f != null) {
    writer.writeMessage(
      5,
      f,
      proto.TraceContext.serializeBinaryToWriter
    );
  }
  f = message.getTagsMap(true);
  if (f && f.getLength() > 0) {
    f.serializeBinary(6, writer, jspb.BinaryWriter.prototype.writeString, jspb.BinaryWriter.prototype.writeString);
  }
};


/**
 * optional string instanceId = 1;
 * @return {string}
 */
proto.CreateSubOrchestrationAction.prototype.getInstanceid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.CreateSubOrchestrationAction} returns this
 */
proto.CreateSubOrchestrationAction.prototype.setInstanceid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string name = 2;
 * @return {string}
 */
proto.CreateSubOrchestrationAction.prototype.getName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/**
 * @param {string} value
 * @return {!proto.CreateSubOrchestrationAction} returns this
 */
proto.CreateSubOrchestrationAction.prototype.setName = function(value) {
  return jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional google.protobuf.StringValue version = 3;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.CreateSubOrchestrationAction.prototype.getVersion = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 3));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.CreateSubOrchestrationAction} returns this
*/
proto.CreateSubOrchestrationAction.prototype.setVersion = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.CreateSubOrchestrationAction} returns this
 */
proto.CreateSubOrchestrationAction.prototype.clearVersion = function() {
  return this.setVersion(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.CreateSubOrchestrationAction.prototype.hasVersion = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional google.protobuf.StringValue input = 4;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.CreateSubOrchestrationAction.prototype.getInput = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 4));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.CreateSubOrchestrationAction} returns this
*/
proto.CreateSubOrchestrationAction.prototype.setInput = function(value) {
  return jspb.Message.setWrapperField(this, 4, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.CreateSubOrchestrationAction} returns this
 */
proto.CreateSubOrchestrationAction.prototype.clearInput = function() {
  return this.setInput(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.CreateSubOrchestrationAction.prototype.hasInput = function() {
  return jspb.Message.getField(this, 4) != null;
};


/**
 * optional TraceContext parentTraceContext = 5;
 * @return {?proto.TraceContext}
 */
proto.CreateSubOrchestrationAction.prototype.getParenttracecontext = function() {
  return /** @type{?proto.TraceContext} */ (
    jspb.Message.getWrapperField(this, proto.TraceContext, 5));
};


/**
 * @param {?proto.TraceContext|undefined} value
 * @return {!proto.CreateSubOrchestrationAction} returns this
*/
proto.CreateSubOrchestrationAction.prototype.setParenttracecontext = function(value) {
  return jspb.Message.setWrapperField(this, 5, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.CreateSubOrchestrationAction} returns this
 */
proto.CreateSubOrchestrationAction.prototype.clearParenttracecontext = function() {
  return this.setParenttracecontext(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.CreateSubOrchestrationAction.prototype.hasParenttracecontext = function() {
  return jspb.Message.getField(this, 5) != null;
};


/**
 * map<string, string> tags = 6;
 * @param {boolean=} opt_noLazyCreate Do not create the map if
 * empty, instead returning `undefined`
 * @return {!jspb.Map<string,string>}
 */
proto.CreateSubOrchestrationAction.prototype.getTagsMap = function(opt_noLazyCreate) {
  return /** @type {!jspb.Map<string,string>} */ (
      jspb.Message.getMapField(this, 6, opt_noLazyCreate,
      null));
};


/**
 * Clears values from the map. The map will be non-null.
 * @return {!proto.CreateSubOrchestrationAction} returns this
 */
proto.CreateSubOrchestrationAction.prototype.clearTagsMap = function() {
  this.getTagsMap().clear();
  return this;};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.CreateTimerAction.prototype.toObject = function(opt_includeInstance) {
  return proto.CreateTimerAction.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.CreateTimerAction} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.CreateTimerAction.toObject = function(includeInstance, msg) {
  var f, obj = {
    fireat: (f = msg.getFireat()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.CreateTimerAction}
 */
proto.CreateTimerAction.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.CreateTimerAction;
  return proto.CreateTimerAction.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.CreateTimerAction} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.CreateTimerAction}
 */
proto.CreateTimerAction.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setFireat(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.CreateTimerAction.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.CreateTimerAction.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.CreateTimerAction} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.CreateTimerAction.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getFireat();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
};


/**
 * optional google.protobuf.Timestamp fireAt = 1;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.CreateTimerAction.prototype.getFireat = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 1));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.CreateTimerAction} returns this
*/
proto.CreateTimerAction.prototype.setFireat = function(value) {
  return jspb.Message.setWrapperField(this, 1, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.CreateTimerAction} returns this
 */
proto.CreateTimerAction.prototype.clearFireat = function() {
  return this.setFireat(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.CreateTimerAction.prototype.hasFireat = function() {
  return jspb.Message.getField(this, 1) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.SendEventAction.prototype.toObject = function(opt_includeInstance) {
  return proto.SendEventAction.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.SendEventAction} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.SendEventAction.toObject = function(includeInstance, msg) {
  var f, obj = {
    instance: (f = msg.getInstance()) && proto.OrchestrationInstance.toObject(includeInstance, f),
    name: jspb.Message.getFieldWithDefault(msg, 2, ""),
    data: (f = msg.getData()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.SendEventAction}
 */
proto.SendEventAction.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.SendEventAction;
  return proto.SendEventAction.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.SendEventAction} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.SendEventAction}
 */
proto.SendEventAction.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.OrchestrationInstance;
      reader.readMessage(value,proto.OrchestrationInstance.deserializeBinaryFromReader);
      msg.setInstance(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setName(value);
      break;
    case 3:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setData(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.SendEventAction.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.SendEventAction.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.SendEventAction} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.SendEventAction.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstance();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      proto.OrchestrationInstance.serializeBinaryToWriter
    );
  }
  f = message.getName();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getData();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
};


/**
 * optional OrchestrationInstance instance = 1;
 * @return {?proto.OrchestrationInstance}
 */
proto.SendEventAction.prototype.getInstance = function() {
  return /** @type{?proto.OrchestrationInstance} */ (
    jspb.Message.getWrapperField(this, proto.OrchestrationInstance, 1));
};


/**
 * @param {?proto.OrchestrationInstance|undefined} value
 * @return {!proto.SendEventAction} returns this
*/
proto.SendEventAction.prototype.setInstance = function(value) {
  return jspb.Message.setWrapperField(this, 1, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.SendEventAction} returns this
 */
proto.SendEventAction.prototype.clearInstance = function() {
  return this.setInstance(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.SendEventAction.prototype.hasInstance = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * optional string name = 2;
 * @return {string}
 */
proto.SendEventAction.prototype.getName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/**
 * @param {string} value
 * @return {!proto.SendEventAction} returns this
 */
proto.SendEventAction.prototype.setName = function(value) {
  return jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional google.protobuf.StringValue data = 3;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.SendEventAction.prototype.getData = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 3));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.SendEventAction} returns this
*/
proto.SendEventAction.prototype.setData = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.SendEventAction} returns this
 */
proto.SendEventAction.prototype.clearData = function() {
  return this.setData(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.SendEventAction.prototype.hasData = function() {
  return jspb.Message.getField(this, 3) != null;
};



/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.CompleteOrchestrationAction.repeatedFields_ = [5];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.CompleteOrchestrationAction.prototype.toObject = function(opt_includeInstance) {
  return proto.CompleteOrchestrationAction.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.CompleteOrchestrationAction} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.CompleteOrchestrationAction.toObject = function(includeInstance, msg) {
  var f, obj = {
    orchestrationstatus: jspb.Message.getFieldWithDefault(msg, 1, 0),
    result: (f = msg.getResult()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    details: (f = msg.getDetails()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    newversion: (f = msg.getNewversion()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    carryovereventsList: jspb.Message.toObjectList(msg.getCarryovereventsList(),
    proto.HistoryEvent.toObject, includeInstance),
    failuredetails: (f = msg.getFailuredetails()) && proto.TaskFailureDetails.toObject(includeInstance, f),
    tagsMap: (f = msg.getTagsMap()) ? f.toObject(includeInstance, undefined) : []
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.CompleteOrchestrationAction}
 */
proto.CompleteOrchestrationAction.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.CompleteOrchestrationAction;
  return proto.CompleteOrchestrationAction.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.CompleteOrchestrationAction} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.CompleteOrchestrationAction}
 */
proto.CompleteOrchestrationAction.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {!proto.OrchestrationStatus} */ (reader.readEnum());
      msg.setOrchestrationstatus(value);
      break;
    case 2:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setResult(value);
      break;
    case 3:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setDetails(value);
      break;
    case 4:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setNewversion(value);
      break;
    case 5:
      var value = new proto.HistoryEvent;
      reader.readMessage(value,proto.HistoryEvent.deserializeBinaryFromReader);
      msg.addCarryoverevents(value);
      break;
    case 6:
      var value = new proto.TaskFailureDetails;
      reader.readMessage(value,proto.TaskFailureDetails.deserializeBinaryFromReader);
      msg.setFailuredetails(value);
      break;
    case 7:
      var value = msg.getTagsMap();
      reader.readMessage(value, function(message, reader) {
        jspb.Map.deserializeBinary(message, reader, jspb.BinaryReader.prototype.readString, jspb.BinaryReader.prototype.readString, null, "", "");
         });
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.CompleteOrchestrationAction.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.CompleteOrchestrationAction.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.CompleteOrchestrationAction} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.CompleteOrchestrationAction.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getOrchestrationstatus();
  if (f !== 0.0) {
    writer.writeEnum(
      1,
      f
    );
  }
  f = message.getResult();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getDetails();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getNewversion();
  if (f != null) {
    writer.writeMessage(
      4,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getCarryovereventsList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      5,
      f,
      proto.HistoryEvent.serializeBinaryToWriter
    );
  }
  f = message.getFailuredetails();
  if (f != null) {
    writer.writeMessage(
      6,
      f,
      proto.TaskFailureDetails.serializeBinaryToWriter
    );
  }
  f = message.getTagsMap(true);
  if (f && f.getLength() > 0) {
    f.serializeBinary(7, writer, jspb.BinaryWriter.prototype.writeString, jspb.BinaryWriter.prototype.writeString);
  }
};


/**
 * optional OrchestrationStatus orchestrationStatus = 1;
 * @return {!proto.OrchestrationStatus}
 */
proto.CompleteOrchestrationAction.prototype.getOrchestrationstatus = function() {
  return /** @type {!proto.OrchestrationStatus} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/**
 * @param {!proto.OrchestrationStatus} value
 * @return {!proto.CompleteOrchestrationAction} returns this
 */
proto.CompleteOrchestrationAction.prototype.setOrchestrationstatus = function(value) {
  return jspb.Message.setProto3EnumField(this, 1, value);
};


/**
 * optional google.protobuf.StringValue result = 2;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.CompleteOrchestrationAction.prototype.getResult = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 2));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.CompleteOrchestrationAction} returns this
*/
proto.CompleteOrchestrationAction.prototype.setResult = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.CompleteOrchestrationAction} returns this
 */
proto.CompleteOrchestrationAction.prototype.clearResult = function() {
  return this.setResult(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.CompleteOrchestrationAction.prototype.hasResult = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional google.protobuf.StringValue details = 3;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.CompleteOrchestrationAction.prototype.getDetails = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 3));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.CompleteOrchestrationAction} returns this
*/
proto.CompleteOrchestrationAction.prototype.setDetails = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.CompleteOrchestrationAction} returns this
 */
proto.CompleteOrchestrationAction.prototype.clearDetails = function() {
  return this.setDetails(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.CompleteOrchestrationAction.prototype.hasDetails = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional google.protobuf.StringValue newVersion = 4;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.CompleteOrchestrationAction.prototype.getNewversion = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 4));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.CompleteOrchestrationAction} returns this
*/
proto.CompleteOrchestrationAction.prototype.setNewversion = function(value) {
  return jspb.Message.setWrapperField(this, 4, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.CompleteOrchestrationAction} returns this
 */
proto.CompleteOrchestrationAction.prototype.clearNewversion = function() {
  return this.setNewversion(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.CompleteOrchestrationAction.prototype.hasNewversion = function() {
  return jspb.Message.getField(this, 4) != null;
};


/**
 * repeated HistoryEvent carryoverEvents = 5;
 * @return {!Array<!proto.HistoryEvent>}
 */
proto.CompleteOrchestrationAction.prototype.getCarryovereventsList = function() {
  return /** @type{!Array<!proto.HistoryEvent>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.HistoryEvent, 5));
};


/**
 * @param {!Array<!proto.HistoryEvent>} value
 * @return {!proto.CompleteOrchestrationAction} returns this
*/
proto.CompleteOrchestrationAction.prototype.setCarryovereventsList = function(value) {
  return jspb.Message.setRepeatedWrapperField(this, 5, value);
};


/**
 * @param {!proto.HistoryEvent=} opt_value
 * @param {number=} opt_index
 * @return {!proto.HistoryEvent}
 */
proto.CompleteOrchestrationAction.prototype.addCarryoverevents = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 5, opt_value, proto.HistoryEvent, opt_index);
};


/**
 * Clears the list making it empty but non-null.
 * @return {!proto.CompleteOrchestrationAction} returns this
 */
proto.CompleteOrchestrationAction.prototype.clearCarryovereventsList = function() {
  return this.setCarryovereventsList([]);
};


/**
 * optional TaskFailureDetails failureDetails = 6;
 * @return {?proto.TaskFailureDetails}
 */
proto.CompleteOrchestrationAction.prototype.getFailuredetails = function() {
  return /** @type{?proto.TaskFailureDetails} */ (
    jspb.Message.getWrapperField(this, proto.TaskFailureDetails, 6));
};


/**
 * @param {?proto.TaskFailureDetails|undefined} value
 * @return {!proto.CompleteOrchestrationAction} returns this
*/
proto.CompleteOrchestrationAction.prototype.setFailuredetails = function(value) {
  return jspb.Message.setWrapperField(this, 6, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.CompleteOrchestrationAction} returns this
 */
proto.CompleteOrchestrationAction.prototype.clearFailuredetails = function() {
  return this.setFailuredetails(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.CompleteOrchestrationAction.prototype.hasFailuredetails = function() {
  return jspb.Message.getField(this, 6) != null;
};


/**
 * map<string, string> tags = 7;
 * @param {boolean=} opt_noLazyCreate Do not create the map if
 * empty, instead returning `undefined`
 * @return {!jspb.Map<string,string>}
 */
proto.CompleteOrchestrationAction.prototype.getTagsMap = function(opt_noLazyCreate) {
  return /** @type {!jspb.Map<string,string>} */ (
      jspb.Message.getMapField(this, 7, opt_noLazyCreate,
      null));
};


/**
 * Clears values from the map. The map will be non-null.
 * @return {!proto.CompleteOrchestrationAction} returns this
 */
proto.CompleteOrchestrationAction.prototype.clearTagsMap = function() {
  this.getTagsMap().clear();
  return this;};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.TerminateOrchestrationAction.prototype.toObject = function(opt_includeInstance) {
  return proto.TerminateOrchestrationAction.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.TerminateOrchestrationAction} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.TerminateOrchestrationAction.toObject = function(includeInstance, msg) {
  var f, obj = {
    instanceid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    reason: (f = msg.getReason()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    recurse: jspb.Message.getBooleanFieldWithDefault(msg, 3, false)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.TerminateOrchestrationAction}
 */
proto.TerminateOrchestrationAction.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.TerminateOrchestrationAction;
  return proto.TerminateOrchestrationAction.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.TerminateOrchestrationAction} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.TerminateOrchestrationAction}
 */
proto.TerminateOrchestrationAction.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setInstanceid(value);
      break;
    case 2:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setReason(value);
      break;
    case 3:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setRecurse(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.TerminateOrchestrationAction.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.TerminateOrchestrationAction.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.TerminateOrchestrationAction} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.TerminateOrchestrationAction.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstanceid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getReason();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getRecurse();
  if (f) {
    writer.writeBool(
      3,
      f
    );
  }
};


/**
 * optional string instanceId = 1;
 * @return {string}
 */
proto.TerminateOrchestrationAction.prototype.getInstanceid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.TerminateOrchestrationAction} returns this
 */
proto.TerminateOrchestrationAction.prototype.setInstanceid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional google.protobuf.StringValue reason = 2;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.TerminateOrchestrationAction.prototype.getReason = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 2));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.TerminateOrchestrationAction} returns this
*/
proto.TerminateOrchestrationAction.prototype.setReason = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.TerminateOrchestrationAction} returns this
 */
proto.TerminateOrchestrationAction.prototype.clearReason = function() {
  return this.setReason(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.TerminateOrchestrationAction.prototype.hasReason = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional bool recurse = 3;
 * @return {boolean}
 */
proto.TerminateOrchestrationAction.prototype.getRecurse = function() {
  return /** @type {boolean} */ (jspb.Message.getBooleanFieldWithDefault(this, 3, false));
};


/**
 * @param {boolean} value
 * @return {!proto.TerminateOrchestrationAction} returns this
 */
proto.TerminateOrchestrationAction.prototype.setRecurse = function(value) {
  return jspb.Message.setProto3BooleanField(this, 3, value);
};



/**
 * Oneof group definitions for this message. Each group defines the field
 * numbers belonging to that group. When of these fields' value is set, all
 * other fields in the group are cleared. During deserialization, if multiple
 * fields are encountered for a group, only the last value seen will be kept.
 * @private {!Array<!Array<number>>}
 * @const
 */
proto.SendEntityMessageAction.oneofGroups_ = [[1,2,3,4]];

/**
 * @enum {number}
 */
proto.SendEntityMessageAction.EntitymessagetypeCase = {
  ENTITYMESSAGETYPE_NOT_SET: 0,
  ENTITYOPERATIONSIGNALED: 1,
  ENTITYOPERATIONCALLED: 2,
  ENTITYLOCKREQUESTED: 3,
  ENTITYUNLOCKSENT: 4
};

/**
 * @return {proto.SendEntityMessageAction.EntitymessagetypeCase}
 */
proto.SendEntityMessageAction.prototype.getEntitymessagetypeCase = function() {
  return /** @type {proto.SendEntityMessageAction.EntitymessagetypeCase} */(jspb.Message.computeOneofCase(this, proto.SendEntityMessageAction.oneofGroups_[0]));
};



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.SendEntityMessageAction.prototype.toObject = function(opt_includeInstance) {
  return proto.SendEntityMessageAction.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.SendEntityMessageAction} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.SendEntityMessageAction.toObject = function(includeInstance, msg) {
  var f, obj = {
    entityoperationsignaled: (f = msg.getEntityoperationsignaled()) && proto.EntityOperationSignaledEvent.toObject(includeInstance, f),
    entityoperationcalled: (f = msg.getEntityoperationcalled()) && proto.EntityOperationCalledEvent.toObject(includeInstance, f),
    entitylockrequested: (f = msg.getEntitylockrequested()) && proto.EntityLockRequestedEvent.toObject(includeInstance, f),
    entityunlocksent: (f = msg.getEntityunlocksent()) && proto.EntityUnlockSentEvent.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.SendEntityMessageAction}
 */
proto.SendEntityMessageAction.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.SendEntityMessageAction;
  return proto.SendEntityMessageAction.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.SendEntityMessageAction} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.SendEntityMessageAction}
 */
proto.SendEntityMessageAction.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.EntityOperationSignaledEvent;
      reader.readMessage(value,proto.EntityOperationSignaledEvent.deserializeBinaryFromReader);
      msg.setEntityoperationsignaled(value);
      break;
    case 2:
      var value = new proto.EntityOperationCalledEvent;
      reader.readMessage(value,proto.EntityOperationCalledEvent.deserializeBinaryFromReader);
      msg.setEntityoperationcalled(value);
      break;
    case 3:
      var value = new proto.EntityLockRequestedEvent;
      reader.readMessage(value,proto.EntityLockRequestedEvent.deserializeBinaryFromReader);
      msg.setEntitylockrequested(value);
      break;
    case 4:
      var value = new proto.EntityUnlockSentEvent;
      reader.readMessage(value,proto.EntityUnlockSentEvent.deserializeBinaryFromReader);
      msg.setEntityunlocksent(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.SendEntityMessageAction.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.SendEntityMessageAction.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.SendEntityMessageAction} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.SendEntityMessageAction.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getEntityoperationsignaled();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      proto.EntityOperationSignaledEvent.serializeBinaryToWriter
    );
  }
  f = message.getEntityoperationcalled();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      proto.EntityOperationCalledEvent.serializeBinaryToWriter
    );
  }
  f = message.getEntitylockrequested();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      proto.EntityLockRequestedEvent.serializeBinaryToWriter
    );
  }
  f = message.getEntityunlocksent();
  if (f != null) {
    writer.writeMessage(
      4,
      f,
      proto.EntityUnlockSentEvent.serializeBinaryToWriter
    );
  }
};


/**
 * optional EntityOperationSignaledEvent entityOperationSignaled = 1;
 * @return {?proto.EntityOperationSignaledEvent}
 */
proto.SendEntityMessageAction.prototype.getEntityoperationsignaled = function() {
  return /** @type{?proto.EntityOperationSignaledEvent} */ (
    jspb.Message.getWrapperField(this, proto.EntityOperationSignaledEvent, 1));
};


/**
 * @param {?proto.EntityOperationSignaledEvent|undefined} value
 * @return {!proto.SendEntityMessageAction} returns this
*/
proto.SendEntityMessageAction.prototype.setEntityoperationsignaled = function(value) {
  return jspb.Message.setOneofWrapperField(this, 1, proto.SendEntityMessageAction.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.SendEntityMessageAction} returns this
 */
proto.SendEntityMessageAction.prototype.clearEntityoperationsignaled = function() {
  return this.setEntityoperationsignaled(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.SendEntityMessageAction.prototype.hasEntityoperationsignaled = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * optional EntityOperationCalledEvent entityOperationCalled = 2;
 * @return {?proto.EntityOperationCalledEvent}
 */
proto.SendEntityMessageAction.prototype.getEntityoperationcalled = function() {
  return /** @type{?proto.EntityOperationCalledEvent} */ (
    jspb.Message.getWrapperField(this, proto.EntityOperationCalledEvent, 2));
};


/**
 * @param {?proto.EntityOperationCalledEvent|undefined} value
 * @return {!proto.SendEntityMessageAction} returns this
*/
proto.SendEntityMessageAction.prototype.setEntityoperationcalled = function(value) {
  return jspb.Message.setOneofWrapperField(this, 2, proto.SendEntityMessageAction.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.SendEntityMessageAction} returns this
 */
proto.SendEntityMessageAction.prototype.clearEntityoperationcalled = function() {
  return this.setEntityoperationcalled(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.SendEntityMessageAction.prototype.hasEntityoperationcalled = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional EntityLockRequestedEvent entityLockRequested = 3;
 * @return {?proto.EntityLockRequestedEvent}
 */
proto.SendEntityMessageAction.prototype.getEntitylockrequested = function() {
  return /** @type{?proto.EntityLockRequestedEvent} */ (
    jspb.Message.getWrapperField(this, proto.EntityLockRequestedEvent, 3));
};


/**
 * @param {?proto.EntityLockRequestedEvent|undefined} value
 * @return {!proto.SendEntityMessageAction} returns this
*/
proto.SendEntityMessageAction.prototype.setEntitylockrequested = function(value) {
  return jspb.Message.setOneofWrapperField(this, 3, proto.SendEntityMessageAction.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.SendEntityMessageAction} returns this
 */
proto.SendEntityMessageAction.prototype.clearEntitylockrequested = function() {
  return this.setEntitylockrequested(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.SendEntityMessageAction.prototype.hasEntitylockrequested = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional EntityUnlockSentEvent entityUnlockSent = 4;
 * @return {?proto.EntityUnlockSentEvent}
 */
proto.SendEntityMessageAction.prototype.getEntityunlocksent = function() {
  return /** @type{?proto.EntityUnlockSentEvent} */ (
    jspb.Message.getWrapperField(this, proto.EntityUnlockSentEvent, 4));
};


/**
 * @param {?proto.EntityUnlockSentEvent|undefined} value
 * @return {!proto.SendEntityMessageAction} returns this
*/
proto.SendEntityMessageAction.prototype.setEntityunlocksent = function(value) {
  return jspb.Message.setOneofWrapperField(this, 4, proto.SendEntityMessageAction.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.SendEntityMessageAction} returns this
 */
proto.SendEntityMessageAction.prototype.clearEntityunlocksent = function() {
  return this.setEntityunlocksent(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.SendEntityMessageAction.prototype.hasEntityunlocksent = function() {
  return jspb.Message.getField(this, 4) != null;
};



/**
 * Oneof group definitions for this message. Each group defines the field
 * numbers belonging to that group. When of these fields' value is set, all
 * other fields in the group are cleared. During deserialization, if multiple
 * fields are encountered for a group, only the last value seen will be kept.
 * @private {!Array<!Array<number>>}
 * @const
 */
proto.OrchestratorAction.oneofGroups_ = [[2,3,4,5,6,7,8]];

/**
 * @enum {number}
 */
proto.OrchestratorAction.OrchestratoractiontypeCase = {
  ORCHESTRATORACTIONTYPE_NOT_SET: 0,
  SCHEDULETASK: 2,
  CREATESUBORCHESTRATION: 3,
  CREATETIMER: 4,
  SENDEVENT: 5,
  COMPLETEORCHESTRATION: 6,
  TERMINATEORCHESTRATION: 7,
  SENDENTITYMESSAGE: 8
};

/**
 * @return {proto.OrchestratorAction.OrchestratoractiontypeCase}
 */
proto.OrchestratorAction.prototype.getOrchestratoractiontypeCase = function() {
  return /** @type {proto.OrchestratorAction.OrchestratoractiontypeCase} */(jspb.Message.computeOneofCase(this, proto.OrchestratorAction.oneofGroups_[0]));
};



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.OrchestratorAction.prototype.toObject = function(opt_includeInstance) {
  return proto.OrchestratorAction.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.OrchestratorAction} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OrchestratorAction.toObject = function(includeInstance, msg) {
  var f, obj = {
    id: jspb.Message.getFieldWithDefault(msg, 1, 0),
    scheduletask: (f = msg.getScheduletask()) && proto.ScheduleTaskAction.toObject(includeInstance, f),
    createsuborchestration: (f = msg.getCreatesuborchestration()) && proto.CreateSubOrchestrationAction.toObject(includeInstance, f),
    createtimer: (f = msg.getCreatetimer()) && proto.CreateTimerAction.toObject(includeInstance, f),
    sendevent: (f = msg.getSendevent()) && proto.SendEventAction.toObject(includeInstance, f),
    completeorchestration: (f = msg.getCompleteorchestration()) && proto.CompleteOrchestrationAction.toObject(includeInstance, f),
    terminateorchestration: (f = msg.getTerminateorchestration()) && proto.TerminateOrchestrationAction.toObject(includeInstance, f),
    sendentitymessage: (f = msg.getSendentitymessage()) && proto.SendEntityMessageAction.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.OrchestratorAction}
 */
proto.OrchestratorAction.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.OrchestratorAction;
  return proto.OrchestratorAction.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.OrchestratorAction} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.OrchestratorAction}
 */
proto.OrchestratorAction.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readInt32());
      msg.setId(value);
      break;
    case 2:
      var value = new proto.ScheduleTaskAction;
      reader.readMessage(value,proto.ScheduleTaskAction.deserializeBinaryFromReader);
      msg.setScheduletask(value);
      break;
    case 3:
      var value = new proto.CreateSubOrchestrationAction;
      reader.readMessage(value,proto.CreateSubOrchestrationAction.deserializeBinaryFromReader);
      msg.setCreatesuborchestration(value);
      break;
    case 4:
      var value = new proto.CreateTimerAction;
      reader.readMessage(value,proto.CreateTimerAction.deserializeBinaryFromReader);
      msg.setCreatetimer(value);
      break;
    case 5:
      var value = new proto.SendEventAction;
      reader.readMessage(value,proto.SendEventAction.deserializeBinaryFromReader);
      msg.setSendevent(value);
      break;
    case 6:
      var value = new proto.CompleteOrchestrationAction;
      reader.readMessage(value,proto.CompleteOrchestrationAction.deserializeBinaryFromReader);
      msg.setCompleteorchestration(value);
      break;
    case 7:
      var value = new proto.TerminateOrchestrationAction;
      reader.readMessage(value,proto.TerminateOrchestrationAction.deserializeBinaryFromReader);
      msg.setTerminateorchestration(value);
      break;
    case 8:
      var value = new proto.SendEntityMessageAction;
      reader.readMessage(value,proto.SendEntityMessageAction.deserializeBinaryFromReader);
      msg.setSendentitymessage(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.OrchestratorAction.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.OrchestratorAction.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.OrchestratorAction} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OrchestratorAction.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getId();
  if (f !== 0) {
    writer.writeInt32(
      1,
      f
    );
  }
  f = message.getScheduletask();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      proto.ScheduleTaskAction.serializeBinaryToWriter
    );
  }
  f = message.getCreatesuborchestration();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      proto.CreateSubOrchestrationAction.serializeBinaryToWriter
    );
  }
  f = message.getCreatetimer();
  if (f != null) {
    writer.writeMessage(
      4,
      f,
      proto.CreateTimerAction.serializeBinaryToWriter
    );
  }
  f = message.getSendevent();
  if (f != null) {
    writer.writeMessage(
      5,
      f,
      proto.SendEventAction.serializeBinaryToWriter
    );
  }
  f = message.getCompleteorchestration();
  if (f != null) {
    writer.writeMessage(
      6,
      f,
      proto.CompleteOrchestrationAction.serializeBinaryToWriter
    );
  }
  f = message.getTerminateorchestration();
  if (f != null) {
    writer.writeMessage(
      7,
      f,
      proto.TerminateOrchestrationAction.serializeBinaryToWriter
    );
  }
  f = message.getSendentitymessage();
  if (f != null) {
    writer.writeMessage(
      8,
      f,
      proto.SendEntityMessageAction.serializeBinaryToWriter
    );
  }
};


/**
 * optional int32 id = 1;
 * @return {number}
 */
proto.OrchestratorAction.prototype.getId = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/**
 * @param {number} value
 * @return {!proto.OrchestratorAction} returns this
 */
proto.OrchestratorAction.prototype.setId = function(value) {
  return jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional ScheduleTaskAction scheduleTask = 2;
 * @return {?proto.ScheduleTaskAction}
 */
proto.OrchestratorAction.prototype.getScheduletask = function() {
  return /** @type{?proto.ScheduleTaskAction} */ (
    jspb.Message.getWrapperField(this, proto.ScheduleTaskAction, 2));
};


/**
 * @param {?proto.ScheduleTaskAction|undefined} value
 * @return {!proto.OrchestratorAction} returns this
*/
proto.OrchestratorAction.prototype.setScheduletask = function(value) {
  return jspb.Message.setOneofWrapperField(this, 2, proto.OrchestratorAction.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OrchestratorAction} returns this
 */
proto.OrchestratorAction.prototype.clearScheduletask = function() {
  return this.setScheduletask(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OrchestratorAction.prototype.hasScheduletask = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional CreateSubOrchestrationAction createSubOrchestration = 3;
 * @return {?proto.CreateSubOrchestrationAction}
 */
proto.OrchestratorAction.prototype.getCreatesuborchestration = function() {
  return /** @type{?proto.CreateSubOrchestrationAction} */ (
    jspb.Message.getWrapperField(this, proto.CreateSubOrchestrationAction, 3));
};


/**
 * @param {?proto.CreateSubOrchestrationAction|undefined} value
 * @return {!proto.OrchestratorAction} returns this
*/
proto.OrchestratorAction.prototype.setCreatesuborchestration = function(value) {
  return jspb.Message.setOneofWrapperField(this, 3, proto.OrchestratorAction.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OrchestratorAction} returns this
 */
proto.OrchestratorAction.prototype.clearCreatesuborchestration = function() {
  return this.setCreatesuborchestration(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OrchestratorAction.prototype.hasCreatesuborchestration = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional CreateTimerAction createTimer = 4;
 * @return {?proto.CreateTimerAction}
 */
proto.OrchestratorAction.prototype.getCreatetimer = function() {
  return /** @type{?proto.CreateTimerAction} */ (
    jspb.Message.getWrapperField(this, proto.CreateTimerAction, 4));
};


/**
 * @param {?proto.CreateTimerAction|undefined} value
 * @return {!proto.OrchestratorAction} returns this
*/
proto.OrchestratorAction.prototype.setCreatetimer = function(value) {
  return jspb.Message.setOneofWrapperField(this, 4, proto.OrchestratorAction.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OrchestratorAction} returns this
 */
proto.OrchestratorAction.prototype.clearCreatetimer = function() {
  return this.setCreatetimer(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OrchestratorAction.prototype.hasCreatetimer = function() {
  return jspb.Message.getField(this, 4) != null;
};


/**
 * optional SendEventAction sendEvent = 5;
 * @return {?proto.SendEventAction}
 */
proto.OrchestratorAction.prototype.getSendevent = function() {
  return /** @type{?proto.SendEventAction} */ (
    jspb.Message.getWrapperField(this, proto.SendEventAction, 5));
};


/**
 * @param {?proto.SendEventAction|undefined} value
 * @return {!proto.OrchestratorAction} returns this
*/
proto.OrchestratorAction.prototype.setSendevent = function(value) {
  return jspb.Message.setOneofWrapperField(this, 5, proto.OrchestratorAction.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OrchestratorAction} returns this
 */
proto.OrchestratorAction.prototype.clearSendevent = function() {
  return this.setSendevent(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OrchestratorAction.prototype.hasSendevent = function() {
  return jspb.Message.getField(this, 5) != null;
};


/**
 * optional CompleteOrchestrationAction completeOrchestration = 6;
 * @return {?proto.CompleteOrchestrationAction}
 */
proto.OrchestratorAction.prototype.getCompleteorchestration = function() {
  return /** @type{?proto.CompleteOrchestrationAction} */ (
    jspb.Message.getWrapperField(this, proto.CompleteOrchestrationAction, 6));
};


/**
 * @param {?proto.CompleteOrchestrationAction|undefined} value
 * @return {!proto.OrchestratorAction} returns this
*/
proto.OrchestratorAction.prototype.setCompleteorchestration = function(value) {
  return jspb.Message.setOneofWrapperField(this, 6, proto.OrchestratorAction.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OrchestratorAction} returns this
 */
proto.OrchestratorAction.prototype.clearCompleteorchestration = function() {
  return this.setCompleteorchestration(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OrchestratorAction.prototype.hasCompleteorchestration = function() {
  return jspb.Message.getField(this, 6) != null;
};


/**
 * optional TerminateOrchestrationAction terminateOrchestration = 7;
 * @return {?proto.TerminateOrchestrationAction}
 */
proto.OrchestratorAction.prototype.getTerminateorchestration = function() {
  return /** @type{?proto.TerminateOrchestrationAction} */ (
    jspb.Message.getWrapperField(this, proto.TerminateOrchestrationAction, 7));
};


/**
 * @param {?proto.TerminateOrchestrationAction|undefined} value
 * @return {!proto.OrchestratorAction} returns this
*/
proto.OrchestratorAction.prototype.setTerminateorchestration = function(value) {
  return jspb.Message.setOneofWrapperField(this, 7, proto.OrchestratorAction.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OrchestratorAction} returns this
 */
proto.OrchestratorAction.prototype.clearTerminateorchestration = function() {
  return this.setTerminateorchestration(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OrchestratorAction.prototype.hasTerminateorchestration = function() {
  return jspb.Message.getField(this, 7) != null;
};


/**
 * optional SendEntityMessageAction sendEntityMessage = 8;
 * @return {?proto.SendEntityMessageAction}
 */
proto.OrchestratorAction.prototype.getSendentitymessage = function() {
  return /** @type{?proto.SendEntityMessageAction} */ (
    jspb.Message.getWrapperField(this, proto.SendEntityMessageAction, 8));
};


/**
 * @param {?proto.SendEntityMessageAction|undefined} value
 * @return {!proto.OrchestratorAction} returns this
*/
proto.OrchestratorAction.prototype.setSendentitymessage = function(value) {
  return jspb.Message.setOneofWrapperField(this, 8, proto.OrchestratorAction.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OrchestratorAction} returns this
 */
proto.OrchestratorAction.prototype.clearSendentitymessage = function() {
  return this.setSendentitymessage(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OrchestratorAction.prototype.hasSendentitymessage = function() {
  return jspb.Message.getField(this, 8) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.OrchestrationTraceContext.prototype.toObject = function(opt_includeInstance) {
  return proto.OrchestrationTraceContext.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.OrchestrationTraceContext} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OrchestrationTraceContext.toObject = function(includeInstance, msg) {
  var f, obj = {
    spanid: (f = msg.getSpanid()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    spanstarttime: (f = msg.getSpanstarttime()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.OrchestrationTraceContext}
 */
proto.OrchestrationTraceContext.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.OrchestrationTraceContext;
  return proto.OrchestrationTraceContext.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.OrchestrationTraceContext} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.OrchestrationTraceContext}
 */
proto.OrchestrationTraceContext.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setSpanid(value);
      break;
    case 2:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setSpanstarttime(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.OrchestrationTraceContext.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.OrchestrationTraceContext.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.OrchestrationTraceContext} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OrchestrationTraceContext.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getSpanid();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getSpanstarttime();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
};


/**
 * optional google.protobuf.StringValue spanID = 1;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.OrchestrationTraceContext.prototype.getSpanid = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 1));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.OrchestrationTraceContext} returns this
*/
proto.OrchestrationTraceContext.prototype.setSpanid = function(value) {
  return jspb.Message.setWrapperField(this, 1, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OrchestrationTraceContext} returns this
 */
proto.OrchestrationTraceContext.prototype.clearSpanid = function() {
  return this.setSpanid(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OrchestrationTraceContext.prototype.hasSpanid = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * optional google.protobuf.Timestamp spanStartTime = 2;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.OrchestrationTraceContext.prototype.getSpanstarttime = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 2));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.OrchestrationTraceContext} returns this
*/
proto.OrchestrationTraceContext.prototype.setSpanstarttime = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OrchestrationTraceContext} returns this
 */
proto.OrchestrationTraceContext.prototype.clearSpanstarttime = function() {
  return this.setSpanstarttime(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OrchestrationTraceContext.prototype.hasSpanstarttime = function() {
  return jspb.Message.getField(this, 2) != null;
};



/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.OrchestratorRequest.repeatedFields_ = [3,4];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.OrchestratorRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.OrchestratorRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.OrchestratorRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OrchestratorRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    instanceid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    executionid: (f = msg.getExecutionid()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    pasteventsList: jspb.Message.toObjectList(msg.getPasteventsList(),
    proto.HistoryEvent.toObject, includeInstance),
    neweventsList: jspb.Message.toObjectList(msg.getNeweventsList(),
    proto.HistoryEvent.toObject, includeInstance),
    entityparameters: (f = msg.getEntityparameters()) && proto.OrchestratorEntityParameters.toObject(includeInstance, f),
    requireshistorystreaming: jspb.Message.getBooleanFieldWithDefault(msg, 6, false),
    propertiesMap: (f = msg.getPropertiesMap()) ? f.toObject(includeInstance, proto.google.protobuf.Value.toObject) : [],
    orchestrationtracecontext: (f = msg.getOrchestrationtracecontext()) && proto.OrchestrationTraceContext.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.OrchestratorRequest}
 */
proto.OrchestratorRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.OrchestratorRequest;
  return proto.OrchestratorRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.OrchestratorRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.OrchestratorRequest}
 */
proto.OrchestratorRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setInstanceid(value);
      break;
    case 2:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setExecutionid(value);
      break;
    case 3:
      var value = new proto.HistoryEvent;
      reader.readMessage(value,proto.HistoryEvent.deserializeBinaryFromReader);
      msg.addPastevents(value);
      break;
    case 4:
      var value = new proto.HistoryEvent;
      reader.readMessage(value,proto.HistoryEvent.deserializeBinaryFromReader);
      msg.addNewevents(value);
      break;
    case 5:
      var value = new proto.OrchestratorEntityParameters;
      reader.readMessage(value,proto.OrchestratorEntityParameters.deserializeBinaryFromReader);
      msg.setEntityparameters(value);
      break;
    case 6:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setRequireshistorystreaming(value);
      break;
    case 7:
      var value = msg.getPropertiesMap();
      reader.readMessage(value, function(message, reader) {
        jspb.Map.deserializeBinary(message, reader, jspb.BinaryReader.prototype.readString, jspb.BinaryReader.prototype.readMessage, proto.google.protobuf.Value.deserializeBinaryFromReader, "", new proto.google.protobuf.Value());
         });
      break;
    case 8:
      var value = new proto.OrchestrationTraceContext;
      reader.readMessage(value,proto.OrchestrationTraceContext.deserializeBinaryFromReader);
      msg.setOrchestrationtracecontext(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.OrchestratorRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.OrchestratorRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.OrchestratorRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OrchestratorRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstanceid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getExecutionid();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getPasteventsList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      3,
      f,
      proto.HistoryEvent.serializeBinaryToWriter
    );
  }
  f = message.getNeweventsList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      4,
      f,
      proto.HistoryEvent.serializeBinaryToWriter
    );
  }
  f = message.getEntityparameters();
  if (f != null) {
    writer.writeMessage(
      5,
      f,
      proto.OrchestratorEntityParameters.serializeBinaryToWriter
    );
  }
  f = message.getRequireshistorystreaming();
  if (f) {
    writer.writeBool(
      6,
      f
    );
  }
  f = message.getPropertiesMap(true);
  if (f && f.getLength() > 0) {
    f.serializeBinary(7, writer, jspb.BinaryWriter.prototype.writeString, jspb.BinaryWriter.prototype.writeMessage, proto.google.protobuf.Value.serializeBinaryToWriter);
  }
  f = message.getOrchestrationtracecontext();
  if (f != null) {
    writer.writeMessage(
      8,
      f,
      proto.OrchestrationTraceContext.serializeBinaryToWriter
    );
  }
};


/**
 * optional string instanceId = 1;
 * @return {string}
 */
proto.OrchestratorRequest.prototype.getInstanceid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.OrchestratorRequest} returns this
 */
proto.OrchestratorRequest.prototype.setInstanceid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional google.protobuf.StringValue executionId = 2;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.OrchestratorRequest.prototype.getExecutionid = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 2));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.OrchestratorRequest} returns this
*/
proto.OrchestratorRequest.prototype.setExecutionid = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OrchestratorRequest} returns this
 */
proto.OrchestratorRequest.prototype.clearExecutionid = function() {
  return this.setExecutionid(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OrchestratorRequest.prototype.hasExecutionid = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * repeated HistoryEvent pastEvents = 3;
 * @return {!Array<!proto.HistoryEvent>}
 */
proto.OrchestratorRequest.prototype.getPasteventsList = function() {
  return /** @type{!Array<!proto.HistoryEvent>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.HistoryEvent, 3));
};


/**
 * @param {!Array<!proto.HistoryEvent>} value
 * @return {!proto.OrchestratorRequest} returns this
*/
proto.OrchestratorRequest.prototype.setPasteventsList = function(value) {
  return jspb.Message.setRepeatedWrapperField(this, 3, value);
};


/**
 * @param {!proto.HistoryEvent=} opt_value
 * @param {number=} opt_index
 * @return {!proto.HistoryEvent}
 */
proto.OrchestratorRequest.prototype.addPastevents = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 3, opt_value, proto.HistoryEvent, opt_index);
};


/**
 * Clears the list making it empty but non-null.
 * @return {!proto.OrchestratorRequest} returns this
 */
proto.OrchestratorRequest.prototype.clearPasteventsList = function() {
  return this.setPasteventsList([]);
};


/**
 * repeated HistoryEvent newEvents = 4;
 * @return {!Array<!proto.HistoryEvent>}
 */
proto.OrchestratorRequest.prototype.getNeweventsList = function() {
  return /** @type{!Array<!proto.HistoryEvent>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.HistoryEvent, 4));
};


/**
 * @param {!Array<!proto.HistoryEvent>} value
 * @return {!proto.OrchestratorRequest} returns this
*/
proto.OrchestratorRequest.prototype.setNeweventsList = function(value) {
  return jspb.Message.setRepeatedWrapperField(this, 4, value);
};


/**
 * @param {!proto.HistoryEvent=} opt_value
 * @param {number=} opt_index
 * @return {!proto.HistoryEvent}
 */
proto.OrchestratorRequest.prototype.addNewevents = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 4, opt_value, proto.HistoryEvent, opt_index);
};


/**
 * Clears the list making it empty but non-null.
 * @return {!proto.OrchestratorRequest} returns this
 */
proto.OrchestratorRequest.prototype.clearNeweventsList = function() {
  return this.setNeweventsList([]);
};


/**
 * optional OrchestratorEntityParameters entityParameters = 5;
 * @return {?proto.OrchestratorEntityParameters}
 */
proto.OrchestratorRequest.prototype.getEntityparameters = function() {
  return /** @type{?proto.OrchestratorEntityParameters} */ (
    jspb.Message.getWrapperField(this, proto.OrchestratorEntityParameters, 5));
};


/**
 * @param {?proto.OrchestratorEntityParameters|undefined} value
 * @return {!proto.OrchestratorRequest} returns this
*/
proto.OrchestratorRequest.prototype.setEntityparameters = function(value) {
  return jspb.Message.setWrapperField(this, 5, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OrchestratorRequest} returns this
 */
proto.OrchestratorRequest.prototype.clearEntityparameters = function() {
  return this.setEntityparameters(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OrchestratorRequest.prototype.hasEntityparameters = function() {
  return jspb.Message.getField(this, 5) != null;
};


/**
 * optional bool requiresHistoryStreaming = 6;
 * @return {boolean}
 */
proto.OrchestratorRequest.prototype.getRequireshistorystreaming = function() {
  return /** @type {boolean} */ (jspb.Message.getBooleanFieldWithDefault(this, 6, false));
};


/**
 * @param {boolean} value
 * @return {!proto.OrchestratorRequest} returns this
 */
proto.OrchestratorRequest.prototype.setRequireshistorystreaming = function(value) {
  return jspb.Message.setProto3BooleanField(this, 6, value);
};


/**
 * map<string, google.protobuf.Value> properties = 7;
 * @param {boolean=} opt_noLazyCreate Do not create the map if
 * empty, instead returning `undefined`
 * @return {!jspb.Map<string,!proto.google.protobuf.Value>}
 */
proto.OrchestratorRequest.prototype.getPropertiesMap = function(opt_noLazyCreate) {
  return /** @type {!jspb.Map<string,!proto.google.protobuf.Value>} */ (
      jspb.Message.getMapField(this, 7, opt_noLazyCreate,
      proto.google.protobuf.Value));
};


/**
 * Clears values from the map. The map will be non-null.
 * @return {!proto.OrchestratorRequest} returns this
 */
proto.OrchestratorRequest.prototype.clearPropertiesMap = function() {
  this.getPropertiesMap().clear();
  return this;};


/**
 * optional OrchestrationTraceContext orchestrationTraceContext = 8;
 * @return {?proto.OrchestrationTraceContext}
 */
proto.OrchestratorRequest.prototype.getOrchestrationtracecontext = function() {
  return /** @type{?proto.OrchestrationTraceContext} */ (
    jspb.Message.getWrapperField(this, proto.OrchestrationTraceContext, 8));
};


/**
 * @param {?proto.OrchestrationTraceContext|undefined} value
 * @return {!proto.OrchestratorRequest} returns this
*/
proto.OrchestratorRequest.prototype.setOrchestrationtracecontext = function(value) {
  return jspb.Message.setWrapperField(this, 8, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OrchestratorRequest} returns this
 */
proto.OrchestratorRequest.prototype.clearOrchestrationtracecontext = function() {
  return this.setOrchestrationtracecontext(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OrchestratorRequest.prototype.hasOrchestrationtracecontext = function() {
  return jspb.Message.getField(this, 8) != null;
};



/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.OrchestratorResponse.repeatedFields_ = [2];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.OrchestratorResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.OrchestratorResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.OrchestratorResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OrchestratorResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    instanceid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    actionsList: jspb.Message.toObjectList(msg.getActionsList(),
    proto.OrchestratorAction.toObject, includeInstance),
    customstatus: (f = msg.getCustomstatus()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    completiontoken: jspb.Message.getFieldWithDefault(msg, 4, ""),
    numeventsprocessed: (f = msg.getNumeventsprocessed()) && google_protobuf_wrappers_pb.Int32Value.toObject(includeInstance, f),
    orchestrationtracecontext: (f = msg.getOrchestrationtracecontext()) && proto.OrchestrationTraceContext.toObject(includeInstance, f),
    requireshistory: jspb.Message.getBooleanFieldWithDefault(msg, 7, false),
    ispartial: jspb.Message.getBooleanFieldWithDefault(msg, 8, false),
    chunkindex: (f = msg.getChunkindex()) && google_protobuf_wrappers_pb.Int32Value.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.OrchestratorResponse}
 */
proto.OrchestratorResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.OrchestratorResponse;
  return proto.OrchestratorResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.OrchestratorResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.OrchestratorResponse}
 */
proto.OrchestratorResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setInstanceid(value);
      break;
    case 2:
      var value = new proto.OrchestratorAction;
      reader.readMessage(value,proto.OrchestratorAction.deserializeBinaryFromReader);
      msg.addActions(value);
      break;
    case 3:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setCustomstatus(value);
      break;
    case 4:
      var value = /** @type {string} */ (reader.readString());
      msg.setCompletiontoken(value);
      break;
    case 5:
      var value = new google_protobuf_wrappers_pb.Int32Value;
      reader.readMessage(value,google_protobuf_wrappers_pb.Int32Value.deserializeBinaryFromReader);
      msg.setNumeventsprocessed(value);
      break;
    case 6:
      var value = new proto.OrchestrationTraceContext;
      reader.readMessage(value,proto.OrchestrationTraceContext.deserializeBinaryFromReader);
      msg.setOrchestrationtracecontext(value);
      break;
    case 7:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setRequireshistory(value);
      break;
    case 8:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setIspartial(value);
      break;
    case 9:
      var value = new google_protobuf_wrappers_pb.Int32Value;
      reader.readMessage(value,google_protobuf_wrappers_pb.Int32Value.deserializeBinaryFromReader);
      msg.setChunkindex(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.OrchestratorResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.OrchestratorResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.OrchestratorResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OrchestratorResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstanceid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getActionsList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      2,
      f,
      proto.OrchestratorAction.serializeBinaryToWriter
    );
  }
  f = message.getCustomstatus();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getCompletiontoken();
  if (f.length > 0) {
    writer.writeString(
      4,
      f
    );
  }
  f = message.getNumeventsprocessed();
  if (f != null) {
    writer.writeMessage(
      5,
      f,
      google_protobuf_wrappers_pb.Int32Value.serializeBinaryToWriter
    );
  }
  f = message.getOrchestrationtracecontext();
  if (f != null) {
    writer.writeMessage(
      6,
      f,
      proto.OrchestrationTraceContext.serializeBinaryToWriter
    );
  }
  f = message.getRequireshistory();
  if (f) {
    writer.writeBool(
      7,
      f
    );
  }
  f = message.getIspartial();
  if (f) {
    writer.writeBool(
      8,
      f
    );
  }
  f = message.getChunkindex();
  if (f != null) {
    writer.writeMessage(
      9,
      f,
      google_protobuf_wrappers_pb.Int32Value.serializeBinaryToWriter
    );
  }
};


/**
 * optional string instanceId = 1;
 * @return {string}
 */
proto.OrchestratorResponse.prototype.getInstanceid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.OrchestratorResponse} returns this
 */
proto.OrchestratorResponse.prototype.setInstanceid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * repeated OrchestratorAction actions = 2;
 * @return {!Array<!proto.OrchestratorAction>}
 */
proto.OrchestratorResponse.prototype.getActionsList = function() {
  return /** @type{!Array<!proto.OrchestratorAction>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.OrchestratorAction, 2));
};


/**
 * @param {!Array<!proto.OrchestratorAction>} value
 * @return {!proto.OrchestratorResponse} returns this
*/
proto.OrchestratorResponse.prototype.setActionsList = function(value) {
  return jspb.Message.setRepeatedWrapperField(this, 2, value);
};


/**
 * @param {!proto.OrchestratorAction=} opt_value
 * @param {number=} opt_index
 * @return {!proto.OrchestratorAction}
 */
proto.OrchestratorResponse.prototype.addActions = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 2, opt_value, proto.OrchestratorAction, opt_index);
};


/**
 * Clears the list making it empty but non-null.
 * @return {!proto.OrchestratorResponse} returns this
 */
proto.OrchestratorResponse.prototype.clearActionsList = function() {
  return this.setActionsList([]);
};


/**
 * optional google.protobuf.StringValue customStatus = 3;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.OrchestratorResponse.prototype.getCustomstatus = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 3));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.OrchestratorResponse} returns this
*/
proto.OrchestratorResponse.prototype.setCustomstatus = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OrchestratorResponse} returns this
 */
proto.OrchestratorResponse.prototype.clearCustomstatus = function() {
  return this.setCustomstatus(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OrchestratorResponse.prototype.hasCustomstatus = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional string completionToken = 4;
 * @return {string}
 */
proto.OrchestratorResponse.prototype.getCompletiontoken = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 4, ""));
};


/**
 * @param {string} value
 * @return {!proto.OrchestratorResponse} returns this
 */
proto.OrchestratorResponse.prototype.setCompletiontoken = function(value) {
  return jspb.Message.setProto3StringField(this, 4, value);
};


/**
 * optional google.protobuf.Int32Value numEventsProcessed = 5;
 * @return {?proto.google.protobuf.Int32Value}
 */
proto.OrchestratorResponse.prototype.getNumeventsprocessed = function() {
  return /** @type{?proto.google.protobuf.Int32Value} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.Int32Value, 5));
};


/**
 * @param {?proto.google.protobuf.Int32Value|undefined} value
 * @return {!proto.OrchestratorResponse} returns this
*/
proto.OrchestratorResponse.prototype.setNumeventsprocessed = function(value) {
  return jspb.Message.setWrapperField(this, 5, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OrchestratorResponse} returns this
 */
proto.OrchestratorResponse.prototype.clearNumeventsprocessed = function() {
  return this.setNumeventsprocessed(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OrchestratorResponse.prototype.hasNumeventsprocessed = function() {
  return jspb.Message.getField(this, 5) != null;
};


/**
 * optional OrchestrationTraceContext orchestrationTraceContext = 6;
 * @return {?proto.OrchestrationTraceContext}
 */
proto.OrchestratorResponse.prototype.getOrchestrationtracecontext = function() {
  return /** @type{?proto.OrchestrationTraceContext} */ (
    jspb.Message.getWrapperField(this, proto.OrchestrationTraceContext, 6));
};


/**
 * @param {?proto.OrchestrationTraceContext|undefined} value
 * @return {!proto.OrchestratorResponse} returns this
*/
proto.OrchestratorResponse.prototype.setOrchestrationtracecontext = function(value) {
  return jspb.Message.setWrapperField(this, 6, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OrchestratorResponse} returns this
 */
proto.OrchestratorResponse.prototype.clearOrchestrationtracecontext = function() {
  return this.setOrchestrationtracecontext(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OrchestratorResponse.prototype.hasOrchestrationtracecontext = function() {
  return jspb.Message.getField(this, 6) != null;
};


/**
 * optional bool requiresHistory = 7;
 * @return {boolean}
 */
proto.OrchestratorResponse.prototype.getRequireshistory = function() {
  return /** @type {boolean} */ (jspb.Message.getBooleanFieldWithDefault(this, 7, false));
};


/**
 * @param {boolean} value
 * @return {!proto.OrchestratorResponse} returns this
 */
proto.OrchestratorResponse.prototype.setRequireshistory = function(value) {
  return jspb.Message.setProto3BooleanField(this, 7, value);
};


/**
 * optional bool isPartial = 8;
 * @return {boolean}
 */
proto.OrchestratorResponse.prototype.getIspartial = function() {
  return /** @type {boolean} */ (jspb.Message.getBooleanFieldWithDefault(this, 8, false));
};


/**
 * @param {boolean} value
 * @return {!proto.OrchestratorResponse} returns this
 */
proto.OrchestratorResponse.prototype.setIspartial = function(value) {
  return jspb.Message.setProto3BooleanField(this, 8, value);
};


/**
 * optional google.protobuf.Int32Value chunkIndex = 9;
 * @return {?proto.google.protobuf.Int32Value}
 */
proto.OrchestratorResponse.prototype.getChunkindex = function() {
  return /** @type{?proto.google.protobuf.Int32Value} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.Int32Value, 9));
};


/**
 * @param {?proto.google.protobuf.Int32Value|undefined} value
 * @return {!proto.OrchestratorResponse} returns this
*/
proto.OrchestratorResponse.prototype.setChunkindex = function(value) {
  return jspb.Message.setWrapperField(this, 9, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OrchestratorResponse} returns this
 */
proto.OrchestratorResponse.prototype.clearChunkindex = function() {
  return this.setChunkindex(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OrchestratorResponse.prototype.hasChunkindex = function() {
  return jspb.Message.getField(this, 9) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.CreateInstanceRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.CreateInstanceRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.CreateInstanceRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.CreateInstanceRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    instanceid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    name: jspb.Message.getFieldWithDefault(msg, 2, ""),
    version: (f = msg.getVersion()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    input: (f = msg.getInput()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    scheduledstarttimestamp: (f = msg.getScheduledstarttimestamp()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f),
    orchestrationidreusepolicy: (f = msg.getOrchestrationidreusepolicy()) && proto.OrchestrationIdReusePolicy.toObject(includeInstance, f),
    executionid: (f = msg.getExecutionid()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    tagsMap: (f = msg.getTagsMap()) ? f.toObject(includeInstance, undefined) : [],
    parenttracecontext: (f = msg.getParenttracecontext()) && proto.TraceContext.toObject(includeInstance, f),
    requesttime: (f = msg.getRequesttime()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.CreateInstanceRequest}
 */
proto.CreateInstanceRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.CreateInstanceRequest;
  return proto.CreateInstanceRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.CreateInstanceRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.CreateInstanceRequest}
 */
proto.CreateInstanceRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setInstanceid(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setName(value);
      break;
    case 3:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setVersion(value);
      break;
    case 4:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setInput(value);
      break;
    case 5:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setScheduledstarttimestamp(value);
      break;
    case 6:
      var value = new proto.OrchestrationIdReusePolicy;
      reader.readMessage(value,proto.OrchestrationIdReusePolicy.deserializeBinaryFromReader);
      msg.setOrchestrationidreusepolicy(value);
      break;
    case 7:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setExecutionid(value);
      break;
    case 8:
      var value = msg.getTagsMap();
      reader.readMessage(value, function(message, reader) {
        jspb.Map.deserializeBinary(message, reader, jspb.BinaryReader.prototype.readString, jspb.BinaryReader.prototype.readString, null, "", "");
         });
      break;
    case 9:
      var value = new proto.TraceContext;
      reader.readMessage(value,proto.TraceContext.deserializeBinaryFromReader);
      msg.setParenttracecontext(value);
      break;
    case 10:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setRequesttime(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.CreateInstanceRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.CreateInstanceRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.CreateInstanceRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.CreateInstanceRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstanceid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getName();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getVersion();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getInput();
  if (f != null) {
    writer.writeMessage(
      4,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getScheduledstarttimestamp();
  if (f != null) {
    writer.writeMessage(
      5,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
  f = message.getOrchestrationidreusepolicy();
  if (f != null) {
    writer.writeMessage(
      6,
      f,
      proto.OrchestrationIdReusePolicy.serializeBinaryToWriter
    );
  }
  f = message.getExecutionid();
  if (f != null) {
    writer.writeMessage(
      7,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getTagsMap(true);
  if (f && f.getLength() > 0) {
    f.serializeBinary(8, writer, jspb.BinaryWriter.prototype.writeString, jspb.BinaryWriter.prototype.writeString);
  }
  f = message.getParenttracecontext();
  if (f != null) {
    writer.writeMessage(
      9,
      f,
      proto.TraceContext.serializeBinaryToWriter
    );
  }
  f = message.getRequesttime();
  if (f != null) {
    writer.writeMessage(
      10,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
};


/**
 * optional string instanceId = 1;
 * @return {string}
 */
proto.CreateInstanceRequest.prototype.getInstanceid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.CreateInstanceRequest} returns this
 */
proto.CreateInstanceRequest.prototype.setInstanceid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string name = 2;
 * @return {string}
 */
proto.CreateInstanceRequest.prototype.getName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/**
 * @param {string} value
 * @return {!proto.CreateInstanceRequest} returns this
 */
proto.CreateInstanceRequest.prototype.setName = function(value) {
  return jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional google.protobuf.StringValue version = 3;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.CreateInstanceRequest.prototype.getVersion = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 3));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.CreateInstanceRequest} returns this
*/
proto.CreateInstanceRequest.prototype.setVersion = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.CreateInstanceRequest} returns this
 */
proto.CreateInstanceRequest.prototype.clearVersion = function() {
  return this.setVersion(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.CreateInstanceRequest.prototype.hasVersion = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional google.protobuf.StringValue input = 4;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.CreateInstanceRequest.prototype.getInput = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 4));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.CreateInstanceRequest} returns this
*/
proto.CreateInstanceRequest.prototype.setInput = function(value) {
  return jspb.Message.setWrapperField(this, 4, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.CreateInstanceRequest} returns this
 */
proto.CreateInstanceRequest.prototype.clearInput = function() {
  return this.setInput(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.CreateInstanceRequest.prototype.hasInput = function() {
  return jspb.Message.getField(this, 4) != null;
};


/**
 * optional google.protobuf.Timestamp scheduledStartTimestamp = 5;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.CreateInstanceRequest.prototype.getScheduledstarttimestamp = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 5));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.CreateInstanceRequest} returns this
*/
proto.CreateInstanceRequest.prototype.setScheduledstarttimestamp = function(value) {
  return jspb.Message.setWrapperField(this, 5, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.CreateInstanceRequest} returns this
 */
proto.CreateInstanceRequest.prototype.clearScheduledstarttimestamp = function() {
  return this.setScheduledstarttimestamp(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.CreateInstanceRequest.prototype.hasScheduledstarttimestamp = function() {
  return jspb.Message.getField(this, 5) != null;
};


/**
 * optional OrchestrationIdReusePolicy orchestrationIdReusePolicy = 6;
 * @return {?proto.OrchestrationIdReusePolicy}
 */
proto.CreateInstanceRequest.prototype.getOrchestrationidreusepolicy = function() {
  return /** @type{?proto.OrchestrationIdReusePolicy} */ (
    jspb.Message.getWrapperField(this, proto.OrchestrationIdReusePolicy, 6));
};


/**
 * @param {?proto.OrchestrationIdReusePolicy|undefined} value
 * @return {!proto.CreateInstanceRequest} returns this
*/
proto.CreateInstanceRequest.prototype.setOrchestrationidreusepolicy = function(value) {
  return jspb.Message.setWrapperField(this, 6, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.CreateInstanceRequest} returns this
 */
proto.CreateInstanceRequest.prototype.clearOrchestrationidreusepolicy = function() {
  return this.setOrchestrationidreusepolicy(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.CreateInstanceRequest.prototype.hasOrchestrationidreusepolicy = function() {
  return jspb.Message.getField(this, 6) != null;
};


/**
 * optional google.protobuf.StringValue executionId = 7;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.CreateInstanceRequest.prototype.getExecutionid = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 7));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.CreateInstanceRequest} returns this
*/
proto.CreateInstanceRequest.prototype.setExecutionid = function(value) {
  return jspb.Message.setWrapperField(this, 7, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.CreateInstanceRequest} returns this
 */
proto.CreateInstanceRequest.prototype.clearExecutionid = function() {
  return this.setExecutionid(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.CreateInstanceRequest.prototype.hasExecutionid = function() {
  return jspb.Message.getField(this, 7) != null;
};


/**
 * map<string, string> tags = 8;
 * @param {boolean=} opt_noLazyCreate Do not create the map if
 * empty, instead returning `undefined`
 * @return {!jspb.Map<string,string>}
 */
proto.CreateInstanceRequest.prototype.getTagsMap = function(opt_noLazyCreate) {
  return /** @type {!jspb.Map<string,string>} */ (
      jspb.Message.getMapField(this, 8, opt_noLazyCreate,
      null));
};


/**
 * Clears values from the map. The map will be non-null.
 * @return {!proto.CreateInstanceRequest} returns this
 */
proto.CreateInstanceRequest.prototype.clearTagsMap = function() {
  this.getTagsMap().clear();
  return this;};


/**
 * optional TraceContext parentTraceContext = 9;
 * @return {?proto.TraceContext}
 */
proto.CreateInstanceRequest.prototype.getParenttracecontext = function() {
  return /** @type{?proto.TraceContext} */ (
    jspb.Message.getWrapperField(this, proto.TraceContext, 9));
};


/**
 * @param {?proto.TraceContext|undefined} value
 * @return {!proto.CreateInstanceRequest} returns this
*/
proto.CreateInstanceRequest.prototype.setParenttracecontext = function(value) {
  return jspb.Message.setWrapperField(this, 9, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.CreateInstanceRequest} returns this
 */
proto.CreateInstanceRequest.prototype.clearParenttracecontext = function() {
  return this.setParenttracecontext(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.CreateInstanceRequest.prototype.hasParenttracecontext = function() {
  return jspb.Message.getField(this, 9) != null;
};


/**
 * optional google.protobuf.Timestamp requestTime = 10;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.CreateInstanceRequest.prototype.getRequesttime = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 10));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.CreateInstanceRequest} returns this
*/
proto.CreateInstanceRequest.prototype.setRequesttime = function(value) {
  return jspb.Message.setWrapperField(this, 10, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.CreateInstanceRequest} returns this
 */
proto.CreateInstanceRequest.prototype.clearRequesttime = function() {
  return this.setRequesttime(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.CreateInstanceRequest.prototype.hasRequesttime = function() {
  return jspb.Message.getField(this, 10) != null;
};



/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.OrchestrationIdReusePolicy.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.OrchestrationIdReusePolicy.prototype.toObject = function(opt_includeInstance) {
  return proto.OrchestrationIdReusePolicy.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.OrchestrationIdReusePolicy} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OrchestrationIdReusePolicy.toObject = function(includeInstance, msg) {
  var f, obj = {
    replaceablestatusList: (f = jspb.Message.getRepeatedField(msg, 1)) == null ? undefined : f
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.OrchestrationIdReusePolicy}
 */
proto.OrchestrationIdReusePolicy.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.OrchestrationIdReusePolicy;
  return proto.OrchestrationIdReusePolicy.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.OrchestrationIdReusePolicy} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.OrchestrationIdReusePolicy}
 */
proto.OrchestrationIdReusePolicy.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var values = /** @type {!Array<!proto.OrchestrationStatus>} */ (reader.isDelimited() ? reader.readPackedEnum() : [reader.readEnum()]);
      for (var i = 0; i < values.length; i++) {
        msg.addReplaceablestatus(values[i]);
      }
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.OrchestrationIdReusePolicy.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.OrchestrationIdReusePolicy.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.OrchestrationIdReusePolicy} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OrchestrationIdReusePolicy.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getReplaceablestatusList();
  if (f.length > 0) {
    writer.writePackedEnum(
      1,
      f
    );
  }
};


/**
 * repeated OrchestrationStatus replaceableStatus = 1;
 * @return {!Array<!proto.OrchestrationStatus>}
 */
proto.OrchestrationIdReusePolicy.prototype.getReplaceablestatusList = function() {
  return /** @type {!Array<!proto.OrchestrationStatus>} */ (jspb.Message.getRepeatedField(this, 1));
};


/**
 * @param {!Array<!proto.OrchestrationStatus>} value
 * @return {!proto.OrchestrationIdReusePolicy} returns this
 */
proto.OrchestrationIdReusePolicy.prototype.setReplaceablestatusList = function(value) {
  return jspb.Message.setField(this, 1, value || []);
};


/**
 * @param {!proto.OrchestrationStatus} value
 * @param {number=} opt_index
 * @return {!proto.OrchestrationIdReusePolicy} returns this
 */
proto.OrchestrationIdReusePolicy.prototype.addReplaceablestatus = function(value, opt_index) {
  return jspb.Message.addToRepeatedField(this, 1, value, opt_index);
};


/**
 * Clears the list making it empty but non-null.
 * @return {!proto.OrchestrationIdReusePolicy} returns this
 */
proto.OrchestrationIdReusePolicy.prototype.clearReplaceablestatusList = function() {
  return this.setReplaceablestatusList([]);
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.CreateInstanceResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.CreateInstanceResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.CreateInstanceResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.CreateInstanceResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    instanceid: jspb.Message.getFieldWithDefault(msg, 1, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.CreateInstanceResponse}
 */
proto.CreateInstanceResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.CreateInstanceResponse;
  return proto.CreateInstanceResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.CreateInstanceResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.CreateInstanceResponse}
 */
proto.CreateInstanceResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setInstanceid(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.CreateInstanceResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.CreateInstanceResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.CreateInstanceResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.CreateInstanceResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstanceid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
};


/**
 * optional string instanceId = 1;
 * @return {string}
 */
proto.CreateInstanceResponse.prototype.getInstanceid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.CreateInstanceResponse} returns this
 */
proto.CreateInstanceResponse.prototype.setInstanceid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.GetInstanceRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.GetInstanceRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.GetInstanceRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.GetInstanceRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    instanceid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    getinputsandoutputs: jspb.Message.getBooleanFieldWithDefault(msg, 2, false)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.GetInstanceRequest}
 */
proto.GetInstanceRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.GetInstanceRequest;
  return proto.GetInstanceRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.GetInstanceRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.GetInstanceRequest}
 */
proto.GetInstanceRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setInstanceid(value);
      break;
    case 2:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setGetinputsandoutputs(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.GetInstanceRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.GetInstanceRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.GetInstanceRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.GetInstanceRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstanceid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getGetinputsandoutputs();
  if (f) {
    writer.writeBool(
      2,
      f
    );
  }
};


/**
 * optional string instanceId = 1;
 * @return {string}
 */
proto.GetInstanceRequest.prototype.getInstanceid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.GetInstanceRequest} returns this
 */
proto.GetInstanceRequest.prototype.setInstanceid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional bool getInputsAndOutputs = 2;
 * @return {boolean}
 */
proto.GetInstanceRequest.prototype.getGetinputsandoutputs = function() {
  return /** @type {boolean} */ (jspb.Message.getBooleanFieldWithDefault(this, 2, false));
};


/**
 * @param {boolean} value
 * @return {!proto.GetInstanceRequest} returns this
 */
proto.GetInstanceRequest.prototype.setGetinputsandoutputs = function(value) {
  return jspb.Message.setProto3BooleanField(this, 2, value);
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.GetInstanceResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.GetInstanceResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.GetInstanceResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.GetInstanceResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    exists: jspb.Message.getBooleanFieldWithDefault(msg, 1, false),
    orchestrationstate: (f = msg.getOrchestrationstate()) && proto.OrchestrationState.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.GetInstanceResponse}
 */
proto.GetInstanceResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.GetInstanceResponse;
  return proto.GetInstanceResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.GetInstanceResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.GetInstanceResponse}
 */
proto.GetInstanceResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setExists(value);
      break;
    case 2:
      var value = new proto.OrchestrationState;
      reader.readMessage(value,proto.OrchestrationState.deserializeBinaryFromReader);
      msg.setOrchestrationstate(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.GetInstanceResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.GetInstanceResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.GetInstanceResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.GetInstanceResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getExists();
  if (f) {
    writer.writeBool(
      1,
      f
    );
  }
  f = message.getOrchestrationstate();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      proto.OrchestrationState.serializeBinaryToWriter
    );
  }
};


/**
 * optional bool exists = 1;
 * @return {boolean}
 */
proto.GetInstanceResponse.prototype.getExists = function() {
  return /** @type {boolean} */ (jspb.Message.getBooleanFieldWithDefault(this, 1, false));
};


/**
 * @param {boolean} value
 * @return {!proto.GetInstanceResponse} returns this
 */
proto.GetInstanceResponse.prototype.setExists = function(value) {
  return jspb.Message.setProto3BooleanField(this, 1, value);
};


/**
 * optional OrchestrationState orchestrationState = 2;
 * @return {?proto.OrchestrationState}
 */
proto.GetInstanceResponse.prototype.getOrchestrationstate = function() {
  return /** @type{?proto.OrchestrationState} */ (
    jspb.Message.getWrapperField(this, proto.OrchestrationState, 2));
};


/**
 * @param {?proto.OrchestrationState|undefined} value
 * @return {!proto.GetInstanceResponse} returns this
*/
proto.GetInstanceResponse.prototype.setOrchestrationstate = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.GetInstanceResponse} returns this
 */
proto.GetInstanceResponse.prototype.clearOrchestrationstate = function() {
  return this.setOrchestrationstate(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.GetInstanceResponse.prototype.hasOrchestrationstate = function() {
  return jspb.Message.getField(this, 2) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.RewindInstanceRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.RewindInstanceRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.RewindInstanceRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.RewindInstanceRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    instanceid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    reason: (f = msg.getReason()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.RewindInstanceRequest}
 */
proto.RewindInstanceRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.RewindInstanceRequest;
  return proto.RewindInstanceRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.RewindInstanceRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.RewindInstanceRequest}
 */
proto.RewindInstanceRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setInstanceid(value);
      break;
    case 2:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setReason(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.RewindInstanceRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.RewindInstanceRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.RewindInstanceRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.RewindInstanceRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstanceid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getReason();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
};


/**
 * optional string instanceId = 1;
 * @return {string}
 */
proto.RewindInstanceRequest.prototype.getInstanceid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.RewindInstanceRequest} returns this
 */
proto.RewindInstanceRequest.prototype.setInstanceid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional google.protobuf.StringValue reason = 2;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.RewindInstanceRequest.prototype.getReason = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 2));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.RewindInstanceRequest} returns this
*/
proto.RewindInstanceRequest.prototype.setReason = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.RewindInstanceRequest} returns this
 */
proto.RewindInstanceRequest.prototype.clearReason = function() {
  return this.setReason(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.RewindInstanceRequest.prototype.hasReason = function() {
  return jspb.Message.getField(this, 2) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.RewindInstanceResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.RewindInstanceResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.RewindInstanceResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.RewindInstanceResponse.toObject = function(includeInstance, msg) {
  var f, obj = {

  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.RewindInstanceResponse}
 */
proto.RewindInstanceResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.RewindInstanceResponse;
  return proto.RewindInstanceResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.RewindInstanceResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.RewindInstanceResponse}
 */
proto.RewindInstanceResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.RewindInstanceResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.RewindInstanceResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.RewindInstanceResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.RewindInstanceResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.OrchestrationState.prototype.toObject = function(opt_includeInstance) {
  return proto.OrchestrationState.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.OrchestrationState} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OrchestrationState.toObject = function(includeInstance, msg) {
  var f, obj = {
    instanceid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    name: jspb.Message.getFieldWithDefault(msg, 2, ""),
    version: (f = msg.getVersion()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    orchestrationstatus: jspb.Message.getFieldWithDefault(msg, 4, 0),
    scheduledstarttimestamp: (f = msg.getScheduledstarttimestamp()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f),
    createdtimestamp: (f = msg.getCreatedtimestamp()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f),
    lastupdatedtimestamp: (f = msg.getLastupdatedtimestamp()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f),
    input: (f = msg.getInput()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    output: (f = msg.getOutput()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    customstatus: (f = msg.getCustomstatus()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    failuredetails: (f = msg.getFailuredetails()) && proto.TaskFailureDetails.toObject(includeInstance, f),
    executionid: (f = msg.getExecutionid()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    completedtimestamp: (f = msg.getCompletedtimestamp()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f),
    parentinstanceid: (f = msg.getParentinstanceid()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    tagsMap: (f = msg.getTagsMap()) ? f.toObject(includeInstance, undefined) : []
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.OrchestrationState}
 */
proto.OrchestrationState.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.OrchestrationState;
  return proto.OrchestrationState.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.OrchestrationState} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.OrchestrationState}
 */
proto.OrchestrationState.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setInstanceid(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setName(value);
      break;
    case 3:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setVersion(value);
      break;
    case 4:
      var value = /** @type {!proto.OrchestrationStatus} */ (reader.readEnum());
      msg.setOrchestrationstatus(value);
      break;
    case 5:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setScheduledstarttimestamp(value);
      break;
    case 6:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setCreatedtimestamp(value);
      break;
    case 7:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setLastupdatedtimestamp(value);
      break;
    case 8:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setInput(value);
      break;
    case 9:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setOutput(value);
      break;
    case 10:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setCustomstatus(value);
      break;
    case 11:
      var value = new proto.TaskFailureDetails;
      reader.readMessage(value,proto.TaskFailureDetails.deserializeBinaryFromReader);
      msg.setFailuredetails(value);
      break;
    case 12:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setExecutionid(value);
      break;
    case 13:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setCompletedtimestamp(value);
      break;
    case 14:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setParentinstanceid(value);
      break;
    case 15:
      var value = msg.getTagsMap();
      reader.readMessage(value, function(message, reader) {
        jspb.Map.deserializeBinary(message, reader, jspb.BinaryReader.prototype.readString, jspb.BinaryReader.prototype.readString, null, "", "");
         });
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.OrchestrationState.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.OrchestrationState.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.OrchestrationState} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OrchestrationState.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstanceid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getName();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getVersion();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getOrchestrationstatus();
  if (f !== 0.0) {
    writer.writeEnum(
      4,
      f
    );
  }
  f = message.getScheduledstarttimestamp();
  if (f != null) {
    writer.writeMessage(
      5,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
  f = message.getCreatedtimestamp();
  if (f != null) {
    writer.writeMessage(
      6,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
  f = message.getLastupdatedtimestamp();
  if (f != null) {
    writer.writeMessage(
      7,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
  f = message.getInput();
  if (f != null) {
    writer.writeMessage(
      8,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getOutput();
  if (f != null) {
    writer.writeMessage(
      9,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getCustomstatus();
  if (f != null) {
    writer.writeMessage(
      10,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getFailuredetails();
  if (f != null) {
    writer.writeMessage(
      11,
      f,
      proto.TaskFailureDetails.serializeBinaryToWriter
    );
  }
  f = message.getExecutionid();
  if (f != null) {
    writer.writeMessage(
      12,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getCompletedtimestamp();
  if (f != null) {
    writer.writeMessage(
      13,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
  f = message.getParentinstanceid();
  if (f != null) {
    writer.writeMessage(
      14,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getTagsMap(true);
  if (f && f.getLength() > 0) {
    f.serializeBinary(15, writer, jspb.BinaryWriter.prototype.writeString, jspb.BinaryWriter.prototype.writeString);
  }
};


/**
 * optional string instanceId = 1;
 * @return {string}
 */
proto.OrchestrationState.prototype.getInstanceid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.OrchestrationState} returns this
 */
proto.OrchestrationState.prototype.setInstanceid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string name = 2;
 * @return {string}
 */
proto.OrchestrationState.prototype.getName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/**
 * @param {string} value
 * @return {!proto.OrchestrationState} returns this
 */
proto.OrchestrationState.prototype.setName = function(value) {
  return jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional google.protobuf.StringValue version = 3;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.OrchestrationState.prototype.getVersion = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 3));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.OrchestrationState} returns this
*/
proto.OrchestrationState.prototype.setVersion = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OrchestrationState} returns this
 */
proto.OrchestrationState.prototype.clearVersion = function() {
  return this.setVersion(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OrchestrationState.prototype.hasVersion = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional OrchestrationStatus orchestrationStatus = 4;
 * @return {!proto.OrchestrationStatus}
 */
proto.OrchestrationState.prototype.getOrchestrationstatus = function() {
  return /** @type {!proto.OrchestrationStatus} */ (jspb.Message.getFieldWithDefault(this, 4, 0));
};


/**
 * @param {!proto.OrchestrationStatus} value
 * @return {!proto.OrchestrationState} returns this
 */
proto.OrchestrationState.prototype.setOrchestrationstatus = function(value) {
  return jspb.Message.setProto3EnumField(this, 4, value);
};


/**
 * optional google.protobuf.Timestamp scheduledStartTimestamp = 5;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.OrchestrationState.prototype.getScheduledstarttimestamp = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 5));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.OrchestrationState} returns this
*/
proto.OrchestrationState.prototype.setScheduledstarttimestamp = function(value) {
  return jspb.Message.setWrapperField(this, 5, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OrchestrationState} returns this
 */
proto.OrchestrationState.prototype.clearScheduledstarttimestamp = function() {
  return this.setScheduledstarttimestamp(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OrchestrationState.prototype.hasScheduledstarttimestamp = function() {
  return jspb.Message.getField(this, 5) != null;
};


/**
 * optional google.protobuf.Timestamp createdTimestamp = 6;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.OrchestrationState.prototype.getCreatedtimestamp = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 6));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.OrchestrationState} returns this
*/
proto.OrchestrationState.prototype.setCreatedtimestamp = function(value) {
  return jspb.Message.setWrapperField(this, 6, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OrchestrationState} returns this
 */
proto.OrchestrationState.prototype.clearCreatedtimestamp = function() {
  return this.setCreatedtimestamp(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OrchestrationState.prototype.hasCreatedtimestamp = function() {
  return jspb.Message.getField(this, 6) != null;
};


/**
 * optional google.protobuf.Timestamp lastUpdatedTimestamp = 7;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.OrchestrationState.prototype.getLastupdatedtimestamp = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 7));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.OrchestrationState} returns this
*/
proto.OrchestrationState.prototype.setLastupdatedtimestamp = function(value) {
  return jspb.Message.setWrapperField(this, 7, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OrchestrationState} returns this
 */
proto.OrchestrationState.prototype.clearLastupdatedtimestamp = function() {
  return this.setLastupdatedtimestamp(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OrchestrationState.prototype.hasLastupdatedtimestamp = function() {
  return jspb.Message.getField(this, 7) != null;
};


/**
 * optional google.protobuf.StringValue input = 8;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.OrchestrationState.prototype.getInput = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 8));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.OrchestrationState} returns this
*/
proto.OrchestrationState.prototype.setInput = function(value) {
  return jspb.Message.setWrapperField(this, 8, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OrchestrationState} returns this
 */
proto.OrchestrationState.prototype.clearInput = function() {
  return this.setInput(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OrchestrationState.prototype.hasInput = function() {
  return jspb.Message.getField(this, 8) != null;
};


/**
 * optional google.protobuf.StringValue output = 9;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.OrchestrationState.prototype.getOutput = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 9));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.OrchestrationState} returns this
*/
proto.OrchestrationState.prototype.setOutput = function(value) {
  return jspb.Message.setWrapperField(this, 9, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OrchestrationState} returns this
 */
proto.OrchestrationState.prototype.clearOutput = function() {
  return this.setOutput(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OrchestrationState.prototype.hasOutput = function() {
  return jspb.Message.getField(this, 9) != null;
};


/**
 * optional google.protobuf.StringValue customStatus = 10;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.OrchestrationState.prototype.getCustomstatus = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 10));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.OrchestrationState} returns this
*/
proto.OrchestrationState.prototype.setCustomstatus = function(value) {
  return jspb.Message.setWrapperField(this, 10, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OrchestrationState} returns this
 */
proto.OrchestrationState.prototype.clearCustomstatus = function() {
  return this.setCustomstatus(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OrchestrationState.prototype.hasCustomstatus = function() {
  return jspb.Message.getField(this, 10) != null;
};


/**
 * optional TaskFailureDetails failureDetails = 11;
 * @return {?proto.TaskFailureDetails}
 */
proto.OrchestrationState.prototype.getFailuredetails = function() {
  return /** @type{?proto.TaskFailureDetails} */ (
    jspb.Message.getWrapperField(this, proto.TaskFailureDetails, 11));
};


/**
 * @param {?proto.TaskFailureDetails|undefined} value
 * @return {!proto.OrchestrationState} returns this
*/
proto.OrchestrationState.prototype.setFailuredetails = function(value) {
  return jspb.Message.setWrapperField(this, 11, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OrchestrationState} returns this
 */
proto.OrchestrationState.prototype.clearFailuredetails = function() {
  return this.setFailuredetails(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OrchestrationState.prototype.hasFailuredetails = function() {
  return jspb.Message.getField(this, 11) != null;
};


/**
 * optional google.protobuf.StringValue executionId = 12;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.OrchestrationState.prototype.getExecutionid = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 12));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.OrchestrationState} returns this
*/
proto.OrchestrationState.prototype.setExecutionid = function(value) {
  return jspb.Message.setWrapperField(this, 12, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OrchestrationState} returns this
 */
proto.OrchestrationState.prototype.clearExecutionid = function() {
  return this.setExecutionid(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OrchestrationState.prototype.hasExecutionid = function() {
  return jspb.Message.getField(this, 12) != null;
};


/**
 * optional google.protobuf.Timestamp completedTimestamp = 13;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.OrchestrationState.prototype.getCompletedtimestamp = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 13));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.OrchestrationState} returns this
*/
proto.OrchestrationState.prototype.setCompletedtimestamp = function(value) {
  return jspb.Message.setWrapperField(this, 13, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OrchestrationState} returns this
 */
proto.OrchestrationState.prototype.clearCompletedtimestamp = function() {
  return this.setCompletedtimestamp(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OrchestrationState.prototype.hasCompletedtimestamp = function() {
  return jspb.Message.getField(this, 13) != null;
};


/**
 * optional google.protobuf.StringValue parentInstanceId = 14;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.OrchestrationState.prototype.getParentinstanceid = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 14));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.OrchestrationState} returns this
*/
proto.OrchestrationState.prototype.setParentinstanceid = function(value) {
  return jspb.Message.setWrapperField(this, 14, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OrchestrationState} returns this
 */
proto.OrchestrationState.prototype.clearParentinstanceid = function() {
  return this.setParentinstanceid(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OrchestrationState.prototype.hasParentinstanceid = function() {
  return jspb.Message.getField(this, 14) != null;
};


/**
 * map<string, string> tags = 15;
 * @param {boolean=} opt_noLazyCreate Do not create the map if
 * empty, instead returning `undefined`
 * @return {!jspb.Map<string,string>}
 */
proto.OrchestrationState.prototype.getTagsMap = function(opt_noLazyCreate) {
  return /** @type {!jspb.Map<string,string>} */ (
      jspb.Message.getMapField(this, 15, opt_noLazyCreate,
      null));
};


/**
 * Clears values from the map. The map will be non-null.
 * @return {!proto.OrchestrationState} returns this
 */
proto.OrchestrationState.prototype.clearTagsMap = function() {
  this.getTagsMap().clear();
  return this;};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.RaiseEventRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.RaiseEventRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.RaiseEventRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.RaiseEventRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    instanceid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    name: jspb.Message.getFieldWithDefault(msg, 2, ""),
    input: (f = msg.getInput()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.RaiseEventRequest}
 */
proto.RaiseEventRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.RaiseEventRequest;
  return proto.RaiseEventRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.RaiseEventRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.RaiseEventRequest}
 */
proto.RaiseEventRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setInstanceid(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setName(value);
      break;
    case 3:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setInput(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.RaiseEventRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.RaiseEventRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.RaiseEventRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.RaiseEventRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstanceid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getName();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getInput();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
};


/**
 * optional string instanceId = 1;
 * @return {string}
 */
proto.RaiseEventRequest.prototype.getInstanceid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.RaiseEventRequest} returns this
 */
proto.RaiseEventRequest.prototype.setInstanceid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string name = 2;
 * @return {string}
 */
proto.RaiseEventRequest.prototype.getName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/**
 * @param {string} value
 * @return {!proto.RaiseEventRequest} returns this
 */
proto.RaiseEventRequest.prototype.setName = function(value) {
  return jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional google.protobuf.StringValue input = 3;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.RaiseEventRequest.prototype.getInput = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 3));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.RaiseEventRequest} returns this
*/
proto.RaiseEventRequest.prototype.setInput = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.RaiseEventRequest} returns this
 */
proto.RaiseEventRequest.prototype.clearInput = function() {
  return this.setInput(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.RaiseEventRequest.prototype.hasInput = function() {
  return jspb.Message.getField(this, 3) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.RaiseEventResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.RaiseEventResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.RaiseEventResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.RaiseEventResponse.toObject = function(includeInstance, msg) {
  var f, obj = {

  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.RaiseEventResponse}
 */
proto.RaiseEventResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.RaiseEventResponse;
  return proto.RaiseEventResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.RaiseEventResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.RaiseEventResponse}
 */
proto.RaiseEventResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.RaiseEventResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.RaiseEventResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.RaiseEventResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.RaiseEventResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.TerminateRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.TerminateRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.TerminateRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.TerminateRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    instanceid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    output: (f = msg.getOutput()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    recursive: jspb.Message.getBooleanFieldWithDefault(msg, 3, false)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.TerminateRequest}
 */
proto.TerminateRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.TerminateRequest;
  return proto.TerminateRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.TerminateRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.TerminateRequest}
 */
proto.TerminateRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setInstanceid(value);
      break;
    case 2:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setOutput(value);
      break;
    case 3:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setRecursive(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.TerminateRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.TerminateRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.TerminateRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.TerminateRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstanceid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getOutput();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getRecursive();
  if (f) {
    writer.writeBool(
      3,
      f
    );
  }
};


/**
 * optional string instanceId = 1;
 * @return {string}
 */
proto.TerminateRequest.prototype.getInstanceid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.TerminateRequest} returns this
 */
proto.TerminateRequest.prototype.setInstanceid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional google.protobuf.StringValue output = 2;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.TerminateRequest.prototype.getOutput = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 2));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.TerminateRequest} returns this
*/
proto.TerminateRequest.prototype.setOutput = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.TerminateRequest} returns this
 */
proto.TerminateRequest.prototype.clearOutput = function() {
  return this.setOutput(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.TerminateRequest.prototype.hasOutput = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional bool recursive = 3;
 * @return {boolean}
 */
proto.TerminateRequest.prototype.getRecursive = function() {
  return /** @type {boolean} */ (jspb.Message.getBooleanFieldWithDefault(this, 3, false));
};


/**
 * @param {boolean} value
 * @return {!proto.TerminateRequest} returns this
 */
proto.TerminateRequest.prototype.setRecursive = function(value) {
  return jspb.Message.setProto3BooleanField(this, 3, value);
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.TerminateResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.TerminateResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.TerminateResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.TerminateResponse.toObject = function(includeInstance, msg) {
  var f, obj = {

  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.TerminateResponse}
 */
proto.TerminateResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.TerminateResponse;
  return proto.TerminateResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.TerminateResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.TerminateResponse}
 */
proto.TerminateResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.TerminateResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.TerminateResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.TerminateResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.TerminateResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.SuspendRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.SuspendRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.SuspendRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.SuspendRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    instanceid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    reason: (f = msg.getReason()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.SuspendRequest}
 */
proto.SuspendRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.SuspendRequest;
  return proto.SuspendRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.SuspendRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.SuspendRequest}
 */
proto.SuspendRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setInstanceid(value);
      break;
    case 2:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setReason(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.SuspendRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.SuspendRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.SuspendRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.SuspendRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstanceid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getReason();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
};


/**
 * optional string instanceId = 1;
 * @return {string}
 */
proto.SuspendRequest.prototype.getInstanceid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.SuspendRequest} returns this
 */
proto.SuspendRequest.prototype.setInstanceid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional google.protobuf.StringValue reason = 2;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.SuspendRequest.prototype.getReason = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 2));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.SuspendRequest} returns this
*/
proto.SuspendRequest.prototype.setReason = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.SuspendRequest} returns this
 */
proto.SuspendRequest.prototype.clearReason = function() {
  return this.setReason(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.SuspendRequest.prototype.hasReason = function() {
  return jspb.Message.getField(this, 2) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.SuspendResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.SuspendResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.SuspendResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.SuspendResponse.toObject = function(includeInstance, msg) {
  var f, obj = {

  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.SuspendResponse}
 */
proto.SuspendResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.SuspendResponse;
  return proto.SuspendResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.SuspendResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.SuspendResponse}
 */
proto.SuspendResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.SuspendResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.SuspendResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.SuspendResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.SuspendResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.ResumeRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.ResumeRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.ResumeRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.ResumeRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    instanceid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    reason: (f = msg.getReason()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.ResumeRequest}
 */
proto.ResumeRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.ResumeRequest;
  return proto.ResumeRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.ResumeRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.ResumeRequest}
 */
proto.ResumeRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setInstanceid(value);
      break;
    case 2:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setReason(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.ResumeRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.ResumeRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.ResumeRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.ResumeRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstanceid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getReason();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
};


/**
 * optional string instanceId = 1;
 * @return {string}
 */
proto.ResumeRequest.prototype.getInstanceid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.ResumeRequest} returns this
 */
proto.ResumeRequest.prototype.setInstanceid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional google.protobuf.StringValue reason = 2;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.ResumeRequest.prototype.getReason = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 2));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.ResumeRequest} returns this
*/
proto.ResumeRequest.prototype.setReason = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ResumeRequest} returns this
 */
proto.ResumeRequest.prototype.clearReason = function() {
  return this.setReason(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ResumeRequest.prototype.hasReason = function() {
  return jspb.Message.getField(this, 2) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.ResumeResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.ResumeResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.ResumeResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.ResumeResponse.toObject = function(includeInstance, msg) {
  var f, obj = {

  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.ResumeResponse}
 */
proto.ResumeResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.ResumeResponse;
  return proto.ResumeResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.ResumeResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.ResumeResponse}
 */
proto.ResumeResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.ResumeResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.ResumeResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.ResumeResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.ResumeResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.QueryInstancesRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.QueryInstancesRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.QueryInstancesRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.QueryInstancesRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    query: (f = msg.getQuery()) && proto.InstanceQuery.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.QueryInstancesRequest}
 */
proto.QueryInstancesRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.QueryInstancesRequest;
  return proto.QueryInstancesRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.QueryInstancesRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.QueryInstancesRequest}
 */
proto.QueryInstancesRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.InstanceQuery;
      reader.readMessage(value,proto.InstanceQuery.deserializeBinaryFromReader);
      msg.setQuery(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.QueryInstancesRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.QueryInstancesRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.QueryInstancesRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.QueryInstancesRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getQuery();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      proto.InstanceQuery.serializeBinaryToWriter
    );
  }
};


/**
 * optional InstanceQuery query = 1;
 * @return {?proto.InstanceQuery}
 */
proto.QueryInstancesRequest.prototype.getQuery = function() {
  return /** @type{?proto.InstanceQuery} */ (
    jspb.Message.getWrapperField(this, proto.InstanceQuery, 1));
};


/**
 * @param {?proto.InstanceQuery|undefined} value
 * @return {!proto.QueryInstancesRequest} returns this
*/
proto.QueryInstancesRequest.prototype.setQuery = function(value) {
  return jspb.Message.setWrapperField(this, 1, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.QueryInstancesRequest} returns this
 */
proto.QueryInstancesRequest.prototype.clearQuery = function() {
  return this.setQuery(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.QueryInstancesRequest.prototype.hasQuery = function() {
  return jspb.Message.getField(this, 1) != null;
};



/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.InstanceQuery.repeatedFields_ = [1,4];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.InstanceQuery.prototype.toObject = function(opt_includeInstance) {
  return proto.InstanceQuery.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.InstanceQuery} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.InstanceQuery.toObject = function(includeInstance, msg) {
  var f, obj = {
    runtimestatusList: (f = jspb.Message.getRepeatedField(msg, 1)) == null ? undefined : f,
    createdtimefrom: (f = msg.getCreatedtimefrom()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f),
    createdtimeto: (f = msg.getCreatedtimeto()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f),
    taskhubnamesList: jspb.Message.toObjectList(msg.getTaskhubnamesList(),
    google_protobuf_wrappers_pb.StringValue.toObject, includeInstance),
    maxinstancecount: jspb.Message.getFieldWithDefault(msg, 5, 0),
    continuationtoken: (f = msg.getContinuationtoken()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    instanceidprefix: (f = msg.getInstanceidprefix()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    fetchinputsandoutputs: jspb.Message.getBooleanFieldWithDefault(msg, 8, false)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.InstanceQuery}
 */
proto.InstanceQuery.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.InstanceQuery;
  return proto.InstanceQuery.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.InstanceQuery} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.InstanceQuery}
 */
proto.InstanceQuery.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var values = /** @type {!Array<!proto.OrchestrationStatus>} */ (reader.isDelimited() ? reader.readPackedEnum() : [reader.readEnum()]);
      for (var i = 0; i < values.length; i++) {
        msg.addRuntimestatus(values[i]);
      }
      break;
    case 2:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setCreatedtimefrom(value);
      break;
    case 3:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setCreatedtimeto(value);
      break;
    case 4:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.addTaskhubnames(value);
      break;
    case 5:
      var value = /** @type {number} */ (reader.readInt32());
      msg.setMaxinstancecount(value);
      break;
    case 6:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setContinuationtoken(value);
      break;
    case 7:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setInstanceidprefix(value);
      break;
    case 8:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setFetchinputsandoutputs(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.InstanceQuery.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.InstanceQuery.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.InstanceQuery} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.InstanceQuery.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getRuntimestatusList();
  if (f.length > 0) {
    writer.writePackedEnum(
      1,
      f
    );
  }
  f = message.getCreatedtimefrom();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
  f = message.getCreatedtimeto();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
  f = message.getTaskhubnamesList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      4,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getMaxinstancecount();
  if (f !== 0) {
    writer.writeInt32(
      5,
      f
    );
  }
  f = message.getContinuationtoken();
  if (f != null) {
    writer.writeMessage(
      6,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getInstanceidprefix();
  if (f != null) {
    writer.writeMessage(
      7,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getFetchinputsandoutputs();
  if (f) {
    writer.writeBool(
      8,
      f
    );
  }
};


/**
 * repeated OrchestrationStatus runtimeStatus = 1;
 * @return {!Array<!proto.OrchestrationStatus>}
 */
proto.InstanceQuery.prototype.getRuntimestatusList = function() {
  return /** @type {!Array<!proto.OrchestrationStatus>} */ (jspb.Message.getRepeatedField(this, 1));
};


/**
 * @param {!Array<!proto.OrchestrationStatus>} value
 * @return {!proto.InstanceQuery} returns this
 */
proto.InstanceQuery.prototype.setRuntimestatusList = function(value) {
  return jspb.Message.setField(this, 1, value || []);
};


/**
 * @param {!proto.OrchestrationStatus} value
 * @param {number=} opt_index
 * @return {!proto.InstanceQuery} returns this
 */
proto.InstanceQuery.prototype.addRuntimestatus = function(value, opt_index) {
  return jspb.Message.addToRepeatedField(this, 1, value, opt_index);
};


/**
 * Clears the list making it empty but non-null.
 * @return {!proto.InstanceQuery} returns this
 */
proto.InstanceQuery.prototype.clearRuntimestatusList = function() {
  return this.setRuntimestatusList([]);
};


/**
 * optional google.protobuf.Timestamp createdTimeFrom = 2;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.InstanceQuery.prototype.getCreatedtimefrom = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 2));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.InstanceQuery} returns this
*/
proto.InstanceQuery.prototype.setCreatedtimefrom = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.InstanceQuery} returns this
 */
proto.InstanceQuery.prototype.clearCreatedtimefrom = function() {
  return this.setCreatedtimefrom(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.InstanceQuery.prototype.hasCreatedtimefrom = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional google.protobuf.Timestamp createdTimeTo = 3;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.InstanceQuery.prototype.getCreatedtimeto = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 3));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.InstanceQuery} returns this
*/
proto.InstanceQuery.prototype.setCreatedtimeto = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.InstanceQuery} returns this
 */
proto.InstanceQuery.prototype.clearCreatedtimeto = function() {
  return this.setCreatedtimeto(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.InstanceQuery.prototype.hasCreatedtimeto = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * repeated google.protobuf.StringValue taskHubNames = 4;
 * @return {!Array<!proto.google.protobuf.StringValue>}
 */
proto.InstanceQuery.prototype.getTaskhubnamesList = function() {
  return /** @type{!Array<!proto.google.protobuf.StringValue>} */ (
    jspb.Message.getRepeatedWrapperField(this, google_protobuf_wrappers_pb.StringValue, 4));
};


/**
 * @param {!Array<!proto.google.protobuf.StringValue>} value
 * @return {!proto.InstanceQuery} returns this
*/
proto.InstanceQuery.prototype.setTaskhubnamesList = function(value) {
  return jspb.Message.setRepeatedWrapperField(this, 4, value);
};


/**
 * @param {!proto.google.protobuf.StringValue=} opt_value
 * @param {number=} opt_index
 * @return {!proto.google.protobuf.StringValue}
 */
proto.InstanceQuery.prototype.addTaskhubnames = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 4, opt_value, proto.google.protobuf.StringValue, opt_index);
};


/**
 * Clears the list making it empty but non-null.
 * @return {!proto.InstanceQuery} returns this
 */
proto.InstanceQuery.prototype.clearTaskhubnamesList = function() {
  return this.setTaskhubnamesList([]);
};


/**
 * optional int32 maxInstanceCount = 5;
 * @return {number}
 */
proto.InstanceQuery.prototype.getMaxinstancecount = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 5, 0));
};


/**
 * @param {number} value
 * @return {!proto.InstanceQuery} returns this
 */
proto.InstanceQuery.prototype.setMaxinstancecount = function(value) {
  return jspb.Message.setProto3IntField(this, 5, value);
};


/**
 * optional google.protobuf.StringValue continuationToken = 6;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.InstanceQuery.prototype.getContinuationtoken = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 6));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.InstanceQuery} returns this
*/
proto.InstanceQuery.prototype.setContinuationtoken = function(value) {
  return jspb.Message.setWrapperField(this, 6, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.InstanceQuery} returns this
 */
proto.InstanceQuery.prototype.clearContinuationtoken = function() {
  return this.setContinuationtoken(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.InstanceQuery.prototype.hasContinuationtoken = function() {
  return jspb.Message.getField(this, 6) != null;
};


/**
 * optional google.protobuf.StringValue instanceIdPrefix = 7;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.InstanceQuery.prototype.getInstanceidprefix = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 7));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.InstanceQuery} returns this
*/
proto.InstanceQuery.prototype.setInstanceidprefix = function(value) {
  return jspb.Message.setWrapperField(this, 7, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.InstanceQuery} returns this
 */
proto.InstanceQuery.prototype.clearInstanceidprefix = function() {
  return this.setInstanceidprefix(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.InstanceQuery.prototype.hasInstanceidprefix = function() {
  return jspb.Message.getField(this, 7) != null;
};


/**
 * optional bool fetchInputsAndOutputs = 8;
 * @return {boolean}
 */
proto.InstanceQuery.prototype.getFetchinputsandoutputs = function() {
  return /** @type {boolean} */ (jspb.Message.getBooleanFieldWithDefault(this, 8, false));
};


/**
 * @param {boolean} value
 * @return {!proto.InstanceQuery} returns this
 */
proto.InstanceQuery.prototype.setFetchinputsandoutputs = function(value) {
  return jspb.Message.setProto3BooleanField(this, 8, value);
};



/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.QueryInstancesResponse.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.QueryInstancesResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.QueryInstancesResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.QueryInstancesResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.QueryInstancesResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    orchestrationstateList: jspb.Message.toObjectList(msg.getOrchestrationstateList(),
    proto.OrchestrationState.toObject, includeInstance),
    continuationtoken: (f = msg.getContinuationtoken()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.QueryInstancesResponse}
 */
proto.QueryInstancesResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.QueryInstancesResponse;
  return proto.QueryInstancesResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.QueryInstancesResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.QueryInstancesResponse}
 */
proto.QueryInstancesResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.OrchestrationState;
      reader.readMessage(value,proto.OrchestrationState.deserializeBinaryFromReader);
      msg.addOrchestrationstate(value);
      break;
    case 2:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setContinuationtoken(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.QueryInstancesResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.QueryInstancesResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.QueryInstancesResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.QueryInstancesResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getOrchestrationstateList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.OrchestrationState.serializeBinaryToWriter
    );
  }
  f = message.getContinuationtoken();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
};


/**
 * repeated OrchestrationState orchestrationState = 1;
 * @return {!Array<!proto.OrchestrationState>}
 */
proto.QueryInstancesResponse.prototype.getOrchestrationstateList = function() {
  return /** @type{!Array<!proto.OrchestrationState>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.OrchestrationState, 1));
};


/**
 * @param {!Array<!proto.OrchestrationState>} value
 * @return {!proto.QueryInstancesResponse} returns this
*/
proto.QueryInstancesResponse.prototype.setOrchestrationstateList = function(value) {
  return jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.OrchestrationState=} opt_value
 * @param {number=} opt_index
 * @return {!proto.OrchestrationState}
 */
proto.QueryInstancesResponse.prototype.addOrchestrationstate = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.OrchestrationState, opt_index);
};


/**
 * Clears the list making it empty but non-null.
 * @return {!proto.QueryInstancesResponse} returns this
 */
proto.QueryInstancesResponse.prototype.clearOrchestrationstateList = function() {
  return this.setOrchestrationstateList([]);
};


/**
 * optional google.protobuf.StringValue continuationToken = 2;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.QueryInstancesResponse.prototype.getContinuationtoken = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 2));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.QueryInstancesResponse} returns this
*/
proto.QueryInstancesResponse.prototype.setContinuationtoken = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.QueryInstancesResponse} returns this
 */
proto.QueryInstancesResponse.prototype.clearContinuationtoken = function() {
  return this.setContinuationtoken(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.QueryInstancesResponse.prototype.hasContinuationtoken = function() {
  return jspb.Message.getField(this, 2) != null;
};



/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.ListInstanceIdsRequest.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.ListInstanceIdsRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.ListInstanceIdsRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.ListInstanceIdsRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.ListInstanceIdsRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    runtimestatusList: (f = jspb.Message.getRepeatedField(msg, 1)) == null ? undefined : f,
    completedtimefrom: (f = msg.getCompletedtimefrom()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f),
    completedtimeto: (f = msg.getCompletedtimeto()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f),
    pagesize: jspb.Message.getFieldWithDefault(msg, 4, 0),
    lastinstancekey: (f = msg.getLastinstancekey()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.ListInstanceIdsRequest}
 */
proto.ListInstanceIdsRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.ListInstanceIdsRequest;
  return proto.ListInstanceIdsRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.ListInstanceIdsRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.ListInstanceIdsRequest}
 */
proto.ListInstanceIdsRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var values = /** @type {!Array<!proto.OrchestrationStatus>} */ (reader.isDelimited() ? reader.readPackedEnum() : [reader.readEnum()]);
      for (var i = 0; i < values.length; i++) {
        msg.addRuntimestatus(values[i]);
      }
      break;
    case 2:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setCompletedtimefrom(value);
      break;
    case 3:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setCompletedtimeto(value);
      break;
    case 4:
      var value = /** @type {number} */ (reader.readInt32());
      msg.setPagesize(value);
      break;
    case 5:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setLastinstancekey(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.ListInstanceIdsRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.ListInstanceIdsRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.ListInstanceIdsRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.ListInstanceIdsRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getRuntimestatusList();
  if (f.length > 0) {
    writer.writePackedEnum(
      1,
      f
    );
  }
  f = message.getCompletedtimefrom();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
  f = message.getCompletedtimeto();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
  f = message.getPagesize();
  if (f !== 0) {
    writer.writeInt32(
      4,
      f
    );
  }
  f = message.getLastinstancekey();
  if (f != null) {
    writer.writeMessage(
      5,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
};


/**
 * repeated OrchestrationStatus runtimeStatus = 1;
 * @return {!Array<!proto.OrchestrationStatus>}
 */
proto.ListInstanceIdsRequest.prototype.getRuntimestatusList = function() {
  return /** @type {!Array<!proto.OrchestrationStatus>} */ (jspb.Message.getRepeatedField(this, 1));
};


/**
 * @param {!Array<!proto.OrchestrationStatus>} value
 * @return {!proto.ListInstanceIdsRequest} returns this
 */
proto.ListInstanceIdsRequest.prototype.setRuntimestatusList = function(value) {
  return jspb.Message.setField(this, 1, value || []);
};


/**
 * @param {!proto.OrchestrationStatus} value
 * @param {number=} opt_index
 * @return {!proto.ListInstanceIdsRequest} returns this
 */
proto.ListInstanceIdsRequest.prototype.addRuntimestatus = function(value, opt_index) {
  return jspb.Message.addToRepeatedField(this, 1, value, opt_index);
};


/**
 * Clears the list making it empty but non-null.
 * @return {!proto.ListInstanceIdsRequest} returns this
 */
proto.ListInstanceIdsRequest.prototype.clearRuntimestatusList = function() {
  return this.setRuntimestatusList([]);
};


/**
 * optional google.protobuf.Timestamp completedTimeFrom = 2;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.ListInstanceIdsRequest.prototype.getCompletedtimefrom = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 2));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.ListInstanceIdsRequest} returns this
*/
proto.ListInstanceIdsRequest.prototype.setCompletedtimefrom = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ListInstanceIdsRequest} returns this
 */
proto.ListInstanceIdsRequest.prototype.clearCompletedtimefrom = function() {
  return this.setCompletedtimefrom(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ListInstanceIdsRequest.prototype.hasCompletedtimefrom = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional google.protobuf.Timestamp completedTimeTo = 3;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.ListInstanceIdsRequest.prototype.getCompletedtimeto = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 3));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.ListInstanceIdsRequest} returns this
*/
proto.ListInstanceIdsRequest.prototype.setCompletedtimeto = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ListInstanceIdsRequest} returns this
 */
proto.ListInstanceIdsRequest.prototype.clearCompletedtimeto = function() {
  return this.setCompletedtimeto(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ListInstanceIdsRequest.prototype.hasCompletedtimeto = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional int32 pageSize = 4;
 * @return {number}
 */
proto.ListInstanceIdsRequest.prototype.getPagesize = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 4, 0));
};


/**
 * @param {number} value
 * @return {!proto.ListInstanceIdsRequest} returns this
 */
proto.ListInstanceIdsRequest.prototype.setPagesize = function(value) {
  return jspb.Message.setProto3IntField(this, 4, value);
};


/**
 * optional google.protobuf.StringValue lastInstanceKey = 5;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.ListInstanceIdsRequest.prototype.getLastinstancekey = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 5));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.ListInstanceIdsRequest} returns this
*/
proto.ListInstanceIdsRequest.prototype.setLastinstancekey = function(value) {
  return jspb.Message.setWrapperField(this, 5, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ListInstanceIdsRequest} returns this
 */
proto.ListInstanceIdsRequest.prototype.clearLastinstancekey = function() {
  return this.setLastinstancekey(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ListInstanceIdsRequest.prototype.hasLastinstancekey = function() {
  return jspb.Message.getField(this, 5) != null;
};



/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.ListInstanceIdsResponse.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.ListInstanceIdsResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.ListInstanceIdsResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.ListInstanceIdsResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.ListInstanceIdsResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    instanceidsList: (f = jspb.Message.getRepeatedField(msg, 1)) == null ? undefined : f,
    lastinstancekey: (f = msg.getLastinstancekey()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.ListInstanceIdsResponse}
 */
proto.ListInstanceIdsResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.ListInstanceIdsResponse;
  return proto.ListInstanceIdsResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.ListInstanceIdsResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.ListInstanceIdsResponse}
 */
proto.ListInstanceIdsResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.addInstanceids(value);
      break;
    case 2:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setLastinstancekey(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.ListInstanceIdsResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.ListInstanceIdsResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.ListInstanceIdsResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.ListInstanceIdsResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstanceidsList();
  if (f.length > 0) {
    writer.writeRepeatedString(
      1,
      f
    );
  }
  f = message.getLastinstancekey();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
};


/**
 * repeated string instanceIds = 1;
 * @return {!Array<string>}
 */
proto.ListInstanceIdsResponse.prototype.getInstanceidsList = function() {
  return /** @type {!Array<string>} */ (jspb.Message.getRepeatedField(this, 1));
};


/**
 * @param {!Array<string>} value
 * @return {!proto.ListInstanceIdsResponse} returns this
 */
proto.ListInstanceIdsResponse.prototype.setInstanceidsList = function(value) {
  return jspb.Message.setField(this, 1, value || []);
};


/**
 * @param {string} value
 * @param {number=} opt_index
 * @return {!proto.ListInstanceIdsResponse} returns this
 */
proto.ListInstanceIdsResponse.prototype.addInstanceids = function(value, opt_index) {
  return jspb.Message.addToRepeatedField(this, 1, value, opt_index);
};


/**
 * Clears the list making it empty but non-null.
 * @return {!proto.ListInstanceIdsResponse} returns this
 */
proto.ListInstanceIdsResponse.prototype.clearInstanceidsList = function() {
  return this.setInstanceidsList([]);
};


/**
 * optional google.protobuf.StringValue lastInstanceKey = 2;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.ListInstanceIdsResponse.prototype.getLastinstancekey = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 2));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.ListInstanceIdsResponse} returns this
*/
proto.ListInstanceIdsResponse.prototype.setLastinstancekey = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.ListInstanceIdsResponse} returns this
 */
proto.ListInstanceIdsResponse.prototype.clearLastinstancekey = function() {
  return this.setLastinstancekey(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.ListInstanceIdsResponse.prototype.hasLastinstancekey = function() {
  return jspb.Message.getField(this, 2) != null;
};



/**
 * Oneof group definitions for this message. Each group defines the field
 * numbers belonging to that group. When of these fields' value is set, all
 * other fields in the group are cleared. During deserialization, if multiple
 * fields are encountered for a group, only the last value seen will be kept.
 * @private {!Array<!Array<number>>}
 * @const
 */
proto.PurgeInstancesRequest.oneofGroups_ = [[1,2,4]];

/**
 * @enum {number}
 */
proto.PurgeInstancesRequest.RequestCase = {
  REQUEST_NOT_SET: 0,
  INSTANCEID: 1,
  PURGEINSTANCEFILTER: 2,
  INSTANCEBATCH: 4
};

/**
 * @return {proto.PurgeInstancesRequest.RequestCase}
 */
proto.PurgeInstancesRequest.prototype.getRequestCase = function() {
  return /** @type {proto.PurgeInstancesRequest.RequestCase} */(jspb.Message.computeOneofCase(this, proto.PurgeInstancesRequest.oneofGroups_[0]));
};



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.PurgeInstancesRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.PurgeInstancesRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.PurgeInstancesRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.PurgeInstancesRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    instanceid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    purgeinstancefilter: (f = msg.getPurgeinstancefilter()) && proto.PurgeInstanceFilter.toObject(includeInstance, f),
    instancebatch: (f = msg.getInstancebatch()) && proto.InstanceBatch.toObject(includeInstance, f),
    recursive: jspb.Message.getBooleanFieldWithDefault(msg, 3, false),
    isorchestration: jspb.Message.getBooleanFieldWithDefault(msg, 5, false)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.PurgeInstancesRequest}
 */
proto.PurgeInstancesRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.PurgeInstancesRequest;
  return proto.PurgeInstancesRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.PurgeInstancesRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.PurgeInstancesRequest}
 */
proto.PurgeInstancesRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setInstanceid(value);
      break;
    case 2:
      var value = new proto.PurgeInstanceFilter;
      reader.readMessage(value,proto.PurgeInstanceFilter.deserializeBinaryFromReader);
      msg.setPurgeinstancefilter(value);
      break;
    case 4:
      var value = new proto.InstanceBatch;
      reader.readMessage(value,proto.InstanceBatch.deserializeBinaryFromReader);
      msg.setInstancebatch(value);
      break;
    case 3:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setRecursive(value);
      break;
    case 5:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setIsorchestration(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.PurgeInstancesRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.PurgeInstancesRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.PurgeInstancesRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.PurgeInstancesRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = /** @type {string} */ (jspb.Message.getField(message, 1));
  if (f != null) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getPurgeinstancefilter();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      proto.PurgeInstanceFilter.serializeBinaryToWriter
    );
  }
  f = message.getInstancebatch();
  if (f != null) {
    writer.writeMessage(
      4,
      f,
      proto.InstanceBatch.serializeBinaryToWriter
    );
  }
  f = message.getRecursive();
  if (f) {
    writer.writeBool(
      3,
      f
    );
  }
  f = message.getIsorchestration();
  if (f) {
    writer.writeBool(
      5,
      f
    );
  }
};


/**
 * optional string instanceId = 1;
 * @return {string}
 */
proto.PurgeInstancesRequest.prototype.getInstanceid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.PurgeInstancesRequest} returns this
 */
proto.PurgeInstancesRequest.prototype.setInstanceid = function(value) {
  return jspb.Message.setOneofField(this, 1, proto.PurgeInstancesRequest.oneofGroups_[0], value);
};


/**
 * Clears the field making it undefined.
 * @return {!proto.PurgeInstancesRequest} returns this
 */
proto.PurgeInstancesRequest.prototype.clearInstanceid = function() {
  return jspb.Message.setOneofField(this, 1, proto.PurgeInstancesRequest.oneofGroups_[0], undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.PurgeInstancesRequest.prototype.hasInstanceid = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * optional PurgeInstanceFilter purgeInstanceFilter = 2;
 * @return {?proto.PurgeInstanceFilter}
 */
proto.PurgeInstancesRequest.prototype.getPurgeinstancefilter = function() {
  return /** @type{?proto.PurgeInstanceFilter} */ (
    jspb.Message.getWrapperField(this, proto.PurgeInstanceFilter, 2));
};


/**
 * @param {?proto.PurgeInstanceFilter|undefined} value
 * @return {!proto.PurgeInstancesRequest} returns this
*/
proto.PurgeInstancesRequest.prototype.setPurgeinstancefilter = function(value) {
  return jspb.Message.setOneofWrapperField(this, 2, proto.PurgeInstancesRequest.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.PurgeInstancesRequest} returns this
 */
proto.PurgeInstancesRequest.prototype.clearPurgeinstancefilter = function() {
  return this.setPurgeinstancefilter(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.PurgeInstancesRequest.prototype.hasPurgeinstancefilter = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional InstanceBatch instanceBatch = 4;
 * @return {?proto.InstanceBatch}
 */
proto.PurgeInstancesRequest.prototype.getInstancebatch = function() {
  return /** @type{?proto.InstanceBatch} */ (
    jspb.Message.getWrapperField(this, proto.InstanceBatch, 4));
};


/**
 * @param {?proto.InstanceBatch|undefined} value
 * @return {!proto.PurgeInstancesRequest} returns this
*/
proto.PurgeInstancesRequest.prototype.setInstancebatch = function(value) {
  return jspb.Message.setOneofWrapperField(this, 4, proto.PurgeInstancesRequest.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.PurgeInstancesRequest} returns this
 */
proto.PurgeInstancesRequest.prototype.clearInstancebatch = function() {
  return this.setInstancebatch(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.PurgeInstancesRequest.prototype.hasInstancebatch = function() {
  return jspb.Message.getField(this, 4) != null;
};


/**
 * optional bool recursive = 3;
 * @return {boolean}
 */
proto.PurgeInstancesRequest.prototype.getRecursive = function() {
  return /** @type {boolean} */ (jspb.Message.getBooleanFieldWithDefault(this, 3, false));
};


/**
 * @param {boolean} value
 * @return {!proto.PurgeInstancesRequest} returns this
 */
proto.PurgeInstancesRequest.prototype.setRecursive = function(value) {
  return jspb.Message.setProto3BooleanField(this, 3, value);
};


/**
 * optional bool isOrchestration = 5;
 * @return {boolean}
 */
proto.PurgeInstancesRequest.prototype.getIsorchestration = function() {
  return /** @type {boolean} */ (jspb.Message.getBooleanFieldWithDefault(this, 5, false));
};


/**
 * @param {boolean} value
 * @return {!proto.PurgeInstancesRequest} returns this
 */
proto.PurgeInstancesRequest.prototype.setIsorchestration = function(value) {
  return jspb.Message.setProto3BooleanField(this, 5, value);
};



/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.PurgeInstanceFilter.repeatedFields_ = [3];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.PurgeInstanceFilter.prototype.toObject = function(opt_includeInstance) {
  return proto.PurgeInstanceFilter.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.PurgeInstanceFilter} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.PurgeInstanceFilter.toObject = function(includeInstance, msg) {
  var f, obj = {
    createdtimefrom: (f = msg.getCreatedtimefrom()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f),
    createdtimeto: (f = msg.getCreatedtimeto()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f),
    runtimestatusList: (f = jspb.Message.getRepeatedField(msg, 3)) == null ? undefined : f
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.PurgeInstanceFilter}
 */
proto.PurgeInstanceFilter.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.PurgeInstanceFilter;
  return proto.PurgeInstanceFilter.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.PurgeInstanceFilter} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.PurgeInstanceFilter}
 */
proto.PurgeInstanceFilter.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setCreatedtimefrom(value);
      break;
    case 2:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setCreatedtimeto(value);
      break;
    case 3:
      var values = /** @type {!Array<!proto.OrchestrationStatus>} */ (reader.isDelimited() ? reader.readPackedEnum() : [reader.readEnum()]);
      for (var i = 0; i < values.length; i++) {
        msg.addRuntimestatus(values[i]);
      }
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.PurgeInstanceFilter.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.PurgeInstanceFilter.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.PurgeInstanceFilter} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.PurgeInstanceFilter.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getCreatedtimefrom();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
  f = message.getCreatedtimeto();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
  f = message.getRuntimestatusList();
  if (f.length > 0) {
    writer.writePackedEnum(
      3,
      f
    );
  }
};


/**
 * optional google.protobuf.Timestamp createdTimeFrom = 1;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.PurgeInstanceFilter.prototype.getCreatedtimefrom = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 1));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.PurgeInstanceFilter} returns this
*/
proto.PurgeInstanceFilter.prototype.setCreatedtimefrom = function(value) {
  return jspb.Message.setWrapperField(this, 1, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.PurgeInstanceFilter} returns this
 */
proto.PurgeInstanceFilter.prototype.clearCreatedtimefrom = function() {
  return this.setCreatedtimefrom(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.PurgeInstanceFilter.prototype.hasCreatedtimefrom = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * optional google.protobuf.Timestamp createdTimeTo = 2;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.PurgeInstanceFilter.prototype.getCreatedtimeto = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 2));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.PurgeInstanceFilter} returns this
*/
proto.PurgeInstanceFilter.prototype.setCreatedtimeto = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.PurgeInstanceFilter} returns this
 */
proto.PurgeInstanceFilter.prototype.clearCreatedtimeto = function() {
  return this.setCreatedtimeto(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.PurgeInstanceFilter.prototype.hasCreatedtimeto = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * repeated OrchestrationStatus runtimeStatus = 3;
 * @return {!Array<!proto.OrchestrationStatus>}
 */
proto.PurgeInstanceFilter.prototype.getRuntimestatusList = function() {
  return /** @type {!Array<!proto.OrchestrationStatus>} */ (jspb.Message.getRepeatedField(this, 3));
};


/**
 * @param {!Array<!proto.OrchestrationStatus>} value
 * @return {!proto.PurgeInstanceFilter} returns this
 */
proto.PurgeInstanceFilter.prototype.setRuntimestatusList = function(value) {
  return jspb.Message.setField(this, 3, value || []);
};


/**
 * @param {!proto.OrchestrationStatus} value
 * @param {number=} opt_index
 * @return {!proto.PurgeInstanceFilter} returns this
 */
proto.PurgeInstanceFilter.prototype.addRuntimestatus = function(value, opt_index) {
  return jspb.Message.addToRepeatedField(this, 3, value, opt_index);
};


/**
 * Clears the list making it empty but non-null.
 * @return {!proto.PurgeInstanceFilter} returns this
 */
proto.PurgeInstanceFilter.prototype.clearRuntimestatusList = function() {
  return this.setRuntimestatusList([]);
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.PurgeInstancesResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.PurgeInstancesResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.PurgeInstancesResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.PurgeInstancesResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    deletedinstancecount: jspb.Message.getFieldWithDefault(msg, 1, 0),
    iscomplete: (f = msg.getIscomplete()) && google_protobuf_wrappers_pb.BoolValue.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.PurgeInstancesResponse}
 */
proto.PurgeInstancesResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.PurgeInstancesResponse;
  return proto.PurgeInstancesResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.PurgeInstancesResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.PurgeInstancesResponse}
 */
proto.PurgeInstancesResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readInt32());
      msg.setDeletedinstancecount(value);
      break;
    case 2:
      var value = new google_protobuf_wrappers_pb.BoolValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.BoolValue.deserializeBinaryFromReader);
      msg.setIscomplete(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.PurgeInstancesResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.PurgeInstancesResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.PurgeInstancesResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.PurgeInstancesResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getDeletedinstancecount();
  if (f !== 0) {
    writer.writeInt32(
      1,
      f
    );
  }
  f = message.getIscomplete();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_wrappers_pb.BoolValue.serializeBinaryToWriter
    );
  }
};


/**
 * optional int32 deletedInstanceCount = 1;
 * @return {number}
 */
proto.PurgeInstancesResponse.prototype.getDeletedinstancecount = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/**
 * @param {number} value
 * @return {!proto.PurgeInstancesResponse} returns this
 */
proto.PurgeInstancesResponse.prototype.setDeletedinstancecount = function(value) {
  return jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional google.protobuf.BoolValue isComplete = 2;
 * @return {?proto.google.protobuf.BoolValue}
 */
proto.PurgeInstancesResponse.prototype.getIscomplete = function() {
  return /** @type{?proto.google.protobuf.BoolValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.BoolValue, 2));
};


/**
 * @param {?proto.google.protobuf.BoolValue|undefined} value
 * @return {!proto.PurgeInstancesResponse} returns this
*/
proto.PurgeInstancesResponse.prototype.setIscomplete = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.PurgeInstancesResponse} returns this
 */
proto.PurgeInstancesResponse.prototype.clearIscomplete = function() {
  return this.setIscomplete(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.PurgeInstancesResponse.prototype.hasIscomplete = function() {
  return jspb.Message.getField(this, 2) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.RestartInstanceRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.RestartInstanceRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.RestartInstanceRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.RestartInstanceRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    instanceid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    restartwithnewinstanceid: jspb.Message.getBooleanFieldWithDefault(msg, 2, false)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.RestartInstanceRequest}
 */
proto.RestartInstanceRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.RestartInstanceRequest;
  return proto.RestartInstanceRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.RestartInstanceRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.RestartInstanceRequest}
 */
proto.RestartInstanceRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setInstanceid(value);
      break;
    case 2:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setRestartwithnewinstanceid(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.RestartInstanceRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.RestartInstanceRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.RestartInstanceRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.RestartInstanceRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstanceid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getRestartwithnewinstanceid();
  if (f) {
    writer.writeBool(
      2,
      f
    );
  }
};


/**
 * optional string instanceId = 1;
 * @return {string}
 */
proto.RestartInstanceRequest.prototype.getInstanceid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.RestartInstanceRequest} returns this
 */
proto.RestartInstanceRequest.prototype.setInstanceid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional bool restartWithNewInstanceId = 2;
 * @return {boolean}
 */
proto.RestartInstanceRequest.prototype.getRestartwithnewinstanceid = function() {
  return /** @type {boolean} */ (jspb.Message.getBooleanFieldWithDefault(this, 2, false));
};


/**
 * @param {boolean} value
 * @return {!proto.RestartInstanceRequest} returns this
 */
proto.RestartInstanceRequest.prototype.setRestartwithnewinstanceid = function(value) {
  return jspb.Message.setProto3BooleanField(this, 2, value);
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.RestartInstanceResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.RestartInstanceResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.RestartInstanceResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.RestartInstanceResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    instanceid: jspb.Message.getFieldWithDefault(msg, 1, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.RestartInstanceResponse}
 */
proto.RestartInstanceResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.RestartInstanceResponse;
  return proto.RestartInstanceResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.RestartInstanceResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.RestartInstanceResponse}
 */
proto.RestartInstanceResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setInstanceid(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.RestartInstanceResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.RestartInstanceResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.RestartInstanceResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.RestartInstanceResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstanceid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
};


/**
 * optional string instanceId = 1;
 * @return {string}
 */
proto.RestartInstanceResponse.prototype.getInstanceid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.RestartInstanceResponse} returns this
 */
proto.RestartInstanceResponse.prototype.setInstanceid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.CreateTaskHubRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.CreateTaskHubRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.CreateTaskHubRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.CreateTaskHubRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    recreateifexists: jspb.Message.getBooleanFieldWithDefault(msg, 1, false)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.CreateTaskHubRequest}
 */
proto.CreateTaskHubRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.CreateTaskHubRequest;
  return proto.CreateTaskHubRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.CreateTaskHubRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.CreateTaskHubRequest}
 */
proto.CreateTaskHubRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setRecreateifexists(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.CreateTaskHubRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.CreateTaskHubRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.CreateTaskHubRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.CreateTaskHubRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getRecreateifexists();
  if (f) {
    writer.writeBool(
      1,
      f
    );
  }
};


/**
 * optional bool recreateIfExists = 1;
 * @return {boolean}
 */
proto.CreateTaskHubRequest.prototype.getRecreateifexists = function() {
  return /** @type {boolean} */ (jspb.Message.getBooleanFieldWithDefault(this, 1, false));
};


/**
 * @param {boolean} value
 * @return {!proto.CreateTaskHubRequest} returns this
 */
proto.CreateTaskHubRequest.prototype.setRecreateifexists = function(value) {
  return jspb.Message.setProto3BooleanField(this, 1, value);
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.CreateTaskHubResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.CreateTaskHubResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.CreateTaskHubResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.CreateTaskHubResponse.toObject = function(includeInstance, msg) {
  var f, obj = {

  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.CreateTaskHubResponse}
 */
proto.CreateTaskHubResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.CreateTaskHubResponse;
  return proto.CreateTaskHubResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.CreateTaskHubResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.CreateTaskHubResponse}
 */
proto.CreateTaskHubResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.CreateTaskHubResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.CreateTaskHubResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.CreateTaskHubResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.CreateTaskHubResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.DeleteTaskHubRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.DeleteTaskHubRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.DeleteTaskHubRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.DeleteTaskHubRequest.toObject = function(includeInstance, msg) {
  var f, obj = {

  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.DeleteTaskHubRequest}
 */
proto.DeleteTaskHubRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.DeleteTaskHubRequest;
  return proto.DeleteTaskHubRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.DeleteTaskHubRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.DeleteTaskHubRequest}
 */
proto.DeleteTaskHubRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.DeleteTaskHubRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.DeleteTaskHubRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.DeleteTaskHubRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.DeleteTaskHubRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.DeleteTaskHubResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.DeleteTaskHubResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.DeleteTaskHubResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.DeleteTaskHubResponse.toObject = function(includeInstance, msg) {
  var f, obj = {

  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.DeleteTaskHubResponse}
 */
proto.DeleteTaskHubResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.DeleteTaskHubResponse;
  return proto.DeleteTaskHubResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.DeleteTaskHubResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.DeleteTaskHubResponse}
 */
proto.DeleteTaskHubResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.DeleteTaskHubResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.DeleteTaskHubResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.DeleteTaskHubResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.DeleteTaskHubResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.SignalEntityRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.SignalEntityRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.SignalEntityRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.SignalEntityRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    instanceid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    name: jspb.Message.getFieldWithDefault(msg, 2, ""),
    input: (f = msg.getInput()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    requestid: jspb.Message.getFieldWithDefault(msg, 4, ""),
    scheduledtime: (f = msg.getScheduledtime()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f),
    parenttracecontext: (f = msg.getParenttracecontext()) && proto.TraceContext.toObject(includeInstance, f),
    requesttime: (f = msg.getRequesttime()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.SignalEntityRequest}
 */
proto.SignalEntityRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.SignalEntityRequest;
  return proto.SignalEntityRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.SignalEntityRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.SignalEntityRequest}
 */
proto.SignalEntityRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setInstanceid(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setName(value);
      break;
    case 3:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setInput(value);
      break;
    case 4:
      var value = /** @type {string} */ (reader.readString());
      msg.setRequestid(value);
      break;
    case 5:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setScheduledtime(value);
      break;
    case 6:
      var value = new proto.TraceContext;
      reader.readMessage(value,proto.TraceContext.deserializeBinaryFromReader);
      msg.setParenttracecontext(value);
      break;
    case 7:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setRequesttime(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.SignalEntityRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.SignalEntityRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.SignalEntityRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.SignalEntityRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstanceid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getName();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getInput();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getRequestid();
  if (f.length > 0) {
    writer.writeString(
      4,
      f
    );
  }
  f = message.getScheduledtime();
  if (f != null) {
    writer.writeMessage(
      5,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
  f = message.getParenttracecontext();
  if (f != null) {
    writer.writeMessage(
      6,
      f,
      proto.TraceContext.serializeBinaryToWriter
    );
  }
  f = message.getRequesttime();
  if (f != null) {
    writer.writeMessage(
      7,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
};


/**
 * optional string instanceId = 1;
 * @return {string}
 */
proto.SignalEntityRequest.prototype.getInstanceid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.SignalEntityRequest} returns this
 */
proto.SignalEntityRequest.prototype.setInstanceid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string name = 2;
 * @return {string}
 */
proto.SignalEntityRequest.prototype.getName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/**
 * @param {string} value
 * @return {!proto.SignalEntityRequest} returns this
 */
proto.SignalEntityRequest.prototype.setName = function(value) {
  return jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional google.protobuf.StringValue input = 3;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.SignalEntityRequest.prototype.getInput = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 3));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.SignalEntityRequest} returns this
*/
proto.SignalEntityRequest.prototype.setInput = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.SignalEntityRequest} returns this
 */
proto.SignalEntityRequest.prototype.clearInput = function() {
  return this.setInput(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.SignalEntityRequest.prototype.hasInput = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional string requestId = 4;
 * @return {string}
 */
proto.SignalEntityRequest.prototype.getRequestid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 4, ""));
};


/**
 * @param {string} value
 * @return {!proto.SignalEntityRequest} returns this
 */
proto.SignalEntityRequest.prototype.setRequestid = function(value) {
  return jspb.Message.setProto3StringField(this, 4, value);
};


/**
 * optional google.protobuf.Timestamp scheduledTime = 5;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.SignalEntityRequest.prototype.getScheduledtime = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 5));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.SignalEntityRequest} returns this
*/
proto.SignalEntityRequest.prototype.setScheduledtime = function(value) {
  return jspb.Message.setWrapperField(this, 5, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.SignalEntityRequest} returns this
 */
proto.SignalEntityRequest.prototype.clearScheduledtime = function() {
  return this.setScheduledtime(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.SignalEntityRequest.prototype.hasScheduledtime = function() {
  return jspb.Message.getField(this, 5) != null;
};


/**
 * optional TraceContext parentTraceContext = 6;
 * @return {?proto.TraceContext}
 */
proto.SignalEntityRequest.prototype.getParenttracecontext = function() {
  return /** @type{?proto.TraceContext} */ (
    jspb.Message.getWrapperField(this, proto.TraceContext, 6));
};


/**
 * @param {?proto.TraceContext|undefined} value
 * @return {!proto.SignalEntityRequest} returns this
*/
proto.SignalEntityRequest.prototype.setParenttracecontext = function(value) {
  return jspb.Message.setWrapperField(this, 6, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.SignalEntityRequest} returns this
 */
proto.SignalEntityRequest.prototype.clearParenttracecontext = function() {
  return this.setParenttracecontext(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.SignalEntityRequest.prototype.hasParenttracecontext = function() {
  return jspb.Message.getField(this, 6) != null;
};


/**
 * optional google.protobuf.Timestamp requestTime = 7;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.SignalEntityRequest.prototype.getRequesttime = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 7));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.SignalEntityRequest} returns this
*/
proto.SignalEntityRequest.prototype.setRequesttime = function(value) {
  return jspb.Message.setWrapperField(this, 7, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.SignalEntityRequest} returns this
 */
proto.SignalEntityRequest.prototype.clearRequesttime = function() {
  return this.setRequesttime(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.SignalEntityRequest.prototype.hasRequesttime = function() {
  return jspb.Message.getField(this, 7) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.SignalEntityResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.SignalEntityResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.SignalEntityResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.SignalEntityResponse.toObject = function(includeInstance, msg) {
  var f, obj = {

  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.SignalEntityResponse}
 */
proto.SignalEntityResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.SignalEntityResponse;
  return proto.SignalEntityResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.SignalEntityResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.SignalEntityResponse}
 */
proto.SignalEntityResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.SignalEntityResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.SignalEntityResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.SignalEntityResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.SignalEntityResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.GetEntityRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.GetEntityRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.GetEntityRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.GetEntityRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    instanceid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    includestate: jspb.Message.getBooleanFieldWithDefault(msg, 2, false)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.GetEntityRequest}
 */
proto.GetEntityRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.GetEntityRequest;
  return proto.GetEntityRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.GetEntityRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.GetEntityRequest}
 */
proto.GetEntityRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setInstanceid(value);
      break;
    case 2:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setIncludestate(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.GetEntityRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.GetEntityRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.GetEntityRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.GetEntityRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstanceid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getIncludestate();
  if (f) {
    writer.writeBool(
      2,
      f
    );
  }
};


/**
 * optional string instanceId = 1;
 * @return {string}
 */
proto.GetEntityRequest.prototype.getInstanceid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.GetEntityRequest} returns this
 */
proto.GetEntityRequest.prototype.setInstanceid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional bool includeState = 2;
 * @return {boolean}
 */
proto.GetEntityRequest.prototype.getIncludestate = function() {
  return /** @type {boolean} */ (jspb.Message.getBooleanFieldWithDefault(this, 2, false));
};


/**
 * @param {boolean} value
 * @return {!proto.GetEntityRequest} returns this
 */
proto.GetEntityRequest.prototype.setIncludestate = function(value) {
  return jspb.Message.setProto3BooleanField(this, 2, value);
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.GetEntityResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.GetEntityResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.GetEntityResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.GetEntityResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    exists: jspb.Message.getBooleanFieldWithDefault(msg, 1, false),
    entity: (f = msg.getEntity()) && proto.EntityMetadata.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.GetEntityResponse}
 */
proto.GetEntityResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.GetEntityResponse;
  return proto.GetEntityResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.GetEntityResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.GetEntityResponse}
 */
proto.GetEntityResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setExists(value);
      break;
    case 2:
      var value = new proto.EntityMetadata;
      reader.readMessage(value,proto.EntityMetadata.deserializeBinaryFromReader);
      msg.setEntity(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.GetEntityResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.GetEntityResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.GetEntityResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.GetEntityResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getExists();
  if (f) {
    writer.writeBool(
      1,
      f
    );
  }
  f = message.getEntity();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      proto.EntityMetadata.serializeBinaryToWriter
    );
  }
};


/**
 * optional bool exists = 1;
 * @return {boolean}
 */
proto.GetEntityResponse.prototype.getExists = function() {
  return /** @type {boolean} */ (jspb.Message.getBooleanFieldWithDefault(this, 1, false));
};


/**
 * @param {boolean} value
 * @return {!proto.GetEntityResponse} returns this
 */
proto.GetEntityResponse.prototype.setExists = function(value) {
  return jspb.Message.setProto3BooleanField(this, 1, value);
};


/**
 * optional EntityMetadata entity = 2;
 * @return {?proto.EntityMetadata}
 */
proto.GetEntityResponse.prototype.getEntity = function() {
  return /** @type{?proto.EntityMetadata} */ (
    jspb.Message.getWrapperField(this, proto.EntityMetadata, 2));
};


/**
 * @param {?proto.EntityMetadata|undefined} value
 * @return {!proto.GetEntityResponse} returns this
*/
proto.GetEntityResponse.prototype.setEntity = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.GetEntityResponse} returns this
 */
proto.GetEntityResponse.prototype.clearEntity = function() {
  return this.setEntity(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.GetEntityResponse.prototype.hasEntity = function() {
  return jspb.Message.getField(this, 2) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.EntityQuery.prototype.toObject = function(opt_includeInstance) {
  return proto.EntityQuery.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.EntityQuery} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.EntityQuery.toObject = function(includeInstance, msg) {
  var f, obj = {
    instanceidstartswith: (f = msg.getInstanceidstartswith()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    lastmodifiedfrom: (f = msg.getLastmodifiedfrom()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f),
    lastmodifiedto: (f = msg.getLastmodifiedto()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f),
    includestate: jspb.Message.getBooleanFieldWithDefault(msg, 4, false),
    includetransient: jspb.Message.getBooleanFieldWithDefault(msg, 5, false),
    pagesize: (f = msg.getPagesize()) && google_protobuf_wrappers_pb.Int32Value.toObject(includeInstance, f),
    continuationtoken: (f = msg.getContinuationtoken()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.EntityQuery}
 */
proto.EntityQuery.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.EntityQuery;
  return proto.EntityQuery.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.EntityQuery} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.EntityQuery}
 */
proto.EntityQuery.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setInstanceidstartswith(value);
      break;
    case 2:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setLastmodifiedfrom(value);
      break;
    case 3:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setLastmodifiedto(value);
      break;
    case 4:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setIncludestate(value);
      break;
    case 5:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setIncludetransient(value);
      break;
    case 6:
      var value = new google_protobuf_wrappers_pb.Int32Value;
      reader.readMessage(value,google_protobuf_wrappers_pb.Int32Value.deserializeBinaryFromReader);
      msg.setPagesize(value);
      break;
    case 7:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setContinuationtoken(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.EntityQuery.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.EntityQuery.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.EntityQuery} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.EntityQuery.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstanceidstartswith();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getLastmodifiedfrom();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
  f = message.getLastmodifiedto();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
  f = message.getIncludestate();
  if (f) {
    writer.writeBool(
      4,
      f
    );
  }
  f = message.getIncludetransient();
  if (f) {
    writer.writeBool(
      5,
      f
    );
  }
  f = message.getPagesize();
  if (f != null) {
    writer.writeMessage(
      6,
      f,
      google_protobuf_wrappers_pb.Int32Value.serializeBinaryToWriter
    );
  }
  f = message.getContinuationtoken();
  if (f != null) {
    writer.writeMessage(
      7,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
};


/**
 * optional google.protobuf.StringValue instanceIdStartsWith = 1;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.EntityQuery.prototype.getInstanceidstartswith = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 1));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.EntityQuery} returns this
*/
proto.EntityQuery.prototype.setInstanceidstartswith = function(value) {
  return jspb.Message.setWrapperField(this, 1, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.EntityQuery} returns this
 */
proto.EntityQuery.prototype.clearInstanceidstartswith = function() {
  return this.setInstanceidstartswith(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.EntityQuery.prototype.hasInstanceidstartswith = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * optional google.protobuf.Timestamp lastModifiedFrom = 2;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.EntityQuery.prototype.getLastmodifiedfrom = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 2));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.EntityQuery} returns this
*/
proto.EntityQuery.prototype.setLastmodifiedfrom = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.EntityQuery} returns this
 */
proto.EntityQuery.prototype.clearLastmodifiedfrom = function() {
  return this.setLastmodifiedfrom(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.EntityQuery.prototype.hasLastmodifiedfrom = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional google.protobuf.Timestamp lastModifiedTo = 3;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.EntityQuery.prototype.getLastmodifiedto = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 3));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.EntityQuery} returns this
*/
proto.EntityQuery.prototype.setLastmodifiedto = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.EntityQuery} returns this
 */
proto.EntityQuery.prototype.clearLastmodifiedto = function() {
  return this.setLastmodifiedto(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.EntityQuery.prototype.hasLastmodifiedto = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional bool includeState = 4;
 * @return {boolean}
 */
proto.EntityQuery.prototype.getIncludestate = function() {
  return /** @type {boolean} */ (jspb.Message.getBooleanFieldWithDefault(this, 4, false));
};


/**
 * @param {boolean} value
 * @return {!proto.EntityQuery} returns this
 */
proto.EntityQuery.prototype.setIncludestate = function(value) {
  return jspb.Message.setProto3BooleanField(this, 4, value);
};


/**
 * optional bool includeTransient = 5;
 * @return {boolean}
 */
proto.EntityQuery.prototype.getIncludetransient = function() {
  return /** @type {boolean} */ (jspb.Message.getBooleanFieldWithDefault(this, 5, false));
};


/**
 * @param {boolean} value
 * @return {!proto.EntityQuery} returns this
 */
proto.EntityQuery.prototype.setIncludetransient = function(value) {
  return jspb.Message.setProto3BooleanField(this, 5, value);
};


/**
 * optional google.protobuf.Int32Value pageSize = 6;
 * @return {?proto.google.protobuf.Int32Value}
 */
proto.EntityQuery.prototype.getPagesize = function() {
  return /** @type{?proto.google.protobuf.Int32Value} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.Int32Value, 6));
};


/**
 * @param {?proto.google.protobuf.Int32Value|undefined} value
 * @return {!proto.EntityQuery} returns this
*/
proto.EntityQuery.prototype.setPagesize = function(value) {
  return jspb.Message.setWrapperField(this, 6, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.EntityQuery} returns this
 */
proto.EntityQuery.prototype.clearPagesize = function() {
  return this.setPagesize(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.EntityQuery.prototype.hasPagesize = function() {
  return jspb.Message.getField(this, 6) != null;
};


/**
 * optional google.protobuf.StringValue continuationToken = 7;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.EntityQuery.prototype.getContinuationtoken = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 7));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.EntityQuery} returns this
*/
proto.EntityQuery.prototype.setContinuationtoken = function(value) {
  return jspb.Message.setWrapperField(this, 7, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.EntityQuery} returns this
 */
proto.EntityQuery.prototype.clearContinuationtoken = function() {
  return this.setContinuationtoken(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.EntityQuery.prototype.hasContinuationtoken = function() {
  return jspb.Message.getField(this, 7) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.QueryEntitiesRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.QueryEntitiesRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.QueryEntitiesRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.QueryEntitiesRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    query: (f = msg.getQuery()) && proto.EntityQuery.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.QueryEntitiesRequest}
 */
proto.QueryEntitiesRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.QueryEntitiesRequest;
  return proto.QueryEntitiesRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.QueryEntitiesRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.QueryEntitiesRequest}
 */
proto.QueryEntitiesRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.EntityQuery;
      reader.readMessage(value,proto.EntityQuery.deserializeBinaryFromReader);
      msg.setQuery(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.QueryEntitiesRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.QueryEntitiesRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.QueryEntitiesRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.QueryEntitiesRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getQuery();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      proto.EntityQuery.serializeBinaryToWriter
    );
  }
};


/**
 * optional EntityQuery query = 1;
 * @return {?proto.EntityQuery}
 */
proto.QueryEntitiesRequest.prototype.getQuery = function() {
  return /** @type{?proto.EntityQuery} */ (
    jspb.Message.getWrapperField(this, proto.EntityQuery, 1));
};


/**
 * @param {?proto.EntityQuery|undefined} value
 * @return {!proto.QueryEntitiesRequest} returns this
*/
proto.QueryEntitiesRequest.prototype.setQuery = function(value) {
  return jspb.Message.setWrapperField(this, 1, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.QueryEntitiesRequest} returns this
 */
proto.QueryEntitiesRequest.prototype.clearQuery = function() {
  return this.setQuery(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.QueryEntitiesRequest.prototype.hasQuery = function() {
  return jspb.Message.getField(this, 1) != null;
};



/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.QueryEntitiesResponse.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.QueryEntitiesResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.QueryEntitiesResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.QueryEntitiesResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.QueryEntitiesResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    entitiesList: jspb.Message.toObjectList(msg.getEntitiesList(),
    proto.EntityMetadata.toObject, includeInstance),
    continuationtoken: (f = msg.getContinuationtoken()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.QueryEntitiesResponse}
 */
proto.QueryEntitiesResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.QueryEntitiesResponse;
  return proto.QueryEntitiesResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.QueryEntitiesResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.QueryEntitiesResponse}
 */
proto.QueryEntitiesResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.EntityMetadata;
      reader.readMessage(value,proto.EntityMetadata.deserializeBinaryFromReader);
      msg.addEntities(value);
      break;
    case 2:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setContinuationtoken(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.QueryEntitiesResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.QueryEntitiesResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.QueryEntitiesResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.QueryEntitiesResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getEntitiesList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.EntityMetadata.serializeBinaryToWriter
    );
  }
  f = message.getContinuationtoken();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
};


/**
 * repeated EntityMetadata entities = 1;
 * @return {!Array<!proto.EntityMetadata>}
 */
proto.QueryEntitiesResponse.prototype.getEntitiesList = function() {
  return /** @type{!Array<!proto.EntityMetadata>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.EntityMetadata, 1));
};


/**
 * @param {!Array<!proto.EntityMetadata>} value
 * @return {!proto.QueryEntitiesResponse} returns this
*/
proto.QueryEntitiesResponse.prototype.setEntitiesList = function(value) {
  return jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.EntityMetadata=} opt_value
 * @param {number=} opt_index
 * @return {!proto.EntityMetadata}
 */
proto.QueryEntitiesResponse.prototype.addEntities = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.EntityMetadata, opt_index);
};


/**
 * Clears the list making it empty but non-null.
 * @return {!proto.QueryEntitiesResponse} returns this
 */
proto.QueryEntitiesResponse.prototype.clearEntitiesList = function() {
  return this.setEntitiesList([]);
};


/**
 * optional google.protobuf.StringValue continuationToken = 2;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.QueryEntitiesResponse.prototype.getContinuationtoken = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 2));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.QueryEntitiesResponse} returns this
*/
proto.QueryEntitiesResponse.prototype.setContinuationtoken = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.QueryEntitiesResponse} returns this
 */
proto.QueryEntitiesResponse.prototype.clearContinuationtoken = function() {
  return this.setContinuationtoken(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.QueryEntitiesResponse.prototype.hasContinuationtoken = function() {
  return jspb.Message.getField(this, 2) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.EntityMetadata.prototype.toObject = function(opt_includeInstance) {
  return proto.EntityMetadata.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.EntityMetadata} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.EntityMetadata.toObject = function(includeInstance, msg) {
  var f, obj = {
    instanceid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    lastmodifiedtime: (f = msg.getLastmodifiedtime()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f),
    backlogqueuesize: jspb.Message.getFieldWithDefault(msg, 3, 0),
    lockedby: (f = msg.getLockedby()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    serializedstate: (f = msg.getSerializedstate()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.EntityMetadata}
 */
proto.EntityMetadata.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.EntityMetadata;
  return proto.EntityMetadata.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.EntityMetadata} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.EntityMetadata}
 */
proto.EntityMetadata.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setInstanceid(value);
      break;
    case 2:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setLastmodifiedtime(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readInt32());
      msg.setBacklogqueuesize(value);
      break;
    case 4:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setLockedby(value);
      break;
    case 5:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setSerializedstate(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.EntityMetadata.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.EntityMetadata.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.EntityMetadata} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.EntityMetadata.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstanceid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getLastmodifiedtime();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
  f = message.getBacklogqueuesize();
  if (f !== 0) {
    writer.writeInt32(
      3,
      f
    );
  }
  f = message.getLockedby();
  if (f != null) {
    writer.writeMessage(
      4,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getSerializedstate();
  if (f != null) {
    writer.writeMessage(
      5,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
};


/**
 * optional string instanceId = 1;
 * @return {string}
 */
proto.EntityMetadata.prototype.getInstanceid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.EntityMetadata} returns this
 */
proto.EntityMetadata.prototype.setInstanceid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional google.protobuf.Timestamp lastModifiedTime = 2;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.EntityMetadata.prototype.getLastmodifiedtime = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 2));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.EntityMetadata} returns this
*/
proto.EntityMetadata.prototype.setLastmodifiedtime = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.EntityMetadata} returns this
 */
proto.EntityMetadata.prototype.clearLastmodifiedtime = function() {
  return this.setLastmodifiedtime(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.EntityMetadata.prototype.hasLastmodifiedtime = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional int32 backlogQueueSize = 3;
 * @return {number}
 */
proto.EntityMetadata.prototype.getBacklogqueuesize = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/**
 * @param {number} value
 * @return {!proto.EntityMetadata} returns this
 */
proto.EntityMetadata.prototype.setBacklogqueuesize = function(value) {
  return jspb.Message.setProto3IntField(this, 3, value);
};


/**
 * optional google.protobuf.StringValue lockedBy = 4;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.EntityMetadata.prototype.getLockedby = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 4));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.EntityMetadata} returns this
*/
proto.EntityMetadata.prototype.setLockedby = function(value) {
  return jspb.Message.setWrapperField(this, 4, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.EntityMetadata} returns this
 */
proto.EntityMetadata.prototype.clearLockedby = function() {
  return this.setLockedby(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.EntityMetadata.prototype.hasLockedby = function() {
  return jspb.Message.getField(this, 4) != null;
};


/**
 * optional google.protobuf.StringValue serializedState = 5;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.EntityMetadata.prototype.getSerializedstate = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 5));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.EntityMetadata} returns this
*/
proto.EntityMetadata.prototype.setSerializedstate = function(value) {
  return jspb.Message.setWrapperField(this, 5, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.EntityMetadata} returns this
 */
proto.EntityMetadata.prototype.clearSerializedstate = function() {
  return this.setSerializedstate(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.EntityMetadata.prototype.hasSerializedstate = function() {
  return jspb.Message.getField(this, 5) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.CleanEntityStorageRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.CleanEntityStorageRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.CleanEntityStorageRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.CleanEntityStorageRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    continuationtoken: (f = msg.getContinuationtoken()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    removeemptyentities: jspb.Message.getBooleanFieldWithDefault(msg, 2, false),
    releaseorphanedlocks: jspb.Message.getBooleanFieldWithDefault(msg, 3, false)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.CleanEntityStorageRequest}
 */
proto.CleanEntityStorageRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.CleanEntityStorageRequest;
  return proto.CleanEntityStorageRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.CleanEntityStorageRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.CleanEntityStorageRequest}
 */
proto.CleanEntityStorageRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setContinuationtoken(value);
      break;
    case 2:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setRemoveemptyentities(value);
      break;
    case 3:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setReleaseorphanedlocks(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.CleanEntityStorageRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.CleanEntityStorageRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.CleanEntityStorageRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.CleanEntityStorageRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getContinuationtoken();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getRemoveemptyentities();
  if (f) {
    writer.writeBool(
      2,
      f
    );
  }
  f = message.getReleaseorphanedlocks();
  if (f) {
    writer.writeBool(
      3,
      f
    );
  }
};


/**
 * optional google.protobuf.StringValue continuationToken = 1;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.CleanEntityStorageRequest.prototype.getContinuationtoken = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 1));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.CleanEntityStorageRequest} returns this
*/
proto.CleanEntityStorageRequest.prototype.setContinuationtoken = function(value) {
  return jspb.Message.setWrapperField(this, 1, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.CleanEntityStorageRequest} returns this
 */
proto.CleanEntityStorageRequest.prototype.clearContinuationtoken = function() {
  return this.setContinuationtoken(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.CleanEntityStorageRequest.prototype.hasContinuationtoken = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * optional bool removeEmptyEntities = 2;
 * @return {boolean}
 */
proto.CleanEntityStorageRequest.prototype.getRemoveemptyentities = function() {
  return /** @type {boolean} */ (jspb.Message.getBooleanFieldWithDefault(this, 2, false));
};


/**
 * @param {boolean} value
 * @return {!proto.CleanEntityStorageRequest} returns this
 */
proto.CleanEntityStorageRequest.prototype.setRemoveemptyentities = function(value) {
  return jspb.Message.setProto3BooleanField(this, 2, value);
};


/**
 * optional bool releaseOrphanedLocks = 3;
 * @return {boolean}
 */
proto.CleanEntityStorageRequest.prototype.getReleaseorphanedlocks = function() {
  return /** @type {boolean} */ (jspb.Message.getBooleanFieldWithDefault(this, 3, false));
};


/**
 * @param {boolean} value
 * @return {!proto.CleanEntityStorageRequest} returns this
 */
proto.CleanEntityStorageRequest.prototype.setReleaseorphanedlocks = function(value) {
  return jspb.Message.setProto3BooleanField(this, 3, value);
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.CleanEntityStorageResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.CleanEntityStorageResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.CleanEntityStorageResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.CleanEntityStorageResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    continuationtoken: (f = msg.getContinuationtoken()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    emptyentitiesremoved: jspb.Message.getFieldWithDefault(msg, 2, 0),
    orphanedlocksreleased: jspb.Message.getFieldWithDefault(msg, 3, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.CleanEntityStorageResponse}
 */
proto.CleanEntityStorageResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.CleanEntityStorageResponse;
  return proto.CleanEntityStorageResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.CleanEntityStorageResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.CleanEntityStorageResponse}
 */
proto.CleanEntityStorageResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setContinuationtoken(value);
      break;
    case 2:
      var value = /** @type {number} */ (reader.readInt32());
      msg.setEmptyentitiesremoved(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readInt32());
      msg.setOrphanedlocksreleased(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.CleanEntityStorageResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.CleanEntityStorageResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.CleanEntityStorageResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.CleanEntityStorageResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getContinuationtoken();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getEmptyentitiesremoved();
  if (f !== 0) {
    writer.writeInt32(
      2,
      f
    );
  }
  f = message.getOrphanedlocksreleased();
  if (f !== 0) {
    writer.writeInt32(
      3,
      f
    );
  }
};


/**
 * optional google.protobuf.StringValue continuationToken = 1;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.CleanEntityStorageResponse.prototype.getContinuationtoken = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 1));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.CleanEntityStorageResponse} returns this
*/
proto.CleanEntityStorageResponse.prototype.setContinuationtoken = function(value) {
  return jspb.Message.setWrapperField(this, 1, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.CleanEntityStorageResponse} returns this
 */
proto.CleanEntityStorageResponse.prototype.clearContinuationtoken = function() {
  return this.setContinuationtoken(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.CleanEntityStorageResponse.prototype.hasContinuationtoken = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * optional int32 emptyEntitiesRemoved = 2;
 * @return {number}
 */
proto.CleanEntityStorageResponse.prototype.getEmptyentitiesremoved = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 2, 0));
};


/**
 * @param {number} value
 * @return {!proto.CleanEntityStorageResponse} returns this
 */
proto.CleanEntityStorageResponse.prototype.setEmptyentitiesremoved = function(value) {
  return jspb.Message.setProto3IntField(this, 2, value);
};


/**
 * optional int32 orphanedLocksReleased = 3;
 * @return {number}
 */
proto.CleanEntityStorageResponse.prototype.getOrphanedlocksreleased = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/**
 * @param {number} value
 * @return {!proto.CleanEntityStorageResponse} returns this
 */
proto.CleanEntityStorageResponse.prototype.setOrphanedlocksreleased = function(value) {
  return jspb.Message.setProto3IntField(this, 3, value);
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.OrchestratorEntityParameters.prototype.toObject = function(opt_includeInstance) {
  return proto.OrchestratorEntityParameters.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.OrchestratorEntityParameters} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OrchestratorEntityParameters.toObject = function(includeInstance, msg) {
  var f, obj = {
    entitymessagereorderwindow: (f = msg.getEntitymessagereorderwindow()) && google_protobuf_duration_pb.Duration.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.OrchestratorEntityParameters}
 */
proto.OrchestratorEntityParameters.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.OrchestratorEntityParameters;
  return proto.OrchestratorEntityParameters.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.OrchestratorEntityParameters} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.OrchestratorEntityParameters}
 */
proto.OrchestratorEntityParameters.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new google_protobuf_duration_pb.Duration;
      reader.readMessage(value,google_protobuf_duration_pb.Duration.deserializeBinaryFromReader);
      msg.setEntitymessagereorderwindow(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.OrchestratorEntityParameters.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.OrchestratorEntityParameters.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.OrchestratorEntityParameters} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OrchestratorEntityParameters.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getEntitymessagereorderwindow();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      google_protobuf_duration_pb.Duration.serializeBinaryToWriter
    );
  }
};


/**
 * optional google.protobuf.Duration entityMessageReorderWindow = 1;
 * @return {?proto.google.protobuf.Duration}
 */
proto.OrchestratorEntityParameters.prototype.getEntitymessagereorderwindow = function() {
  return /** @type{?proto.google.protobuf.Duration} */ (
    jspb.Message.getWrapperField(this, google_protobuf_duration_pb.Duration, 1));
};


/**
 * @param {?proto.google.protobuf.Duration|undefined} value
 * @return {!proto.OrchestratorEntityParameters} returns this
*/
proto.OrchestratorEntityParameters.prototype.setEntitymessagereorderwindow = function(value) {
  return jspb.Message.setWrapperField(this, 1, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OrchestratorEntityParameters} returns this
 */
proto.OrchestratorEntityParameters.prototype.clearEntitymessagereorderwindow = function() {
  return this.setEntitymessagereorderwindow(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OrchestratorEntityParameters.prototype.hasEntitymessagereorderwindow = function() {
  return jspb.Message.getField(this, 1) != null;
};



/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.EntityBatchRequest.repeatedFields_ = [3];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.EntityBatchRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.EntityBatchRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.EntityBatchRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.EntityBatchRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    instanceid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    entitystate: (f = msg.getEntitystate()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    operationsList: jspb.Message.toObjectList(msg.getOperationsList(),
    proto.OperationRequest.toObject, includeInstance),
    propertiesMap: (f = msg.getPropertiesMap()) ? f.toObject(includeInstance, proto.google.protobuf.Value.toObject) : []
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.EntityBatchRequest}
 */
proto.EntityBatchRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.EntityBatchRequest;
  return proto.EntityBatchRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.EntityBatchRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.EntityBatchRequest}
 */
proto.EntityBatchRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setInstanceid(value);
      break;
    case 2:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setEntitystate(value);
      break;
    case 3:
      var value = new proto.OperationRequest;
      reader.readMessage(value,proto.OperationRequest.deserializeBinaryFromReader);
      msg.addOperations(value);
      break;
    case 4:
      var value = msg.getPropertiesMap();
      reader.readMessage(value, function(message, reader) {
        jspb.Map.deserializeBinary(message, reader, jspb.BinaryReader.prototype.readString, jspb.BinaryReader.prototype.readMessage, proto.google.protobuf.Value.deserializeBinaryFromReader, "", new proto.google.protobuf.Value());
         });
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.EntityBatchRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.EntityBatchRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.EntityBatchRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.EntityBatchRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstanceid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getEntitystate();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getOperationsList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      3,
      f,
      proto.OperationRequest.serializeBinaryToWriter
    );
  }
  f = message.getPropertiesMap(true);
  if (f && f.getLength() > 0) {
    f.serializeBinary(4, writer, jspb.BinaryWriter.prototype.writeString, jspb.BinaryWriter.prototype.writeMessage, proto.google.protobuf.Value.serializeBinaryToWriter);
  }
};


/**
 * optional string instanceId = 1;
 * @return {string}
 */
proto.EntityBatchRequest.prototype.getInstanceid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.EntityBatchRequest} returns this
 */
proto.EntityBatchRequest.prototype.setInstanceid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional google.protobuf.StringValue entityState = 2;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.EntityBatchRequest.prototype.getEntitystate = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 2));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.EntityBatchRequest} returns this
*/
proto.EntityBatchRequest.prototype.setEntitystate = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.EntityBatchRequest} returns this
 */
proto.EntityBatchRequest.prototype.clearEntitystate = function() {
  return this.setEntitystate(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.EntityBatchRequest.prototype.hasEntitystate = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * repeated OperationRequest operations = 3;
 * @return {!Array<!proto.OperationRequest>}
 */
proto.EntityBatchRequest.prototype.getOperationsList = function() {
  return /** @type{!Array<!proto.OperationRequest>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.OperationRequest, 3));
};


/**
 * @param {!Array<!proto.OperationRequest>} value
 * @return {!proto.EntityBatchRequest} returns this
*/
proto.EntityBatchRequest.prototype.setOperationsList = function(value) {
  return jspb.Message.setRepeatedWrapperField(this, 3, value);
};


/**
 * @param {!proto.OperationRequest=} opt_value
 * @param {number=} opt_index
 * @return {!proto.OperationRequest}
 */
proto.EntityBatchRequest.prototype.addOperations = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 3, opt_value, proto.OperationRequest, opt_index);
};


/**
 * Clears the list making it empty but non-null.
 * @return {!proto.EntityBatchRequest} returns this
 */
proto.EntityBatchRequest.prototype.clearOperationsList = function() {
  return this.setOperationsList([]);
};


/**
 * map<string, google.protobuf.Value> properties = 4;
 * @param {boolean=} opt_noLazyCreate Do not create the map if
 * empty, instead returning `undefined`
 * @return {!jspb.Map<string,!proto.google.protobuf.Value>}
 */
proto.EntityBatchRequest.prototype.getPropertiesMap = function(opt_noLazyCreate) {
  return /** @type {!jspb.Map<string,!proto.google.protobuf.Value>} */ (
      jspb.Message.getMapField(this, 4, opt_noLazyCreate,
      proto.google.protobuf.Value));
};


/**
 * Clears values from the map. The map will be non-null.
 * @return {!proto.EntityBatchRequest} returns this
 */
proto.EntityBatchRequest.prototype.clearPropertiesMap = function() {
  this.getPropertiesMap().clear();
  return this;};



/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.EntityBatchResult.repeatedFields_ = [1,2,6];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.EntityBatchResult.prototype.toObject = function(opt_includeInstance) {
  return proto.EntityBatchResult.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.EntityBatchResult} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.EntityBatchResult.toObject = function(includeInstance, msg) {
  var f, obj = {
    resultsList: jspb.Message.toObjectList(msg.getResultsList(),
    proto.OperationResult.toObject, includeInstance),
    actionsList: jspb.Message.toObjectList(msg.getActionsList(),
    proto.OperationAction.toObject, includeInstance),
    entitystate: (f = msg.getEntitystate()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    failuredetails: (f = msg.getFailuredetails()) && proto.TaskFailureDetails.toObject(includeInstance, f),
    completiontoken: jspb.Message.getFieldWithDefault(msg, 5, ""),
    operationinfosList: jspb.Message.toObjectList(msg.getOperationinfosList(),
    proto.OperationInfo.toObject, includeInstance),
    requiresstate: jspb.Message.getBooleanFieldWithDefault(msg, 7, false)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.EntityBatchResult}
 */
proto.EntityBatchResult.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.EntityBatchResult;
  return proto.EntityBatchResult.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.EntityBatchResult} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.EntityBatchResult}
 */
proto.EntityBatchResult.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.OperationResult;
      reader.readMessage(value,proto.OperationResult.deserializeBinaryFromReader);
      msg.addResults(value);
      break;
    case 2:
      var value = new proto.OperationAction;
      reader.readMessage(value,proto.OperationAction.deserializeBinaryFromReader);
      msg.addActions(value);
      break;
    case 3:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setEntitystate(value);
      break;
    case 4:
      var value = new proto.TaskFailureDetails;
      reader.readMessage(value,proto.TaskFailureDetails.deserializeBinaryFromReader);
      msg.setFailuredetails(value);
      break;
    case 5:
      var value = /** @type {string} */ (reader.readString());
      msg.setCompletiontoken(value);
      break;
    case 6:
      var value = new proto.OperationInfo;
      reader.readMessage(value,proto.OperationInfo.deserializeBinaryFromReader);
      msg.addOperationinfos(value);
      break;
    case 7:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setRequiresstate(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.EntityBatchResult.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.EntityBatchResult.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.EntityBatchResult} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.EntityBatchResult.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getResultsList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.OperationResult.serializeBinaryToWriter
    );
  }
  f = message.getActionsList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      2,
      f,
      proto.OperationAction.serializeBinaryToWriter
    );
  }
  f = message.getEntitystate();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getFailuredetails();
  if (f != null) {
    writer.writeMessage(
      4,
      f,
      proto.TaskFailureDetails.serializeBinaryToWriter
    );
  }
  f = message.getCompletiontoken();
  if (f.length > 0) {
    writer.writeString(
      5,
      f
    );
  }
  f = message.getOperationinfosList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      6,
      f,
      proto.OperationInfo.serializeBinaryToWriter
    );
  }
  f = message.getRequiresstate();
  if (f) {
    writer.writeBool(
      7,
      f
    );
  }
};


/**
 * repeated OperationResult results = 1;
 * @return {!Array<!proto.OperationResult>}
 */
proto.EntityBatchResult.prototype.getResultsList = function() {
  return /** @type{!Array<!proto.OperationResult>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.OperationResult, 1));
};


/**
 * @param {!Array<!proto.OperationResult>} value
 * @return {!proto.EntityBatchResult} returns this
*/
proto.EntityBatchResult.prototype.setResultsList = function(value) {
  return jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.OperationResult=} opt_value
 * @param {number=} opt_index
 * @return {!proto.OperationResult}
 */
proto.EntityBatchResult.prototype.addResults = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.OperationResult, opt_index);
};


/**
 * Clears the list making it empty but non-null.
 * @return {!proto.EntityBatchResult} returns this
 */
proto.EntityBatchResult.prototype.clearResultsList = function() {
  return this.setResultsList([]);
};


/**
 * repeated OperationAction actions = 2;
 * @return {!Array<!proto.OperationAction>}
 */
proto.EntityBatchResult.prototype.getActionsList = function() {
  return /** @type{!Array<!proto.OperationAction>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.OperationAction, 2));
};


/**
 * @param {!Array<!proto.OperationAction>} value
 * @return {!proto.EntityBatchResult} returns this
*/
proto.EntityBatchResult.prototype.setActionsList = function(value) {
  return jspb.Message.setRepeatedWrapperField(this, 2, value);
};


/**
 * @param {!proto.OperationAction=} opt_value
 * @param {number=} opt_index
 * @return {!proto.OperationAction}
 */
proto.EntityBatchResult.prototype.addActions = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 2, opt_value, proto.OperationAction, opt_index);
};


/**
 * Clears the list making it empty but non-null.
 * @return {!proto.EntityBatchResult} returns this
 */
proto.EntityBatchResult.prototype.clearActionsList = function() {
  return this.setActionsList([]);
};


/**
 * optional google.protobuf.StringValue entityState = 3;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.EntityBatchResult.prototype.getEntitystate = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 3));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.EntityBatchResult} returns this
*/
proto.EntityBatchResult.prototype.setEntitystate = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.EntityBatchResult} returns this
 */
proto.EntityBatchResult.prototype.clearEntitystate = function() {
  return this.setEntitystate(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.EntityBatchResult.prototype.hasEntitystate = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional TaskFailureDetails failureDetails = 4;
 * @return {?proto.TaskFailureDetails}
 */
proto.EntityBatchResult.prototype.getFailuredetails = function() {
  return /** @type{?proto.TaskFailureDetails} */ (
    jspb.Message.getWrapperField(this, proto.TaskFailureDetails, 4));
};


/**
 * @param {?proto.TaskFailureDetails|undefined} value
 * @return {!proto.EntityBatchResult} returns this
*/
proto.EntityBatchResult.prototype.setFailuredetails = function(value) {
  return jspb.Message.setWrapperField(this, 4, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.EntityBatchResult} returns this
 */
proto.EntityBatchResult.prototype.clearFailuredetails = function() {
  return this.setFailuredetails(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.EntityBatchResult.prototype.hasFailuredetails = function() {
  return jspb.Message.getField(this, 4) != null;
};


/**
 * optional string completionToken = 5;
 * @return {string}
 */
proto.EntityBatchResult.prototype.getCompletiontoken = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 5, ""));
};


/**
 * @param {string} value
 * @return {!proto.EntityBatchResult} returns this
 */
proto.EntityBatchResult.prototype.setCompletiontoken = function(value) {
  return jspb.Message.setProto3StringField(this, 5, value);
};


/**
 * repeated OperationInfo operationInfos = 6;
 * @return {!Array<!proto.OperationInfo>}
 */
proto.EntityBatchResult.prototype.getOperationinfosList = function() {
  return /** @type{!Array<!proto.OperationInfo>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.OperationInfo, 6));
};


/**
 * @param {!Array<!proto.OperationInfo>} value
 * @return {!proto.EntityBatchResult} returns this
*/
proto.EntityBatchResult.prototype.setOperationinfosList = function(value) {
  return jspb.Message.setRepeatedWrapperField(this, 6, value);
};


/**
 * @param {!proto.OperationInfo=} opt_value
 * @param {number=} opt_index
 * @return {!proto.OperationInfo}
 */
proto.EntityBatchResult.prototype.addOperationinfos = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 6, opt_value, proto.OperationInfo, opt_index);
};


/**
 * Clears the list making it empty but non-null.
 * @return {!proto.EntityBatchResult} returns this
 */
proto.EntityBatchResult.prototype.clearOperationinfosList = function() {
  return this.setOperationinfosList([]);
};


/**
 * optional bool requiresState = 7;
 * @return {boolean}
 */
proto.EntityBatchResult.prototype.getRequiresstate = function() {
  return /** @type {boolean} */ (jspb.Message.getBooleanFieldWithDefault(this, 7, false));
};


/**
 * @param {boolean} value
 * @return {!proto.EntityBatchResult} returns this
 */
proto.EntityBatchResult.prototype.setRequiresstate = function(value) {
  return jspb.Message.setProto3BooleanField(this, 7, value);
};



/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.EntityRequest.repeatedFields_ = [4];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.EntityRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.EntityRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.EntityRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.EntityRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    instanceid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    executionid: jspb.Message.getFieldWithDefault(msg, 2, ""),
    entitystate: (f = msg.getEntitystate()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    operationrequestsList: jspb.Message.toObjectList(msg.getOperationrequestsList(),
    proto.HistoryEvent.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.EntityRequest}
 */
proto.EntityRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.EntityRequest;
  return proto.EntityRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.EntityRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.EntityRequest}
 */
proto.EntityRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setInstanceid(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setExecutionid(value);
      break;
    case 3:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setEntitystate(value);
      break;
    case 4:
      var value = new proto.HistoryEvent;
      reader.readMessage(value,proto.HistoryEvent.deserializeBinaryFromReader);
      msg.addOperationrequests(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.EntityRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.EntityRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.EntityRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.EntityRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstanceid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getExecutionid();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getEntitystate();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getOperationrequestsList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      4,
      f,
      proto.HistoryEvent.serializeBinaryToWriter
    );
  }
};


/**
 * optional string instanceId = 1;
 * @return {string}
 */
proto.EntityRequest.prototype.getInstanceid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.EntityRequest} returns this
 */
proto.EntityRequest.prototype.setInstanceid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string executionId = 2;
 * @return {string}
 */
proto.EntityRequest.prototype.getExecutionid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/**
 * @param {string} value
 * @return {!proto.EntityRequest} returns this
 */
proto.EntityRequest.prototype.setExecutionid = function(value) {
  return jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional google.protobuf.StringValue entityState = 3;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.EntityRequest.prototype.getEntitystate = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 3));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.EntityRequest} returns this
*/
proto.EntityRequest.prototype.setEntitystate = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.EntityRequest} returns this
 */
proto.EntityRequest.prototype.clearEntitystate = function() {
  return this.setEntitystate(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.EntityRequest.prototype.hasEntitystate = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * repeated HistoryEvent operationRequests = 4;
 * @return {!Array<!proto.HistoryEvent>}
 */
proto.EntityRequest.prototype.getOperationrequestsList = function() {
  return /** @type{!Array<!proto.HistoryEvent>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.HistoryEvent, 4));
};


/**
 * @param {!Array<!proto.HistoryEvent>} value
 * @return {!proto.EntityRequest} returns this
*/
proto.EntityRequest.prototype.setOperationrequestsList = function(value) {
  return jspb.Message.setRepeatedWrapperField(this, 4, value);
};


/**
 * @param {!proto.HistoryEvent=} opt_value
 * @param {number=} opt_index
 * @return {!proto.HistoryEvent}
 */
proto.EntityRequest.prototype.addOperationrequests = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 4, opt_value, proto.HistoryEvent, opt_index);
};


/**
 * Clears the list making it empty but non-null.
 * @return {!proto.EntityRequest} returns this
 */
proto.EntityRequest.prototype.clearOperationrequestsList = function() {
  return this.setOperationrequestsList([]);
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.OperationRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.OperationRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.OperationRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OperationRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    operation: jspb.Message.getFieldWithDefault(msg, 1, ""),
    requestid: jspb.Message.getFieldWithDefault(msg, 2, ""),
    input: (f = msg.getInput()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    tracecontext: (f = msg.getTracecontext()) && proto.TraceContext.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.OperationRequest}
 */
proto.OperationRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.OperationRequest;
  return proto.OperationRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.OperationRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.OperationRequest}
 */
proto.OperationRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setOperation(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setRequestid(value);
      break;
    case 3:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setInput(value);
      break;
    case 4:
      var value = new proto.TraceContext;
      reader.readMessage(value,proto.TraceContext.deserializeBinaryFromReader);
      msg.setTracecontext(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.OperationRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.OperationRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.OperationRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OperationRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getOperation();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getRequestid();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getInput();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getTracecontext();
  if (f != null) {
    writer.writeMessage(
      4,
      f,
      proto.TraceContext.serializeBinaryToWriter
    );
  }
};


/**
 * optional string operation = 1;
 * @return {string}
 */
proto.OperationRequest.prototype.getOperation = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.OperationRequest} returns this
 */
proto.OperationRequest.prototype.setOperation = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string requestId = 2;
 * @return {string}
 */
proto.OperationRequest.prototype.getRequestid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/**
 * @param {string} value
 * @return {!proto.OperationRequest} returns this
 */
proto.OperationRequest.prototype.setRequestid = function(value) {
  return jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional google.protobuf.StringValue input = 3;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.OperationRequest.prototype.getInput = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 3));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.OperationRequest} returns this
*/
proto.OperationRequest.prototype.setInput = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OperationRequest} returns this
 */
proto.OperationRequest.prototype.clearInput = function() {
  return this.setInput(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OperationRequest.prototype.hasInput = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional TraceContext traceContext = 4;
 * @return {?proto.TraceContext}
 */
proto.OperationRequest.prototype.getTracecontext = function() {
  return /** @type{?proto.TraceContext} */ (
    jspb.Message.getWrapperField(this, proto.TraceContext, 4));
};


/**
 * @param {?proto.TraceContext|undefined} value
 * @return {!proto.OperationRequest} returns this
*/
proto.OperationRequest.prototype.setTracecontext = function(value) {
  return jspb.Message.setWrapperField(this, 4, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OperationRequest} returns this
 */
proto.OperationRequest.prototype.clearTracecontext = function() {
  return this.setTracecontext(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OperationRequest.prototype.hasTracecontext = function() {
  return jspb.Message.getField(this, 4) != null;
};



/**
 * Oneof group definitions for this message. Each group defines the field
 * numbers belonging to that group. When of these fields' value is set, all
 * other fields in the group are cleared. During deserialization, if multiple
 * fields are encountered for a group, only the last value seen will be kept.
 * @private {!Array<!Array<number>>}
 * @const
 */
proto.OperationResult.oneofGroups_ = [[1,2]];

/**
 * @enum {number}
 */
proto.OperationResult.ResulttypeCase = {
  RESULTTYPE_NOT_SET: 0,
  SUCCESS: 1,
  FAILURE: 2
};

/**
 * @return {proto.OperationResult.ResulttypeCase}
 */
proto.OperationResult.prototype.getResulttypeCase = function() {
  return /** @type {proto.OperationResult.ResulttypeCase} */(jspb.Message.computeOneofCase(this, proto.OperationResult.oneofGroups_[0]));
};



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.OperationResult.prototype.toObject = function(opt_includeInstance) {
  return proto.OperationResult.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.OperationResult} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OperationResult.toObject = function(includeInstance, msg) {
  var f, obj = {
    success: (f = msg.getSuccess()) && proto.OperationResultSuccess.toObject(includeInstance, f),
    failure: (f = msg.getFailure()) && proto.OperationResultFailure.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.OperationResult}
 */
proto.OperationResult.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.OperationResult;
  return proto.OperationResult.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.OperationResult} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.OperationResult}
 */
proto.OperationResult.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.OperationResultSuccess;
      reader.readMessage(value,proto.OperationResultSuccess.deserializeBinaryFromReader);
      msg.setSuccess(value);
      break;
    case 2:
      var value = new proto.OperationResultFailure;
      reader.readMessage(value,proto.OperationResultFailure.deserializeBinaryFromReader);
      msg.setFailure(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.OperationResult.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.OperationResult.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.OperationResult} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OperationResult.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getSuccess();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      proto.OperationResultSuccess.serializeBinaryToWriter
    );
  }
  f = message.getFailure();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      proto.OperationResultFailure.serializeBinaryToWriter
    );
  }
};


/**
 * optional OperationResultSuccess success = 1;
 * @return {?proto.OperationResultSuccess}
 */
proto.OperationResult.prototype.getSuccess = function() {
  return /** @type{?proto.OperationResultSuccess} */ (
    jspb.Message.getWrapperField(this, proto.OperationResultSuccess, 1));
};


/**
 * @param {?proto.OperationResultSuccess|undefined} value
 * @return {!proto.OperationResult} returns this
*/
proto.OperationResult.prototype.setSuccess = function(value) {
  return jspb.Message.setOneofWrapperField(this, 1, proto.OperationResult.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OperationResult} returns this
 */
proto.OperationResult.prototype.clearSuccess = function() {
  return this.setSuccess(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OperationResult.prototype.hasSuccess = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * optional OperationResultFailure failure = 2;
 * @return {?proto.OperationResultFailure}
 */
proto.OperationResult.prototype.getFailure = function() {
  return /** @type{?proto.OperationResultFailure} */ (
    jspb.Message.getWrapperField(this, proto.OperationResultFailure, 2));
};


/**
 * @param {?proto.OperationResultFailure|undefined} value
 * @return {!proto.OperationResult} returns this
*/
proto.OperationResult.prototype.setFailure = function(value) {
  return jspb.Message.setOneofWrapperField(this, 2, proto.OperationResult.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OperationResult} returns this
 */
proto.OperationResult.prototype.clearFailure = function() {
  return this.setFailure(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OperationResult.prototype.hasFailure = function() {
  return jspb.Message.getField(this, 2) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.OperationInfo.prototype.toObject = function(opt_includeInstance) {
  return proto.OperationInfo.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.OperationInfo} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OperationInfo.toObject = function(includeInstance, msg) {
  var f, obj = {
    requestid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    responsedestination: (f = msg.getResponsedestination()) && proto.OrchestrationInstance.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.OperationInfo}
 */
proto.OperationInfo.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.OperationInfo;
  return proto.OperationInfo.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.OperationInfo} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.OperationInfo}
 */
proto.OperationInfo.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setRequestid(value);
      break;
    case 2:
      var value = new proto.OrchestrationInstance;
      reader.readMessage(value,proto.OrchestrationInstance.deserializeBinaryFromReader);
      msg.setResponsedestination(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.OperationInfo.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.OperationInfo.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.OperationInfo} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OperationInfo.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getRequestid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getResponsedestination();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      proto.OrchestrationInstance.serializeBinaryToWriter
    );
  }
};


/**
 * optional string requestId = 1;
 * @return {string}
 */
proto.OperationInfo.prototype.getRequestid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.OperationInfo} returns this
 */
proto.OperationInfo.prototype.setRequestid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional OrchestrationInstance responseDestination = 2;
 * @return {?proto.OrchestrationInstance}
 */
proto.OperationInfo.prototype.getResponsedestination = function() {
  return /** @type{?proto.OrchestrationInstance} */ (
    jspb.Message.getWrapperField(this, proto.OrchestrationInstance, 2));
};


/**
 * @param {?proto.OrchestrationInstance|undefined} value
 * @return {!proto.OperationInfo} returns this
*/
proto.OperationInfo.prototype.setResponsedestination = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OperationInfo} returns this
 */
proto.OperationInfo.prototype.clearResponsedestination = function() {
  return this.setResponsedestination(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OperationInfo.prototype.hasResponsedestination = function() {
  return jspb.Message.getField(this, 2) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.OperationResultSuccess.prototype.toObject = function(opt_includeInstance) {
  return proto.OperationResultSuccess.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.OperationResultSuccess} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OperationResultSuccess.toObject = function(includeInstance, msg) {
  var f, obj = {
    result: (f = msg.getResult()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    starttimeutc: (f = msg.getStarttimeutc()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f),
    endtimeutc: (f = msg.getEndtimeutc()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.OperationResultSuccess}
 */
proto.OperationResultSuccess.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.OperationResultSuccess;
  return proto.OperationResultSuccess.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.OperationResultSuccess} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.OperationResultSuccess}
 */
proto.OperationResultSuccess.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setResult(value);
      break;
    case 2:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setStarttimeutc(value);
      break;
    case 3:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setEndtimeutc(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.OperationResultSuccess.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.OperationResultSuccess.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.OperationResultSuccess} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OperationResultSuccess.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getResult();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getStarttimeutc();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
  f = message.getEndtimeutc();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
};


/**
 * optional google.protobuf.StringValue result = 1;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.OperationResultSuccess.prototype.getResult = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 1));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.OperationResultSuccess} returns this
*/
proto.OperationResultSuccess.prototype.setResult = function(value) {
  return jspb.Message.setWrapperField(this, 1, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OperationResultSuccess} returns this
 */
proto.OperationResultSuccess.prototype.clearResult = function() {
  return this.setResult(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OperationResultSuccess.prototype.hasResult = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * optional google.protobuf.Timestamp startTimeUtc = 2;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.OperationResultSuccess.prototype.getStarttimeutc = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 2));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.OperationResultSuccess} returns this
*/
proto.OperationResultSuccess.prototype.setStarttimeutc = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OperationResultSuccess} returns this
 */
proto.OperationResultSuccess.prototype.clearStarttimeutc = function() {
  return this.setStarttimeutc(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OperationResultSuccess.prototype.hasStarttimeutc = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional google.protobuf.Timestamp endTimeUtc = 3;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.OperationResultSuccess.prototype.getEndtimeutc = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 3));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.OperationResultSuccess} returns this
*/
proto.OperationResultSuccess.prototype.setEndtimeutc = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OperationResultSuccess} returns this
 */
proto.OperationResultSuccess.prototype.clearEndtimeutc = function() {
  return this.setEndtimeutc(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OperationResultSuccess.prototype.hasEndtimeutc = function() {
  return jspb.Message.getField(this, 3) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.OperationResultFailure.prototype.toObject = function(opt_includeInstance) {
  return proto.OperationResultFailure.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.OperationResultFailure} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OperationResultFailure.toObject = function(includeInstance, msg) {
  var f, obj = {
    failuredetails: (f = msg.getFailuredetails()) && proto.TaskFailureDetails.toObject(includeInstance, f),
    starttimeutc: (f = msg.getStarttimeutc()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f),
    endtimeutc: (f = msg.getEndtimeutc()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.OperationResultFailure}
 */
proto.OperationResultFailure.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.OperationResultFailure;
  return proto.OperationResultFailure.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.OperationResultFailure} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.OperationResultFailure}
 */
proto.OperationResultFailure.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.TaskFailureDetails;
      reader.readMessage(value,proto.TaskFailureDetails.deserializeBinaryFromReader);
      msg.setFailuredetails(value);
      break;
    case 2:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setStarttimeutc(value);
      break;
    case 3:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setEndtimeutc(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.OperationResultFailure.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.OperationResultFailure.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.OperationResultFailure} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OperationResultFailure.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getFailuredetails();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      proto.TaskFailureDetails.serializeBinaryToWriter
    );
  }
  f = message.getStarttimeutc();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
  f = message.getEndtimeutc();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
};


/**
 * optional TaskFailureDetails failureDetails = 1;
 * @return {?proto.TaskFailureDetails}
 */
proto.OperationResultFailure.prototype.getFailuredetails = function() {
  return /** @type{?proto.TaskFailureDetails} */ (
    jspb.Message.getWrapperField(this, proto.TaskFailureDetails, 1));
};


/**
 * @param {?proto.TaskFailureDetails|undefined} value
 * @return {!proto.OperationResultFailure} returns this
*/
proto.OperationResultFailure.prototype.setFailuredetails = function(value) {
  return jspb.Message.setWrapperField(this, 1, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OperationResultFailure} returns this
 */
proto.OperationResultFailure.prototype.clearFailuredetails = function() {
  return this.setFailuredetails(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OperationResultFailure.prototype.hasFailuredetails = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * optional google.protobuf.Timestamp startTimeUtc = 2;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.OperationResultFailure.prototype.getStarttimeutc = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 2));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.OperationResultFailure} returns this
*/
proto.OperationResultFailure.prototype.setStarttimeutc = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OperationResultFailure} returns this
 */
proto.OperationResultFailure.prototype.clearStarttimeutc = function() {
  return this.setStarttimeutc(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OperationResultFailure.prototype.hasStarttimeutc = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional google.protobuf.Timestamp endTimeUtc = 3;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.OperationResultFailure.prototype.getEndtimeutc = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 3));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.OperationResultFailure} returns this
*/
proto.OperationResultFailure.prototype.setEndtimeutc = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OperationResultFailure} returns this
 */
proto.OperationResultFailure.prototype.clearEndtimeutc = function() {
  return this.setEndtimeutc(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OperationResultFailure.prototype.hasEndtimeutc = function() {
  return jspb.Message.getField(this, 3) != null;
};



/**
 * Oneof group definitions for this message. Each group defines the field
 * numbers belonging to that group. When of these fields' value is set, all
 * other fields in the group are cleared. During deserialization, if multiple
 * fields are encountered for a group, only the last value seen will be kept.
 * @private {!Array<!Array<number>>}
 * @const
 */
proto.OperationAction.oneofGroups_ = [[2,3]];

/**
 * @enum {number}
 */
proto.OperationAction.OperationactiontypeCase = {
  OPERATIONACTIONTYPE_NOT_SET: 0,
  SENDSIGNAL: 2,
  STARTNEWORCHESTRATION: 3
};

/**
 * @return {proto.OperationAction.OperationactiontypeCase}
 */
proto.OperationAction.prototype.getOperationactiontypeCase = function() {
  return /** @type {proto.OperationAction.OperationactiontypeCase} */(jspb.Message.computeOneofCase(this, proto.OperationAction.oneofGroups_[0]));
};



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.OperationAction.prototype.toObject = function(opt_includeInstance) {
  return proto.OperationAction.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.OperationAction} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OperationAction.toObject = function(includeInstance, msg) {
  var f, obj = {
    id: jspb.Message.getFieldWithDefault(msg, 1, 0),
    sendsignal: (f = msg.getSendsignal()) && proto.SendSignalAction.toObject(includeInstance, f),
    startneworchestration: (f = msg.getStartneworchestration()) && proto.StartNewOrchestrationAction.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.OperationAction}
 */
proto.OperationAction.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.OperationAction;
  return proto.OperationAction.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.OperationAction} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.OperationAction}
 */
proto.OperationAction.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readInt32());
      msg.setId(value);
      break;
    case 2:
      var value = new proto.SendSignalAction;
      reader.readMessage(value,proto.SendSignalAction.deserializeBinaryFromReader);
      msg.setSendsignal(value);
      break;
    case 3:
      var value = new proto.StartNewOrchestrationAction;
      reader.readMessage(value,proto.StartNewOrchestrationAction.deserializeBinaryFromReader);
      msg.setStartneworchestration(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.OperationAction.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.OperationAction.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.OperationAction} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.OperationAction.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getId();
  if (f !== 0) {
    writer.writeInt32(
      1,
      f
    );
  }
  f = message.getSendsignal();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      proto.SendSignalAction.serializeBinaryToWriter
    );
  }
  f = message.getStartneworchestration();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      proto.StartNewOrchestrationAction.serializeBinaryToWriter
    );
  }
};


/**
 * optional int32 id = 1;
 * @return {number}
 */
proto.OperationAction.prototype.getId = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/**
 * @param {number} value
 * @return {!proto.OperationAction} returns this
 */
proto.OperationAction.prototype.setId = function(value) {
  return jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional SendSignalAction sendSignal = 2;
 * @return {?proto.SendSignalAction}
 */
proto.OperationAction.prototype.getSendsignal = function() {
  return /** @type{?proto.SendSignalAction} */ (
    jspb.Message.getWrapperField(this, proto.SendSignalAction, 2));
};


/**
 * @param {?proto.SendSignalAction|undefined} value
 * @return {!proto.OperationAction} returns this
*/
proto.OperationAction.prototype.setSendsignal = function(value) {
  return jspb.Message.setOneofWrapperField(this, 2, proto.OperationAction.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OperationAction} returns this
 */
proto.OperationAction.prototype.clearSendsignal = function() {
  return this.setSendsignal(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OperationAction.prototype.hasSendsignal = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional StartNewOrchestrationAction startNewOrchestration = 3;
 * @return {?proto.StartNewOrchestrationAction}
 */
proto.OperationAction.prototype.getStartneworchestration = function() {
  return /** @type{?proto.StartNewOrchestrationAction} */ (
    jspb.Message.getWrapperField(this, proto.StartNewOrchestrationAction, 3));
};


/**
 * @param {?proto.StartNewOrchestrationAction|undefined} value
 * @return {!proto.OperationAction} returns this
*/
proto.OperationAction.prototype.setStartneworchestration = function(value) {
  return jspb.Message.setOneofWrapperField(this, 3, proto.OperationAction.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.OperationAction} returns this
 */
proto.OperationAction.prototype.clearStartneworchestration = function() {
  return this.setStartneworchestration(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.OperationAction.prototype.hasStartneworchestration = function() {
  return jspb.Message.getField(this, 3) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.SendSignalAction.prototype.toObject = function(opt_includeInstance) {
  return proto.SendSignalAction.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.SendSignalAction} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.SendSignalAction.toObject = function(includeInstance, msg) {
  var f, obj = {
    instanceid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    name: jspb.Message.getFieldWithDefault(msg, 2, ""),
    input: (f = msg.getInput()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    scheduledtime: (f = msg.getScheduledtime()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f),
    requesttime: (f = msg.getRequesttime()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f),
    parenttracecontext: (f = msg.getParenttracecontext()) && proto.TraceContext.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.SendSignalAction}
 */
proto.SendSignalAction.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.SendSignalAction;
  return proto.SendSignalAction.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.SendSignalAction} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.SendSignalAction}
 */
proto.SendSignalAction.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setInstanceid(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setName(value);
      break;
    case 3:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setInput(value);
      break;
    case 4:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setScheduledtime(value);
      break;
    case 5:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setRequesttime(value);
      break;
    case 6:
      var value = new proto.TraceContext;
      reader.readMessage(value,proto.TraceContext.deserializeBinaryFromReader);
      msg.setParenttracecontext(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.SendSignalAction.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.SendSignalAction.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.SendSignalAction} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.SendSignalAction.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstanceid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getName();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getInput();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getScheduledtime();
  if (f != null) {
    writer.writeMessage(
      4,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
  f = message.getRequesttime();
  if (f != null) {
    writer.writeMessage(
      5,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
  f = message.getParenttracecontext();
  if (f != null) {
    writer.writeMessage(
      6,
      f,
      proto.TraceContext.serializeBinaryToWriter
    );
  }
};


/**
 * optional string instanceId = 1;
 * @return {string}
 */
proto.SendSignalAction.prototype.getInstanceid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.SendSignalAction} returns this
 */
proto.SendSignalAction.prototype.setInstanceid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string name = 2;
 * @return {string}
 */
proto.SendSignalAction.prototype.getName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/**
 * @param {string} value
 * @return {!proto.SendSignalAction} returns this
 */
proto.SendSignalAction.prototype.setName = function(value) {
  return jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional google.protobuf.StringValue input = 3;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.SendSignalAction.prototype.getInput = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 3));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.SendSignalAction} returns this
*/
proto.SendSignalAction.prototype.setInput = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.SendSignalAction} returns this
 */
proto.SendSignalAction.prototype.clearInput = function() {
  return this.setInput(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.SendSignalAction.prototype.hasInput = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional google.protobuf.Timestamp scheduledTime = 4;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.SendSignalAction.prototype.getScheduledtime = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 4));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.SendSignalAction} returns this
*/
proto.SendSignalAction.prototype.setScheduledtime = function(value) {
  return jspb.Message.setWrapperField(this, 4, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.SendSignalAction} returns this
 */
proto.SendSignalAction.prototype.clearScheduledtime = function() {
  return this.setScheduledtime(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.SendSignalAction.prototype.hasScheduledtime = function() {
  return jspb.Message.getField(this, 4) != null;
};


/**
 * optional google.protobuf.Timestamp requestTime = 5;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.SendSignalAction.prototype.getRequesttime = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 5));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.SendSignalAction} returns this
*/
proto.SendSignalAction.prototype.setRequesttime = function(value) {
  return jspb.Message.setWrapperField(this, 5, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.SendSignalAction} returns this
 */
proto.SendSignalAction.prototype.clearRequesttime = function() {
  return this.setRequesttime(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.SendSignalAction.prototype.hasRequesttime = function() {
  return jspb.Message.getField(this, 5) != null;
};


/**
 * optional TraceContext parentTraceContext = 6;
 * @return {?proto.TraceContext}
 */
proto.SendSignalAction.prototype.getParenttracecontext = function() {
  return /** @type{?proto.TraceContext} */ (
    jspb.Message.getWrapperField(this, proto.TraceContext, 6));
};


/**
 * @param {?proto.TraceContext|undefined} value
 * @return {!proto.SendSignalAction} returns this
*/
proto.SendSignalAction.prototype.setParenttracecontext = function(value) {
  return jspb.Message.setWrapperField(this, 6, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.SendSignalAction} returns this
 */
proto.SendSignalAction.prototype.clearParenttracecontext = function() {
  return this.setParenttracecontext(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.SendSignalAction.prototype.hasParenttracecontext = function() {
  return jspb.Message.getField(this, 6) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.StartNewOrchestrationAction.prototype.toObject = function(opt_includeInstance) {
  return proto.StartNewOrchestrationAction.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.StartNewOrchestrationAction} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.StartNewOrchestrationAction.toObject = function(includeInstance, msg) {
  var f, obj = {
    instanceid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    name: jspb.Message.getFieldWithDefault(msg, 2, ""),
    version: (f = msg.getVersion()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    input: (f = msg.getInput()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    scheduledtime: (f = msg.getScheduledtime()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f),
    requesttime: (f = msg.getRequesttime()) && google_protobuf_timestamp_pb.Timestamp.toObject(includeInstance, f),
    parenttracecontext: (f = msg.getParenttracecontext()) && proto.TraceContext.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.StartNewOrchestrationAction}
 */
proto.StartNewOrchestrationAction.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.StartNewOrchestrationAction;
  return proto.StartNewOrchestrationAction.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.StartNewOrchestrationAction} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.StartNewOrchestrationAction}
 */
proto.StartNewOrchestrationAction.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setInstanceid(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setName(value);
      break;
    case 3:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setVersion(value);
      break;
    case 4:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setInput(value);
      break;
    case 5:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setScheduledtime(value);
      break;
    case 6:
      var value = new google_protobuf_timestamp_pb.Timestamp;
      reader.readMessage(value,google_protobuf_timestamp_pb.Timestamp.deserializeBinaryFromReader);
      msg.setRequesttime(value);
      break;
    case 7:
      var value = new proto.TraceContext;
      reader.readMessage(value,proto.TraceContext.deserializeBinaryFromReader);
      msg.setParenttracecontext(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.StartNewOrchestrationAction.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.StartNewOrchestrationAction.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.StartNewOrchestrationAction} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.StartNewOrchestrationAction.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstanceid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getName();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getVersion();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getInput();
  if (f != null) {
    writer.writeMessage(
      4,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getScheduledtime();
  if (f != null) {
    writer.writeMessage(
      5,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
  f = message.getRequesttime();
  if (f != null) {
    writer.writeMessage(
      6,
      f,
      google_protobuf_timestamp_pb.Timestamp.serializeBinaryToWriter
    );
  }
  f = message.getParenttracecontext();
  if (f != null) {
    writer.writeMessage(
      7,
      f,
      proto.TraceContext.serializeBinaryToWriter
    );
  }
};


/**
 * optional string instanceId = 1;
 * @return {string}
 */
proto.StartNewOrchestrationAction.prototype.getInstanceid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.StartNewOrchestrationAction} returns this
 */
proto.StartNewOrchestrationAction.prototype.setInstanceid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string name = 2;
 * @return {string}
 */
proto.StartNewOrchestrationAction.prototype.getName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/**
 * @param {string} value
 * @return {!proto.StartNewOrchestrationAction} returns this
 */
proto.StartNewOrchestrationAction.prototype.setName = function(value) {
  return jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional google.protobuf.StringValue version = 3;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.StartNewOrchestrationAction.prototype.getVersion = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 3));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.StartNewOrchestrationAction} returns this
*/
proto.StartNewOrchestrationAction.prototype.setVersion = function(value) {
  return jspb.Message.setWrapperField(this, 3, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.StartNewOrchestrationAction} returns this
 */
proto.StartNewOrchestrationAction.prototype.clearVersion = function() {
  return this.setVersion(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.StartNewOrchestrationAction.prototype.hasVersion = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional google.protobuf.StringValue input = 4;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.StartNewOrchestrationAction.prototype.getInput = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 4));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.StartNewOrchestrationAction} returns this
*/
proto.StartNewOrchestrationAction.prototype.setInput = function(value) {
  return jspb.Message.setWrapperField(this, 4, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.StartNewOrchestrationAction} returns this
 */
proto.StartNewOrchestrationAction.prototype.clearInput = function() {
  return this.setInput(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.StartNewOrchestrationAction.prototype.hasInput = function() {
  return jspb.Message.getField(this, 4) != null;
};


/**
 * optional google.protobuf.Timestamp scheduledTime = 5;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.StartNewOrchestrationAction.prototype.getScheduledtime = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 5));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.StartNewOrchestrationAction} returns this
*/
proto.StartNewOrchestrationAction.prototype.setScheduledtime = function(value) {
  return jspb.Message.setWrapperField(this, 5, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.StartNewOrchestrationAction} returns this
 */
proto.StartNewOrchestrationAction.prototype.clearScheduledtime = function() {
  return this.setScheduledtime(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.StartNewOrchestrationAction.prototype.hasScheduledtime = function() {
  return jspb.Message.getField(this, 5) != null;
};


/**
 * optional google.protobuf.Timestamp requestTime = 6;
 * @return {?proto.google.protobuf.Timestamp}
 */
proto.StartNewOrchestrationAction.prototype.getRequesttime = function() {
  return /** @type{?proto.google.protobuf.Timestamp} */ (
    jspb.Message.getWrapperField(this, google_protobuf_timestamp_pb.Timestamp, 6));
};


/**
 * @param {?proto.google.protobuf.Timestamp|undefined} value
 * @return {!proto.StartNewOrchestrationAction} returns this
*/
proto.StartNewOrchestrationAction.prototype.setRequesttime = function(value) {
  return jspb.Message.setWrapperField(this, 6, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.StartNewOrchestrationAction} returns this
 */
proto.StartNewOrchestrationAction.prototype.clearRequesttime = function() {
  return this.setRequesttime(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.StartNewOrchestrationAction.prototype.hasRequesttime = function() {
  return jspb.Message.getField(this, 6) != null;
};


/**
 * optional TraceContext parentTraceContext = 7;
 * @return {?proto.TraceContext}
 */
proto.StartNewOrchestrationAction.prototype.getParenttracecontext = function() {
  return /** @type{?proto.TraceContext} */ (
    jspb.Message.getWrapperField(this, proto.TraceContext, 7));
};


/**
 * @param {?proto.TraceContext|undefined} value
 * @return {!proto.StartNewOrchestrationAction} returns this
*/
proto.StartNewOrchestrationAction.prototype.setParenttracecontext = function(value) {
  return jspb.Message.setWrapperField(this, 7, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.StartNewOrchestrationAction} returns this
 */
proto.StartNewOrchestrationAction.prototype.clearParenttracecontext = function() {
  return this.setParenttracecontext(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.StartNewOrchestrationAction.prototype.hasParenttracecontext = function() {
  return jspb.Message.getField(this, 7) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.AbandonActivityTaskRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.AbandonActivityTaskRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.AbandonActivityTaskRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.AbandonActivityTaskRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    completiontoken: jspb.Message.getFieldWithDefault(msg, 1, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.AbandonActivityTaskRequest}
 */
proto.AbandonActivityTaskRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.AbandonActivityTaskRequest;
  return proto.AbandonActivityTaskRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.AbandonActivityTaskRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.AbandonActivityTaskRequest}
 */
proto.AbandonActivityTaskRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setCompletiontoken(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.AbandonActivityTaskRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.AbandonActivityTaskRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.AbandonActivityTaskRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.AbandonActivityTaskRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getCompletiontoken();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
};


/**
 * optional string completionToken = 1;
 * @return {string}
 */
proto.AbandonActivityTaskRequest.prototype.getCompletiontoken = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.AbandonActivityTaskRequest} returns this
 */
proto.AbandonActivityTaskRequest.prototype.setCompletiontoken = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.AbandonActivityTaskResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.AbandonActivityTaskResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.AbandonActivityTaskResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.AbandonActivityTaskResponse.toObject = function(includeInstance, msg) {
  var f, obj = {

  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.AbandonActivityTaskResponse}
 */
proto.AbandonActivityTaskResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.AbandonActivityTaskResponse;
  return proto.AbandonActivityTaskResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.AbandonActivityTaskResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.AbandonActivityTaskResponse}
 */
proto.AbandonActivityTaskResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.AbandonActivityTaskResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.AbandonActivityTaskResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.AbandonActivityTaskResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.AbandonActivityTaskResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.AbandonOrchestrationTaskRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.AbandonOrchestrationTaskRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.AbandonOrchestrationTaskRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.AbandonOrchestrationTaskRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    completiontoken: jspb.Message.getFieldWithDefault(msg, 1, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.AbandonOrchestrationTaskRequest}
 */
proto.AbandonOrchestrationTaskRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.AbandonOrchestrationTaskRequest;
  return proto.AbandonOrchestrationTaskRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.AbandonOrchestrationTaskRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.AbandonOrchestrationTaskRequest}
 */
proto.AbandonOrchestrationTaskRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setCompletiontoken(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.AbandonOrchestrationTaskRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.AbandonOrchestrationTaskRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.AbandonOrchestrationTaskRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.AbandonOrchestrationTaskRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getCompletiontoken();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
};


/**
 * optional string completionToken = 1;
 * @return {string}
 */
proto.AbandonOrchestrationTaskRequest.prototype.getCompletiontoken = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.AbandonOrchestrationTaskRequest} returns this
 */
proto.AbandonOrchestrationTaskRequest.prototype.setCompletiontoken = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.AbandonOrchestrationTaskResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.AbandonOrchestrationTaskResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.AbandonOrchestrationTaskResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.AbandonOrchestrationTaskResponse.toObject = function(includeInstance, msg) {
  var f, obj = {

  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.AbandonOrchestrationTaskResponse}
 */
proto.AbandonOrchestrationTaskResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.AbandonOrchestrationTaskResponse;
  return proto.AbandonOrchestrationTaskResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.AbandonOrchestrationTaskResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.AbandonOrchestrationTaskResponse}
 */
proto.AbandonOrchestrationTaskResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.AbandonOrchestrationTaskResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.AbandonOrchestrationTaskResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.AbandonOrchestrationTaskResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.AbandonOrchestrationTaskResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.AbandonEntityTaskRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.AbandonEntityTaskRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.AbandonEntityTaskRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.AbandonEntityTaskRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    completiontoken: jspb.Message.getFieldWithDefault(msg, 1, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.AbandonEntityTaskRequest}
 */
proto.AbandonEntityTaskRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.AbandonEntityTaskRequest;
  return proto.AbandonEntityTaskRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.AbandonEntityTaskRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.AbandonEntityTaskRequest}
 */
proto.AbandonEntityTaskRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setCompletiontoken(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.AbandonEntityTaskRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.AbandonEntityTaskRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.AbandonEntityTaskRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.AbandonEntityTaskRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getCompletiontoken();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
};


/**
 * optional string completionToken = 1;
 * @return {string}
 */
proto.AbandonEntityTaskRequest.prototype.getCompletiontoken = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.AbandonEntityTaskRequest} returns this
 */
proto.AbandonEntityTaskRequest.prototype.setCompletiontoken = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.AbandonEntityTaskResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.AbandonEntityTaskResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.AbandonEntityTaskResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.AbandonEntityTaskResponse.toObject = function(includeInstance, msg) {
  var f, obj = {

  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.AbandonEntityTaskResponse}
 */
proto.AbandonEntityTaskResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.AbandonEntityTaskResponse;
  return proto.AbandonEntityTaskResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.AbandonEntityTaskResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.AbandonEntityTaskResponse}
 */
proto.AbandonEntityTaskResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.AbandonEntityTaskResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.AbandonEntityTaskResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.AbandonEntityTaskResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.AbandonEntityTaskResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.SkipGracefulOrchestrationTerminationsRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.SkipGracefulOrchestrationTerminationsRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.SkipGracefulOrchestrationTerminationsRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.SkipGracefulOrchestrationTerminationsRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    instancebatch: (f = msg.getInstancebatch()) && proto.InstanceBatch.toObject(includeInstance, f),
    reason: (f = msg.getReason()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.SkipGracefulOrchestrationTerminationsRequest}
 */
proto.SkipGracefulOrchestrationTerminationsRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.SkipGracefulOrchestrationTerminationsRequest;
  return proto.SkipGracefulOrchestrationTerminationsRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.SkipGracefulOrchestrationTerminationsRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.SkipGracefulOrchestrationTerminationsRequest}
 */
proto.SkipGracefulOrchestrationTerminationsRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.InstanceBatch;
      reader.readMessage(value,proto.InstanceBatch.deserializeBinaryFromReader);
      msg.setInstancebatch(value);
      break;
    case 2:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setReason(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.SkipGracefulOrchestrationTerminationsRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.SkipGracefulOrchestrationTerminationsRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.SkipGracefulOrchestrationTerminationsRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.SkipGracefulOrchestrationTerminationsRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstancebatch();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      proto.InstanceBatch.serializeBinaryToWriter
    );
  }
  f = message.getReason();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
};


/**
 * optional InstanceBatch instanceBatch = 1;
 * @return {?proto.InstanceBatch}
 */
proto.SkipGracefulOrchestrationTerminationsRequest.prototype.getInstancebatch = function() {
  return /** @type{?proto.InstanceBatch} */ (
    jspb.Message.getWrapperField(this, proto.InstanceBatch, 1));
};


/**
 * @param {?proto.InstanceBatch|undefined} value
 * @return {!proto.SkipGracefulOrchestrationTerminationsRequest} returns this
*/
proto.SkipGracefulOrchestrationTerminationsRequest.prototype.setInstancebatch = function(value) {
  return jspb.Message.setWrapperField(this, 1, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.SkipGracefulOrchestrationTerminationsRequest} returns this
 */
proto.SkipGracefulOrchestrationTerminationsRequest.prototype.clearInstancebatch = function() {
  return this.setInstancebatch(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.SkipGracefulOrchestrationTerminationsRequest.prototype.hasInstancebatch = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * optional google.protobuf.StringValue reason = 2;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.SkipGracefulOrchestrationTerminationsRequest.prototype.getReason = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 2));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.SkipGracefulOrchestrationTerminationsRequest} returns this
*/
proto.SkipGracefulOrchestrationTerminationsRequest.prototype.setReason = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.SkipGracefulOrchestrationTerminationsRequest} returns this
 */
proto.SkipGracefulOrchestrationTerminationsRequest.prototype.clearReason = function() {
  return this.setReason(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.SkipGracefulOrchestrationTerminationsRequest.prototype.hasReason = function() {
  return jspb.Message.getField(this, 2) != null;
};



/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.SkipGracefulOrchestrationTerminationsResponse.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.SkipGracefulOrchestrationTerminationsResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.SkipGracefulOrchestrationTerminationsResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.SkipGracefulOrchestrationTerminationsResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.SkipGracefulOrchestrationTerminationsResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    unterminatedinstanceidsList: (f = jspb.Message.getRepeatedField(msg, 1)) == null ? undefined : f
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.SkipGracefulOrchestrationTerminationsResponse}
 */
proto.SkipGracefulOrchestrationTerminationsResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.SkipGracefulOrchestrationTerminationsResponse;
  return proto.SkipGracefulOrchestrationTerminationsResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.SkipGracefulOrchestrationTerminationsResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.SkipGracefulOrchestrationTerminationsResponse}
 */
proto.SkipGracefulOrchestrationTerminationsResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.addUnterminatedinstanceids(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.SkipGracefulOrchestrationTerminationsResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.SkipGracefulOrchestrationTerminationsResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.SkipGracefulOrchestrationTerminationsResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.SkipGracefulOrchestrationTerminationsResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getUnterminatedinstanceidsList();
  if (f.length > 0) {
    writer.writeRepeatedString(
      1,
      f
    );
  }
};


/**
 * repeated string unterminatedInstanceIds = 1;
 * @return {!Array<string>}
 */
proto.SkipGracefulOrchestrationTerminationsResponse.prototype.getUnterminatedinstanceidsList = function() {
  return /** @type {!Array<string>} */ (jspb.Message.getRepeatedField(this, 1));
};


/**
 * @param {!Array<string>} value
 * @return {!proto.SkipGracefulOrchestrationTerminationsResponse} returns this
 */
proto.SkipGracefulOrchestrationTerminationsResponse.prototype.setUnterminatedinstanceidsList = function(value) {
  return jspb.Message.setField(this, 1, value || []);
};


/**
 * @param {string} value
 * @param {number=} opt_index
 * @return {!proto.SkipGracefulOrchestrationTerminationsResponse} returns this
 */
proto.SkipGracefulOrchestrationTerminationsResponse.prototype.addUnterminatedinstanceids = function(value, opt_index) {
  return jspb.Message.addToRepeatedField(this, 1, value, opt_index);
};


/**
 * Clears the list making it empty but non-null.
 * @return {!proto.SkipGracefulOrchestrationTerminationsResponse} returns this
 */
proto.SkipGracefulOrchestrationTerminationsResponse.prototype.clearUnterminatedinstanceidsList = function() {
  return this.setUnterminatedinstanceidsList([]);
};



/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.GetWorkItemsRequest.repeatedFields_ = [10];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.GetWorkItemsRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.GetWorkItemsRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.GetWorkItemsRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.GetWorkItemsRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    maxconcurrentorchestrationworkitems: jspb.Message.getFieldWithDefault(msg, 1, 0),
    maxconcurrentactivityworkitems: jspb.Message.getFieldWithDefault(msg, 2, 0),
    maxconcurrententityworkitems: jspb.Message.getFieldWithDefault(msg, 3, 0),
    capabilitiesList: (f = jspb.Message.getRepeatedField(msg, 10)) == null ? undefined : f
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.GetWorkItemsRequest}
 */
proto.GetWorkItemsRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.GetWorkItemsRequest;
  return proto.GetWorkItemsRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.GetWorkItemsRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.GetWorkItemsRequest}
 */
proto.GetWorkItemsRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readInt32());
      msg.setMaxconcurrentorchestrationworkitems(value);
      break;
    case 2:
      var value = /** @type {number} */ (reader.readInt32());
      msg.setMaxconcurrentactivityworkitems(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readInt32());
      msg.setMaxconcurrententityworkitems(value);
      break;
    case 10:
      var values = /** @type {!Array<!proto.WorkerCapability>} */ (reader.isDelimited() ? reader.readPackedEnum() : [reader.readEnum()]);
      for (var i = 0; i < values.length; i++) {
        msg.addCapabilities(values[i]);
      }
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.GetWorkItemsRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.GetWorkItemsRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.GetWorkItemsRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.GetWorkItemsRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getMaxconcurrentorchestrationworkitems();
  if (f !== 0) {
    writer.writeInt32(
      1,
      f
    );
  }
  f = message.getMaxconcurrentactivityworkitems();
  if (f !== 0) {
    writer.writeInt32(
      2,
      f
    );
  }
  f = message.getMaxconcurrententityworkitems();
  if (f !== 0) {
    writer.writeInt32(
      3,
      f
    );
  }
  f = message.getCapabilitiesList();
  if (f.length > 0) {
    writer.writePackedEnum(
      10,
      f
    );
  }
};


/**
 * optional int32 maxConcurrentOrchestrationWorkItems = 1;
 * @return {number}
 */
proto.GetWorkItemsRequest.prototype.getMaxconcurrentorchestrationworkitems = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/**
 * @param {number} value
 * @return {!proto.GetWorkItemsRequest} returns this
 */
proto.GetWorkItemsRequest.prototype.setMaxconcurrentorchestrationworkitems = function(value) {
  return jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional int32 maxConcurrentActivityWorkItems = 2;
 * @return {number}
 */
proto.GetWorkItemsRequest.prototype.getMaxconcurrentactivityworkitems = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 2, 0));
};


/**
 * @param {number} value
 * @return {!proto.GetWorkItemsRequest} returns this
 */
proto.GetWorkItemsRequest.prototype.setMaxconcurrentactivityworkitems = function(value) {
  return jspb.Message.setProto3IntField(this, 2, value);
};


/**
 * optional int32 maxConcurrentEntityWorkItems = 3;
 * @return {number}
 */
proto.GetWorkItemsRequest.prototype.getMaxconcurrententityworkitems = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/**
 * @param {number} value
 * @return {!proto.GetWorkItemsRequest} returns this
 */
proto.GetWorkItemsRequest.prototype.setMaxconcurrententityworkitems = function(value) {
  return jspb.Message.setProto3IntField(this, 3, value);
};


/**
 * repeated WorkerCapability capabilities = 10;
 * @return {!Array<!proto.WorkerCapability>}
 */
proto.GetWorkItemsRequest.prototype.getCapabilitiesList = function() {
  return /** @type {!Array<!proto.WorkerCapability>} */ (jspb.Message.getRepeatedField(this, 10));
};


/**
 * @param {!Array<!proto.WorkerCapability>} value
 * @return {!proto.GetWorkItemsRequest} returns this
 */
proto.GetWorkItemsRequest.prototype.setCapabilitiesList = function(value) {
  return jspb.Message.setField(this, 10, value || []);
};


/**
 * @param {!proto.WorkerCapability} value
 * @param {number=} opt_index
 * @return {!proto.GetWorkItemsRequest} returns this
 */
proto.GetWorkItemsRequest.prototype.addCapabilities = function(value, opt_index) {
  return jspb.Message.addToRepeatedField(this, 10, value, opt_index);
};


/**
 * Clears the list making it empty but non-null.
 * @return {!proto.GetWorkItemsRequest} returns this
 */
proto.GetWorkItemsRequest.prototype.clearCapabilitiesList = function() {
  return this.setCapabilitiesList([]);
};



/**
 * Oneof group definitions for this message. Each group defines the field
 * numbers belonging to that group. When of these fields' value is set, all
 * other fields in the group are cleared. During deserialization, if multiple
 * fields are encountered for a group, only the last value seen will be kept.
 * @private {!Array<!Array<number>>}
 * @const
 */
proto.WorkItem.oneofGroups_ = [[1,2,3,4,5]];

/**
 * @enum {number}
 */
proto.WorkItem.RequestCase = {
  REQUEST_NOT_SET: 0,
  ORCHESTRATORREQUEST: 1,
  ACTIVITYREQUEST: 2,
  ENTITYREQUEST: 3,
  HEALTHPING: 4,
  ENTITYREQUESTV2: 5
};

/**
 * @return {proto.WorkItem.RequestCase}
 */
proto.WorkItem.prototype.getRequestCase = function() {
  return /** @type {proto.WorkItem.RequestCase} */(jspb.Message.computeOneofCase(this, proto.WorkItem.oneofGroups_[0]));
};



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.WorkItem.prototype.toObject = function(opt_includeInstance) {
  return proto.WorkItem.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.WorkItem} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.WorkItem.toObject = function(includeInstance, msg) {
  var f, obj = {
    orchestratorrequest: (f = msg.getOrchestratorrequest()) && proto.OrchestratorRequest.toObject(includeInstance, f),
    activityrequest: (f = msg.getActivityrequest()) && proto.ActivityRequest.toObject(includeInstance, f),
    entityrequest: (f = msg.getEntityrequest()) && proto.EntityBatchRequest.toObject(includeInstance, f),
    healthping: (f = msg.getHealthping()) && proto.HealthPing.toObject(includeInstance, f),
    entityrequestv2: (f = msg.getEntityrequestv2()) && proto.EntityRequest.toObject(includeInstance, f),
    completiontoken: jspb.Message.getFieldWithDefault(msg, 10, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.WorkItem}
 */
proto.WorkItem.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.WorkItem;
  return proto.WorkItem.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.WorkItem} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.WorkItem}
 */
proto.WorkItem.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.OrchestratorRequest;
      reader.readMessage(value,proto.OrchestratorRequest.deserializeBinaryFromReader);
      msg.setOrchestratorrequest(value);
      break;
    case 2:
      var value = new proto.ActivityRequest;
      reader.readMessage(value,proto.ActivityRequest.deserializeBinaryFromReader);
      msg.setActivityrequest(value);
      break;
    case 3:
      var value = new proto.EntityBatchRequest;
      reader.readMessage(value,proto.EntityBatchRequest.deserializeBinaryFromReader);
      msg.setEntityrequest(value);
      break;
    case 4:
      var value = new proto.HealthPing;
      reader.readMessage(value,proto.HealthPing.deserializeBinaryFromReader);
      msg.setHealthping(value);
      break;
    case 5:
      var value = new proto.EntityRequest;
      reader.readMessage(value,proto.EntityRequest.deserializeBinaryFromReader);
      msg.setEntityrequestv2(value);
      break;
    case 10:
      var value = /** @type {string} */ (reader.readString());
      msg.setCompletiontoken(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.WorkItem.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.WorkItem.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.WorkItem} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.WorkItem.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getOrchestratorrequest();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      proto.OrchestratorRequest.serializeBinaryToWriter
    );
  }
  f = message.getActivityrequest();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      proto.ActivityRequest.serializeBinaryToWriter
    );
  }
  f = message.getEntityrequest();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      proto.EntityBatchRequest.serializeBinaryToWriter
    );
  }
  f = message.getHealthping();
  if (f != null) {
    writer.writeMessage(
      4,
      f,
      proto.HealthPing.serializeBinaryToWriter
    );
  }
  f = message.getEntityrequestv2();
  if (f != null) {
    writer.writeMessage(
      5,
      f,
      proto.EntityRequest.serializeBinaryToWriter
    );
  }
  f = message.getCompletiontoken();
  if (f.length > 0) {
    writer.writeString(
      10,
      f
    );
  }
};


/**
 * optional OrchestratorRequest orchestratorRequest = 1;
 * @return {?proto.OrchestratorRequest}
 */
proto.WorkItem.prototype.getOrchestratorrequest = function() {
  return /** @type{?proto.OrchestratorRequest} */ (
    jspb.Message.getWrapperField(this, proto.OrchestratorRequest, 1));
};


/**
 * @param {?proto.OrchestratorRequest|undefined} value
 * @return {!proto.WorkItem} returns this
*/
proto.WorkItem.prototype.setOrchestratorrequest = function(value) {
  return jspb.Message.setOneofWrapperField(this, 1, proto.WorkItem.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.WorkItem} returns this
 */
proto.WorkItem.prototype.clearOrchestratorrequest = function() {
  return this.setOrchestratorrequest(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.WorkItem.prototype.hasOrchestratorrequest = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * optional ActivityRequest activityRequest = 2;
 * @return {?proto.ActivityRequest}
 */
proto.WorkItem.prototype.getActivityrequest = function() {
  return /** @type{?proto.ActivityRequest} */ (
    jspb.Message.getWrapperField(this, proto.ActivityRequest, 2));
};


/**
 * @param {?proto.ActivityRequest|undefined} value
 * @return {!proto.WorkItem} returns this
*/
proto.WorkItem.prototype.setActivityrequest = function(value) {
  return jspb.Message.setOneofWrapperField(this, 2, proto.WorkItem.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.WorkItem} returns this
 */
proto.WorkItem.prototype.clearActivityrequest = function() {
  return this.setActivityrequest(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.WorkItem.prototype.hasActivityrequest = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional EntityBatchRequest entityRequest = 3;
 * @return {?proto.EntityBatchRequest}
 */
proto.WorkItem.prototype.getEntityrequest = function() {
  return /** @type{?proto.EntityBatchRequest} */ (
    jspb.Message.getWrapperField(this, proto.EntityBatchRequest, 3));
};


/**
 * @param {?proto.EntityBatchRequest|undefined} value
 * @return {!proto.WorkItem} returns this
*/
proto.WorkItem.prototype.setEntityrequest = function(value) {
  return jspb.Message.setOneofWrapperField(this, 3, proto.WorkItem.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.WorkItem} returns this
 */
proto.WorkItem.prototype.clearEntityrequest = function() {
  return this.setEntityrequest(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.WorkItem.prototype.hasEntityrequest = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional HealthPing healthPing = 4;
 * @return {?proto.HealthPing}
 */
proto.WorkItem.prototype.getHealthping = function() {
  return /** @type{?proto.HealthPing} */ (
    jspb.Message.getWrapperField(this, proto.HealthPing, 4));
};


/**
 * @param {?proto.HealthPing|undefined} value
 * @return {!proto.WorkItem} returns this
*/
proto.WorkItem.prototype.setHealthping = function(value) {
  return jspb.Message.setOneofWrapperField(this, 4, proto.WorkItem.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.WorkItem} returns this
 */
proto.WorkItem.prototype.clearHealthping = function() {
  return this.setHealthping(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.WorkItem.prototype.hasHealthping = function() {
  return jspb.Message.getField(this, 4) != null;
};


/**
 * optional EntityRequest entityRequestV2 = 5;
 * @return {?proto.EntityRequest}
 */
proto.WorkItem.prototype.getEntityrequestv2 = function() {
  return /** @type{?proto.EntityRequest} */ (
    jspb.Message.getWrapperField(this, proto.EntityRequest, 5));
};


/**
 * @param {?proto.EntityRequest|undefined} value
 * @return {!proto.WorkItem} returns this
*/
proto.WorkItem.prototype.setEntityrequestv2 = function(value) {
  return jspb.Message.setOneofWrapperField(this, 5, proto.WorkItem.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.WorkItem} returns this
 */
proto.WorkItem.prototype.clearEntityrequestv2 = function() {
  return this.setEntityrequestv2(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.WorkItem.prototype.hasEntityrequestv2 = function() {
  return jspb.Message.getField(this, 5) != null;
};


/**
 * optional string completionToken = 10;
 * @return {string}
 */
proto.WorkItem.prototype.getCompletiontoken = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 10, ""));
};


/**
 * @param {string} value
 * @return {!proto.WorkItem} returns this
 */
proto.WorkItem.prototype.setCompletiontoken = function(value) {
  return jspb.Message.setProto3StringField(this, 10, value);
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.CompleteTaskResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.CompleteTaskResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.CompleteTaskResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.CompleteTaskResponse.toObject = function(includeInstance, msg) {
  var f, obj = {

  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.CompleteTaskResponse}
 */
proto.CompleteTaskResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.CompleteTaskResponse;
  return proto.CompleteTaskResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.CompleteTaskResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.CompleteTaskResponse}
 */
proto.CompleteTaskResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.CompleteTaskResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.CompleteTaskResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.CompleteTaskResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.CompleteTaskResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.HealthPing.prototype.toObject = function(opt_includeInstance) {
  return proto.HealthPing.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.HealthPing} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.HealthPing.toObject = function(includeInstance, msg) {
  var f, obj = {

  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.HealthPing}
 */
proto.HealthPing.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.HealthPing;
  return proto.HealthPing.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.HealthPing} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.HealthPing}
 */
proto.HealthPing.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.HealthPing.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.HealthPing.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.HealthPing} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.HealthPing.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.StreamInstanceHistoryRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.StreamInstanceHistoryRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.StreamInstanceHistoryRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.StreamInstanceHistoryRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    instanceid: jspb.Message.getFieldWithDefault(msg, 1, ""),
    executionid: (f = msg.getExecutionid()) && google_protobuf_wrappers_pb.StringValue.toObject(includeInstance, f),
    forworkitemprocessing: jspb.Message.getBooleanFieldWithDefault(msg, 3, false)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.StreamInstanceHistoryRequest}
 */
proto.StreamInstanceHistoryRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.StreamInstanceHistoryRequest;
  return proto.StreamInstanceHistoryRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.StreamInstanceHistoryRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.StreamInstanceHistoryRequest}
 */
proto.StreamInstanceHistoryRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setInstanceid(value);
      break;
    case 2:
      var value = new google_protobuf_wrappers_pb.StringValue;
      reader.readMessage(value,google_protobuf_wrappers_pb.StringValue.deserializeBinaryFromReader);
      msg.setExecutionid(value);
      break;
    case 3:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setForworkitemprocessing(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.StreamInstanceHistoryRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.StreamInstanceHistoryRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.StreamInstanceHistoryRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.StreamInstanceHistoryRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstanceid();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getExecutionid();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      google_protobuf_wrappers_pb.StringValue.serializeBinaryToWriter
    );
  }
  f = message.getForworkitemprocessing();
  if (f) {
    writer.writeBool(
      3,
      f
    );
  }
};


/**
 * optional string instanceId = 1;
 * @return {string}
 */
proto.StreamInstanceHistoryRequest.prototype.getInstanceid = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.StreamInstanceHistoryRequest} returns this
 */
proto.StreamInstanceHistoryRequest.prototype.setInstanceid = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional google.protobuf.StringValue executionId = 2;
 * @return {?proto.google.protobuf.StringValue}
 */
proto.StreamInstanceHistoryRequest.prototype.getExecutionid = function() {
  return /** @type{?proto.google.protobuf.StringValue} */ (
    jspb.Message.getWrapperField(this, google_protobuf_wrappers_pb.StringValue, 2));
};


/**
 * @param {?proto.google.protobuf.StringValue|undefined} value
 * @return {!proto.StreamInstanceHistoryRequest} returns this
*/
proto.StreamInstanceHistoryRequest.prototype.setExecutionid = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.StreamInstanceHistoryRequest} returns this
 */
proto.StreamInstanceHistoryRequest.prototype.clearExecutionid = function() {
  return this.setExecutionid(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.StreamInstanceHistoryRequest.prototype.hasExecutionid = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional bool forWorkItemProcessing = 3;
 * @return {boolean}
 */
proto.StreamInstanceHistoryRequest.prototype.getForworkitemprocessing = function() {
  return /** @type {boolean} */ (jspb.Message.getBooleanFieldWithDefault(this, 3, false));
};


/**
 * @param {boolean} value
 * @return {!proto.StreamInstanceHistoryRequest} returns this
 */
proto.StreamInstanceHistoryRequest.prototype.setForworkitemprocessing = function(value) {
  return jspb.Message.setProto3BooleanField(this, 3, value);
};



/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.HistoryChunk.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.HistoryChunk.prototype.toObject = function(opt_includeInstance) {
  return proto.HistoryChunk.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.HistoryChunk} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.HistoryChunk.toObject = function(includeInstance, msg) {
  var f, obj = {
    eventsList: jspb.Message.toObjectList(msg.getEventsList(),
    proto.HistoryEvent.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.HistoryChunk}
 */
proto.HistoryChunk.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.HistoryChunk;
  return proto.HistoryChunk.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.HistoryChunk} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.HistoryChunk}
 */
proto.HistoryChunk.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.HistoryEvent;
      reader.readMessage(value,proto.HistoryEvent.deserializeBinaryFromReader);
      msg.addEvents(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.HistoryChunk.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.HistoryChunk.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.HistoryChunk} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.HistoryChunk.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getEventsList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.HistoryEvent.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HistoryEvent events = 1;
 * @return {!Array<!proto.HistoryEvent>}
 */
proto.HistoryChunk.prototype.getEventsList = function() {
  return /** @type{!Array<!proto.HistoryEvent>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.HistoryEvent, 1));
};


/**
 * @param {!Array<!proto.HistoryEvent>} value
 * @return {!proto.HistoryChunk} returns this
*/
proto.HistoryChunk.prototype.setEventsList = function(value) {
  return jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.HistoryEvent=} opt_value
 * @param {number=} opt_index
 * @return {!proto.HistoryEvent}
 */
proto.HistoryChunk.prototype.addEvents = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.HistoryEvent, opt_index);
};


/**
 * Clears the list making it empty but non-null.
 * @return {!proto.HistoryChunk} returns this
 */
proto.HistoryChunk.prototype.clearEventsList = function() {
  return this.setEventsList([]);
};



/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.InstanceBatch.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.InstanceBatch.prototype.toObject = function(opt_includeInstance) {
  return proto.InstanceBatch.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.InstanceBatch} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.InstanceBatch.toObject = function(includeInstance, msg) {
  var f, obj = {
    instanceidsList: (f = jspb.Message.getRepeatedField(msg, 1)) == null ? undefined : f
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.InstanceBatch}
 */
proto.InstanceBatch.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.InstanceBatch;
  return proto.InstanceBatch.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.InstanceBatch} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.InstanceBatch}
 */
proto.InstanceBatch.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.addInstanceids(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.InstanceBatch.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.InstanceBatch.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.InstanceBatch} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.InstanceBatch.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInstanceidsList();
  if (f.length > 0) {
    writer.writeRepeatedString(
      1,
      f
    );
  }
};


/**
 * repeated string instanceIds = 1;
 * @return {!Array<string>}
 */
proto.InstanceBatch.prototype.getInstanceidsList = function() {
  return /** @type {!Array<string>} */ (jspb.Message.getRepeatedField(this, 1));
};


/**
 * @param {!Array<string>} value
 * @return {!proto.InstanceBatch} returns this
 */
proto.InstanceBatch.prototype.setInstanceidsList = function(value) {
  return jspb.Message.setField(this, 1, value || []);
};


/**
 * @param {string} value
 * @param {number=} opt_index
 * @return {!proto.InstanceBatch} returns this
 */
proto.InstanceBatch.prototype.addInstanceids = function(value, opt_index) {
  return jspb.Message.addToRepeatedField(this, 1, value, opt_index);
};


/**
 * Clears the list making it empty but non-null.
 * @return {!proto.InstanceBatch} returns this
 */
proto.InstanceBatch.prototype.clearInstanceidsList = function() {
  return this.setInstanceidsList([]);
};


/**
 * @enum {number}
 */
proto.OrchestrationStatus = {
  ORCHESTRATION_STATUS_RUNNING: 0,
  ORCHESTRATION_STATUS_COMPLETED: 1,
  ORCHESTRATION_STATUS_CONTINUED_AS_NEW: 2,
  ORCHESTRATION_STATUS_FAILED: 3,
  ORCHESTRATION_STATUS_CANCELED: 4,
  ORCHESTRATION_STATUS_TERMINATED: 5,
  ORCHESTRATION_STATUS_PENDING: 6,
  ORCHESTRATION_STATUS_SUSPENDED: 7
};

/**
 * @enum {number}
 */
proto.WorkerCapability = {
  WORKER_CAPABILITY_UNSPECIFIED: 0,
  WORKER_CAPABILITY_HISTORY_STREAMING: 1,
  WORKER_CAPABILITY_SCHEDULED_TASKS: 2,
  WORKER_CAPABILITY_LARGE_PAYLOADS: 3
};

goog.object.extend(exports, proto);
