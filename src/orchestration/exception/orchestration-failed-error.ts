import { FailureDetails } from "../../task/failure-details";

export class OrchestrationFailedError extends Error {
  private _failureDetails: FailureDetails;

  constructor(message: string, details: FailureDetails) {
    super(message);
    this._failureDetails = details;
  }

  get failureDetails(): FailureDetails {
    return this._failureDetails;
  }
}
