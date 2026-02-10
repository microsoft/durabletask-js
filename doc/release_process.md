# Release Process

This document describes how to cut a new release of the `@microsoft/durabletask-js` and `@microsoft/durabletask-js-azuremanaged` npm packages.

## Overview

| Package | npm |
|---|---|
| `@microsoft/durabletask-js` | [npmjs](https://www.npmjs.com/package/@microsoft/durabletask-js) |
| `@microsoft/durabletask-js-azuremanaged` | [npmjs](https://www.npmjs.com/package/@microsoft/durabletask-js-azuremanaged) |

This is an **npm workspaces** monorepo. There is no automated publish pipeline — the official build (`eng/ci/official-build.yml`) produces signed `.tgz` artifacts which are then published to npm manually.

### Versioning Policy

**All packages are released with the same version number.** This simplifies dependency management and makes it clear which versions are compatible. When cutting a release, both packages are bumped to the same version regardless of whether both have changes.

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

## Automated Release Preparation (Recommended)

Use the **Prepare Release** GitHub Action to automate the release preparation process.

### Running the Workflow

1. Go to **Actions** → **Prepare Release** in GitHub
2. Click **Run workflow**
3. Optionally specify a version (e.g., `0.2.0-beta.1`). Leave empty to auto-increment.
4. Click **Run workflow**

### What the Workflow Does

1. **Determines the next version**: If not specified, auto-increments the current version
2. **Generates changelog**: Uses `git diff` to find changes between `main` and the last release tag
3. **Updates package versions**: Bumps `version` in all `package.json` files to the same version
4. **Updates CHANGELOG.md**: Adds a new version section with the discovered changes
5. **Creates a release branch**: `release/vX.Y.Z`
6. **Creates a release tag**: `vX.Y.Z`
7. **Opens a pull request**: For review before merging to `main`

After the PR is merged, follow steps 7-9 in the manual process below to publish.

## Manual Release Process (Alternative)

If you prefer to prepare the release manually, follow these steps.

### 1. Determine the Next Version

Review merged PRs since the last release tag to understand what's shipping. Choose an appropriate version number following semver.

### 2. Update Package Versions

Bump the `"version"` field in **both** package.json files to the **same version**:

```bash
# Edit packages/durabletask-js/package.json        → "version": "X.Y.Z"
# Edit packages/durabletask-js-azuremanaged/package.json → "version": "X.Y.Z"
```

Also update the peer dependency in `packages/durabletask-js-azuremanaged/package.json`:

```jsonc
"peerDependencies": {
    "@microsoft/durabletask-js": ">=X.Y.Z"  // ← same version
}
```

### 3. Update CHANGELOG.md

Move items from the `## Upcoming` section into a new versioned section. Follow the existing format:

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

Create a branch (e.g., `release/vX.Y.Z`), commit the version bumps and changelog update, and open a PR against `main`. The PR title should follow: `Release vX.Y.Z`.

### 6. Merge and Tag

After the PR is approved and merged to `main`:

```bash
git checkout main
git pull
git tag vX.Y.Z
git push origin vX.Y.Z
```

### 7. Trigger the Official Build Pipeline

The official build pipeline (`eng/ci/official-build.yml`) runs automatically on pushes to `main`, or can be triggered manually from Azure DevOps. This pipeline:

1. Installs dependencies (`npm ci`)
2. Runs `prebuild` (generates `version.ts` from `package.json`)
3. Builds both packages
4. Packs `.tgz` artifacts with ESRP code signing
5. Publishes the `.tgz` files as pipeline artifact `drop`

Wait for the pipeline to complete and verify the artifact contains the correctly versioned `.tgz` files.

### 8. Publish to npm

Download the signed `.tgz` artifacts from the pipeline's `drop` artifact and publish to npm:

```bash
# For pre-release versions, use the appropriate tag
npm publish microsoft-durabletask-js-X.Y.Z-<prerelease>.tgz --tag <alpha|beta|next>
npm publish microsoft-durabletask-js-azuremanaged-X.Y.Z-<prerelease>.tgz --tag <alpha|beta|next>

# For stable releases, omit the tag (becomes "latest")
npm publish microsoft-durabletask-js-X.Y.Z.tgz
npm publish microsoft-durabletask-js-azuremanaged-X.Y.Z.tgz
```

> **Important**: Use `--tag alpha`, `--tag beta`, or `--tag next` for pre-release versions. This ensures `npm install @microsoft/durabletask-js` still installs the latest stable version, not the pre-release. Only omit the tag for GA releases.

Verify the publish succeeded:

```bash
npm view @microsoft/durabletask-js versions
npm view @microsoft/durabletask-js-azuremanaged versions
```

### 9. Create a GitHub Release

Go to [GitHub Releases](https://github.com/microsoft/durabletask-js/releases) and create a new release:

- **Tag**: `vX.Y.Z`
- **Title**: `vX.Y.Z`
- **Description**: Copy the relevant section from `CHANGELOG.md`
- **Pre-release**: Check this box for alpha/beta/rc releases

## Quick Reference: npm Dist Tags

| Tag | When to use |
|---|---|
| `--tag alpha` | For `X.Y.Z-alpha.N` versions |
| `--tag beta` | For `X.Y.Z-beta.N` versions |
| `--tag next` | For release candidates (`X.Y.Z-rc.N`) |
| *(no tag / `latest`)* | For stable GA releases only |

## Rolling Back a Release

If a release has critical issues:

1. **Deprecate on npm**: `npm deprecate @microsoft/durabletask-js@X.Y.Z "Critical bug, use X.Y.Z+1"`
2. **Unpublish** (within 72 hours only): `npm unpublish @microsoft/durabletask-js@X.Y.Z`
3. Cut a new patch release with the fix.
