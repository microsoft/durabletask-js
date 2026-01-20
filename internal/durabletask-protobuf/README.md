# Durable Task Protobuf Files

This directory contains the protocol buffer definitions used by the Durable Task Framework JavaScript SDK. The files in this directory are automatically downloaded and updated during the build process from the [microsoft/durabletask-protobuf](https://github.com/microsoft/durabletask-protobuf) repository.

## Directory Structure

- `protos/` - Contains the downloaded proto files
- `PROTO_SOURCE_COMMIT_HASH` - Contains the commit hash of the latest proto file version

## Auto-Update Process

The proto files are automatically downloaded and updated when running the download script. This is handled by the `scripts/download-proto.sh` script. The script:

1. Downloads the latest version of `orchestrator_service.proto`
2. Saves the current commit hash for tracking purposes
3. Updates these files before proto compilation begins

## Manual Update

If you need to manually update the proto files, you can run:

```bash
npm run download-proto
# or
./scripts/download-proto.sh [branch-name]
```
