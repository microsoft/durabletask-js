// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export function enumValueToKey(enumObj: any, enumValue: any) {
  return Object.keys(enumObj).find((key) => enumObj[key] === enumValue);
}
