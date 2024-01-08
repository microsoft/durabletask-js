// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ActivityContext } from "../task/context/activity-context";

export type TActivity<TInput, TOutput> = (context: ActivityContext, input: TInput) => TOutput;
