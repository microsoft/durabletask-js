// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { randomUUID, createHash } from "crypto";
import { ContainerClient } from "@azure/storage-blob";
import { PayloadDeleteOutcome } from "@microsoft/durabletask-js";
import { BlobPayloadStore } from "../src";
import fixtures from "./dotnet-payload-fixtures.json";
import { createLocalAzuriteClient } from "./local-azurite-client";

const connectionString = process.env.DURABLETASK_BLOB_TEST_CONNECTION_STRING;
const service = createLocalAzuriteClient(connectionString);

(service ? describe : describe.skip)("BlobPayloadStore with local Azurite", () => {
  let container: ContainerClient;
  let containerName: string;
  beforeEach(() => {
    containerName = `payloads-${randomUUID()}`;
    container = service!.getContainerClient(containerName);
  });
  afterEach(async () => {
    await container.deleteIfExists();
  });

  it.each([true, false])("round-trips UTF-8 payloads and same-account tokens (gzip=%s)", async (compressionEnabled) => {
    const store = new BlobPayloadStore({ connectionString, containerName, compressionEnabled });
    const value = "\u00e9\ud83d\ude80".repeat(100000);
    const token = await store.upload(value);
    expect(await store.download(token)).toBe(value);
    const url = new URL(token.slice("blob:v2:".length));
    const blobName = url.pathname.split("/").at(-1)!;
    expect(await store.download(`blob:v1:${containerName}:${blobName}`)).toBe(value);
    const properties = await container.getBlobClient(blobName).getProperties();
    expect(properties.metadata).toMatchObject({ managed_by: "dts" });
    expect(properties.contentEncoding ?? "").toBe(compressionEnabled ? "gzip" : "");
    const rotated = new BlobPayloadStore({ connectionString, containerName: `rotated-${randomUUID()}` });
    expect(await rotated.download(token)).toBe(value);
  });

  it.each(fixtures.vectors)("hydrates .NET-produced compressed blob $id", async (fixture) => {
    await container.create();
    const blob = container.getBlockBlobClient("dotnet");
    const bytes = Buffer.from(fixture.gzipBase64, "base64");
    await blob.upload(bytes, bytes.length, {
      metadata: { managed_by: "dts" },
      blobHTTPHeaders: { blobContentEncoding: "gzip" },
    });
    const store = new BlobPayloadStore({ connectionString, containerName });
    const actual = await store.download(`blob:v2:${blob.url}`);
    expect(Buffer.byteLength(actual, "utf8")).toBe(fixture.utf8Bytes);
    expect(createHash("sha256").update(actual, "utf8").digest("hex")).toBe(fixture.sha256);
  });

  it("deletes owned blobs and snapshots but never deletes unowned blobs", async () => {
    const store = new BlobPayloadStore({ connectionString, containerName });
    const token = await store.upload("owned");
    const owned = container.getBlobClient(new URL(token.slice("blob:v2:".length)).pathname.split("/").at(-1)!);
    await owned.createSnapshot();
    expect(await store.delete(token)).toBe(PayloadDeleteOutcome.Deleted);
    expect(await store.delete(token)).toBe(PayloadDeleteOutcome.AlreadyAbsent);
    expect(await owned.exists()).toBe(false);
    const customer = container.getBlockBlobClient("customer");
    await customer.upload("customer data", 13);
    expect(await store.delete(`blob:v2:${customer.url}`)).toBe(PayloadDeleteOutcome.NotStoreOwned);
    expect(await customer.exists()).toBe(true);
  });
});
