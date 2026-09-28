// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as identity from "@azure/identity";
import {
  DurableTaskAzureManagedClientOptions,
  DurableTaskAzureManagedWorkerOptions,
  DurableTaskAzureManagedConnectionString,
  getCredentialFromAuthenticationType,
} from "../../src";

jest.mock("@azure/identity", () => {
  const credentialConstructor = () =>
    jest.fn(() => ({
      getToken: jest.fn(async () => ({ token: "recorded-token", expiresOnTimestamp: Date.now() + 3_600_000 })),
    }));
  return {
    DefaultAzureCredential: credentialConstructor(),
    ManagedIdentityCredential: credentialConstructor(),
    WorkloadIdentityCredential: credentialConstructor(),
    EnvironmentCredential: credentialConstructor(),
    AzureCliCredential: credentialConstructor(),
    AzurePowerShellCredential: credentialConstructor(),
    VisualStudioCodeCredential: credentialConstructor(),
    InteractiveBrowserCredential: credentialConstructor(),
  };
});

const credentialCases = [
  { authentication: "DefaultAzure", Credential: identity.DefaultAzureCredential, supportsAuthority: true },
  { authentication: "ManagedIdentity", Credential: identity.ManagedIdentityCredential, supportsAuthority: false },
  { authentication: "WorkloadIdentity", Credential: identity.WorkloadIdentityCredential, supportsAuthority: true },
  { authentication: "Environment", Credential: identity.EnvironmentCredential, supportsAuthority: true },
  { authentication: "AzureCli", Credential: identity.AzureCliCredential, supportsAuthority: false },
  { authentication: "AzurePowerShell", Credential: identity.AzurePowerShellCredential, supportsAuthority: false },
  { authentication: "VisualStudioCode", Credential: identity.VisualStudioCodeCredential, supportsAuthority: true },
  { authentication: "InteractiveBrowser", Credential: identity.InteractiveBrowserCredential, supportsAuthority: true },
];
const AUTHORITY = "https://login.microsoftonline.us";
const ENDPOINT = "https://scheduler.example";

function connectionString(authentication: string, extra = ""): string {
  return `Endpoint=${ENDPOINT};TaskHub=test;Authentication=${authentication}${extra}`;
}

describe("SDK-created credentials", () => {
  const originalRegion = process.env.REGION_NAME;
  const originalAuthority = process.env.AZURE_AUTHORITY_HOST;

  beforeEach(() => {
    process.env.REGION_NAME = "UsGovVirginia";
    process.env.AZURE_AUTHORITY_HOST = AUTHORITY;
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (originalRegion === undefined) delete process.env.REGION_NAME;
    else process.env.REGION_NAME = originalRegion;
    if (originalAuthority === undefined) delete process.env.AZURE_AUTHORITY_HOST;
    else process.env.AZURE_AUTHORITY_HOST = originalAuthority;
  });

  describe.each(credentialCases)("$authentication", ({ authentication, Credential, supportsAuthority }) => {
    it("forwards AuthorityHost only to credentials that support it", () => {
      const parsed = new DurableTaskAzureManagedConnectionString(
        connectionString(authentication, `;aUtHoRiTyHoSt= ${AUTHORITY} `),
      );
      const credential = getCredentialFromAuthenticationType(parsed);
      const args = jest.mocked(Credential).mock.calls[0];
      expect(args[0]).toEqual(supportsAuthority ? { authorityHost: AUTHORITY } : undefined);
      expect(credential?.getToken).not.toHaveBeenCalled();
    });

    it.each(["", ";AuthorityHost="])("leaves omitted authority to Azure Identity, not REGION_NAME (%s)", (extra) => {
      getCredentialFromAuthenticationType(
        new DurableTaskAzureManagedConnectionString(connectionString(authentication, extra)),
      );
      const args = jest.mocked(Credential).mock.calls[0];
      expect(args[0] ?? {}).not.toHaveProperty("authorityHost");
    });

    it.each([DurableTaskAzureManagedClientOptions, DurableTaskAzureManagedWorkerOptions])(
      "%s requests a normalized custom audience independently of authority",
      async (Options) => {
        const options = Options.fromConnectionString(
          connectionString(authentication, `;ResourceId= api://Custom/.default/.DEFAULT/ ;AuthorityHost=${AUTHORITY}`),
        );
        const credential = options.getCredential();
        expect(credential).not.toBeNull();
        expect(options.getEndpointAddress()).toBe(ENDPOINT);
        expect(credential?.getToken).not.toHaveBeenCalled();
        await options.createMetadataGenerator()();
        expect(credential?.getToken).toHaveBeenCalledWith("api://Custom/.default/.default", undefined);
      },
    );

    it.each([DurableTaskAzureManagedClientOptions, DurableTaskAzureManagedWorkerOptions])(
      "%s requests the government default without changing authority",
      async (Options) => {
        const options = Options.fromConnectionString(connectionString(authentication));
        await options.createMetadataGenerator()();
        expect(options.getCredential()?.getToken).toHaveBeenCalledWith(
          "https://durabletask.azure.us/.default",
          undefined,
        );
        expect(jest.mocked(Credential).mock.calls[0][0] ?? {}).not.toHaveProperty("authorityHost");
      },
    );
  });

  it("preserves workload identity configuration alongside authority", () => {
    getCredentialFromAuthenticationType(
      new DurableTaskAzureManagedConnectionString(
        connectionString(
          "WorkloadIdentity",
          `;ClientID=client;TenantId=tenant;TokenFilePath=token-file;AdditionallyAllowedTenants=one, two;AuthorityHost=${AUTHORITY}`,
        ),
      ),
    );
    expect(identity.WorkloadIdentityCredential).toHaveBeenCalledWith({
      clientId: "client",
      tenantId: "tenant",
      tokenFilePath: "token-file",
      additionallyAllowedTenants: ["one", "two"],
      authorityHost: AUTHORITY,
    });
  });

  it("preserves managed identity client ID without passing an authority", () => {
    getCredentialFromAuthenticationType(
      new DurableTaskAzureManagedConnectionString(
        connectionString("ManagedIdentity", `;ClientID=client;AuthorityHost=${AUTHORITY}`),
      ),
    );
    expect(identity.ManagedIdentityCredential).toHaveBeenCalledWith({ clientId: "client" });
  });

  it("does not create credentials for anonymous authentication", async () => {
    const options = DurableTaskAzureManagedClientOptions.fromConnectionString(
      connectionString("None", `;ResourceId=api://Custom;AuthorityHost=${AUTHORITY}`),
    );
    expect(options.getCredential()).toBeNull();
    expect((await options.createMetadataGenerator()()).get("authorization")).toEqual([]);
    for (const { Credential } of credentialCases) {
      expect(Credential).not.toHaveBeenCalled();
    }
  });

  it("rejects invalid audiences before creating a credential", () => {
    expect(() =>
      DurableTaskAzureManagedClientOptions.fromConnectionString(connectionString("DefaultAzure", ";ResourceId= \t ")),
    ).toThrow(/resourceId.*cannot be empty after normalization/);
    expect(identity.DefaultAzureCredential).not.toHaveBeenCalled();
  });
});
