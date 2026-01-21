## Unreleased

### New

- Add new `@microsoft/durabletask-js-azuremanaged` package for Azure-managed Durable Task support ([#XX](https://github.com/microsoft/durabletask-js/pull/XX))
  - `DurableTaskAzureManagedConnectionString` for parsing connection strings
  - `DurableTaskAzureManagedOptions` for client/worker configuration
  - `DurableTaskAzureManagedClientBuilder` for creating Azure-managed-connected clients
  - `DurableTaskAzureManagedWorkerBuilder` for creating Azure-managed-connected workers
  - `createAzureManagedClient` and `createAzureManagedWorkerBuilder` helper functions
  - Support for Azure authentication via `@azure/identity`

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
