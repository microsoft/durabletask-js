// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { IHttpClient } from "@azure/storage-blob";
import { createLocalAzuriteClient } from "./local-azurite-client";

const prefix = `DefaultEndpointsProtocol=https;AccountName=account;AccountKey=${Buffer.alloc(64).toString("base64")};`;

describe("Azurite effective local-only endpoint guard", () => {
  const sendRequest = jest.fn<ReturnType<IHttpClient["sendRequest"]>, Parameters<IHttpClient["sendRequest"]>>(
    async () => {
      throw new Error("No HTTP is permitted in endpoint guard tests.");
    },
  );
  const options = { httpClient: { sendRequest } };

  afterEach(() => {
    expect(sendRequest).not.toHaveBeenCalled();
    sendRequest.mockClear();
  });

  it.each([undefined, ""])("keeps the opt-in suite disabled without a connection string (%s)", (value) => {
    expect(createLocalAzuriteClient(value, options)).toBeUndefined();
  });

  it.each(["localhost", "127.0.0.1", "[::1]"])("allows a parsed explicit %s endpoint without I/O", (host) => {
    const client = createLocalAzuriteClient(`${prefix}BlobEndpoint=http://${host}:10000/account`, options);
    expect(new URL(client!.url).hostname).toBe(host);
  });

  it("uses the SDK's first repeated propercase endpoint, not the last", () => {
    const client = createLocalAzuriteClient(
      `${prefix}BlobEndpoint=http://localhost:10000/account;BlobEndpoint=https://remote.invalid`,
      options,
    );
    expect(new URL(client!.url).hostname).toBe("localhost");
  });

  it("rejects a lowercase local hint when the SDK actually selects a remote endpoint", () => {
    expect(() =>
      createLocalAzuriteClient(
        `${prefix}blobendpoint=http://localhost:10000/account;BlobEndpoint=https://remote.invalid`,
        options,
      ),
    ).toThrow("explicit local-only BlobEndpoint");
  });

  it("rejects an actually remote first propercase endpoint even if a later endpoint is local", () => {
    expect(() =>
      createLocalAzuriteClient(
        `${prefix}BlobEndpoint=https://remote.invalid;BlobEndpoint=http://localhost:10000/account`,
        options,
      ),
    ).toThrow("explicit local-only BlobEndpoint");
  });

  it("requires an explicit endpoint rather than an implicit development-storage shortcut", () => {
    expect(() => createLocalAzuriteClient("UseDevelopmentStorage=true", options)).toThrow(
      "explicit local-only BlobEndpoint",
    );
  });
});
