/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.spec.ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  moduleNameMapper: {
    "^@microsoft/durabletask-js$": "<rootDir>/packages/durabletask-js/src/index.ts",
    "^@microsoft/durabletask-js-azuremanaged$": "<rootDir>/packages/durabletask-js-azuremanaged/src/index.ts",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.base.json",
      },
    ],
  },
};
