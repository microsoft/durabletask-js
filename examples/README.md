# Durable Task JavaScript SDK - Examples

This directory contains examples demonstrating various features of the Durable Task JavaScript SDK.

## Example Applications

Each example is a standalone application with its own README and can be run independently.

### Basic Orchestration Examples

Located in `hello-world/`:

- **[Activity Sequence](./hello-world/activity-sequence.ts)**: Basic orchestration that calls three activities in sequence.
- **[Fan-out/Fan-in](./hello-world/fanout-fanin.ts)**: Orchestration that schedules multiple activities in parallel and aggregates results.
- **[Human Interaction](./hello-world/human_interaction.ts)**: Demonstrates waiting for external events in orchestrations.

### Durable Entities Examples

Durable Entities are stateful objects with built-in concurrency control:

- **[Entity Counter](./entity-counter/)**: Simple counter entity demonstrating basic entity operations, signaling, and state management.
- **[Entity Orchestration](./entity-orchestration/)**: Bank transfer scenario using entity locking for atomic cross-entity operations.

### Azure Integration Examples

- **[Azure Managed DTS](./azure-managed/)**: Integration with Azure Managed Durable Task Scheduler using Azure authentication.
- **[Azure Managed DTS (Simple)](./azure-managed-dts.ts)**: Simplified version showing Azure DTS connection setup.

## Prerequisites

Examples require a Durable Task-compatible backend. Choose one:

### Option 1: DTS Emulator (Recommended for Testing)

The DTS Emulator is ideal for local development and testing:

```bash
docker run --name dts-emulator -i -p 8080:8080 -d --rm mcr.microsoft.com/dts/dts-emulator:latest
```

Most standalone examples can run against the emulator using:

```bash
cd examples/entity-counter
npm run start:emulator
```

### Option 2: Local Sidecar

Install and run locally (requires Go 1.18+):

```bash
# Install Dapr CLI (includes Durable Task sidecar)
https://docs.dapr.io/getting-started/install-dapr-cli/

# Or build from source
git clone https://github.com/microsoft/durabletask-go
cd durabletask-go
go run . start --backend Emulator
```

The sidecar runs on `localhost:4001` by default.

### Option 3: Unofficial Sidecar Docker Image

For quick local development:

```bash
docker run \
    --name durabletask-sidecar -d --rm \
    -p 4001:4001 \
    --env 'DURABLETASK_SIDECAR_LOGLEVEL=Debug' \
    kaibocai/durabletask-sidecar:latest start \
    --backend Emulator
```

## Running Examples

### Standalone Applications (Recommended)

Standalone applications include `entity-counter` and `entity-orchestration`. Each has its own `package.json`:

```bash
cd examples/entity-counter
npm run start:emulator  # Run against DTS emulator
# OR
npm run start           # Run against local sidecar on localhost:4001
```

See individual README files for detailed instructions.

### Single-File Examples

Basic orchestration examples in `hello-world/` can be run directly:

```bash
npm run example ./examples/hello-world/activity-sequence.ts
```

## Testing Against DTS Emulator

All entity examples are designed to work with the DTS emulator:

1. Start the DTS emulator:
   ```bash
   docker run --name dts-emulator -i -p 8080:8080 -d --rm mcr.microsoft.com/dts/dts-emulator:latest
   ```

2. Run the example:
   ```bash
   cd examples/entity-counter
   npm run start:emulator
   ```

The emulator provides a clean, isolated environment for testing without requiring external dependencies.

## Azure Managed DTS

For production scenarios with Azure, see the [Azure Managed DTS example](./azure-managed/) which demonstrates:
- Connection string configuration
- Azure authentication with DefaultAzureCredential
- Environment-based configuration

## Documentation

For more information about Durable Task concepts:

- **Orchestrations**: Workflow definitions that coordinate activities
- **Activities**: Units of work executed by orchestrations
- **Entities**: Stateful actors with automatic concurrency control
- **Entity Locking**: Critical sections for atomic multi-entity operations

See the main [README](../README.md) for comprehensive documentation.
