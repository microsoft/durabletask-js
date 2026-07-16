#!/bin/bash
# Script to run the gated Azure Functions host E2E tests.
#
# This mirrors scripts/test-e2e-azuremanaged.sh. The suite launches a real
# Azure Functions host ("func start") for test/e2e-functions/test-app, backed by
# Azurite (the local Azure Storage emulator), and drives it over HTTP.
#
# The test-app depends on the PUBLISHED durable-functions / @azure/functions
# packages, so it installs and builds without any in-repo package build.
#
# Prerequisites (the suite SKIPS cleanly if any are missing):
#   - Azure Functions Core Tools ('func') v4 on PATH
#   - Azurite reachable on 127.0.0.1:10000 (started here if the 'azurite' CLI is
#     installed and the port is free)

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_APP_DIR="$ROOT_DIR/test/e2e-functions/test-app"

AZURITE_HOST="127.0.0.1"
AZURITE_BLOB_PORT="10000"

started_azurite=""

azurite_up() {
    (exec 3<>"/dev/tcp/$AZURITE_HOST/$AZURITE_BLOB_PORT") 2>/dev/null && exec 3>&- 3<&-
}

if ! azurite_up; then
    if command -v azurite >/dev/null 2>&1; then
        echo "Starting Azurite..."
        AZURITE_DATA="$(mktemp -d)"
        azurite --silent --location "$AZURITE_DATA" \
            --blobPort 10000 --queuePort 10001 --tablePort 10002 &
        started_azurite="$!"
        for _ in $(seq 1 30); do
            azurite_up && break
            sleep 1
        done
    else
        echo "Azurite is not running and 'azurite' is not installed; the suite will skip."
    fi
fi

# Install + build the ported BasicNode app against the published durable-functions
# package so 'func start' has a dist/ to serve. If this fails there is no app to
# run, so fail fast instead of letting the suite skip and masking the error.
echo "Installing + building test-app..."
if ! ( cd "$TEST_APP_DIR" && npm install && npm run build ); then
    echo "test-app install/build failed." >&2
    if [ -n "$started_azurite" ]; then
        echo "Stopping Azurite..."
        kill "$started_azurite" 2>/dev/null || true
    fi
    exit 1
fi

echo "Running Functions host E2E tests..."
( cd "$ROOT_DIR" && npm run test:e2e:functions:internal )
status=$?

if [ -n "$started_azurite" ]; then
    echo "Stopping Azurite..."
    kill "$started_azurite" 2>/dev/null || true
fi

exit $status
