#!/bin/bash
# Script to run E2E tests against the DTS (Durable Task Scheduler) emulator.
#
# This script mirrors the Python testing setup at durabletask-python for Azure-managed tests.
# It expects the DTS emulator to be running at the specified endpoint.
#
# Environment variables:
#   - ENDPOINT: The endpoint for the DTS emulator (default: localhost:8080)
#   - TASKHUB: The task hub name (default: default)

ENDPOINT="${ENDPOINT:-localhost:8080}"
TASKHUB="${TASKHUB:-default}"

# Start the DTS emulator if it is not running yet
if [ ! "$(docker ps -q -f name=dts-emulator)" ]; then
    if [ "$(docker ps -aq -f status=exited -f name=dts-emulator)" ]; then
        # cleanup
        docker rm dts-emulator
    fi

    # run your container
    echo "Starting DTS emulator"
    docker run \
        --name dts-emulator -d --rm \
        -p 8080:8080 \
        mcr.microsoft.com/dts/dts-emulator:latest

    # Wait for container to be ready
    echo "Waiting for DTS emulator to be ready..."
    sleep 10
fi

echo "Running E2E tests against DTS emulator"
echo "Endpoint: $ENDPOINT"
echo "TaskHub: $TASKHUB"

ENDPOINT="$ENDPOINT" TASKHUB="$TASKHUB" npm run test:e2e:azuremanaged:internal

# It should fail if the npm run fails
if [ $? -ne 0 ]; then
    echo "E2E tests failed"
    exit 1
fi

echo "Stopping DTS emulator"
docker stop dts-emulator
