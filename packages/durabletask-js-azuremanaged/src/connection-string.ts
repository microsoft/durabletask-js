// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

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
  getAuthentication(): string {
    return this.getRequiredValue("Authentication");
  }

  /**
   * Gets the raw token audience URI. Options normalize this value before use.
   * Missing or empty selects the per-options REGION_NAME default; whitespace-only is invalid.
   * This is not an Azure Resource Manager resource path.
   */
  getResourceId(): string | undefined {
    return this.getValue("ResourceId");
  }

  /**
   * Gets the optional Azure Identity authority host for SDK-created credentials that support it.
   * Omission preserves Azure Identity defaults, including AZURE_AUTHORITY_HOST where applicable.
   * Does not apply to managed identity or configure developer tools' clouds.
   */
  getAuthorityHost(): string | undefined {
    return this.getValue("AuthorityHost");
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
    return value
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t !== "");
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
    return this.properties.get(name.toLowerCase());
  }

  private getRequiredValue(name: string): string {
    const value = this.getValue(name);
    if (!value || value === "") {
      const article = /^[aeiou]/i.test(name) ? "an" : "a";
      throw new Error(`The connection string must contain ${article} ${name} property`);
    }
    return value;
  }

  private parseConnectionString(connectionString: string): Map<string, string> {
    const properties = new Map<string, string>();

    const pairs = connectionString.split(";");
    for (const pair of pairs) {
      const equalsIndex = pair.indexOf("=");
      if (equalsIndex > 0) {
        const key = pair.substring(0, equalsIndex).trim().toLowerCase();
        const value = pair.substring(equalsIndex + 1);
        // Preserve ResourceId whitespace so options can distinguish empty from whitespace-only input.
        properties.set(key, key === "resourceid" ? value : value.trim());
      }
    }

    return properties;
  }
}
