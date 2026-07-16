// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Shared helpers for the Azure Functions Durable end-to-end tests.
 *
 * These tests launch a *real* Azure Functions host (`func start`) for the sample
 * function app under `test-app/`, backed by Azurite (the local Azure Storage
 * emulator) and the public Durable Task extension bundle. The Node.js worker,
 * the host, and the Durable extension all cooperate exactly as they would in
 * production, and the suite drives the app purely over HTTP.
 *
 * Everything here is Node built-in only (`child_process`, `http`, `net`, `fs`,
 * `os`, `path`) so the harness adds no test dependencies of its own.
 *
 * The harness mirrors the C# `DurableHelpers`/`HttpHelpers` used by the
 * extension's own e2e suite (which drive the identical `BasicNode` app):
 *   - POST /api/{functionName}{queryString}  -> invoke an HTTP trigger. Durable
 *     starters return the `createCheckStatusResponse` payload
 *     ({ id, statusQueryGetUri, ... }); client-operation triggers (RaiseEvent,
 *     SuspendInstance, TerminateInstance, ...) return their own status/body.
 *   - GET  {statusQueryGetUri}                -> poll orchestration status.
 *   - GET  /admin/host/status                 -> host readiness probe.
 */

import { ChildProcess, spawn, spawnSync } from "child_process";
import * as fs from "fs";
import * as http from "http";
import * as net from "net";
import * as os from "os";
import * as path from "path";

/** Directory of the sample function app driven by these tests. */
export const TEST_APP_DIR = path.join(__dirname, "test-app");

// Azurite's well-known blob endpoint. The Durable extension's default Azure
// Storage provider also needs queue/table, but a reachable blob port is a good
// proxy for "Azurite is up" and matches the other e2e suites in this repo.
export const AZURITE_HOST = "127.0.0.1";
export const AZURITE_BLOB_PORT = 10000;

// How long to wait for the Functions host to become ready, and for an
// orchestration to reach a terminal state. The host cold-start (extension
// bundle download on first run + worker spin-up) dominates the former.
export const HOST_STARTUP_TIMEOUT_MS = 180_000;
export const ORCHESTRATION_TIMEOUT_MS = 60_000;

/** Result of a preflight prerequisite check. */
export interface PrerequisiteCheck {
  ok: boolean;
  reason?: string;
  /** Base URL of the shared `func` host, set by globalSetup once it is ready. */
  baseUrl?: string;
}

/** Loose shape of a durable orchestration status-query response. */
export interface OrchestrationStatus {
  name?: string;
  instanceId?: string;
  runtimeStatus?: string;
  input?: unknown;
  output?: unknown;
  customStatus?: unknown;
  createdTime?: string;
  lastUpdatedTime?: string;
  [key: string]: unknown;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Return an OS-assigned free TCP port. */
export function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address && typeof address === "object") {
        const { port } = address;
        server.close(() => resolve(port));
      } else {
        server.close(() => reject(new Error("Failed to acquire a free TCP port")));
      }
    });
  });
}

/** Return the path to the Azure Functions Core Tools (`func`), if installed. */
export function funcExecutable(): string | undefined {
  const isWindows = process.platform === "win32";
  const candidates = isWindows ? ["func.cmd", "func.exe", "func.bat", "func"] : ["func"];
  const pathDirs = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  for (const dir of pathDirs) {
    for (const candidate of candidates) {
      const full = path.join(dir, candidate);
      try {
        if (fs.statSync(full).isFile()) {
          return full;
        }
      } catch {
        // Not in this directory; keep looking.
      }
    }
  }
  return undefined;
}

/** Return true if Azurite's blob endpoint accepts TCP connections. */
export function azuriteRunning(timeoutMs = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const done = (result: boolean): void => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
    socket.connect(AZURITE_BLOB_PORT, AZURITE_HOST);
  });
}

/**
 * `func start` for a Node app serves the compiled output in `dist/` and needs
 * the `durable-functions` dependency installed under `node_modules/`. Both are
 * produced by `npm install && npm run build` inside the test-app. The app is
 * wired to the published `durable-functions` package, so this works out of the
 * box with no in-repo package build required.
 */
export function testAppBuilt(appDir: string = TEST_APP_DIR): boolean {
  return fs.existsSync(path.join(appDir, "dist")) && fs.existsSync(path.join(appDir, "node_modules"));
}

/** Run the full async preflight (func + Azurite + built test-app). */
export async function checkPrerequisites(appDir: string = TEST_APP_DIR): Promise<PrerequisiteCheck> {
  if (!funcExecutable()) {
    return { ok: false, reason: "Azure Functions Core Tools ('func') is not installed." };
  }
  if (!(await azuriteRunning())) {
    return { ok: false, reason: `Azurite is not running on ${AZURITE_HOST}:${AZURITE_BLOB_PORT}.` };
  }
  if (!testAppBuilt(appDir)) {
    return {
      ok: false,
      reason:
        `test-app is not built/installed at ${appDir} (missing dist/ or node_modules/). ` +
        "Run `npm install && npm run build` inside the test-app.",
    };
  }
  return { ok: true };
}

/** Path of the preflight result file written by jest globalSetup. */
export function preflightFilePath(): string {
  return path.join(os.tmpdir(), "durabletask-js-functions-e2e-preflight.json");
}

/**
 * Read the preflight result written by globalSetup. Specs use this to decide
 * `describe` vs `describe.skip` and to obtain the shared host `baseUrl`.
 *
 * When the file is absent (e.g. a spec is run without the dedicated jest config
 * that provides globalSetup) the suite cannot reach a shared host, so this
 * returns a skip result rather than attempting anything.
 */
export function readPreflight(): PrerequisiteCheck {
  let result: PrerequisiteCheck;
  try {
    result = JSON.parse(fs.readFileSync(preflightFilePath(), "utf-8")) as PrerequisiteCheck;
  } catch {
    return {
      ok: false,
      reason:
        "No preflight result found. Run the suite via `npm run test:e2e:functions:internal` " +
        "(the dedicated jest config provides the globalSetup that starts the shared host).",
    };
  }
  if (result.ok && !result.baseUrl) {
    return { ok: false, reason: "Preflight reported OK but no shared host baseUrl was recorded." };
  }
  return result;
}

/** Result of an HTTP request performed by the harness. */
export interface HttpResult {
  status: number;
  body: string;
  json<T = unknown>(): T;
}

/**
 * Perform an HTTP request, returning status and body. HTTP error responses
 * (4xx/5xx) are returned rather than thrown, so callers can assert on status.
 */
export function httpRequest(
  method: string,
  url: string,
  data?: unknown,
  timeoutMs = 30_000,
  contentType?: string,
): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    let payload: string | undefined;
    const headers: Record<string, string> = {};
    if (data !== undefined) {
      const isString = typeof data === "string";
      payload = isString ? (data as string) : JSON.stringify(data);
      headers["Content-Type"] = contentType ?? (isString ? "text/plain" : "application/json");
      headers["Content-Length"] = Buffer.byteLength(payload).toString();
    }
    const req = http.request(
      {
        method,
        hostname: parsed.hostname,
        port: parsed.port,
        path: `${parsed.pathname}${parsed.search}`,
        headers,
        timeout: timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf-8");
          resolve({
            status: res.statusCode ?? 0,
            body,
            json<T = unknown>(): T {
              return (body ? JSON.parse(body) : null) as T;
            },
          });
        });
      },
    );
    req.once("timeout", () => {
      req.destroy(new Error(`HTTP ${method} ${url} timed out after ${timeoutMs}ms`));
    });
    req.once("error", reject);
    if (payload !== undefined) {
      req.write(payload);
    }
    req.end();
  });
}

/** Raised when the host aborts startup for a non-transient reason. */
class FatalStartupError extends Error {}

// Markers that indicate the host aborted startup (e.g. the app failed to load).
// Detecting these lets us fail fast with the log rather than blocking for the
// full startup timeout.
const FATAL_LOG_MARKERS = [
  "Host startup operation has been canceled",
  "Worker failed to load",
  "Worker was unable to load",
];

/**
 * Manages the lifecycle of a `func start` host for the sample app.
 *
 * `start()` launches the host and blocks until `/admin/host/status` reports
 * `Running`; `stop()`
 * terminates the whole process tree and surfaces the captured host log if
 * startup failed.
 */
export class FunctionApp {
  readonly appDir: string;
  port: number;
  baseUrl: string;

  private _process: ChildProcess | undefined;
  private readonly _logPath: string;
  private _logStream: fs.WriteStream | undefined;
  private _log = "";
  private _exited = false;

  // `func start` binds the HTTP port itself, some time after we pick a free one.
  // Another process can claim that port in the interim, so a transient startup
  // failure is retried on a freshly chosen free port a few times.
  private static readonly STARTUP_MAX_ATTEMPTS = 3;

  constructor(appDir: string = TEST_APP_DIR, port?: number) {
    this.appDir = appDir;
    if (!fs.existsSync(this.appDir) || !fs.statSync(this.appDir).isDirectory()) {
      throw new Error(`Sample app not found: ${this.appDir}`);
    }
    this.port = port ?? 0;
    this.baseUrl = "";
    this._logPath = path.join(this.appDir, "_func_host.log");
  }

  async start(): Promise<void> {
    if (!funcExecutable()) {
      throw new Error("Azure Functions Core Tools ('func') is not installed.");
    }

    let lastError: unknown;
    for (let attempt = 1; attempt <= FunctionApp.STARTUP_MAX_ATTEMPTS; attempt++) {
      if (!this.port) {
        this.port = await findFreePort();
      }
      this.baseUrl = `http://127.0.0.1:${this.port}`;
      this._launch();
      try {
        await this._waitUntilReady();
        return;
      } catch (err) {
        await this.stop();
        if (err instanceof FatalStartupError) {
          // The app itself failed to load; a different port won't help.
          throw err;
        }
        lastError = err;
        this.port = 0; // pick a fresh port on the next attempt
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private _launch(): void {
    this._exited = false;
    this._log = "";
    this._logStream = fs.createWriteStream(this._logPath, { flags: "w" });

    const isWindows = process.platform === "win32";
    // On Windows `func` is a `.cmd`, so run it through the shell (which also
    // resolves it from PATH). On POSIX, `detached` puts the host in its own
    // process group so we can terminate it and its worker children together.
    const child = spawn("func", ["start", "--port", String(this.port)], {
      cwd: this.appDir,
      env: process.env,
      shell: isWindows,
      windowsHide: true,
      detached: !isWindows,
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout?.on("data", (chunk: Buffer) => this._appendLog(chunk));
    child.stderr?.on("data", (chunk: Buffer) => this._appendLog(chunk));
    child.once("exit", () => {
      this._exited = true;
    });
    this._process = child;
  }

  private _appendLog(chunk: Buffer): void {
    const text = chunk.toString("utf-8");
    this._log += text;
    this._logStream?.write(text);
  }

  private async _waitUntilReady(): Promise<void> {
    const deadline = Date.now() + HOST_STARTUP_TIMEOUT_MS;
    // Mirrors the extension's C# `FunctionAppProcess`: poll the host's admin
    // status endpoint until it reports `state == "Running"`.
    const statusUrl = `${this.baseUrl}/admin/host/status`;
    while (Date.now() < deadline) {
      if (this._exited) {
        throw new Error(`Functions host exited early.\n${this._readLog()}`);
      }
      this._checkLogForFatalErrors();
      try {
        const result = await httpRequest("GET", statusUrl, undefined, 5000);
        if (result.status === 200) {
          const state = (JSON.parse(result.body) as { state?: string }).state;
          if (state === "Running") {
            return;
          }
        }
      } catch {
        // Host is not accepting connections / not fully started yet.
      }
      await sleep(1000);
    }
    throw new Error(`Functions host did not become ready within ${HOST_STARTUP_TIMEOUT_MS}ms.\n${this._readLog()}`);
  }

  private _checkLogForFatalErrors(): void {
    for (const marker of FATAL_LOG_MARKERS) {
      if (this._log.includes(marker)) {
        throw new FatalStartupError(`Functions host failed to start (matched '${marker}').\n${this._readLog()}`);
      }
    }
  }

  private _readLog(): string {
    return `----- func host log -----\n${this._log || "(no host log captured)"}`;
  }

  async stop(): Promise<void> {
    const proc = this._process;
    this._process = undefined;
    if (proc && proc.pid !== undefined && !this._exited) {
      await FunctionApp._terminateProcessTree(proc);
    }
    if (this._logStream) {
      this._logStream.end();
      this._logStream = undefined;
    }
  }

  /**
   * Terminate the `func` host *and* its child worker processes. `func start`
   * spawns children (the .NET host and the Node language worker); terminating
   * only the top process can orphan them and block later runs on a fixed port.
   */
  private static _terminateProcessTree(proc: ChildProcess): Promise<void> {
    return new Promise((resolve) => {
      const pid = proc.pid;
      if (pid === undefined) {
        resolve();
        return;
      }

      let settled = false;
      const finish = (): void => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };
      proc.once("exit", finish);

      if (process.platform === "win32") {
        spawnSync("taskkill", ["/F", "/T", "/PID", String(pid)], { windowsHide: true });
      } else {
        try {
          process.kill(-pid, "SIGTERM");
        } catch {
          try {
            proc.kill("SIGTERM");
          } catch {
            // Already exited.
          }
        }
        // Force-kill the whole group if it has not exited gracefully.
        setTimeout(() => {
          try {
            process.kill(-pid, "SIGKILL");
          } catch {
            // Already exited.
          }
        }, 10_000).unref();
      }

      // Safety net so teardown never hangs the test run.
      setTimeout(finish, 20_000).unref();
    });
  }
}

// -- HTTP trigger + durable status helpers -------------------------------
//
// These mirror the C# `HttpHelpers`/`DurableHelpers` used by the extension's
// own e2e suite so the ported specs read the same way. They are standalone
// functions (not methods) because the suite drives a single shared `func` host
// started once in globalSetup; specs receive its `baseUrl` from the preflight.

/**
 * Invoke an HTTP trigger via `POST {baseUrl}/api/{functionName}{queryString}`.
 *
 * Mirrors `HttpHelpers.InvokeHttpTrigger` (and, when `body` is supplied,
 * `InvokeHttpTriggerWithBody`). HTTP error responses are returned rather than
 * thrown so specs can assert on status/body. `queryString` must include its
 * leading `?` when present.
 */
export async function invokeHttpTrigger(
  baseUrl: string,
  functionName: string,
  queryString = "",
  body?: string,
  mediaType = "text/plain",
): Promise<HttpResult> {
  const url = `${baseUrl}/api/${functionName}${queryString}`;
  return httpRequest("POST", url, body, 60_000, body !== undefined ? mediaType : undefined);
}

/** Fetch the raw orchestration status by following the durable status-query URI. */
export async function getStatus(statusQueryGetUri: string): Promise<OrchestrationStatus> {
  const result = await httpRequest("GET", statusQueryGetUri);
  // Durable returns 202 while the instance is running and 200 once terminal;
  // both carry the status body.
  if (result.status !== 200 && result.status !== 202) {
    throw new Error(`status failed: ${result.status} ${result.body}`);
  }
  return result.json<OrchestrationStatus>();
}

/**
 * Read orchestration details from the durable status-query URI, mirroring C#
 * `DurableHelpers.GetRunningOrchestrationDetailsAsync`.
 *
 * `output`/`input` are the raw parsed JSON values; `outputString`/`inputString`
 * mirror C#'s `JsonNode.ToString()` semantics used throughout the suite: a JSON
 * string value becomes the unquoted string, while an object/array/number
 * becomes its JSON text.
 */
export async function getOrchestrationDetails(statusQueryGetUri: string): Promise<OrchestrationDetails> {
  const status = await getStatus(statusQueryGetUri);
  return {
    instanceId: String(status.instanceId ?? ""),
    runtimeStatus: String(status.runtimeStatus ?? ""),
    input: status.input,
    inputString: jsonNodeToString(status.input),
    output: status.output,
    outputString: jsonNodeToString(status.output),
  };
}

/**
 * Poll status until the orchestration reaches `desiredState`, mirroring C#
 * `DurableHelpers.WaitForOrchestrationStateAsync` (200ms backoff doubling to
 * 2s). Fails fast if the instance reaches an unexpected terminal state.
 */
export async function waitForOrchestrationState(
  statusQueryGetUri: string,
  desiredState: string,
  maxTimeoutSeconds = ORCHESTRATION_TIMEOUT_MS / 1000,
): Promise<OrchestrationDetails> {
  const finalStates = new Set(["Completed", "Terminated", "Failed"]);
  const deadline = Date.now() + maxTimeoutSeconds * 1000;
  let delay = 200;
  let current: OrchestrationDetails = {
    instanceId: "",
    runtimeStatus: "",
    input: undefined,
    inputString: "",
    output: undefined,
    outputString: "",
  };
  while (Date.now() < deadline) {
    current = await getOrchestrationDetails(statusQueryGetUri);
    if (current.runtimeStatus === desiredState) {
      return current;
    }
    if (finalStates.has(current.runtimeStatus)) {
      throw new Error(`Orchestration reached ${current.runtimeStatus} state when test was expecting ${desiredState}`);
    }
    await sleep(delay);
    delay = Math.min(delay * 2, 2000);
  }
  throw new Error(
    `Orchestration did not reach ${desiredState} status within ${maxTimeoutSeconds} seconds; last status: ${current.runtimeStatus}`,
  );
}

/** Orchestration details parsed from a durable status-query response. */
export interface OrchestrationDetails {
  instanceId: string;
  runtimeStatus: string;
  input: unknown;
  inputString: string;
  output: unknown;
  outputString: string;
}

/**
 * Mirror C#'s `JsonNode.ToString()`: string values become the unquoted string,
 * objects/arrays/numbers become their JSON text, null/undefined become "".
 */
export function jsonNodeToString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value);
}

/**
 * Parse the durable instance id from a check-status response body, mirroring
 * C# `DurableHelpers.ParseInstanceIdAsync` (key `Id`, falling back to `id`).
 */
export function parseInstanceId(response: HttpResult): string {
  return tokenizeAndGetValue(response.body, "Id");
}

/**
 * Parse `statusQueryGetUri` from a check-status response body, mirroring C#
 * `DurableHelpers.ParseStatusQueryGetUriAsync` (key `StatusQueryGetUri`,
 * falling back to `statusQueryGetUri`).
 */
export function parseStatusQueryGetUri(response: HttpResult): string {
  return tokenizeAndGetValue(response.body, "StatusQueryGetUri");
}

function tokenizeAndGetValue(json: string, key: string): string {
  if (!json) {
    return "";
  }
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(json) as Record<string, unknown>;
  } catch {
    return "";
  }
  const lowerKey = key.charAt(0).toLowerCase() + key.slice(1);
  const value = parsed[key] ?? parsed[lowerKey];
  return value === undefined || value === null ? "" : String(value);
}

/**
 * Node-specific expected strings and bug annotations, ported verbatim from the
 * extension's `NodeTestLanguageLocalizer`. `{0}`-style placeholders are filled
 * by `formatLocalized`. C# `{{`/`}}` escapes are already unescaped here.
 */
export const NODE_LOCALIZED_STRINGS: Record<string, string> = {
  "CaughtActivityException.ErrorMessage": "Caught exception: Error: Activity function 'raise_exception' failed:",
  "RethrownActivityException.ErrorMessage":
    "Orchestrator function 'RethrowActivityException' failed: Activity function 'raise_exception' failed: ",
  // Bug: https://github.com/Azure/azure-functions-durable-js/issues/642
  "CaughtEntityException.ErrorMessage": "Error: [object Object]",
  "RethrownEntityException.ErrorMessage": "Orchestrator function 'ThrowEntityOrchestration' failed:",
  // Bug: https://github.com/Azure/azure-functions-durable-js/issues/645
  "ExternalEvent.CompletedInstance.ErrorName": "N/A",
  "ExternalEvent.CompletedInstance.ErrorMessage": "N/A",
  "ExternalEvent.InvalidInstance.ErrorName": "Error",
  "ExternalEvent.InvalidInstance.ErrorMessage": "No instance with ID '{0}' found",
  // Empty: Node's unique behavior causes suspend/resume/terminate of terminal
  // instances to succeed rather than fail.
  "SuspendCompletedInstance.FailureMessage": "",
  "ResumeCompletedInstance.FailureMessage": "",
  "SuspendSuspendedInstance.FailureMessage":
    'Error: The operation failed with an unexpected status code: 500. Details: {"Message":"Something went wrong while processing your request',
  "ResumeRunningInstance.FailureMessage":
    'Error: The operation failed with an unexpected status code: 500. Details: {"Message":"Something went wrong while processing your request',
  "TerminateCompletedInstance.FailureMessage": "",
  "TerminateTerminatedInstance.FailureMessage": "",
  "TerminateInvalidInstance.FailureMessage": "No instance with ID '{0}' found.",
};

/** Look up a Node localized string and substitute `{0}`, `{1}`, ... args. */
export function formatLocalized(key: string, ...args: unknown[]): string {
  const template = NODE_LOCALIZED_STRINGS[key] ?? "";
  return template.replace(/\{(\d+)\}/g, (match, index) => {
    const arg = args[Number(index)];
    return arg === undefined ? match : String(arg);
  });
}
