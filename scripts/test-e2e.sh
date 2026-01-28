#!/bin/bash
# Script to run E2E tests against the durabletask-sidecar.
#
# This script uses the cgillum/durabletask-sidecar Docker container for local testing.
# In CI/CD, we use durabletask-go sidecar instead (similar to Python SDK testing approach).
#
# NOTE: To run tests similar to the Python SDK setup:
#       go install github.com/microsoft/durabletask-go@main
#       durabletask-go --port 4001

# Start the sidecar if it is not running yet
if [ ! "$(docker ps -q -f name=durabletask-sidecar)" ]; then
    if [ "$(docker ps -aq -f status=exited -f name=durabletask-sidecar)" ]; then
        # cleanup
        docker rm durabletask-sidecar
    fi

    # run your container
    echo "Starting Sidecar"
    docker run \
        --name durabletask-sidecar -d --rm \
        -p 4001:4001 \
        --env 'DURABLETASK_SIDECAR_LOGLEVEL=Debug' \
        cgillum/durabletask-sidecar:latest start \
        --backend Emulator
fi

echo "Running E2E tests"
npm run test:e2e:internal

# It should fail if the npm run fails
if [ $? -ne 0 ]; then
    echo "E2E tests failed"
    exit 1
fi

echo "Stopping Sidecar"
docker stop durabletask-sidecar