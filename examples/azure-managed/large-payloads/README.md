# Large payloads

This sample round-trips a 300 KiB input through an orchestration and an activity,
verifying that the client receives the original output rather than a blob token.
The standard 256 KiB threshold is measured on serialized UTF-8 payloads.

Build the SDK, configure a DTS endpoint and a blob endpoint, then run from the repository root:

```sh
npm install
npm run build
npm run example -- ./examples/azure-managed/large-payloads/index.ts
```

Set these in `examples/azure-managed/.env` or your environment:

```text
DURABLE_TASK_SCHEDULER_CONNECTION_STRING=Endpoint=http://localhost:8080;Authentication=None;TaskHub=default
AZURE_STORAGE_CONNECTION_STRING=UseDevelopmentStorage=true
```

For local execution, start DTS using the parent directory's Docker Compose file and run
Azurite separately on its default blob port 10000. The sample can instead use existing
Azure resources; no account or role is provisioned. Connection strings must never be committed.
For identity-based storage authentication, see the
[payload package documentation](../../../packages/durabletask-js-azureblob/README.md).

The sample leaves its instance intact and does **not** modify the task hub's auto-purge setting.
To opt into cleanup separately, configure a supporting DTS backend and payload-enabled workers,
call `client.setLargePayloadAutoPurge(true)`, then purge terminal instances through the usual
client API. Keep a payload-enabled worker running to process tombstones. Disabling with
`client.setLargePayloadAutoPurge(false)` pauses backend fetches without terminating the runner.
Legacy v1 blobs, soft-deleted data, and retained blob versions are not immediately reclaimed.
