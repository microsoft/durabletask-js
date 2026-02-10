## Upcoming

### New

### Fixes


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
