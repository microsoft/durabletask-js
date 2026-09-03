## Upcoming

### New

- Add `ConcurrencyOptions` to configure the orchestration, activity, and entity concurrency
  hints sent by `TaskHubGrpcWorker` to the backend.
- Add an optional `newVersion` parameter to `OrchestrationContext.continueAsNew()` for version migrations.
- Implement entity support in the in-memory testing backend ([#341](https://github.com/microsoft/durabletask-js/pull/341))
- Add the top-level `StartOrchestrationOptions.dedupeStatuses` option, `ValidDedupeStatuses`, and
  `OrchestrationAlreadyExistsError`, aligned with the .NET status-based duplicate rejection and
  atomic replacement contract. The gRPC client defers omitted policies to its backend, while the
  in-memory test client mirrors the .NET shim by treating omission as all statuses reusable. The
  shared protocol does not support atomic no-op/`IGNORE`.
- Add the `CANCELED` member to the public `OrchestrationStatus` enum.

### Fixes

- Bound each worker sidecar hello attempt to 30 seconds, retry failed connections, and cancel
  pending hello calls and reconnect delays when the worker stops.
- Align worker stream recovery with the .NET SDK: reconnect after 120 seconds without a message
  or health ping, reset retry state only after the first message, use full-jitter backoff, reuse
  channels until five likely-poisoned failures, isolate recreated grpc-js transports, and defer
  disposal of replaced channels. Sidecars that do not send health-ping work items, including the
  current durabletask-go sidecar, should set `silentDisconnectTimeoutMs` to `0`.

## v0.4.0 (2026-07-31)

### Changes

- feat(durable-functions): restore worker-side callHttp ([#333](https://github.com/microsoft/durabletask-js/pull/333), fixes [#318](https://github.com/microsoft/durabletask-js/issues/318))
- [copilot-finds] Bug: Entity getState() produces unhelpful SyntaxError for corrupted state ([#309](https://github.com/microsoft/durabletask-js/pull/309))
- fix: prevent infinite loop in suspend/resume event buffer iteration ([#306](https://github.com/microsoft/durabletask-js/pull/306))
- fix: clear stale in-memory purge queue entries ([#285](https://github.com/microsoft/durabletask-js/pull/285))
- fix: preserve error cause chains in failure details ([#310](https://github.com/microsoft/durabletask-js/pull/310))
- fix: treat empty entity operation input as no input ([#283](https://github.com/microsoft/durabletask-js/pull/283))
- fix: use getValue() instead of toString() on protobuf StringValue in activity execution ([#280](https://github.com/microsoft/durabletask-js/pull/280))
- fix: clean up orchestration history streams ([#314](https://github.com/microsoft/durabletask-js/pull/314))
- fix: make raiseIfFailed honor failed runtime status ([#308](https://github.com/microsoft/durabletask-js/pull/308))
- fix: prevent test worker crash during completion error handling ([#305](https://github.com/microsoft/durabletask-js/pull/305))
- Add `durable-functions@4.0.0` — Azure Functions Durable provider on the gRPC core (+ core host helpers, E2E CI, and release pipeline) ([#282](https://github.com/microsoft/durabletask-js/pull/282))
- fix: use failure details for failed orchestration span messages ([#290](https://github.com/microsoft/durabletask-js/pull/290))
- Fix #301: WhenAll wait-all + aggregate-exception semantics (root cause of rewind deadlock) ([#302](https://github.com/microsoft/durabletask-js/pull/302))
- Add rewind support ([#296](https://github.com/microsoft/durabletask-js/pull/296))
- Fix #292: align core Task/TimerTask public shape (result/isCompleted/isFaulted, cancellable TimerTask) ([#293](https://github.com/microsoft/durabletask-js/pull/293))
- test: add missing RetryableTask coverage for non-retriable, remaining-timeout, and complete() override ([#289](https://github.com/microsoft/durabletask-js/pull/289))
- Fix #291: accept EVENTSENT/EVENTRAISED confirmation for entity calls on classic (Azure Storage) backend ([#294](https://github.com/microsoft/durabletask-js/pull/294))
- fix: normalize entity query prefix in client.getEntities() ([#286](https://github.com/microsoft/durabletask-js/pull/286))
- fix: validate invalid createTimer inputs ([#288](https://github.com/microsoft/durabletask-js/pull/288))
- fix: preserve EntityOperationFailedException details ([#277](https://github.com/microsoft/durabletask-js/pull/277))
- fix: exclude initializeState from TaskEntity method dispatch ([#278](https://github.com/microsoft/durabletask-js/pull/278))
- fix: preserve V2 entity operation info for index zero ([#279](https://github.com/microsoft/durabletask-js/pull/279))
- Add input validation for empty event names in waitForExternalEvent() and sendEvent() ([#276](https://github.com/microsoft/durabletask-js/pull/276))
- fix: reject non-finite retry policy values ([#274](https://github.com/microsoft/durabletask-js/pull/274))
- fix: use ordinal string comparison for deterministic ordering ([#273](https://github.com/microsoft/durabletask-js/pull/273))
- test: add Task and CompletableTask coverage ([#272](https://github.com/microsoft/durabletask-js/pull/272))
- fix: add missing action types to non-determinism method names ([#271](https://github.com/microsoft/durabletask-js/pull/271))
- fix: preserve continue-as-new carryover event ordering ([#269](https://github.com/microsoft/durabletask-js/pull/269))
- Fix: Handle EntityUnlockSent events in orchestration executor replay ([#268](https://github.com/microsoft/durabletask-js/pull/268))
- fix: Update instance status on suspend/resume in InMemoryOrchestrationBackend ([#176](https://github.com/microsoft/durabletask-js/pull/176))
- fix: prevent duplicate completion actions when setFailed() is called after setComplete() ([#267](https://github.com/microsoft/durabletask-js/pull/267))
- fix: use epoch fallback for entity lastModifiedTime ([#265](https://github.com/microsoft/durabletask-js/pull/265))
- fix: handle EventSent replay events ([#264](https://github.com/microsoft/durabletask-js/pull/264))
- fix: propagate parent instance info in in-memory backend ([#263](https://github.com/microsoft/durabletask-js/pull/263))
- fix: avoid wildcard names for anonymous generator functions ([#262](https://github.com/microsoft/durabletask-js/pull/262))
- fix: use epoch fallback for missing orchestration timestamps ([#261](https://github.com/microsoft/durabletask-js/pull/261))
- fix: add UNKNOWN fallback in getNewEventSummary for unrecognized event types ([#260](https://github.com/microsoft/durabletask-js/pull/260))
- [copilot-finds] Improve: withTimeout() input validation and remove dead sleepWithAbort ([#258](https://github.com/microsoft/durabletask-js/pull/258))
- fix: prevent unhandled rejections in worker execution wrappers ([#257](https://github.com/microsoft/durabletask-js/pull/257))
- build(deps): bump @grpc/grpc-js ([#259](https://github.com/microsoft/durabletask-js/pull/259))
- fix: use toLowerCase() instead of toLocaleLowerCase() for event name matching ([#180](https://github.com/microsoft/durabletask-js/pull/180))
- fix: track entity execution in pendingWorkItems for graceful shutdown ([#179](https://github.com/microsoft/durabletask-js/pull/179))
- fix: move activity input JSON.parse inside try-catch for proper error handling ([#181](https://github.com/microsoft/durabletask-js/pull/181))
- fix: Validate first yielded value in orchestrator run() method ([#164](https://github.com/microsoft/durabletask-js/pull/164))
- fix: Sub-orchestration watcher uses unintended 30s default timeout in InMemoryOrchestrationBackend ([#156](https://github.com/microsoft/durabletask-js/pull/156))
- fix: serialize custom status eagerly to prevent executor crash ([#195](https://github.com/microsoft/durabletask-js/pull/195))
- fix: cancel pending timers when purging orchestration instances ([#197](https://github.com/microsoft/durabletask-js/pull/197))
- [copilot-finds] Bug: Fix TestOrchestrationClient null serialization divergence from real client ([#199](https://github.com/microsoft/durabletask-js/pull/199))
- [copilot-finds] Bug: newOrchestrationState drops failure details when error message or type is empty string ([#198](https://github.com/microsoft/durabletask-js/pull/198))
- fix: Preserve original gRPC error cause in rewindInstance and restartOrchestration ([#200](https://github.com/microsoft/durabletask-js/pull/200))
- fix: Catch exceptions from user-provided retry handlers to prevent orchestration crash ([#193](https://github.com/microsoft/durabletask-js/pull/193))
- feat: Implement work item filters ([#168](https://github.com/microsoft/durabletask-js/pull/168))
- fix: Add guard clause to handleSubOrchestrationCompleted to prevent unconditional resume ([#183](https://github.com/microsoft/durabletask-js/pull/183))
- fix: Add stream cleanup and retry logic to gRPC error handler ([#182](https://github.com/microsoft/durabletask-js/pull/182))
- fix: Use strict undefined check for taskId in completion event handlers ([#157](https://github.com/microsoft/durabletask-js/pull/157))
- Add comprehensive unit tests for WhenAnyTask ([#162](https://github.com/microsoft/durabletask-js/pull/162))
- fix: Add missing non-Task validation in generator failure recovery path ([#163](https://github.com/microsoft/durabletask-js/pull/163))
- fix: Entity StateShim.setState() corrupts cache on serialization failure ([#151](https://github.com/microsoft/durabletask-js/pull/151))
- fix: clear customStatus on continue-as-new in InMemoryOrchestrationBackend ([#155](https://github.com/microsoft/durabletask-js/pull/155))
- fix: propagate parent notification from composite tasks (WhenAllTask/WhenAnyTask) ([#150](https://github.com/microsoft/durabletask-js/pull/150))
- fix: use deterministic time in createTimer instead of Date.now() ([#146](https://github.com/microsoft/durabletask-js/pull/146))
- Fix WhenAllTask constructor resetting \_completedTasks counter ([#143](https://github.com/microsoft/durabletask-js/pull/143))
- Fix retry handler treating undefined/null/NaN/Infinity as retry signal ([#142](https://github.com/microsoft/durabletask-js/pull/142))
- Release v0.3.0 ([#147](https://github.com/microsoft/durabletask-js/pull/147))

## v0.3.0 (2026-03-06)

### Changes

- Fix falsy values (0, empty string, false, null) silently dropped during serialization ([#138](https://github.com/microsoft/durabletask-js/pull/138))
- Fix PR verification agent: grant contents:write to push verification branches ([#141](https://github.com/microsoft/durabletask-js/pull/141))
- Enforce Azure Managed e2e tests in daily-code-review agent ([#139](https://github.com/microsoft/durabletask-js/pull/139))
- Add sample code branch push step to PR verification agent ([#137](https://github.com/microsoft/durabletask-js/pull/137))
- Fix continueAsNew dropping fire-and-forget actions (sendEvent, signalEntity) ([#136](https://github.com/microsoft/durabletask-js/pull/136))
- fix: clear orchestrationQueueSet in InMemoryOrchestrationBackend.reset() ([#133](https://github.com/microsoft/durabletask-js/pull/133))
- PR Verification Agent + github action ([#132](https://github.com/microsoft/durabletask-js/pull/132))
- fix: update daily code review agent to require tracking issues before PRs ([#130](https://github.com/microsoft/durabletask-js/pull/130))
- Fix WhenAllTask crash when children complete after fail-fast ([#123](https://github.com/microsoft/durabletask-js/pull/123))
- Optimize daily code review agent with focused detection playbook ([#128](https://github.com/microsoft/durabletask-js/pull/128))
- feat: align tracing attributes with .NET SDK conventions ([#126](https://github.com/microsoft/durabletask-js/pull/126))
- fix: set instanceId on ActivityResponse in failure path ([#122](https://github.com/microsoft/durabletask-js/pull/122))
- Update code review agent instructions ([#119](https://github.com/microsoft/durabletask-js/pull/119))
- [copilot-finds] Bug: Fix whenAll([]) hanging orchestration forever ([#118](https://github.com/microsoft/durabletask-js/pull/118))
- Daily Code Review Agent ([#117](https://github.com/microsoft/durabletask-js/pull/117))
- refactor: streamline orchestration event handling and improve state management ([#115](https://github.com/microsoft/durabletask-js/pull/115))
- Bump tar in the npm_and_yarn group across 1 directory ([#113](https://github.com/microsoft/durabletask-js/pull/113))
- Release v0.2.0 ([#112](https://github.com/microsoft/durabletask-js/pull/112))

## v0.2.0 (2026-02-18)

### Changes

- Update README.md to clarify SDK compatibility and improve usage instructions ([#110](https://github.com/microsoft/durabletask-js/pull/110))
- Update ESRP release configuration for durabletask-js and durabletask-js-azuremanaged ([#109](https://github.com/microsoft/durabletask-js/pull/109))
- Add autonomous issue triage agent for GitHub issues management ([#108](https://github.com/microsoft/durabletask-js/pull/108))
- Release v0.1.0-beta.1 ([#107](https://github.com/microsoft/durabletask-js/pull/107))

## v0.1.0-beta.1 (2026-02-10)

### Changes

- Refactor get latest release tag step to exclude current version and improve changelog generation ([#105](https://github.com/microsoft/durabletask-js/pull/105))
- Update release workflow documentation and remove automated PR creation step ([#104](https://github.com/microsoft/durabletask-js/pull/104))
- Add release pipeline/doc + fix build pipeline ([#103](https://github.com/microsoft/durabletask-js/pull/103))
- Refactor release preparation workflow and add automated changelog update script ([#102](https://github.com/microsoft/durabletask-js/pull/102))
- Release Process Update ([#101](https://github.com/microsoft/durabletask-js/pull/101))
- Add samples and sample validation ci ([#100](https://github.com/microsoft/durabletask-js/pull/100))
- Fix misleading tracer cache invalidation comment and simplify logic ([#97](https://github.com/microsoft/durabletask-js/pull/97))
- Durable Entities Support ([#75](https://github.com/microsoft/durabletask-js/pull/75))
- Retry Handler Support when call activity or suborchestration ([#96](https://github.com/microsoft/durabletask-js/pull/96))
- Add OpenTelemetry distributed tracing example for Azure Managed DTS ([#95](https://github.com/microsoft/durabletask-js/pull/95))
- Versioning, recursive terminating/purging, Replay safe logger ([#93](https://github.com/microsoft/durabletask-js/pull/93))
- Implement in-memory orchestration backend for testing ([#94](https://github.com/microsoft/durabletask-js/pull/94))
- Parent Orchestration Access For SubOrchestration ([#92](https://github.com/microsoft/durabletask-js/pull/92))
- Add tags support for activities, sub-orchestrations, and client APIs ([#89](https://github.com/microsoft/durabletask-js/pull/89))
- Get Orchestration History ([#88](https://github.com/microsoft/durabletask-js/pull/88))
- Add Logger interface, AzureLoggerAdapter, and fix gRPC client stop ([#85](https://github.com/microsoft/durabletask-js/pull/85))
- NewGuid, SetCustomStatus, sendevent between orchestrations api support ([#86](https://github.com/microsoft/durabletask-js/pull/86))
- Rewind client api ([#84](https://github.com/microsoft/durabletask-js/pull/84))
- Update dependencies, ESLint configuration, and add pull request template ([#81](https://github.com/microsoft/durabletask-js/pull/81))
- Support retry handling when calling activity/suborchestrations ([#77](https://github.com/microsoft/durabletask-js/pull/77))
- Restart Instance ([#80](https://github.com/microsoft/durabletask-js/pull/80))
- Client api support - Getinstances/listinstanceids ([#78](https://github.com/microsoft/durabletask-js/pull/78))
- Add pre-commit hook to run lint on staged files ([#79](https://github.com/microsoft/durabletask-js/pull/79))
- Set up E2E testing infrastructure aligned with durabletask-python ([#74](https://github.com/microsoft/durabletask-js/pull/74))
- Add Azure-managed Durable Task support as separate npm package ([#73](https://github.com/microsoft/durabletask-js/pull/73))
- Remove submodule, add proto file download script ([#72](https://github.com/microsoft/durabletask-js/pull/72))
- Set low priority for scheduled runs ([#70](https://github.com/microsoft/durabletask-js/pull/70))
- retry workflows grpc stream ([#66](https://github.com/microsoft/durabletask-js/pull/66))

## v0.1.0-alpha.2

### New

- TLS connections support ([#40](https://github.com/microsoft/durabletask-js/pull/40))

### Fixes

- Fix a test case with a undefined result ([#42](https://github.com/microsoft/durabletask-js/pull/42))
- Check async generator ([#41](https://github.com/microsoft/durabletask-js/pull/41))

## v0.1.0-alpha.1

### New

- First release that support all basic orchestration patterns.
- Add CHANGELOG.md file to track changes across versions
