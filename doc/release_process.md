# Release Process

This document describes how to cut a new release of the three npm packages published from this monorepo: `@microsoft/durabletask-js` (core), `@microsoft/durabletask-js-azuremanaged`, and `durable-functions` (the Azure Functions v4 compatibility provider, whose source lives in `packages/azure-functions-durable`).

## Overview

| Package (npm name) | Directory | Changelog | npm |
|---|---|---|---|
| `@microsoft/durabletask-js` (core) | `packages/durabletask-js` | `CHANGELOG.md` | [npmjs](https://www.npmjs.com/package/@microsoft/durabletask-js) |
| `@microsoft/durabletask-js-azuremanaged` | `packages/durabletask-js-azuremanaged` | `packages/durabletask-js-azuremanaged/CHANGELOG.md` | [npmjs](https://www.npmjs.com/package/@microsoft/durabletask-js-azuremanaged) |
| `durable-functions` | `packages/azure-functions-durable` | `packages/azure-functions-durable/CHANGELOG.md` | [npmjs](https://www.npmjs.com/package/durable-functions) |

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

| Version Type | Example |
|---|---|
| Alpha | `0.1.0-alpha.1` |
| Beta | `0.1.0-beta.1` |
| Release Candidate | `0.1.0-rc.1` |
| Stable | `0.1.0` |

The scheme above describes the version **string**. Mapping a version to an **npm dist-tag** is a separate concern and does **not** follow a per-stage `beta`/`next` convention: the **Prepare Release** workflow's emitted **manual fallback** `npm publish` command tags every prerelease `preview` and omits `--tag` for a stable GA (so only a GA moves `latest`). Publishing a prerelease through the sanctioned ESRP path is **blocked pending B11** until owners confirm whether the ESRP task can set that tag. See *Quick Reference: npm Dist Tags* below for the authoritative rule.

## Automated Release Preparation (Recommended)

Use the **Prepare Release** GitHub Action to automate the release preparation process.

### Automatic Legacy Baseline for Azure Managed

The changelog step lists commits since the released package's **last package-scoped tag** (`git log <last-tag>..HEAD -- <pkg-dir>`). If Azure Managed has no `azuremanaged-v` tag yet, the workflow automatically checks for the legacy lockstep tag `v${CURRENT_VERSION}` and uses it as the baseline. This keeps the first independent Azure Managed changelog scoped to changes after its matching legacy release without requiring a manually seeded tag. If neither tag exists, the workflow falls back to the repository's initial commit.

### Running the Workflow

1. Go to **Actions** → **Prepare Release** in GitHub
2. Click **Run workflow**
3. **Select the `package` to release** (required) — one of `durabletask-js`, `durabletask-js-azuremanaged`, or `azure-functions-durable`. Each run releases exactly one package.
4. Optionally specify a version (e.g., `0.2.0-beta.1` for core, or `4.0.0-beta.1` for `durable-functions`). Leave empty to auto-increment the selected package's current version (bumps the prerelease number for a prerelease, otherwise the patch).
5. Click **Run workflow**

### What the Workflow Does

For the **one package you selected** (and only that package):

1. **Determines the next version**: uses the `version` input, or auto-increments the selected package's current version
2. **Verifies the target tag is unused**: fails before preparing the release if the package-scoped tag already exists on `origin`; existing release tags are immutable
3. **Generates a changelog**: lists commits since that package's last release tag, scoped to the package's directory (`git log <last-tag>..HEAD -- <pkg-dir>`), so only commits that touched that package are included
4. **Bumps the version**: updates `version` in that package's own `package.json`
5. **Updates that package's changelog**: core writes `CHANGELOG.md`, Azure Managed writes `packages/durabletask-js-azuremanaged/CHANGELOG.md`, and `durable-functions` writes `packages/azure-functions-durable/CHANGELOG.md`
6. **Creates a release branch**: branch `release/<prefix><version>`, where the target tag prefix is `v` (core), `azuremanaged-v`, or `durable-functions-v`. The workflow does not create or modify the tag.
7. **For `durable-functions` only**: verifies the exact-pinned `@microsoft/durabletask-js` version is already published on public npm, and fails the run if it is not (guards the uninstallable-dependency case)

### After the Workflow Completes

The workflow only **prepares** a release — it bumps the version, generates the changelog, and creates the release branch. It does **not** create or modify a Git tag and does **not** publish to npm. Its run summary includes a **Create PR** link, safe post-merge tagging instructions, and an `npm publish` command; that publish command is a **manual fallback** for maintainers, and the sanctioned publish path is the ADO official build + ESRP release pipeline (see **Publishing** below).

You must **manually create a pull request** from the release branch to `main`. The branch is `release/<tag>` where `<tag>` is the package-scoped tag — e.g. `release/durable-functions-v4.0.0-beta.1`, `release/azuremanaged-v0.3.0`, or `release/v0.4.0`:

1. Go to the workflow run summary and click the **Create PR** link
2. Set the PR title to `Release <npm-name>@<version>` (e.g. `Release durable-functions@4.0.0-beta.1`)
3. Review the version bump and changelog update — only the released package should change
4. Merge the PR after CI passes

After the PR is merged, follow the **Publishing** steps below. The package-scoped tag must be created only after merge and must point to the exact merged commit on `main`.

## Publishing (After Release PR is Merged)

After the release PR is merged to `main`, follow these steps to build, sign, and publish the packages.

### Step 0: Tag the Exact Merged Commit

Sync the latest `main`, identify the merged release PR's exact commit, and verify both that it is on `main` and that it contains the expected package version. Then create and push the package-scoped tag without force. Replace the example values before running:

```bash
set -euo pipefail
git switch main
git pull --ff-only origin main
git fetch origin --tags

PR_NUMBER=1234  # replace with the merged release PR number
PKG_DIR="packages/durabletask-js-azuremanaged"  # replace with the released package directory
NEW_VERSION="0.4.0"  # replace with the released version
TAG_NAME="azuremanaged-v0.4.0"  # replace with the package-scoped tag

MERGED_COMMIT=$(gh pr view "$PR_NUMBER" --repo microsoft/durabletask-js --json mergeCommit --jq '.mergeCommit.oid')
git merge-base --is-ancestor "$MERGED_COMMIT" origin/main
test "$(git show "${MERGED_COMMIT}:${PKG_DIR}/package.json" | node -p "JSON.parse(require('fs').readFileSync(0, 'utf8')).version")" = "$NEW_VERSION"

if git rev-parse --verify --quiet "refs/tags/${TAG_NAME}" >/dev/null; then
  echo "Tag ${TAG_NAME} already exists; refusing to move it." >&2
  exit 1
fi
git tag "$TAG_NAME" "$MERGED_COMMIT"
git push origin "refs/tags/${TAG_NAME}"
```

Both tag commands deliberately omit `-f`. Fetching tags makes the explicit check fail when the tag already exists locally or on `origin`; the non-force push also rejects a tag created remotely in the meantime. **Never delete or force-move an existing release tag.** Stop and investigate any conflict.

### Step 1: Confirm the Tag-Triggered Code Mirror

Pushing the post-merge package tag in Step 0 automatically triggers the code mirror pipeline. The pipeline keeps its existing `main` branch trigger and also triggers for every tag, so a new release tag is mirrored immediately rather than waiting for a later `main` push:

**Pipeline**: [durabletask-js code mirror](https://dev.azure.com/azfunc/internal/_build?definitionId=1757)

Before continuing to the official build, verify all of the following in the tag-triggered run:

1. Its source ref is the new package-scoped tag.
2. The mirrored internal tag resolves to exactly `MERGED_COMMIT` from Step 0.
3. The internal tag is locked after the mirror completes.

Do not substitute a manual `main` run for this step: the shared engineering template routes tag refs through `ci/internal/code-mirror-tag.yml`, which compares the destination tag, deletes and recreates it with the mirror identity when required, and re-locks it. A `main` run uses the normal branch mirror path and pushes tags with the branch, so it does not provide the dedicated tag handling. The shared tag path operates on the internal mirror; it does not move or delete the immutable source tag on GitHub.

### Step 2: Run the Official Build Pipeline

Trigger the official build pipeline to produce signed `.tgz` artifacts. The official build (`eng/ci/official-build.yml`) triggers on and builds **`main`** — it has no branch/tag selector and never builds the short-lived release branch. Use the official build whose source commit is **exactly the merged release commit tagged in Step 0**, not merely a later commit that includes it:

**Pipeline**: [durabletask-js.official](https://dev.azure.com/azfunc/internal/_build?definitionId=1012&_a=summary)

1. Locate the automatic `main` run whose source version exactly matches `MERGED_COMMIT` / `TAG_NAME` from Step 0. If no exact run is available, stop and coordinate an exact-commit build with the pipeline owners; do not substitute a later `main` build.
2. Wait for it to complete
3. A single `main` build packs **all three** packages into one `drop` artifact; which single package publishes is decided later by the `package` parameter in the release pipeline (Step 3). Verify `drop` contains the correctly versioned `.tgz` files:
   - `buildoutputs/durabletask-js/microsoft-durabletask-js-X.Y.Z.tgz`
   - `buildoutputs/durabletask-js-azuremanaged/microsoft-durabletask-js-azuremanaged-X.Y.Z.tgz`
   - `buildoutputs/azure-functions-durable/durable-functions-X.Y.Z.tgz`

Never publish from the release branch — it exists only to carry the version/changelog PR into `main`. The official build, merged commit, and package-scoped tag must all identify the same commit.

### Step 3: Run the Release Pipeline

Trigger the release pipeline to publish one signed package to npm via ESRP. **This is the sanctioned publish path.** `eng/ci/release.yml` consumes the `durabletask-js.official` build artifact from **`main`** (its pipeline resource is pinned to `branch: main`), so its source is the `main` official build selected in Step 2 — not the release branch. The pipeline's `package` runtime parameter controls which one of these release stages is inserted into the compiled 1ES plan. It defaults to `durabletask-js`, so verify or change it before queueing: a wrong or unchanged default compiles the wrong package stage. ESRP approval remains the final safety gate before publishing.

- `durabletask-js` inserts `release_durabletask_js` for core `@microsoft/durabletask-js`.
- `durabletask-js-azuremanaged` inserts `release_durabletask_js_azuremanaged` for `@microsoft/durabletask-js-azuremanaged`.
- `azure-functions-durable` inserts `release_durable_functions` for `durable-functions`.

**Pipeline**: [durabletask-js.release](https://dev.azure.com/azfunc/internal/_build?definitionId=1686)

1. Click **Run pipeline**
2. Select the **`main` official build from Step 2** (the one whose source commit exactly equals the tagged merged release commit) as the source pipeline artifact
3. Verify or change the **`package`** parameter to the one package to publish. Exactly one release stage is compiled and exactly one package is published; do not use queue-time stage selection to choose packages.
4. Approve the ESRP release when prompted.

This compile-time selection eliminates the failure demonstrated by run **294746**: de-selecting the core stage at queue time did not expose its result to the Azure Managed dependency condition as the expected literal `Skipped`, so the selected package's stage was skipped too. The selected package now has no cross-stage dependency because the other package stages do not exist in that run's compiled plan.

**Two runs for core + compat.** The compat **Prepare Release** run guards on core already being published to **public npm** — it runs `npm view @microsoft/durabletask-js@<pinned-version> --registry https://registry.npmjs.org/` and fails if that exact version is absent (`durable-functions` exact-pins core). Publish and verify core first; only then prepare `durable-functions` and publish it in a later release-pipeline run. (`azuremanaged` depends on core only through a peer floor that is already satisfied and has no ordering constraint.)

> **Open question (B11) — hard blocker for ESRP prereleases:** it is not yet confirmed whether the ESRP release task can set the npm **dist-tag** (e.g. publish a prerelease under `preview` rather than moving `latest`). Publishing a prerelease such as `durable-functions@4.0.0-beta.1` through ESRP is **blocked** until the ESRP / 1ES pipeline owners confirm how to apply the `preview` tag — do **not** assume ESRP applies a dist-tag. The `--tag` guidance in *Quick Reference: npm Dist Tags* applies to a manual `npm publish`.

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

- **Tag**: the package-scoped tag created on the exact merged commit in Step 0 — e.g. `durable-functions-v4.0.0-beta.1`, `azuremanaged-v0.3.0`, or `v0.4.0`
- **Title**: the same tag, or `<npm-name>@<version>`
- **Description**: copy the relevant section from that package's changelog: `CHANGELOG.md` for core, `packages/durabletask-js-azuremanaged/CHANGELOG.md` for Azure Managed, or `packages/azure-functions-durable/CHANGELOG.md` for `durable-functions`
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

Move items from the `## Upcoming` section of the package's changelog into a new versioned section. The changelog is a **generated** list of the released package's commit messages / PR links — not a place for hand-authored breaking-change narrative; detailed preview and migration guidance lives in `packages/azure-functions-durable/README.md` (for `durable-functions`), not the changelog. To reproduce the tooling manually, promote any curated `## Upcoming` notes into the new section and add one `### Changes` entry per commit, mirroring `git log <last-tag>..HEAD -- <pkg-dir>` (each commit subject with its `(#NN)` linked). Update only the released package's changelog:

| Package | Changelog |
|---|---|
| `@microsoft/durabletask-js` | `CHANGELOG.md` |
| `@microsoft/durabletask-js-azuremanaged` | `packages/durabletask-js-azuremanaged/CHANGELOG.md` |
| `durable-functions` | `packages/azure-functions-durable/CHANGELOG.md` |

```markdown
## Upcoming

### New

### Fixes

## vX.Y.Z (YYYY-MM-DD)

### Changes
- Some change ([#NN](https://github.com/microsoft/durabletask-js/pull/NN))
- Another change ([#NN](https://github.com/microsoft/durabletask-js/pull/NN))
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

After the PR is approved and merged to `main`, follow **Publishing Step 0** to sync `main`, identify and verify the exact merged commit, and create the package-scoped tag (`<prefix><version>`) without force. If the tag already exists, stop; never delete or move it.

Then continue with **Publishing** Steps 1-5.

## Quick Reference: npm Dist Tags

npm **dist-tags** are separate from the git tags this repo pushes (`v...`, `azuremanaged-v...`, `durable-functions-v...`); a git tag only names a release commit and never moves an npm dist-tag. This repo uses one simple rule, not the per-stage `alpha`/`beta`/`next` convention:

- **Prerelease** — any version containing `-` (e.g. `0.4.0-beta.1`, `4.0.0-beta.1`). The **Prepare Release** workflow emits `npm publish --registry https://registry.npmjs.org/ --tag preview` in its run summary as a **manual fallback** to run after the release PR merges. When using this manual fallback, publish every prerelease under the single `preview` dist-tag, so it never moves `latest`. `durable-functions` 4.x previews install with `npm install durable-functions@preview` (see `packages/azure-functions-durable/README.md`).
- **Stable GA** — no `-`. The emitted command omits `--tag`, so the publish moves `latest`.
- **ESRP path (sanctioned, Step 3):** whether the ESRP release task can set an npm dist-tag is an **open question (B11)** and a **hard blocker** for publishing a prerelease such as `durable-functions@4.0.0-beta.1` through ESRP — confirm with the ESRP / 1ES owners how to apply the `preview` tag before publishing any prerelease via ESRP. Do **not** assume ESRP applies a dist-tag; the `--tag preview` guidance above is for a manual `npm publish`.

## Rolling Back a Release

If a release has critical issues:

1. **Deprecate on npm**: `npm deprecate @microsoft/durabletask-js@X.Y.Z "Critical bug, use X.Y.Z+1"`
2. **Unpublish** (within 72 hours only): `npm unpublish @microsoft/durabletask-js@X.Y.Z`
3. Cut a new patch release with the fix.
