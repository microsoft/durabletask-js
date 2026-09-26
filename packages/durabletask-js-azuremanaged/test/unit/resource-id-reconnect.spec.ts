// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { DefaultAzureCredential, TokenCredential } from "@azure/identity";
import * as grpc from "@grpc/grpc-js";
import { EventEmitter } from "events";
import { Empty } from "google-protobuf/google/protobuf/empty_pb";
import { PassThrough } from "stream";
import { NoOpLogger } from "@microsoft/durabletask-js";
import { GrpcClient } from "../../../durabletask-js/src/client/client-grpc";
import { WorkItem } from "../../../durabletask-js/src/proto/orchestrator_service_pb";
import { createAzureManagedWorkerBuilder, DurableTaskAzureManagedWorkerBuilder } from "../../src";

const ENDPOINT = "https://scheduler.example:8443";
const workerFactories = [
  {
    name: "builder endpoint",
    create: (credential: TokenCredential, resourceId?: string) =>
      new DurableTaskAzureManagedWorkerBuilder().endpoint(ENDPOINT, "test-hub", credential).resourceId(resourceId),
  },
  {
    name: "factory endpoint",
    create: (credential: TokenCredential, resourceId?: string) =>
      createAzureManagedWorkerBuilder(ENDPOINT, "test-hub", credential, resourceId),
  },
  {
    name: "builder connection string",
    create: (_credential: TokenCredential, resourceId?: string) =>
      new DurableTaskAzureManagedWorkerBuilder().connectionString(
        `Endpoint=${ENDPOINT};TaskHub=test-hub;Authentication=DefaultAzure` +
          (resourceId === undefined ? "" : `;ResourceId=${resourceId}`),
      ),
  },
  {
    name: "factory connection string",
    create: (_credential: TokenCredential, resourceId?: string) =>
      createAzureManagedWorkerBuilder(
        `Endpoint=${ENDPOINT};TaskHub=test-hub;Authentication=DefaultAzure` +
          (resourceId === undefined ? "" : `;ResourceId=${resourceId}`),
      ),
  },
];

describe.each(workerFactories)("$name audience lifetime", ({ create }) => {
  const originalRegion = process.env.REGION_NAME;

  beforeEach(() => {
    process.env.REGION_NAME = "UsDodCentral";
    jest.useFakeTimers();
    jest.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    if (originalRegion === undefined) delete process.env.REGION_NAME;
    else process.env.REGION_NAME = originalRegion;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it.each([
    [undefined, "https://durabletask.azure.us"],
    [" https://durabletask.io/.DEFAULT/ ", "https://durabletask.io"],
    ["api://Custom/.default/.default", "api://Custom/.default"],
  ])("preserves %s across refresh, reconnect, channel recreation and restart", async (resourceId, expected) => {
    const credential = {
      getToken: jest.fn(async (_scope: string | string[]) => ({
        token: "recorded-token",
        expiresOnTimestamp: Date.now() + 3_600_000,
      })),
    } satisfies TokenCredential;
    jest.spyOn(DefaultAzureCredential.prototype, "getToken").mockImplementation(credential.getToken);
    const streams: PassThrough[] = [];
    const metadataSeen: grpc.Metadata[] = [];
    const credentialsSeen: (grpc.ChannelCredentials | undefined)[] = [];
    const targetsSeen: string[] = [];
    const originalGenerateClient = GrpcClient.prototype._generateClient;
    const channelOptions = jest.spyOn(GrpcClient.prototype, "_generateChannelOptions");
    const generateClient = jest.spyOn(GrpcClient.prototype, "_generateClient").mockImplementation(function (
      this: GrpcClient,
    ) {
      const stub = originalGenerateClient.call(this);
      credentialsSeen.push(this["_credentials"]);
      targetsSeen.push(stub.getChannel().getTarget());
      jest.spyOn(stub, "hello").mockImplementation((_request, metadata, _options, callback) => {
        metadataSeen.push(metadata);
        callback(null, new Empty());
        return Object.assign(new EventEmitter(), {
          cancel: jest.fn(),
          getPeer: () => "test",
          getAuthContext: () => null,
        });
      });
      jest.spyOn(stub, "getWorkItems").mockImplementation((_request, metadata) => {
        if (metadata) metadataSeen.push(metadata);
        const stream = Object.assign(new PassThrough({ objectMode: true }), {
          cancel(this: PassThrough) {
            this.emit("close");
          },
          getPeer: () => "test",
          getAuthContext: () => null,
          deserialize: WorkItem.deserializeBinary,
        });
        streams.push(stream);
        return stream;
      });
      return stub;
    });
    const worker = create(credential, resourceId)
      .logger(new NoOpLogger())
      .workerId("test-worker")
      .silentDisconnectTimeout(0)
      .channelRecreateFailureThreshold(2)
      .grpcChannelOptions({ "grpc.keepalive_time_ms": 1234 })
      .build();
    expect(credential.getToken).not.toHaveBeenCalled();

    async function stopWorker(): Promise<void> {
      const stopping = worker.stop();
      await jest.advanceTimersByTimeAsync(1000);
      await stopping;
    }

    try {
      await worker.start();
      await jest.advanceTimersByTimeAsync(0);
      expect(streams).toHaveLength(1);
      expect(credential.getToken).toHaveBeenCalledTimes(1);
      process.env.REGION_NAME = "westus2";

      for (let i = 0; i < 2; i++) {
        jest.setSystemTime(Date.now() + 3_300_001);
        streams[i].emit("error", Object.assign(new Error("test unavailable"), { code: grpc.status.UNAVAILABLE }));
        await jest.advanceTimersByTimeAsync(1);
        expect(streams).toHaveLength(i + 2);
        expect(credential.getToken).toHaveBeenCalledTimes(i + 2);
      }
      expect(generateClient).toHaveBeenCalledTimes(2);

      await stopWorker();
      jest.setSystemTime(Date.now() + 3_300_001);
      await worker.start();
      await jest.advanceTimersByTimeAsync(0);
      expect(streams).toHaveLength(4);
      expect(credential.getToken.mock.calls).toEqual(Array(4).fill([`${expected}/.default`, undefined]));
      expect(metadataSeen).toHaveLength(8); // Hello and getWorkItems on each connection.
      for (const metadata of metadataSeen) {
        expect(metadata.get("authorization")).toEqual(["Bearer recorded-token"]);
        expect(metadata.get("taskhub")).toEqual(["test-hub"]);
        expect(metadata.get("workerid")).toEqual(["test-worker"]);
      }
      expect(targetsSeen).toEqual(Array(3).fill("dns:scheduler.example:8443"));
      expect(credentialsSeen[0]).toBeDefined();
      expect(credentialsSeen.every((value) => value === credentialsSeen[0])).toBe(true);
      for (const [options] of channelOptions.mock.calls) {
        expect(options).toMatchObject({ "grpc.keepalive_time_ms": 1234 });
      }
    } finally {
      await stopWorker();
    }
    expect(jest.getTimerCount()).toBe(0);
  });
});
