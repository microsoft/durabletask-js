// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const [oldCoreArgument, ...extraArguments] = process.argv.slice(2);
if (!oldCoreArgument || extraArguments.length) {
  throw new Error("Usage: npm run test:payload-packages -- <published-core-0.4.0.tgz>");
}
const oldCore = path.resolve(oldCoreArgument);
assert.ok(fs.statSync(oldCore).isFile(), "The published core archive must be a file.");
const npmCli = process.env.npm_execpath;
assert.ok(npmCli, "Run this check through npm run test:payload-packages.");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "durabletask-payload-packages-"));

function npm(args, cwd) {
  const result = spawnSync(process.execPath, [npmCli, ...args], {
    cwd,
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 2 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return result;
}

function pack(name) {
  const result = npm(
    ["pack", "--json", "--ignore-scripts", "--workspace", name, "--pack-destination", temporary],
    root,
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const [metadata] = JSON.parse(result.stdout);
  return path.join(temporary, metadata.filename);
}

function install(name, dependencies) {
  const directory = path.join(temporary, name);
  fs.mkdirSync(directory);
  fs.writeFileSync(
    path.join(directory, "package.json"),
    JSON.stringify({
      name,
      version: "1.0.0",
      private: true,
      dependencies: Object.fromEntries(
        Object.entries(dependencies).map(([dependency, archive]) => [dependency, pathToFileURL(archive).href]),
      ),
    }),
  );
  const result = npm(
    ["install", "--json", "--ignore-scripts", "--strict-peer-deps", "--no-audit", "--no-fund"],
    directory,
  );
  return { ...result, directory };
}

try {
  const coreName = "@microsoft/durabletask-js";
  const blobName = "@microsoft/durabletask-js-azureblob";
  const managedName = "@microsoft/durabletask-js-azuremanaged";
  const core = pack(coreName);
  const blob = pack(blobName);
  const managed = pack(managedName);
  for (const [index, name, archive] of [
    [0, blobName, blob],
    [1, managedName, managed],
  ]) {
    const result = install(`reject-published-core-${index}`, { [coreName]: oldCore, [name]: archive });
    assert.notEqual(result.status, 0, `${name} accepted published core 0.4.0, which lacks PayloadStore.`);
    const output = `${result.stdout}\n${result.stderr}`;
    assert.match(output, /ERESOLVE/, `Expected a peer conflict, not an unrelated install failure:\n${output}`);
    assert.match(output, /@microsoft\/durabletask-js@0\.4\.0/, output);
    console.log(`${name}: npm rejected published core 0.4.0 with ERESOLVE.`);
  }
  const result = install("accept-payload-capable-core", { [coreName]: core, [blobName]: blob, [managedName]: managed });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const runtime = spawnSync(
    process.execPath,
    [
      "-e",
      `
    const assert = require("node:assert/strict");
    const core = require("@microsoft/durabletask-js");
    const { BlobPayloadStore } = require("@microsoft/durabletask-js-azureblob");
    const { DurableTaskAzureManagedClientBuilder } = require("@microsoft/durabletask-js-azuremanaged");
    assert.equal(typeof core.PayloadStore, "function");
    assert.equal(typeof core.TaskHubGrpcClient.prototype.setLargePayloadAutoPurge, "function");
    assert.ok(new BlobPayloadStore({ connectionString: "UseDevelopmentStorage=true" }) instanceof core.PayloadStore);
    assert.equal(typeof DurableTaskAzureManagedClientBuilder.prototype.useExternalizedPayloads, "function");
  `,
    ],
    { cwd: result.directory, encoding: "utf8", timeout: 30000 },
  );
  if (runtime.error) throw runtime.error;
  assert.equal(runtime.status, 0, runtime.stderr || runtime.stdout);
  console.log("Packed core and extensions install successfully; public APIs load without storage or DTS I/O.");
} finally {
  fs.rmSync(temporary, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}
