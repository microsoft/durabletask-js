// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Exercises the restored v3 `context.df.callHttp` API end-to-end. The orchestration
// calls the app's OWN http endpoints (HttpEcho / HttpAsyncEcho) so the suite stays
// hermetic — no external network is required. HttpAsyncEcho drives a stateless
// 202 -> Location -> 200 poll loop keyed off an `attempt` query param.
//
// HttpCrossOriginStart / HttpAuthEcho additionally exercise the cross-origin credential
// policy: the poll Location always targets the `localhost` origin, so a first hop made via
// the `127.0.0.1` origin is cross-origin (Authorization stripped) while a first hop via
// `localhost` is same-origin (Authorization forwarded). Both resolve to loopback.

import { app, HttpHandler, HttpRequest, HttpResponse, HttpResponseInit, InvocationContext } from '@azure/functions';
import * as df from 'durable-functions';
import { CallHttpOptions, OrchestrationContext, OrchestrationHandler } from 'durable-functions';

// Orchestration: issue a single durable callHttp and return the final status + body.
const CallHttpOrchestration: OrchestrationHandler = function* (context: OrchestrationContext) {
    const input = context.df.getInput<{
        url: string;
        enablePolling?: boolean;
        headers?: { [key: string]: string };
    }>();
    const options: CallHttpOptions = { method: 'GET', url: input.url };
    if (input.headers !== undefined) {
        options.headers = input.headers;
    }
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

// Downstream endpoint (cross-origin poll start): returns 202 with a Location that ALWAYS
// targets the `localhost` origin. When the first hop arrived via the `127.0.0.1` origin the
// poll Location is therefore a *different* origin (credentials must be stripped); when it
// arrived via `localhost` the Location is the *same* origin (credentials forwarded). Both host
// strings resolve to loopback, so the suite stays hermetic.
const HttpCrossOriginStart: HttpHandler = async (
    request: HttpRequest,
    _context: InvocationContext,
): Promise<HttpResponseInit> => {
    // Build the poll target by construction rather than string interpolation: a template literal on
    // `${u.port}` emits an invalid empty `localhost:` whenever the incoming request used a protocol
    // default port (80/443, where `URL.port` is ""). `URL` omits the port when it is the scheme default
    // and preserves it otherwise, so the hazard disappears while the origin still flips to `localhost`.
    const target = new URL(request.url);
    target.hostname = 'localhost';
    target.pathname = '/api/HttpAuthEcho';
    target.search = '';
    const location = target.toString();
    return {
        status: 202,
        headers: { Location: location, 'Retry-After': '1' },
    };
};
app.http('HttpCrossOriginStart', {
    route: 'HttpCrossOriginStart',
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: HttpCrossOriginStart,
});

// Downstream endpoint (poll target): echoes back the Authorization header it received so the
// test can assert whether the poll forwarded (same-origin) or stripped (cross-origin) it.
const HttpAuthEcho: HttpHandler = async (
    request: HttpRequest,
    _context: InvocationContext,
): Promise<HttpResponseInit> => {
    return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ echoed: 'xorigin-done', authorization: request.headers.get('authorization') }),
    };
};
app.http('HttpAuthEcho', {
    route: 'HttpAuthEcho',
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: HttpAuthEcho,
});

// HTTP starter: schedule CallHttpOrchestration pointed at one of the app's own
// endpoints. `mode` selects the sync (HttpEcho), polling, or no-poll variant.
const CallHttp_HttpStart: HttpHandler = async (request: HttpRequest, context: InvocationContext): Promise<HttpResponse> => {
    const client = df.getClient(context);
    const origin = new URL(request.url).origin;
    const mode = request.query.get('mode') ?? 'sync';

    let input: { url: string; enablePolling?: boolean; headers?: { [key: string]: string } };
    if (mode === 'sync') {
        input = { url: `${origin}/api/HttpEcho?value=hello` };
    } else if (mode === 'nopoll') {
        input = { url: `${origin}/api/HttpAsyncEcho`, enablePolling: false };
    } else if (mode === 'xorigin' || mode === 'xorigin-same') {
        // Carry an Authorization header the poll must handle per the cross-origin policy. The first
        // hop uses the `127.0.0.1` origin for `xorigin` (so the localhost Location is cross-origin and
        // the credential is stripped) and the `localhost` origin for `xorigin-same` (so the Location is
        // same-origin and the credential is forwarded). Both share the host's port.
        // Build the URL by construction, not string interpolation: a `${u.port}` template emits an
        // invalid dangling `:` (e.g. `https://127.0.0.1:/api/...`) whenever the host used a protocol
        // default port (80/443, where `URL.port` is ""). Setting `hostname` keeps the host's actual
        // port, and `URL` omits it only when it is the scheme default. Mirrors `HttpCrossOriginStart` above.
        const target = new URL(request.url);
        target.hostname = mode === 'xorigin' ? '127.0.0.1' : 'localhost';
        target.pathname = '/api/HttpCrossOriginStart';
        target.search = '';
        input = {
            url: target.toString(),
            headers: { Authorization: 'Bearer e2e-secret' },
        };
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
