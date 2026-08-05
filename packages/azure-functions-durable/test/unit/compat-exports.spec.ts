// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import ts from "typescript";
import type {
  ActivityHandler,
  DurableClient,
  EntityContext,
  EntityHandler,
  OrchestrationContext,
  OrchestrationHandler,
} from "../../src";
import { TaskFailedError } from "../../src";
import packageJson from "../../package.json";

describe("v3 compatibility type aliases", () => {
  it("exposes ActivityHandler / OrchestrationHandler / OrchestrationContext", () => {
    const activity: ActivityHandler = (input: unknown) => input;
    const orchestrator: OrchestrationHandler = function* (context: OrchestrationContext) {
      yield context.df.callActivity("noop");
      return context.df.getInput();
    };
    expect(typeof activity).toBe("function");
    expect(typeof orchestrator).toBe("function");
  });

  describe("package exports", () => {
    it("publishes the testing subpath independently from the runtime entry point", () => {
      const exports = packageJson.exports as Record<string, unknown>;
      expect(exports["./testing"]).toEqual({
        types: "./dist/testing/index.d.ts",
        require: "./dist/testing/index.js",
        import: "./dist/testing/index.js",
      });
      expect(packageJson.typesVersions).toEqual({
        "*": {
          testing: ["./dist/testing/index.d.ts"],
        },
      });
    });

    it("resolves testing declarations with classic Node module resolution", () => {
      const consumerRoot = mkdtempSync(join(tmpdir(), "durable-functions-types-"));
      const packageRoot = join(consumerRoot, "node_modules", "durable-functions");
      const declarationPath = join(packageRoot, "dist", "testing", "index.d.ts");
      const consumerPath = join(consumerRoot, "consumer.ts");

      try {
        mkdirSync(join(packageRoot, "dist", "testing"), { recursive: true });
        writeFileSync(join(packageRoot, "package.json"), JSON.stringify(packageJson));
        writeFileSync(declarationPath, "export declare function runOrchestrator(): Promise<void>;");
        writeFileSync(consumerPath, 'import { runOrchestrator } from "durable-functions/testing";');

        const resolved = ts.resolveModuleName(
          "durable-functions/testing",
          consumerPath,
          { moduleResolution: ts.ModuleResolutionKind.Node10 },
          ts.sys,
        ).resolvedModule;

        expect(resolved?.resolvedFileName.replace(/\\/g, "/")).toBe(declarationPath.replace(/\\/g, "/"));
      } finally {
        rmSync(consumerRoot, { recursive: true, force: true });
      }
    });
  });

  it("exposes generic EntityContext<TState> / EntityHandler<TState> and DurableClient", () => {
    // Compile-guard: the generic aliases must accept a type argument (the legacy v3 surface uses
    // e.g. EntityHandler<string>), even though our underlying types are non-generic.
    type _E1 = EntityContext<{ x: number }>;
    type _E2 = EntityHandler<string>;
    const handler: EntityHandler<string> = (context: EntityContext<string>) => {
      context.df.return(0);
    };
    // DurableClient is the type returned by getClient(); assert it's usable as a type annotation.
    const client: DurableClient | undefined = undefined;
    expect(typeof handler).toBe("function");
    expect(client).toBeUndefined();
  });

  it("re-exports the core TaskFailedError as a top-level export for instanceof guards", () => {
    // v3 exposed TaskFailedError so callers could `catch (e) { if (e instanceof TaskFailedError) }`.
    // The core engine throws its own TaskFailedError; this package must re-export the same class.
    expect(typeof TaskFailedError).toBe("function");
    expect(TaskFailedError.prototype).toBeInstanceOf(Error);
  });
});
