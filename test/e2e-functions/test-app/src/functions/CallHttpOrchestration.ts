// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Exercises the restored v3 `context.df.callHttp` API end-to-end. The orchestration
// calls the app's OWN http endpoints (HttpEcho / HttpAsyncEcho) so the suite stays
// hermetic — no external network is required. HttpAsyncEcho drives a stateless
// 202 -> Location -> 200 poll loop keyed off an `attempt` query param.

import { app, HttpHandler, HttpRequest, HttpResponse, HttpResponseInit, InvocationContext } from '@azure/functions';
import * as df from 'durable-functions';
import { CallHttpOptions, OrchestrationContext, OrchestrationHandler } from 'durable-functions';

// Orchestration: issue a single durable callHttp and return the final status + body.
const CallHttpOrchestration: OrchestrationHandler = function* (context: OrchestrationContext) {
    const input = context.df.getInput<{ url: string; enablePolling?: boolean }>();
    const options: CallHttpOptions = { method: 'GET', url: input.url };
    if (input.enablePolling !== undefined) {
        options.enablePolling = input.enablePolling;
    }
    const response = (yield context.df.callHttp(options)) as { statusCode: number; content?: string };
    return { statusCode: response.statusCode, content: response.content };
};
df.app.orchestration('CallHttpOrchestration', CallHttpOrchestration);

// Downstream endpoint (sync path): echoes the `value` query param as JSON.
const HttpEcho: HttpHandler = async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ echoed: request.query.get('value') ?? 'default', method: request.method }),
    };
};
app.http('HttpEcho', {
    route: 'HttpEcho',
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: HttpEcho,
});

// Downstream endpoint (async 202 pattern): stateless poll loop keyed off `attempt`.
// The first request returns 202 with a Location pointing at attempt+1; the next
// returns the final 200. Encoding attempt in the URL keeps it deterministic across
// worker processes (no module-level state).
const HttpAsyncEcho: HttpHandler = async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const attempt = parseInt(request.query.get('attempt') ?? '1', 10);
    if (attempt < 2) {
        const next = new URL(request.url);
        next.searchParams.set('attempt', String(attempt + 1));
        return {
            status: 202,
            headers: { Location: next.toString(), 'Retry-After': '1' },
        };
    }
    return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ echoed: 'async-done', attempt }),
    };
};
app.http('HttpAsyncEcho', {
    route: 'HttpAsyncEcho',
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: HttpAsyncEcho,
});

// HTTP starter: schedule CallHttpOrchestration pointed at one of the app's own
// endpoints. `mode` selects the sync (HttpEcho), polling, or no-poll variant.
const CallHttp_HttpStart: HttpHandler = async (request: HttpRequest, context: InvocationContext): Promise<HttpResponse> => {
    const client = df.getClient(context);
    const origin = new URL(request.url).origin;
    const mode = request.query.get('mode') ?? 'sync';

    let input: { url: string; enablePolling?: boolean };
    if (mode === 'sync') {
        input = { url: `${origin}/api/HttpEcho?value=hello` };
    } else if (mode === 'nopoll') {
        input = { url: `${origin}/api/HttpAsyncEcho`, enablePolling: false };
    } else {
        input = { url: `${origin}/api/HttpAsyncEcho` };
    }

    const instanceId = await client.startNew('CallHttpOrchestration', { input });
    return client.createCheckStatusResponse(request, instanceId);
};
app.http('CallHttp_HttpStart', {
    route: 'CallHttp_HttpStart',
    extraInputs: [df.input.durableClient()],
    methods: ['GET', 'POST'],
    handler: CallHttp_HttpStart,
});
