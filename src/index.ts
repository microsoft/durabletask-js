// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TaskHubGrpcClient } from "./client/client";
import { TaskHubGrpcWorker } from "./worker/task-hub-grpc-worker";
import { OrchestrationContext } from "./task/context/orchestration-context";
import { ActivityContext } from "./task/context/activity-context";

// Scheduler exports for Azure-managed Durable Task Scheduler
import {
  DurableTaskSchedulerConnectionString,
  AuthenticationType,
  AccessTokenCache,
  DurableTaskSchedulerOptions,
  DurableTaskSchedulerClientBuilder,
  DurableTaskSchedulerWorkerBuilder,
  SchedulerTaskHubGrpcClient,
  SchedulerTaskHubGrpcWorker,
  createSchedulerClient,
  createSchedulerWorkerBuilder,
  getCredentialFromAuthenticationType,
} from "./scheduler";

export {
  TaskHubGrpcClient,
  TaskHubGrpcWorker,
  OrchestrationContext,
  ActivityContext,
  // Scheduler exports
  DurableTaskSchedulerConnectionString,
  AuthenticationType,
  AccessTokenCache,
  DurableTaskSchedulerOptions,
  DurableTaskSchedulerClientBuilder,
  DurableTaskSchedulerWorkerBuilder,
  SchedulerTaskHubGrpcClient,
  SchedulerTaskHubGrpcWorker,
  createSchedulerClient,
  createSchedulerWorkerBuilder,
  getCredentialFromAuthenticationType,
};
