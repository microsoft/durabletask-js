// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AccessToken, DefaultAzureCredential, GetTokenOptions, TokenCredential } from "@azure/identity";
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

const malformedSchemeEndpoints = [
  "htps:/scheduler.internal:8080",
  "http:/localhost:8080",
  "https:/example.com",
  "https:/example.com/a://b",
  "https:/\\example.com",
];

const silentlyRetargetedEndpoints = [
  "htt\nps:/example.com",
  "http:\t/localhost:8080",
  "https://exa\nmple.com",
  "https://user@example.com",
  "https:///example.com",
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

  it.each([" https://example.com ", " example.com "])("ignores outer whitespace in endpoint %s", (endpoint) => {
    expectSecureChannel(fromEndpoint(endpoint, null));
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

  it("allows connection string HTTP credentials when opt-in follows connectionString", async () => {
    jest.spyOn(DefaultAzureCredential.prototype, "getToken").mockResolvedValue({
      token: "mock-token",
      expiresOnTimestamp: Date.now() + 3600000,
    });
    const value = expectInsecureChannel(
      create()
        .connectionString("Endpoint=http://localhost:8080;Authentication=DefaultAzure;TaskHub=myTaskHub")
        .allowInsecureCredentials(true),
    );

    expect((await getMetadata(value)).get("authorization")).toHaveLength(1);
  });

  it("resets insecure credential opt-in when connectionString follows it", () => {
    const createSsl = jest.spyOn(grpc.ChannelCredentials, "createSsl");
    const createInsecure = jest.spyOn(grpc.ChannelCredentials, "createInsecure");
    const builder = create()
      .allowInsecureCredentials(true)
      .connectionString("Endpoint=http://localhost:8080;Authentication=DefaultAzure;TaskHub=myTaskHub");

    expect(() => builder.build()).toThrow("allowInsecureCredentials(true)");
    expect(createSsl).not.toHaveBeenCalled();
    expect(createInsecure).not.toHaveBeenCalled();
  });

  it("does not let explicit insecure credential opt-in downgrade an HTTPS endpoint", () => {
    expectSecureChannel(fromEndpoint("https://example.com", new MockTokenCredential()).allowInsecureCredentials(true));
  });

  it("rejects typo endpoint schemes instead of using plaintext", () => {
    const builder = fromConnectionString("Endpoint=htps://example.com;Authentication=None;TaskHub=myTaskHub");

    expect(() => builder.build()).toThrow("Invalid endpoint URL");
  });

  it.each(malformedSchemeEndpoints)("rejects malformed scheme endpoint %s before channel construction", (endpoint) => {
    const createSsl = jest.spyOn(grpc.ChannelCredentials, "createSsl");
    const createInsecure = jest.spyOn(grpc.ChannelCredentials, "createInsecure");
    const builder = fromEndpoint(endpoint, new MockTokenCredential());

    expect(() => builder.build()).toThrow("Invalid endpoint URL");
    expect(createSsl).not.toHaveBeenCalled();
    expect(createInsecure).not.toHaveBeenCalled();
  });

  it.each(silentlyRetargetedEndpoints)("rejects ambiguous endpoint %s before channel construction", (endpoint) => {
    const createSsl = jest.spyOn(grpc.ChannelCredentials, "createSsl");
    const createInsecure = jest.spyOn(grpc.ChannelCredentials, "createInsecure");
    const builder = fromEndpoint(endpoint, new MockTokenCredential());

    expect(() => builder.build()).toThrow("Invalid endpoint URL");
    expect(createSsl).not.toHaveBeenCalled();
    expect(createInsecure).not.toHaveBeenCalled();
  });
});

describe("grpc-js endpoint target", () => {
  it("preserves the HTTP default port in the client channel target", () => {
    const client = new DurableTaskAzureManagedClientBuilder()
      .endpoint("http://localhost:80", "myTaskHub", null)
      .build();

    try {
      const stub = (client as unknown as { _stub: { getChannel(): grpc.Channel } })._stub;
      expect(stub.getChannel().getTarget()).toBe("dns:localhost:80");
    } finally {
      (client as unknown as { _stub: { close(): void } })._stub.close();
    }
  });
});

describe.each([
  {
    name: "client",
    create: (endpoint: string) => new DurableTaskAzureManagedClientOptions().setEndpointAddress(endpoint),
    fromConnectionString: DurableTaskAzureManagedClientOptions.fromConnectionString,
  },
  {
    name: "worker",
    create: (endpoint: string) => new DurableTaskAzureManagedWorkerOptions().setEndpointAddress(endpoint),
    fromConnectionString: DurableTaskAzureManagedWorkerOptions.fromConnectionString,
  },
])("$name options endpoint security", ({ create, fromConnectionString }) => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ["example.com", "example.com"],
    ["example.com:8443", "example.com:8443"],
    ["localhost:8080", "localhost:8080"],
    ["127.0.0.1:8080", "127.0.0.1:8080"],
    ["[::1]", "[::1]"],
    ["[::1]:8080", "[::1]:8080"],
    ["HTTPS://EXAMPLE.COM", "example.com"],
    ["HTTP://LOCALHOST:8080", "localhost:8080"],
    ["example.com:80", "example.com:80"],
    ["http://example.com", "example.com:80"],
    ["http://example.com:80", "example.com:80"],
    ["http://example.com:8080", "example.com:8080"],
    ["https://example.com", "example.com"],
    ["https://example.com:443", "example.com"],
    ["https://example.com:8443", "example.com:8443"],
    ["https://example.com/path?key=value#fragment", "example.com"],
    [" https://example.com \n", "example.com"],
    [" localhost:8080 ", "localhost:8080"],
  ])("normalizes supported endpoint %s to authority %s", (endpoint, authority) => {
    expect(create(endpoint).getHostAddress()).toBe(authority);
  });

  it.each([...silentlyRetargetedEndpoints, "https://", "::1"])("rejects invalid endpoint %s", (endpoint) => {
    expect(() => create(endpoint).getHostAddress()).toThrow("Invalid endpoint URL");
  });

  it.each(malformedSchemeEndpoints)("rejects malformed scheme endpoint %s before channel construction", (endpoint) => {
    const createSsl = jest.spyOn(grpc.ChannelCredentials, "createSsl");
    const createInsecure = jest.spyOn(grpc.ChannelCredentials, "createInsecure");
    const options = fromConnectionString(`Endpoint=${endpoint};Authentication=None;TaskHub=myTaskHub`).setCredential(
      new MockTokenCredential(),
    );

    expect(() => options.createChannelCredentials()).toThrow("Invalid endpoint URL");
    expect(createSsl).not.toHaveBeenCalled();
    expect(createInsecure).not.toHaveBeenCalled();
  });

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
