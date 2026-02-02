# Testing Entity Examples Against DTS Emulator

This guide explains how to test the entity examples (`entity-counter` and `entity-orchestration`) against the DTS emulator.

## Prerequisites

1. Docker installed and running
2. Node.js 22+ installed (as specified in package.json)
3. Dependencies installed: `npm install` in the repository root

## Step 1: Start the DTS Emulator

```bash
docker run -i -p 8080:8080 -d mcr.microsoft.com/dts/dts-emulator:latest
```

Wait a few seconds for the emulator to be ready.

## Step 2: Test entity-counter Example

```bash
cd examples/entity-counter
npm run start:emulator
```

### Expected Output

```
Connecting to endpoint: localhost:8080, taskHub: default
Worker started successfully

--- Signaling entity operations ---
Signaled: add(5)
Signaled: add(3)
Signaled: add(-2)

--- Getting entity state ---
Counter value: 6
Last modified: [timestamp]

--- Resetting counter ---
Signaled: reset()
Counter value after reset: 0

--- Cleaning up ---
Worker stopped
```

## Step 3: Test entity-orchestration Example

```bash
cd examples/entity-orchestration
npm run start:emulator
```

### Expected Output

```
Connecting to endpoint: localhost:8080, taskHub: default
Worker started successfully

--- Initializing accounts ---
Alice balance: 1000
Bob balance: 500

--- Running transfer orchestration ---
Transfer orchestration started: [instance-id]
In critical section: true
Locked entities: BankAccount@alice, BankAccount@bob
From account balance: 1000
To account balance: 500
Transfer completed: {"success":true,"fromBalance":750,"toBalance":750,"message":"Transferred 250 from alice to bob"}

--- Final balances ---
Alice balance: 750
Bob balance: 750

--- Cleaning up ---
Worker stopped
```

## Step 4: Clean Up

Stop the DTS emulator:

```bash
docker stop dts-emulator
```

## Alternative: Test Against Local Sidecar

If you prefer to test against a local sidecar instead of the emulator:

1. Start the sidecar on `localhost:4001` (using Dapr CLI or durabletask-go)
2. Run the examples with the default start script:

```bash
cd examples/entity-counter
npm run start
```

## Troubleshooting

### "Cannot find module" errors

Make sure dependencies are installed:
```bash
cd /path/to/durabletask-js
npm install
```

### "ts-node: command not found"

The `ts-node` package should be installed as a dev dependency. Run `npm install` in the repository root.

### Emulator connection errors

- Verify the emulator is running: `docker ps | grep dts-emulator`
- Check logs: `docker logs dts-emulator`
- Ensure port 8080 is not in use by another process

### Worker fails to start

Check that the packages are built:
```bash
npm run build
```

## Validation Script

A validation script is available to check the structure:

```bash
bash /tmp/validate_examples.sh
```

This verifies:
- Example directory structure
- package.json scripts
- Environment variable support
- Required imports and builders
