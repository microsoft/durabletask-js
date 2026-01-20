// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TokenCredential } from "@azure/identity";
import { DurableTaskSchedulerConnectionString, AuthenticationType } from "./connection-string";

/**
 * Creates a TokenCredential based on the authentication type specified in the connection string.
 *
 * @param connectionString The parsed connection string.
 * @returns A TokenCredential instance based on the specified authentication type, or null if authentication type is "None".
 * @throws Error if the connection string contains an unsupported authentication type.
 */
export function getCredentialFromAuthenticationType(
  connectionString: DurableTaskSchedulerConnectionString,
): TokenCredential | null {
  const authType = connectionString.getAuthentication().toLowerCase().trim() as Lowercase<AuthenticationType>;

  // Dynamically import @azure/identity to handle cases where it may not be installed
  // This allows the package to work without the dependency if not using Azure authentication
  let azureIdentity: typeof import("@azure/identity");

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    azureIdentity = require("@azure/identity");
  } catch {
    if (authType !== "none") {
      throw new Error(
        `Azure authentication type "${authType}" requires the @azure/identity package. ` +
          `Please install it with: npm install @azure/identity`,
      );
    }
    return null;
  }

  switch (authType) {
    case "defaultazure":
      return new azureIdentity.DefaultAzureCredential();

    case "managedidentity": {
      const clientId = connectionString.getClientId();
      if (clientId) {
        return new azureIdentity.ManagedIdentityCredential({ clientId });
      }
      return new azureIdentity.ManagedIdentityCredential();
    }

    case "workloadidentity": {
      const options: {
        clientId?: string;
        tenantId?: string;
        tokenFilePath?: string;
        additionallyAllowedTenants?: string[];
      } = {};

      const clientId = connectionString.getClientId();
      if (clientId) {
        options.clientId = clientId;
      }

      const tenantId = connectionString.getTenantId();
      if (tenantId) {
        options.tenantId = tenantId;
      }

      const tokenFilePath = connectionString.getTokenFilePath();
      if (tokenFilePath) {
        options.tokenFilePath = tokenFilePath;
      }

      const additionallyAllowedTenants = connectionString.getAdditionallyAllowedTenants();
      if (additionallyAllowedTenants) {
        options.additionallyAllowedTenants = additionallyAllowedTenants;
      }

      return new azureIdentity.WorkloadIdentityCredential(options);
    }

    case "environment":
      return new azureIdentity.EnvironmentCredential();

    case "azurecli":
      return new azureIdentity.AzureCliCredential();

    case "azurepowershell":
      return new azureIdentity.AzurePowerShellCredential();

    case "visualstudiocode":
      return new azureIdentity.VisualStudioCodeCredential();

    case "interactivebrowser":
      return new azureIdentity.InteractiveBrowserCredential({});

    case "none":
      return null;

    default:
      throw new Error(`The connection string contains an unsupported authentication type '${authType}'.`);
  }
}
