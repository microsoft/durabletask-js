// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Orchestrator-shape routing coverage for the compat `durable-functions` package (#321/#322).
 *
 * The compat layer accepts BOTH the classic Durable Functions v3 orchestrator shape (a sync
 * generator that uses `context.df.*`) AND the core-native durabletask-js shapes (async/sync,
 * generator/non-generator, that use the core `OrchestrationContext` directly). `wrapOrchestrator`
 * (packages/azure-functions-durable/src/orchestration-context.ts) must classify the shape and hand
 * each orchestrator the right context.
 *
 * Regression guard for #321/#322: a plain SYNC, single-argument, NON-generator orchestrator
 * `(ctx) => value` is the ambiguous shape. Before #322 it was mis-detected as classic and received a
 * `{ df, log }` context with no core members, so `ctx.instanceId` was `undefined` and it silently
 * completed with the garbage output `sync-native:undefined`. After #322 it is driven with the dual
 * context and returns `sync-native:<instanceId>`.
 *
 * These functions are driven end-to-end through a real `func start` host by
 * `test/e2e-functions/orchestrator-shapes.spec.ts`, using the generic `StartOrchestration` HTTP
 * starter registered in `HelloCities.ts`.
 */

import * as df from 'durable-functions';
import { OrchestrationContext as DfOrchestrationContext } from 'durable-functions';
import { OrchestrationContext } from '@microsoft/durabletask-js';

const echoActivity = 'ShapeEcho';

// Shared echo activity used by the generator shapes to prove they are actually driven (an activity
// round-trip) rather than short-circuited by the wrong context.
df.app.activity(echoActivity, { handler: (input: string): string => `echo:${input}` });

// 1) Classic v3 shape: sync generator using `context.df.*`. Must keep working (routed to classic).
df.app.orchestration('ShapeClassicGenerator', function* (context: DfOrchestrationContext) {
    const result = (yield context.df.callActivity(echoActivity, 'IN')) as string;
    return `classic:${result}`;
});

// 2) Core-native async generator, single arg: uses the core context (`ctx.callActivity`) directly.
//    Arity is 1 (like classic) but it is NOT classic; it must pass through unchanged and be driven.
df.app.orchestration('ShapeNativeGenerator', async function* (ctx: OrchestrationContext) {
    const result = (yield ctx.callActivity(echoActivity, 'IN')) as string;
    return `native-gen:${result}`;
});

// 3) #321/#322 regression: plain SYNC, single-arg, NON-generator core-native orchestrator. It reads a
//    CORE context member (`ctx.instanceId`); before #322 that was `undefined` (garbage output).
df.app.orchestration('ShapeSyncNative', (ctx: OrchestrationContext): string => `sync-native:${ctx.instanceId}`);

// 4) Plain ASYNC, single-arg, NON-generator core-native orchestrator (never a classic shape).
df.app.orchestration(
    'ShapeAsyncNative',
    async (ctx: OrchestrationContext): Promise<string> => `async-native:${ctx.instanceId}`,
);
