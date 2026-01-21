// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Supported authentication types for Azure-managed Durable Task connection strings.
 */
export type AuthenticationType =
  | "DefaultAzure"
  | "ManagedIdentity"
  | "WorkloadIdentity"
  | "Environment"
  | "AzureCli"
  | "AzurePowerShell"
  | "VisualStudioCode"
  | "InteractiveBrowser"
  | "None";

/**
 * Represents the constituent parts of a connection string for an Azure-managed Durable Task service.
 */
export class DurableTaskAzureManagedConnectionString {
  private properties: Map<string, string>;

  /**
   * Creates a new instance of DurableTaskAzureManagedConnectionString.
   * @param connectionString A connection string for an Azure-managed Durable Task service.
   * @throws Error if the connection string is invalid or missing required properties.
   */
  constructor(connectionString: string) {
    if (!connectionString || connectionString.trim() === "") {
      throw new Error("connectionString must not be null or empty");
    }

    this.properties = this.parseConnectionString(connectionString);

    // Validate required properties
    this.getAuthentication();
    this.getTaskHubName();
    this.getEndpoint();
  }

  /**
   * Gets the authentication method specified in the connection string.
   * @returns The authentication method.
   */
  getAuthentication(): AuthenticationType {
    return this.getRequiredValue("Authentication") as AuthenticationType;
  }

  /**
   * Gets the managed identity or workload identity client ID specified in the connection string.
   * @returns The client ID, or undefined if not specified.
   */
  getClientId(): string | undefined {
    return this.getValue("ClientID");
  }

  /**
   * Gets the "AdditionallyAllowedTenants" property, optionally used by Workload Identity.
   * Multiple values can be separated by a comma.
   * @returns List of allowed tenants, or undefined if not specified.
   */
  getAdditionallyAllowedTenants(): string[] | undefined {
    const value = this.getValue("AdditionallyAllowedTenants");
    if (!value || value === "") {
      return undefined;
    }
    return value.split(",");
  }

  /**
   * Gets the "TenantId" property, optionally used by Workload Identity.
   * @returns The tenant ID, or undefined if not specified.
   */
  getTenantId(): string | undefined {
    return this.getValue("TenantId");
  }

  /**
   * Gets the "TokenFilePath" property, optionally used by Workload Identity.
   * @returns The token file path, or undefined if not specified.
   */
  getTokenFilePath(): string | undefined {
    return this.getValue("TokenFilePath");
  }

  /**
   * Gets the endpoint specified in the connection string.
   * @returns The endpoint URL.
   */
  getEndpoint(): string {
    return this.getRequiredValue("Endpoint");
  }

  /**
   * Gets the task hub name specified in the connection string.
   * @returns The task hub name.
   */
  getTaskHubName(): string {
    return this.getRequiredValue("TaskHub");
  }

  private getValue(name: string): string | undefined {
    return this.properties.get(name);
  }

  private getRequiredValue(name: string): string {
    const value = this.getValue(name);
    if (!value || value === "") {
      throw new Error(`The connection string must contain a ${name} property`);
    }
    return value;
  }

  private parseConnectionString(connectionString: string): Map<string, string> {
    const properties = new Map<string, string>();

    const pairs = connectionString.split(";");
    for (const pair of pairs) {
      const equalsIndex = pair.indexOf("=");
      if (equalsIndex > 0) {
        const key = pair.substring(0, equalsIndex).trim();
        const value = pair.substring(equalsIndex + 1).trim();
        properties.set(key, value);
      }
    }

    return properties;
  }
}
