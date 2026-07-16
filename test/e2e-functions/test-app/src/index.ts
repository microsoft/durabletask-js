// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Ported from the azure-functions-durable-extension e2e `BasicNode` app.

import { app } from '@azure/functions';

app.setup({
    enableHttpStream: true,
});
