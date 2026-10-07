// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { app, HttpHandler, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import * as df from 'durable-functions';
import { OrchestrationContext, OrchestrationHandler } from 'durable-functions';

const childName = 'TaggedSubOrchestrationChild';
const parentName = 'TaggedSubOrchestrationParent';

const TaggedSubOrchestrationChild: OrchestrationHandler = function* (context: OrchestrationContext) {
    yield context.df.Task.all([]);
    return 'completed';
};
df.app.orchestration(childName, TaggedSubOrchestrationChild);

const TaggedSubOrchestrationParent: OrchestrationHandler = function* (context: OrchestrationContext) {
    const input = context.df.getInput<{ childInstanceId: string }>();
    return yield context.df.callSubOrchestrator(childName, undefined, {
        instanceId: input.childInstanceId,
        tags: {
            environment: 'functions-e2e',
            empty: '',
        },
    });
};
df.app.orchestration(parentName, TaggedSubOrchestrationParent);

const StartTaggedSubOrchestration: HttpHandler = async (
    request: HttpRequest,
    context: InvocationContext,
): Promise<HttpResponseInit> => {
    const parentInstanceId = request.query.get('parentInstanceId');
    const childInstanceId = request.query.get('childInstanceId');
    if (!parentInstanceId || !childInstanceId) {
        return {
            status: 400,
            body: 'parentInstanceId and childInstanceId are required',
        };
    }

    const client = df.getClient(context);
    const instanceId = await client.startNew(parentName, {
        instanceId: parentInstanceId,
        input: { childInstanceId },
    });
    return client.createCheckStatusResponse(request, instanceId);
};

app.http('StartTaggedSubOrchestration', {
    route: 'StartTaggedSubOrchestration',
    extraInputs: [df.input.durableClient()],
    handler: StartTaggedSubOrchestration,
});

const GetTaggedSubOrchestrationMetadata: HttpHandler = async (
    request: HttpRequest,
    context: InvocationContext,
): Promise<HttpResponseInit> => {
    const instanceId = request.query.get('instanceId');
    if (!instanceId) {
        return {
            status: 400,
            body: 'instanceId is required',
        };
    }

    const state = await df.getClient(context).waitForOrchestrationCompletion(instanceId, true, 60);
    if (!state) {
        return {
            status: 404,
            body: `Orchestration '${instanceId}' was not found`,
        };
    }

    return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            instanceId: state.instanceId,
            name: state.name,
            isCompleted: state.isCompleted,
            tags: state.tags,
        }),
    };
};

app.http('GetTaggedSubOrchestrationMetadata', {
    route: 'GetTaggedSubOrchestrationMetadata',
    extraInputs: [df.input.durableClient()],
    handler: GetTaggedSubOrchestrationMetadata,
});
