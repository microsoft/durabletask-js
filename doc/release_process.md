# Release Process

This document describes how to cut a new release of the three npm packages published from this monorepo: `@microsoft/durabletask-js` (core), `@microsoft/durabletask-js-azuremanaged`, and `durable-functions` (the Azure Functions v4 compatibility provider, whose source lives in `packages/azure-functions-durable`).

## Overview

| Package (npm name) | Directory | npm |
|---|---|---|
| `@microsoft/durabletask-js` (core) | `packages/durabletask-js` | [npmjs](https://www.npmjs.com/package/@microsoft/durabletask-js) |
| `@microsoft/durabletask-js-azuremanaged` | `packages/durabletask-js-azuremanaged` | [npmjs](https://www.npmjs.com/package/@microsoft/durabletask-js-azuremanaged) |
| `durable-functions` | `packages/azure-functions-durable` | [npmjs](https://www.npmjs.com/package/durable-functions) |

This is an **npm workspaces** monorepo. The official build (`eng/ci/official-build.yml`) produces signed `.tgz` artifacts, and the **sanctioned way to publish them to npm is the ESRP release pipeline** (`eng/ci/release.yml`, see Step 3 below). A manual `npm publish` from the package directory is documented as an alternative for maintainers who need it.

### Versioning Policy

**Each package is versioned, changelogged, and tagged independently.** A release covers exactly one package; its version number, its changelog, and its git tag advance on their own and do **not** have to match the other packages.

There is one hard ordering constraint between packages:

- **`@microsoft/durabletask-js` (core) must be published before `durable-functions`.** The compat package declares an **exact** dependency on core (currently `"@microsoft/durabletask-js": "0.4.0"`). If `durable-functions` is published while that exact core version is not yet on npm, the published compat package is **uninstallable**.
- **`@microsoft/durabletask-js-azuremanaged` is unordered relative to `durable-functions`.** It depends on core only through a peer **floor** (`"@microsoft/durabletask-js": ">=0.3.0"`), which is already satisfied by the published core, so it can be released before or after the other packages.

## Versioning Scheme

We follow [semver](https://semver.org/) with optional pre-release tags:

```
X.Y.Z-alpha.N  →  X.Y.Z-beta.N  →  X.Y.Z-rc.N  →  X.Y.Z (stable)
```

| Version Type | Example | npm Tag |
|---|---|---|
| Alpha | `0.1.0-alpha.1` | `--tag alpha` |
| Beta | `0.1.0-beta.1` | `--tag beta` |
| Release Candidate | `0.1.0-rc.1` | `--tag next` |
| Stable | `0.1.0` | *(no tag, becomes `latest`)* |

> Note: current tooling overrides the beta/rc rows above for prereleases. The **Prepare Release** workflow publishes every prerelease under the single `preview` dist-tag, and `durable-functions` 4.x previews ship under `preview` (`npm install durable-functions@preview`). See *Quick Reference: npm Dist Tags* below.

## Automated Release Preparation (Recommended)

Use the **Prepare Release** GitHub Action to automate the release preparation process.

### Running the Workflow

1. Go to **Actions** → **Prepare Release** in GitHub
2. Click **Run workflow**
3. **Select the `package` to release** (required) — one of `durabletask-js`, `durabletask-js-azuremanaged`, or `azure-functions-durable`. Each run releases exactly one package.
4. Optionally specify a version (e.g., `0.2.0-beta.1` for core, or `4.0.0-beta.1` for `durable-functions`). Leave empty to auto-increment the selected package's current version (bumps the prerelease number for a prerelease, otherwise the patch).
5. Click **Run workflow**

### What the Workflow Does

For the **one package you selected** (and only that package):

1. **Determines the next version**: uses the `version` input, or auto-increments the selected package's current version
2. **Generates a changelog**: lists commits since that package's last release tag, scoped to the package's directory (`git log <last-tag>..HEAD -- <pkg-dir>`), so only commits that touched that package are included
3. **Bumps the version**: updates `version` in that package's own `package.json`
4. **Updates that package's changelog**: core and azuremanaged write the repo-root `CHANGELOG.md`; `durable-functions` writes `packages/azure-functions-durable/CHANGELOG.md`
5. **Creates a release branch and a package-scoped tag**: tag `<prefix><version>` and branch `release/<prefix><version>`, where the prefix is `v` (core), `azuremanaged-v`, or `durable-functions-v`
6. **For `durable-functions` only**: verifies the exact-pinned `@microsoft/durabletask-js` version is already published on public npm, and fails the run if it is not (guards the uninstallable-dependency case)

### After the Workflow Completes

The workflow summary includes a **Create PR** link and the exact `npm publish` command to run later. You must **manually create a pull request** from the release branch to `main`. The branch is `release/<tag>` where `<tag>` is the package-scoped tag — e.g. `release/durable-functions-v4.0.0-beta.1`, `release/azuremanaged-v0.3.0`, or `release/v0.4.0`:

1. Go to the workflow run summary and click the **Create PR** link
2. Set the PR title to `Release <npm-name>@<version>` (e.g. `Release durable-functions@4.0.0-beta.1`)
3. Review the version bump and changelog update — only the released package should change
4. Merge the PR after CI passes

After the PR is merged, follow the **Publishing** steps below to build and publish.

## Publishing (After Release PR is Merged)

After the release PR is merged to `main`, follow these steps to build, sign, and publish the packages.

### Step 1: Run the Code Mirror Pipeline

Manually trigger the code mirror pipeline to sync the release to the internal ADO repo:

**Pipeline**: [durabletask-js code mirror](https://dev.azure.com/azfunc/internal/_build?definitionId=1004)

Run it on the `main` branch (which now contains the release commit).

### Step 2: Run the Official Build Pipeline

Trigger the official build pipeline on the release tag/commit/branch to produce signed `.tgz` artifacts:

**Pipeline**: [durabletask-js.official](https://dev.azure.com/azfunc/internal/_build?definitionId=1012&_a=summary)

1. Click **Run pipeline**
2. Select the release branch or tag created by the release — the package-scoped `release/<prefix><version>` branch or `<prefix><version>` tag (e.g., `release/v0.4.0` or tag `v0.4.0`)
3. Wait for it to complete
4. Verify the `drop` artifact contains the correctly versioned `.tgz` files (the official build packs all three packages):
   - `buildoutputs/durabletask-js/microsoft-durabletask-js-X.Y.Z.tgz`
   - `buildoutputs/durabletask-js-azuremanaged/microsoft-durabletask-js-azuremanaged-X.Y.Z.tgz`
   - `buildoutputs/azure-functions-durable/durable-functions-X.Y.Z.tgz`

### Step 3: Run the Release Pipeline

Trigger the release pipeline to publish the signed packages to npm via ESRP. **This is the sanctioned publish path.** `eng/ci/release.yml` is a 1ES multi-stage pipeline with **one stage per package**, each publishing that package's `.tgz` from its own `buildoutputs/` folder via the `EsrpRelease@9` task:

- `release_durabletask_js` — core `@microsoft/durabletask-js`; has no stage dependency.
- `release_durabletask_js_azuremanaged` — `@microsoft/durabletask-js-azuremanaged`; `dependsOn: release_durabletask_js`.
- `release_durable_functions` — `durable-functions`; `dependsOn: release_durabletask_js`.

**Pipeline**: `eng/ci/release.yml` (ADO pipeline link: TBD)

1. Click **Run pipeline**
2. Select the build from Step 2 as the source pipeline artifact
3. **Choose which stage(s) to run.** Stages are individually selectable at queue time, so you can release one package at a time. Both dependent stages `dependsOn` the core stage only — they are siblings, not chained to each other.
4. **Respect the ordering rule:** release the core stage before (or in the same run as) `durable-functions`, because compat exact-pins core. Each dependent stage carries an explicit condition — `in(dependencies.release_durabletask_js.result, 'Succeeded', 'SucceededWithIssues', 'Skipped')` — so it still runs when the core stage is **de-selected (Skipped)** at queue time (letting you release that package on its own once core is already on npm), but it will **not** run if the core stage actually **Failed** or was **Canceled**, which preserves the publish ordering.
5. Approve the ESRP release when prompted — each selected stage runs its own `EsrpRelease@9` task with its own approver, so expect one ESRP approval per package.

> **Open question (B11):** it is not yet confirmed whether the ESRP release task can set the npm **dist-tag** (e.g. publish a prerelease under `preview` rather than moving `latest`). This must be confirmed with the ESRP / 1ES pipeline owners before publishing a prerelease through ESRP — do **not** assume ESRP applies a dist-tag. The `--tag` guidance in *Quick Reference: npm Dist Tags* applies to a manual `npm publish`.

### Step 4: Verify npm Publish

```bash
npm view @microsoft/durabletask-js versions
npm view @microsoft/durabletask-js-azuremanaged versions
npm view durable-functions versions

# For a prerelease, also confirm which dist-tag it landed under (and that `latest` did not move):
npm view durable-functions dist-tags
```

### Step 5: Create a GitHub Release

Go to [GitHub Releases](https://github.com/microsoft/durabletask-js/releases) and create a new release:

- **Tag**: the package-scoped tag created by the release — e.g. `durable-functions-v4.0.0-beta.1`, `azuremanaged-v0.3.0`, or `v0.4.0`
- **Title**: the same tag, or `<npm-name>@<version>`
- **Description**: copy the relevant section from that package's changelog (`CHANGELOG.md` for core / azuremanaged, `packages/azure-functions-durable/CHANGELOG.md` for `durable-functions`)
- **Pre-release**: check this box for alpha/beta/rc/preview releases

## Manual Release Process (Alternative)

If you prefer to prepare the release manually, follow these steps.

### 1. Determine the Next Version

Review merged PRs since the last release tag to understand what's shipping. Choose an appropriate version number following semver.

### 2. Update the Package Version

Bump the `"version"` field in **only the package you are releasing**:

```bash
# core:         packages/durabletask-js/package.json                → "version": "X.Y.Z"
# azuremanaged: packages/durabletask-js-azuremanaged/package.json   → "version": "X.Y.Z"
# compat:       packages/azure-functions-durable/package.json       → "version": "X.Y.Z"
```

Then update the affected cross-package dependency **for the package you are releasing**:

- **`@microsoft/durabletask-js-azuremanaged`** declares a peer **floor** on core. Only raise it if this release actually requires a newer core — it does not have to equal the release version:

  ```jsonc
  "peerDependencies": {
      "@microsoft/durabletask-js": ">=X.Y.Z"
  }
  ```

- **`durable-functions`** pins core to an **exact** version. This is the single most consequential dependency edit: if core is being bumped, set this pin to the exact core version you will publish, and publish that core version **first** (otherwise the published compat package is uninstallable):

  ```jsonc
  "dependencies": {
      "@microsoft/durabletask-js": "X.Y.Z"  // exact — no range; must be published on npm first
  }
  ```

### 3. Update the Changelog

Move items from the `## Upcoming` section of the package's changelog into a new versioned section, following the existing format. Use the repo-root `CHANGELOG.md` for `@microsoft/durabletask-js` and `@microsoft/durabletask-js-azuremanaged`, or `packages/azure-functions-durable/CHANGELOG.md` for `durable-functions`:

```markdown
## Upcoming

### New
<!-- empty or future items -->

## vX.Y.Z

### New
- Feature A ([#NN](https://github.com/microsoft/durabletask-js/pull/NN))

### Fixes
- Fix B ([#NN](https://github.com/microsoft/durabletask-js/pull/NN))

### Breaking Changes
- Breaking change C ([#NN](https://github.com/microsoft/durabletask-js/pull/NN))
```

### 4. Verify Build & Tests Pass Locally

```bash
npm ci
npm run build
npm test
npm run lint
```

### 5. Create a Release PR

Create a release branch named `release/<tag>`, where `<tag>` is the package-scoped tag `<prefix><version>` (prefix `v`, `azuremanaged-v`, or `durable-functions-v`) — e.g. `release/durable-functions-v4.0.0-beta.1`. Commit the version bump and changelog update for that one package, and open a PR against `main`. The PR title should follow: `Release <npm-name>@<version>`.

### 6. Merge and Tag

After the PR is approved and merged to `main`, create the package-scoped tag (`<prefix><version>`):

```bash
git checkout main
git pull
# e.g. durable-functions-v4.0.0-beta.1, azuremanaged-v0.3.0, or v0.4.0
git tag <prefix><version>
git push origin <prefix><version>
```

Then follow the **Publishing** steps above (Steps 1-5).

## Quick Reference: npm Dist Tags

The general semver → dist-tag convention:

| Tag | When to use |
|---|---|
| `--tag alpha` | For `X.Y.Z-alpha.N` versions |
| `--tag beta` | For `X.Y.Z-beta.N` versions |
| `--tag next` | For release candidates (`X.Y.Z-rc.N`) |
| *(no tag / `latest`)* | For stable GA releases only |

**Current tooling and package-specific rules take precedence where they differ from the table above:**

- The **Prepare Release** workflow publishes *every* prerelease (any version containing `-`) under the single **`preview`** dist-tag — its run summary suggests `npm publish --registry https://registry.npmjs.org/ --tag preview` — so a prerelease never moves `latest`.
- **`durable-functions` 4.x previews ship under `preview`.** Its documented install line is `npm install durable-functions@preview` (see `packages/azure-functions-durable/CHANGELOG.md`); publish these with `npm publish --tag preview`.
- Whether the **ESRP** pipeline (Step 3) can set a dist-tag is an open question (B11); the `--tag` guidance here applies to a manual `npm publish`.

## Rolling Back a Release

If a release has critical issues:

1. **Deprecate on npm**: `npm deprecate @microsoft/durabletask-js@X.Y.Z "Critical bug, use X.Y.Z+1"`
2. **Unpublish** (within 72 hours only): `npm unpublish @microsoft/durabletask-js@X.Y.Z`
3. Cut a new patch release with the fix.
