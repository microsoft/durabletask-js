// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { EntityInstanceId } from "@microsoft/durabletask-js";

/**
 * Classic Durable Functions (v3) entity identifier, constructed as `new EntityId(name, key)`.
 *
 * @remarks
 * A thin subclass of the core {@link EntityInstanceId}, retained so existing `durable-functions`
 * code that builds `new df.EntityId(name, key)` and passes it to `callEntity` / `signalEntity` /
 * `readEntityState` keeps working. The entity name is normalized to lowercase and the key is
 * preserved, matching the core behavior.
 */
export class EntityId extends EntityInstanceId {}
