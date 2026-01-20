# Durable Task Protobuf Files

This directory contains the protocol buffer definitions used by the Durable Task Framework JavaScript SDK. The files in this directory can be updated from the [microsoft/durabletask-protobuf](https://github.com/microsoft/durabletask-protobuf) repository using the download script.

## Directory Structure

- `protos/` - Contains the proto files
- `PROTO_SOURCE_COMMIT_HASH` - Contains the commit hash of the proto file version

## Update Process

The proto files can be downloaded and updated by running the download script. This is handled by the `scripts/download-proto.sh` script. The script:

1. Downloads the latest version of `orchestrator_service.proto`
2. Saves the current commit hash for tracking purposes

## Manual Update

To update the proto files, you can run:

```bash
npm run download-proto
# or
./scripts/download-proto.sh [branch-name]
```
