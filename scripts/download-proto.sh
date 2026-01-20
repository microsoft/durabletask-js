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
curl -sL "https://raw.githubusercontent.com/microsoft/durabletask-protobuf/${BRANCH}/protos/orchestrator_service.proto" -o "$PROTO_DIR/orchestrator_service.proto"

# Get and save the commit hash
echo "Fetching commit hash..."
COMMIT_HASH=$(curl -sL "https://api.github.com/repos/microsoft/durabletask-protobuf/commits?path=protos/orchestrator_service.proto&sha=${BRANCH}&per_page=1" | grep '"sha":' | head -1 | sed 's/.*"sha": "\([^"]*\)".*/\1/')

if [ -n "$COMMIT_HASH" ]; then
    echo "$COMMIT_HASH" > "$COMMIT_HASH_FILE"
    echo "Commit hash saved: $COMMIT_HASH"
else
    echo "Warning: Could not fetch commit hash from GitHub API"
fi

echo "Proto files downloaded successfully!"
