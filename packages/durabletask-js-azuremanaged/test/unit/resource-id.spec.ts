// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { DefaultAzureCredential, TokenCredential } from "@azure/identity";
import * as grpc from "@grpc/grpc-js";
import { TaskHubGrpcClient, TaskHubGrpcWorker } from "@microsoft/durabletask-js";
import {
  createAzureManagedClient,
  createAzureManagedWorkerBuilder,
  DurableTaskAzureManagedClientBuilder,
  DurableTaskAzureManagedClientOptions,
  DurableTaskAzureManagedConnectionString,
  DurableTaskAzureManagedWorkerBuilder,
  DurableTaskAzureManagedWorkerOptions,
} from "../../src";

const PUBLIC = "https://durabletask.io";
const GOVERNMENT = "https://durabletask.azure.us";
const ENDPOINT = "https://scheduler.example:8443";
const TASKHUB = "test-hub";
type MetadataGenerator = () => Promise<grpc.Metadata>;
type ResourceId = string | null | undefined;

const resourceCases: [string | undefined, ResourceId, string][] = [
  [undefined, undefined, PUBLIC],
  ["", undefined, PUBLIC],
  ["westus2", null, PUBLIC],
  ["chinaeast2", null, PUBLIC],
  ["notusgov", null, PUBLIC],
  ["notusdod", null, PUBLIC],
  [" usgovvirginia", null, PUBLIC],
  ["usgovvirginia", undefined, GOVERNMENT],
  ["USGOVARIZONA", null, GOVERNMENT],
  ["UsGovTexas", null, GOVERNMENT],
  ["usdodcentral", null, GOVERNMENT],
  ["USDODEAST", null, GOVERNMENT],
  ["UsDodCentral", null, GOVERNMENT],
  ["usgov", null, GOVERNMENT],
  ["usdod", null, GOVERNMENT],
  [undefined, "", PUBLIC],
  ["usgovvirginia", "", GOVERNMENT],
  ["usdodcentral", "", GOVERNMENT],
  ["usgovvirginia", PUBLIC, PUBLIC],
  ["usdodcentral", PUBLIC, PUBLIC],
  ["westus2", GOVERNMENT, GOVERNMENT],
  ["chinaeast2", "https://durabletask.example", "https://durabletask.example"],
  [undefined, GOVERNMENT + "/", GOVERNMENT],
  [undefined, GOVERNMENT + "/.default", GOVERNMENT],
  [undefined, GOVERNMENT + "//.DEFAULT//", GOVERNMENT],
  [undefined, " \t" + GOVERNMENT + "/.default/ \t", GOVERNMENT],
  ["usgovvirginia", "api://CustomAudience/resource/.DEFAULT/", "api://CustomAudience/resource"],
  ["westus2", "api://custom/.default/.default", "api://custom/.default"],
];
const invalidResourceIds = [" \t ", "///", "/.default", "/.DEFAULT///", " /.DEFAULT/// "];

function setRegion(region: string | undefined): void {
  if (region === undefined) {
    delete process.env.REGION_NAME;
  } else {
    process.env.REGION_NAME = region;
  }
}

function connectionString(resourceId: ResourceId, credential: TokenCredential | null): string {
  return (
    `Endpoint=${ENDPOINT};TaskHub=${TASKHUB};Authentication=${credential ? "DefaultAzure" : "None"}` +
    (resourceId == null ? "" : `;rEsOuRcEiD=${resourceId}`)
  );
}

const built: (TaskHubGrpcClient | TaskHubGrpcWorker)[] = [];

function metadataFrom(value: TaskHubGrpcClient | TaskHubGrpcWorker): MetadataGenerator {
  built.push(value);
  const generator = value instanceof TaskHubGrpcClient ? value["_metadataGenerator"] : value["_metadataGenerator"];
  if (!generator) {
    throw new Error("Builder did not forward the metadata generator");
  }
  return generator;
}

const paths: {
  name: string;
  create(credential: TokenCredential | null, resourceId: ResourceId): MetadataGenerator;
}[] = [];

for (const Options of [DurableTaskAzureManagedClientOptions, DurableTaskAzureManagedWorkerOptions]) {
  paths.push(
    {
      name: `${Options.name} setters`,
      create: (credential, resourceId) =>
        new Options()
          .setEndpointAddress(ENDPOINT)
          .setTaskHubName(TASKHUB)
          .setCredential(credential)
          .setResourceId(resourceId)
          .createMetadataGenerator(),
    },
    {
      name: `${Options.name} connection string`,
      create: (credential, resourceId) =>
        Options.fromConnectionString(connectionString(resourceId, credential)).createMetadataGenerator(),
    },
    {
      name: `${Options.name} parsed connection string`,
      create: (credential, resourceId) =>
        Options.fromParsedConnectionString(
          new DurableTaskAzureManagedConnectionString(connectionString(resourceId, credential)),
        ).createMetadataGenerator(),
    },
  );
}

for (const Builder of [DurableTaskAzureManagedClientBuilder, DurableTaskAzureManagedWorkerBuilder]) {
  paths.push(
    {
      name: `${Builder.name} endpoint`,
      create: (credential, resourceId) =>
        metadataFrom(new Builder().endpoint(ENDPOINT, TASKHUB, credential).resourceId(resourceId).build()),
    },
    {
      name: `${Builder.name} connection string`,
      create: (credential, resourceId) =>
        metadataFrom(new Builder().connectionString(connectionString(resourceId, credential)).build()),
    },
  );
}

paths.push(
  {
    name: "createAzureManagedClient endpoint",
    create: (credential, resourceId) =>
      metadataFrom(createAzureManagedClient(ENDPOINT, TASKHUB, credential, resourceId)),
  },
  {
    name: "createAzureManagedClient connection string",
    create: (credential, resourceId) =>
      metadataFrom(createAzureManagedClient(connectionString(resourceId, credential))),
  },
  {
    name: "createAzureManagedWorkerBuilder endpoint",
    create: (credential, resourceId) =>
      metadataFrom(createAzureManagedWorkerBuilder(ENDPOINT, TASKHUB, credential, resourceId).build()),
  },
  {
    name: "createAzureManagedWorkerBuilder connection string",
    create: (credential, resourceId) =>
      metadataFrom(createAzureManagedWorkerBuilder(connectionString(resourceId, credential)).build()),
  },
);

describe("Resource audience", () => {
  const originalRegion = process.env.REGION_NAME;

  beforeEach(() => {
    delete process.env.REGION_NAME;
    jest.useFakeTimers();
  });

  afterEach(() => {
    for (const value of built) {
      if (value instanceof TaskHubGrpcClient) {
        value["_stub"].close();
      } else {
        value["_stub"]?.close();
      }
    }
    built.length = 0;
    setRegion(originalRegion);
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  function recordingCredential() {
    const credential = {
      getToken: jest.fn(async (_scopes: string | string[]) => ({
        token: "recorded-token",
        expiresOnTimestamp: Date.now() + 3_600_000,
      })),
    } satisfies TokenCredential;
    jest.spyOn(DefaultAzureCredential.prototype, "getToken").mockImplementation(credential.getToken);
    return credential;
  }

  describe.each(paths)("$name", ({ create }) => {
    it.each(resourceCases)(
      "requests the correct scope and refreshes it: region=%s resourceId=%s",
      async (region, resourceId, expected) => {
        setRegion(region);
        const credential = recordingCredential();
        const generate = create(credential, resourceId);
        expect(credential.getToken).not.toHaveBeenCalled();
        setRegion(region?.toLowerCase().startsWith("usgov") ? "westus2" : "usgovvirginia");

        const metadata = await Promise.all(Array.from({ length: 5 }, () => generate()));
        await generate();
        expect(credential.getToken.mock.calls).toEqual([[`${expected}/.default`, undefined]]);
        expect(metadata[0].get("authorization")).toEqual(["Bearer recorded-token"]);
        expect(metadata[0].get("taskhub")).toEqual([TASKHUB]);

        // Enter the existing five-minute refresh margin without expiring the token.
        jest.setSystemTime(Date.now() + 3_300_001);
        await Promise.all(Array.from({ length: 5 }, () => generate()));
        expect(credential.getToken.mock.calls).toEqual([
          [`${expected}/.default`, undefined],
          [`${expected}/.default`, undefined],
        ]);
      },
    );

    it.each(invalidResourceIds)("rejects invalid anonymous resourceId %j", (resourceId) => {
      expect(() => create(null, resourceId)).toThrow(/resourceId.*cannot be empty after normalization/);
    });

    it("resolves defaults independently for each instance", async () => {
      const credential = recordingCredential();
      setRegion("usgovvirginia");
      const government = create(credential, undefined);
      setRegion("westus2");
      const publicCloud = create(credential, undefined);
      setRegion("usdodeast");
      await government();
      await publicCloud();
      expect(credential.getToken.mock.calls).toEqual([
        [`${GOVERNMENT}/.default`, undefined],
        [`${PUBLIC}/.default`, undefined],
      ]);
    });

    it("keeps anonymous authentication anonymous", async () => {
      const credential = recordingCredential();
      setRegion("usgovvirginia");
      const metadata = await create(null, "api://Custom/.default")();
      expect(metadata.get("authorization")).toEqual([]);
      expect(metadata.get("taskhub")).toEqual([TASKHUB]);
      expect(credential.getToken).not.toHaveBeenCalled();
    });
  });

  describe.each([DurableTaskAzureManagedClientOptions, DurableTaskAzureManagedWorkerOptions])(
    "%s configuration lifetime",
    (Options) => {
      it.each([undefined, null, ""])("pins the default when resetting resourceId to %s", async (resourceId) => {
        setRegion("usgovvirginia");
        const credential = recordingCredential();
        const options = new Options().setEndpointAddress(ENDPOINT).setCredential(credential);
        options.setResourceId("api://custom");
        setRegion("westus2");
        options.setResourceId(resourceId);
        await options.createMetadataGenerator()();
        expect(credential.getToken).toHaveBeenCalledWith(`${GOVERNMENT}/.default`, undefined);
      });

      it("does not infer the audience from a government endpoint or change the supplied credential", async () => {
        const credential = recordingCredential();
        const endpoint = "https://account.usgovvirginia.durabletask.azure.us";
        const options = new Options().setEndpointAddress(endpoint).setCredential(credential);
        expect(options.getCredential()).toBe(credential);
        expect(options.getEndpointAddress()).toBe(endpoint);
        expect(options.getHostAddress()).toBe("account.usgovvirginia.durabletask.azure.us");
        await options.createMetadataGenerator()();
        expect(credential.getToken).toHaveBeenCalledWith(`${PUBLIC}/.default`, undefined);
      });
    },
  );

  it.each([DurableTaskAzureManagedClientBuilder, DurableTaskAzureManagedWorkerBuilder])(
    "%s captures defaults at options creation, not build or token acquisition",
    async (Builder) => {
      setRegion("usgovvirginia");
      const credential = recordingCredential();
      const builder = new Builder().endpoint(ENDPOINT, TASKHUB, credential);
      setRegion("westus2");
      await metadataFrom(builder.build())();
      expect(credential.getToken).toHaveBeenCalledWith(`${GOVERNMENT}/.default`, undefined);
    },
  );

  it.each([DurableTaskAzureManagedClientBuilder, DurableTaskAzureManagedWorkerBuilder])(
    "%s preserves connection-string replacement and explicit setter precedence",
    async (Builder) => {
      const credential = recordingCredential();
      const builder = new Builder()
        .resourceId("api://discarded")
        .connectionString(connectionString("api://from-string", credential));
      await metadataFrom(builder.build())();
      builder.resourceId("api://override/.default/.default");
      await metadataFrom(builder.build())();
      expect(credential.getToken.mock.calls).toEqual([
        ["api://from-string/.default", undefined],
        ["api://override/.default/.default", undefined],
      ]);
    },
  );
});
