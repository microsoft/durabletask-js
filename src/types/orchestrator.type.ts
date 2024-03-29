// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { OrchestrationContext } from "../task/context/orchestration-context";
import { Task } from "../task/task";
import { TOutput } from "./output.type";

export type TOrchestrator = (context: OrchestrationContext, input: any) => Generator<Task<any>, any, any> | TOutput;
