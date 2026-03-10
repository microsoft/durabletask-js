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
      const clientId = connectionString.getClientId();
      const tenantId = connectionString.getTenantId();
      const tokenFilePath = connectionString.getTokenFilePath();
      const additionallyAllowedTenants = connectionString.getAdditionallyAllowedTenants();

      return new WorkloadIdentityCredential({
        ...(clientId && { clientId }),
        ...(tenantId && { tenantId }),
        ...(tokenFilePath && { tokenFilePath }),
        ...(additionallyAllowedTenants && { additionallyAllowedTenants }),
      });
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
