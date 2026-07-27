/** @type {import('ts-jest').JestConfigWithTsJest} */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
//
// Dedicated jest config for the gated Azure Functions host e2e suite. It is
// intentionally NOT part of the default `npm test` / workspaces test run and is
// only executed via `npm run test:e2e:functions:internal`. These specs drive a
// real `func start` host over HTTP and skip cleanly without the local toolchain.
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/test/e2e-functions"],
  testMatch: ["**/test/e2e-functions/**/*.spec.ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.base.json",
      },
    ],
  },
  globalSetup: "<rootDir>/test/e2e-functions/global-setup.ts",
  globalTeardown: "<rootDir>/test/e2e-functions/global-teardown.ts",
  // Host cold-start (extension-bundle download + worker spin-up) dominates.
  testTimeout: 300_000,
};
