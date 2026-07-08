# Changelog

## 4.0.0-alpha.0

- Added the initial gRPC-consolidated Azure Functions Durable provider package.
- Added `DurableFunctionsClient`, a direct `TaskHubGrpcClient` subclass for host-provided gRPC client bindings.
- Added Functions HTTP management payload helpers, worker byte-processing adapter, and `durableRequiresGrpc` binding metadata helper.
- Added the authoring model (`app.orchestration` / `app.activity` / `app.entity`, `input.durableClient`, `getClient`).
- Added a classic (v3) backward-compatibility layer: `context.df.*` orchestration and entity context adapters (`wrapOrchestrator` / `wrapEntity`), `RetryOptions`, and the deprecated `DurableOrchestrationClient` alias. Classic single-parameter and core-native two-parameter handlers are both supported.
- Added classic (v3) client query-return types (`DurableOrchestrationStatus`, `OrchestrationRuntimeStatus`, `EntityStateResponse`, `PurgeHistoryResult`) and `DurableFunctionsClient` methods `getStatus` / `readEntityState` / `purgeInstanceHistory` that map from the core client. Added `context.df.callHttp`, which throws (the durabletask engine has no durable-HTTP equivalent).
- Added the remaining v3 client surface: `startNew`, `getStatusAll`, `getStatusBy`, and `waitForCompletionOrCreateCheckStatusResponse`, plus `context.df.parentInstanceId`. The client now honors the host-provided `maxGrpcMessageSizeInBytes` by wiring it into the gRPC channel options (parity with the Python provider).
- Added the classic (v3) client lifecycle aliases `raiseEvent`, `terminate`, `suspend`, `resume`, `rewind`, `restart`, and `purgeInstanceHistoryBy` as deprecated thin wrappers over the core `TaskHubGrpcClient` methods, so existing v3 management code keeps working. (`signalEntity` is already inherited under the same name.)
- Added the classic (v3) `EntityId` class (`new EntityId(name, key)`) so existing entity code that constructs entity ids keeps working, plus `context.df.entityId` / `context.df.isNewlyConstructed` / `context.df.signalEntity` on the entity context and a `context.df.customStatus` getter on the orchestration context.
