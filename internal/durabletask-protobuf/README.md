# Durable Task Protobuf Files

This directory contains the protocol buffer definitions used by the Durable Task Framework JavaScript SDK. The files in this directory are automatically downloaded and updated during the build process from the [microsoft/durabletask-protobuf](https://github.com/microsoft/durabletask-protobuf) repository.

## Directory Structure

- `protos/` - Contains the proto files
- `PROTO_SOURCE_COMMIT_HASH` - Contains the commit hash of the proto file version

## Auto-Update Process

The proto files are automatically downloaded and updated when running `npm run build`. This is handled by the `scripts/download-proto.sh` script. The script:

1. Downloads the latest version of `orchestrator_service.proto`
2. Saves the current commit hash for tracking purposes

## Manual Update

To manually update the proto files, you can run:

```bash
npm run download-proto
# or
./scripts/download-proto.sh [branch-name]
```
