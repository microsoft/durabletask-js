module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  testMatch: ["**/*.spec.ts"],
  moduleNameMapper: {
    "^@microsoft/durabletask-js$": "<rootDir>/../durabletask-js/src/index.ts",
  },
};
