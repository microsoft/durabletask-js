#!/usr/bin/env bash
#
# Copyright 2022 The Dapr Authors
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#     http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# This script downloads the proto files from the durabletask-protobuf repository.
# Usage: ./scripts/download-proto.sh [branch-name]
# If no branch is specified, 'main' is used.

set -e

BRANCH=${1:-main}
PROTO_DIR="internal/durabletask-protobuf/protos"
COMMIT_HASH_FILE="internal/durabletask-protobuf/PROTO_SOURCE_COMMIT_HASH"

echo "====================================================="
echo "========== Download Proto Files ====================="
echo "====================================================="
echo "Branch: $BRANCH"

# Create directory if it doesn't exist
mkdir -p "$PROTO_DIR"

# Download the proto file
echo "Downloading orchestrator_service.proto..."
curl -sfL "https://raw.githubusercontent.com/microsoft/durabletask-protobuf/${BRANCH}/protos/orchestrator_service.proto" -o "$PROTO_DIR/orchestrator_service.proto"

# Get and save the commit hash
echo "Fetching commit hash..."
API_RESPONSE=$(curl -sfL "https://api.github.com/repos/microsoft/durabletask-protobuf/commits?path=protos/orchestrator_service.proto&sha=${BRANCH}&per_page=1")

# Try to parse with jq if available, otherwise fall back to grep/sed
if command -v jq &> /dev/null; then
    COMMIT_HASH=$(echo "$API_RESPONSE" | jq -r '.[0].sha')
else
    COMMIT_HASH=$(echo "$API_RESPONSE" | grep '"sha":' | head -1 | sed 's/.*"sha": "\([^"]*\)".*/\1/')
fi

if [ -n "$COMMIT_HASH" ] && [ "$COMMIT_HASH" != "null" ]; then
    echo "$COMMIT_HASH" > "$COMMIT_HASH_FILE"
    echo "Commit hash saved: $COMMIT_HASH"
else
    echo "Error: Could not fetch commit hash from GitHub API"
    exit 1
fi

echo "Proto files downloaded successfully!"
