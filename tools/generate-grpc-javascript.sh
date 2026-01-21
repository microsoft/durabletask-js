PATH_ROOT=$(readlink -f $(dirname $0))/..
PATH_PROTO_SRC=$(readlink -f $(dirname $0))/../internal/durabletask-protobuf/protos
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
    PROTOC_GEN_GRPC_PATH=$(which grpc_tools_node_protoc_plugin)

    echo "Processing '$PROTO_FILE_PATH_ABSOLUTE'..."
    protoc \
        --proto_path=${PATH_PROTO_SRC} \
        --plugin="protoc-gen-ts=${PROTOC_GEN_TS_PATH}" \
        --plugin=protoc-gen-grpc=${PROTOC_GEN_GRPC_PATH} \
        --js_out="import_style=commonjs,binary:$PATH_PROTO_OUT" \
        --ts_out="grpc_js:$PATH_PROTO_OUT" \
        --grpc_out="grpc_js:$PATH_PROTO_OUT" \
        ${PROTO_FILE_PATH_ABSOLUTE}

    PATH_PROTO_FILE_GENERATED="${PROTO_FILE_PATH_RELATIVE}/${PROTO_FILE_NAME_NO_PROTO}_pb2.py"
    PATH_PROTO_FILE_GENERATED_GRPC="${PROTO_FILE_PATH_RELATIVE}/${PROTO_FILE_NAME_NO_PROTO}_pb2_grpc.py"

    echo "- Generated '${PATH_PROTO_FILE_GENERATED}'"
    echo "- Generated '${PATH_PROTO_FILE_GENERATED_GRPC}'"
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
    echo "Output directory does not exist: $PATH_PROTO_OUT"
    exit 1
fi

# Ensure grpc-tools has been installed by npm globally with npm list -g
echo "Checking grpc-tools"

if [ ! $(npm list -g | grep grpc-tools | wc -l) -gt 0  ]; then
    echo "grpc-tools not installed. Installing..."
    npm install -g grpc-tools
else
    echo "grpc-tools already installed"
fi

# # We output proto files in the dir proto/
# PATH_PROTO_OUT=$PATH_PROTO_OUT

echo "Creating output directory $PATH_PROTO_OUT"
mkdir -p $PATH_PROTO_OUT

echo "=============================================="

echo "Generating Javascript code in $PATH_PROTO_OUT"
generateGrpc "$PATH_PROTO_SRC/orchestrator_service.proto"