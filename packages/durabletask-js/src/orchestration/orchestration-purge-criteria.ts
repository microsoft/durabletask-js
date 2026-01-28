// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { OrchestrationStatus } from "./enum/orchestration-status.enum";

export class PurgeInstanceCriteria {
  createdTimeFrom?: Date;
  createdTimeTo?: Date;
  runtimeStatusList: OrchestrationStatus[] = [];
  // default timeout 5 mins
  timeout: number = 5 * 60 * 1000;

  // Setter methods to allow users to set values later
  setCreatedTimeFrom(date: Date | undefined): void {
    this.createdTimeFrom = date;
  }

  getCreatedTimeFrom(): Date | undefined {
    return this.createdTimeFrom;
  }

  setCreatedTimeTo(date: Date | undefined): void {
    this.createdTimeTo = date;
  }

  getCreatedTimeTo(): Date | undefined {
    return this.createdTimeTo;
  }

  setRuntimeStatusList(statusList: OrchestrationStatus[]): void {
    this.runtimeStatusList = statusList;
  }

  getRuntimeStatusList(): OrchestrationStatus[] {
    return this.runtimeStatusList;
  }

  setTimeout(timeout: number): void {
    this.timeout = timeout;
  }

  getTimeout(): number {
    return this.timeout;
  }
}
