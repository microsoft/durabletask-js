## Unreleased

### New

- Add Durable Task Scheduler (DTS) support for Azure-managed orchestration ([#XX](https://github.com/microsoft/durabletask-js/pull/XX))
  - `DurableTaskSchedulerConnectionString` for parsing connection strings
  - `DurableTaskSchedulerOptions` for client/worker configuration
  - `DurableTaskSchedulerClientBuilder` for creating scheduler-connected clients
  - `DurableTaskSchedulerWorkerBuilder` for creating scheduler-connected workers
  - `createSchedulerClient` and `createSchedulerWorkerBuilder` helper functions
  - Support for Azure authentication via `@azure/identity` (optional peer dependency)

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
