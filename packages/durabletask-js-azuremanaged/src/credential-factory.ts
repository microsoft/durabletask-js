// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  TokenCredential,
  DefaultAzureCredential,
  ManagedIdentityCredential,
  WorkloadIdentityCredential,
  EnvironmentCredential,
  AzureCliCredential,
  AzurePowerShellCredential,
  VisualStudioCodeCredential,
  InteractiveBrowserCredential,
} from "@azure/identity";
import { DurableTaskAzureManagedConnectionString } from "./connection-string";

/**
 * Creates a TokenCredential based on the authentication type specified in the connection string.
 *
 * @param connectionString The parsed connection string.
 * @returns A TokenCredential instance based on the specified authentication type, or null if authentication type is "None".
 * @throws Error if the connection string contains an unsupported authentication type.
 */
export function getCredentialFromAuthenticationType(
  connectionString: DurableTaskAzureManagedConnectionString,
): TokenCredential | null {
  const authType = connectionString.getAuthentication().toLowerCase().trim();

  switch (authType) {
    case "defaultazure":
      return new DefaultAzureCredential();

    case "managedidentity": {
      const clientId = connectionString.getClientId();
      if (clientId) {
        return new ManagedIdentityCredential({ clientId });
      }
      return new ManagedIdentityCredential();
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

      return new WorkloadIdentityCredential(options);
    }

    case "environment":
      return new EnvironmentCredential();

    case "azurecli":
      return new AzureCliCredential();

    case "azurepowershell":
      return new AzurePowerShellCredential();

    case "visualstudiocode":
      return new VisualStudioCodeCredential();

    case "interactivebrowser":
      return new InteractiveBrowserCredential({});

    case "none":
      return null;

    default:
      throw new Error(`The connection string contains an unsupported authentication type '${authType}'.`);
  }
}
