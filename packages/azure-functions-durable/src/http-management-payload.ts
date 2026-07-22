// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface HttpManagementPayload {
  id: string;
  purgeHistoryDeleteUri: string;
  restartPostUri: string;
  rewindPostUri: string;
  sendEventPostUri: string;
  statusQueryGetUri: string;
  terminatePostUri: string;
  resumePostUri: string;
  suspendPostUri: string;
}

export function createHttpManagementPayload(
  instanceId: string,
  instanceStatusUrl: string,
  requiredQueryStringParameters: string,
): HttpManagementPayload {
  const queryString = normalizeQueryString(requiredQueryStringParameters);
  const querySuffix = queryString ? `?${queryString}` : "";
  const reasonQuerySuffix = queryString ? `?reason={text}&${queryString}` : "?reason={text}";

  return {
    id: instanceId,
    purgeHistoryDeleteUri: `${instanceStatusUrl}${querySuffix}`,
    restartPostUri: `${instanceStatusUrl}/restart${querySuffix}`,
    rewindPostUri: `${instanceStatusUrl}/rewind${reasonQuerySuffix}`,
    sendEventPostUri: `${instanceStatusUrl}/raiseEvent/{eventName}${querySuffix}`,
    statusQueryGetUri: `${instanceStatusUrl}${querySuffix}`,
    terminatePostUri: `${instanceStatusUrl}/terminate${reasonQuerySuffix}`,
    resumePostUri: `${instanceStatusUrl}/resume${reasonQuerySuffix}`,
    suspendPostUri: `${instanceStatusUrl}/suspend${reasonQuerySuffix}`,
  };
}

function normalizeQueryString(requiredQueryStringParameters: string): string {
  return requiredQueryStringParameters.startsWith("?")
    ? requiredQueryStringParameters.slice(1)
    : requiredQueryStringParameters;
}
