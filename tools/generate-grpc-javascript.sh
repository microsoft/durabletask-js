PATH_ROOT=$(readlink -f $(dirname $0))/..
PATH_PROTO_SRC=$(readlink -f $(dirname $0))/../internal/protocol/protos
PATH_PROTO_OUT=$(readlink -f $1)

echo "=============================================="
echo "PATH_ROOT: $PATH_ROOT"
echo "PATH_PROTO_SRC: $PATH_PROTO_SRC"
echo "PATH_PROTO_OUT: $PATH_PROTO_OUT"
echo "=============================================="

generateGrpc() {
    PROTO_FILE_PATH_ABSOLUTE=$1
    PROTO_FILE_PATH_RELATIVE=$(echo "$PROTO_FILE_PATH_ABSOLUTE" | sed "s|$PATH_ROOT||g")
    PROTO_FILE_NAME=$(basename $PROTO_FILE_PATH_ABSOLUTE)
    PROTO_FILE_NAME_NO_PROTO=$(echo "$PROTO_FILE_NAME" | sed "s|.proto||g")

    # Tools to be installed by npm (see package.json)
    PROTOC_GEN_TS_PATH="${PATH_ROOT}/node_modules/.bin/protoc-gen-ts"
    PROTOC_GEN_GRPC_PATH="${PATH_ROOT}/node_modules/.bin/grpc_tools_node_protoc_plugin"
    GRPC_TOOLS_PROTOC="${PATH_ROOT}/node_modules/.bin/grpc_tools_node_protoc"

    echo "Processing '$PROTO_FILE_PATH_ABSOLUTE'..."
    $GRPC_TOOLS_PROTOC \
        --proto_path=${PATH_PROTO_SRC} \
        --plugin="protoc-gen-ts=${PROTOC_GEN_TS_PATH}" \
        --plugin=protoc-gen-grpc=${PROTOC_GEN_GRPC_PATH} \
        --js_out="import_style=commonjs,binary:$PATH_PROTO_OUT" \
        --ts_out="grpc_js:$PATH_PROTO_OUT" \
        --grpc_out="grpc_js:$PATH_PROTO_OUT" \
        ${PROTO_FILE_PATH_ABSOLUTE}

    echo "- Generated '${PATH_PROTO_OUT}/${PROTO_FILE_NAME_NO_PROTO}_pb.js'"
    echo "- Generated '${PATH_PROTO_OUT}/${PROTO_FILE_NAME_NO_PROTO}_pb.d.ts'"
    echo "- Generated '${PATH_PROTO_OUT}/${PROTO_FILE_NAME_NO_PROTO}_grpc_pb.js'"
    echo "- Generated '${PATH_PROTO_OUT}/${PROTO_FILE_NAME_NO_PROTO}_grpc_pb.d.ts'"
}

fail_trap() {
    result=$?

    if [ $result != 0 ]; then
        echo "Failed to generate gRPC interface and proto buf: $ret_val"
    fi

    exit $result
}

# -----------------------------------------------------------------------------
# main
# -----------------------------------------------------------------------------
trap "fail_trap" EXIT

# Ensure the Paths exist
echo "Checking source directory $PATH_PROTO_SRC"
if [ ! -d "$PATH_PROTO_SRC" ]; then
    echo "Source directory does not exist: $PATH_PROTO_SRC"
    exit 1
fi

echo "Checking output directory $PATH_PROTO_OUT"
if [ ! -d "$PATH_PROTO_OUT" ]; then
    echo "Output directory does not exist, creating: $PATH_PROTO_OUT"
    mkdir -p "$PATH_PROTO_OUT"
fi

# Ensure grpc-tools has been installed by npm (check local node_modules)
echo "Checking grpc-tools"

if [ ! -f "${PATH_ROOT}/node_modules/.bin/grpc_tools_node_protoc" ]; then
    echo "grpc-tools not installed. Please run 'npm install' first."
    exit 1
else
    echo "grpc-tools found in node_modules"
fi

# # We output proto files in the dir proto/
# PATH_PROTO_OUT=$PATH_PROTO_OUT

echo "=============================================="

echo "Generating Javascript code in $PATH_PROTO_OUT"
generateGrpc "$PATH_PROTO_SRC/orchestrator_service.proto"