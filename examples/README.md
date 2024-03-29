# Examples

This directory contains examples of how to author durable orchestrations using the Durable Task JavaScript SDK.

## Prerequisites

All the examples assume that you have a Durable Task-compatible sidecar running locally. There are three options for this:

1. Install the latest version of the [Dapr CLI](https://docs.dapr.io/getting-started/install-dapr-cli/), which contains and exposes an embedded version of the Durable Task engine. The setup process (which requires Docker) will configure the workflow engine to store state in a local Redis container.

2. Clone and run the [Durable Task Sidecar](https://github.com/microsoft/durabletask-go) project locally (requires Go 1.18 or higher). Orchestration state will be stored in a local sqlite database.

3. Use unofficial sidecar docker image. You should use this only for local development and test.

```sh
    docker run \
        --name durabletask-sidecar -d --rm \
        -p 4001:4001 \
        --env 'DURABLETASK_SIDECAR_LOGLEVEL=Debug' \
        kaibocai/durabletask-sidecar:latest start \
        --backend Emulator
```

## Running the examples

With one of the sidecars running, you can simply execute any of the examples in this directory using `python3`:

```sh
npm run example ./examples/activity-sequence.ts
```

In some cases, the sample may require command-line parameters or user inputs. In these cases, the sample will print out instructions on how to proceed.

## List of examples

- [Activity sequence](./activity-sequence.ts): Orchestration that schedules three activity calls in a sequence.
- [Fan-out/fan-in](./fanout-fanin.ts): Orchestration that schedules a dynamic number of activity calls in parallel, waits for all of them to complete, and then performs an aggregation on the results.
