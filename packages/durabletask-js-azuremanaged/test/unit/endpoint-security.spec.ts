// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AccessToken, GetTokenOptions, TokenCredential } from "@azure/identity";
import * as grpc from "@grpc/grpc-js";
import { DurableTaskAzureManagedClientBuilder } from "../../src/client-builder";
import { DurableTaskAzureManagedClientOptions, DurableTaskAzureManagedWorkerOptions } from "../../src/options";
import { DurableTaskAzureManagedWorkerBuilder } from "../../src/worker-builder";

class MockTokenCredential implements TokenCredential {
  async getToken(_scopes: string | string[], _options?: GetTokenOptions): Promise<AccessToken> {
    return {
      token: "mock-token",
      expiresOnTimestamp: Date.now() + 3600000,
    };
  }
}

interface TestBuilder {
  allowInsecureCredentials(allowInsecure: boolean): TestBuilder;
  connectionString(connectionString: string): TestBuilder;
  endpoint(endpoint: string, taskHubName: string, credential?: TokenCredential | null): TestBuilder;
  build(): object;
}

interface BuilderFactory {
  name: string;
  create(): TestBuilder;
  fromConnectionString(connectionString: string): TestBuilder;
  fromEndpoint(endpoint: string, credential: TokenCredential | null): TestBuilder;
}

const builderFactories: BuilderFactory[] = [
  {
    name: "client",
    create: () => new DurableTaskAzureManagedClientBuilder(),
    fromConnectionString: (connectionString) =>
      new DurableTaskAzureManagedClientBuilder().connectionString(connectionString),
    fromEndpoint: (endpoint, credential) =>
      new DurableTaskAzureManagedClientBuilder().endpoint(endpoint, "myTaskHub", credential),
  },
  {
    name: "worker",
    create: () => new DurableTaskAzureManagedWorkerBuilder(),
    fromConnectionString: (connectionString) =>
      new DurableTaskAzureManagedWorkerBuilder().connectionString(connectionString),
    fromEndpoint: (endpoint, credential) =>
      new DurableTaskAzureManagedWorkerBuilder().endpoint(endpoint, "myTaskHub", credential),
  },
];

describe.each(builderFactories)("$name endpoint security", ({ create, fromConnectionString, fromEndpoint }) => {
  const constructed: object[] = [];

  afterEach(() => {
    for (const value of constructed) {
      const stub = (value as { _stub?: { close(): void } | null })._stub;
      stub?.close();
    }
    constructed.length = 0;
    jest.restoreAllMocks();
  });

  function buildAndCapture(builder: TestBuilder): object {
    const value = builder.build();
    constructed.push(value);
    return value;
  }

  function expectSecureChannel(builder: TestBuilder): object {
    const createSsl = jest.spyOn(grpc.ChannelCredentials, "createSsl");
    const createInsecure = jest.spyOn(grpc.ChannelCredentials, "createInsecure");

    const value = buildAndCapture(builder);

    expect(createSsl).toHaveBeenCalledTimes(1);
    expect(createInsecure).not.toHaveBeenCalled();
    return value;
  }

  function expectInsecureChannel(builder: TestBuilder): object {
    const createSsl = jest.spyOn(grpc.ChannelCredentials, "createSsl");
    const createInsecure = jest.spyOn(grpc.ChannelCredentials, "createInsecure");

    const value = buildAndCapture(builder);

    expect(createInsecure).toHaveBeenCalledTimes(1);
    expect(createSsl).not.toHaveBeenCalled();
    return value;
  }

  async function getMetadata(value: object): Promise<grpc.Metadata> {
    const generator = (value as { _metadataGenerator?: () => Promise<grpc.Metadata> })._metadataGenerator;
    expect(generator).toBeDefined();
    return generator!();
  }

  it("uses TLS without authorization metadata for an HTTPS anonymous connection string", async () => {
    const value = expectSecureChannel(
      fromConnectionString("Endpoint=https://example.com;Authentication=None;TaskHub=myTaskHub"),
    );

    expect((await getMetadata(value)).get("authorization")).toEqual([]);
  });

  it("uses plaintext without authorization metadata for an HTTP anonymous connection string", async () => {
    const value = expectInsecureChannel(
      fromConnectionString("Endpoint=http://localhost:8080;Authentication=None;TaskHub=myTaskHub"),
    );

    expect((await getMetadata(value)).get("authorization")).toEqual([]);
  });

  it("defaults an endpoint without a scheme to TLS", () => {
    expectSecureChannel(fromConnectionString("Endpoint=example.com;Authentication=None;TaskHub=myTaskHub"));
  });

  it("uses TLS with authorization metadata for an HTTPS token credential", async () => {
    const value = expectSecureChannel(fromEndpoint("https://example.com", new MockTokenCredential()));

    expect((await getMetadata(value)).get("authorization")).toEqual(["Bearer mock-token"]);
  });

  it("rejects an HTTP token credential without explicit opt-in", () => {
    const builder = fromEndpoint("http://localhost:8080", new MockTokenCredential());

    expect(() => builder.build()).toThrow("allowInsecureCredentials(true)");
  });

  it("allows insecure credentials when explicit opt-in precedes endpoint configuration", async () => {
    const value = expectInsecureChannel(
      create().allowInsecureCredentials(true).endpoint("http://localhost:8080", "myTaskHub", new MockTokenCredential()),
    );

    expect((await getMetadata(value)).get("authorization")).toHaveLength(1);
  });

  it("allows an HTTP token credential with explicit opt-in", async () => {
    const value = expectInsecureChannel(
      fromEndpoint("http://localhost:8080", new MockTokenCredential()).allowInsecureCredentials(true),
    );

    expect((await getMetadata(value)).get("authorization")).toEqual(["Bearer mock-token"]);
  });

  it("does not let explicit insecure credential opt-in downgrade an HTTPS endpoint", () => {
    expectSecureChannel(fromEndpoint("https://example.com", new MockTokenCredential()).allowInsecureCredentials(true));
  });

  it("rejects unsupported endpoint schemes instead of using plaintext", () => {
    const builder = fromConnectionString("Endpoint=htps://example.com;Authentication=None;TaskHub=myTaskHub");

    expect(() => builder.build()).toThrow("Unsupported endpoint scheme");
  });
});

describe.each([
  {
    name: "client",
    fromConnectionString: DurableTaskAzureManagedClientOptions.fromConnectionString,
  },
  {
    name: "worker",
    fromConnectionString: DurableTaskAzureManagedWorkerOptions.fromConnectionString,
  },
])("$name options endpoint security", ({ fromConnectionString }) => {
  it("does not infer insecure token consent from an anonymous connection string", () => {
    const options = fromConnectionString(
      "Endpoint=http://localhost:8080;Authentication=None;TaskHub=myTaskHub",
    ).setCredential(new MockTokenCredential());

    expect(() => options.createChannelCredentials()).toThrow("allowInsecureCredentials(true)");
  });

  it("does not emit token metadata after creating an anonymous insecure channel", () => {
    const options = fromConnectionString("Endpoint=http://localhost:8080;Authentication=None;TaskHub=myTaskHub");
    options.createChannelCredentials();
    options.setCredential(new MockTokenCredential());

    expect(() => options.createMetadataGenerator()).toThrow("allowInsecureCredentials(true)");
  });
});
