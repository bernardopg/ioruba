# GitHub Repository Migration Plan

## Branch And Protection Strategy

- Keep `main` as the default branch.
- Require the `CI` workflow before merge.
- Protect `main` against force-push.
- Require pull requests for direct changes to release workflows and installer config.

## Workflows

### `ci.yml`

- Runs on pushes and pull requests against `main`.
- Installs Node 22, Rust stable, and Linux desktop build dependencies.
- Runs:
  - `npm ci`
  - shared typecheck
  - desktop typecheck
  - shared tests
  - desktop tests
  - Rust tests
  - desktop production build
  - firmware compile

### `release.yml`

- Triggers on semantic version tags such as `v0.6.1`.
- Uses `tauri-apps/tauri-action` to build installers for:
  - Windows
  - Linux (`deb`, `rpm`, `AppImage`)
  - macOS
- Builds the Arduino firmware separately and uploads the compiled artifacts to the same release.
- Generates Arch packaging metadata and uploads it to the same release:
  - `PKGBUILD` + `.SRCINFO` for source build (`ioruba-desktop`)
  - `PKGBUILD-bin` + `.SRCINFO-bin` for AppImage-based install (`ioruba-desktop-bin`)
  - source tarball with versioned checksum (`ioruba-<version>.tar.gz`)
- Generates `SHA256SUMS.txt` and GitHub artifact attestations for release assets.

### `pages.yml`

- Builds the documentation site from `docs/`, selected root manuals, and `docs-site/`.
- Runs `npm run docs:prepare-site` before the Jekyll build.
- Deploys the generated `.site-src` content to GitHub Pages.

### `docs-autoupdate.yml`

- Runs after successful `CI` pushes to `main`.
- Allows documentation-only updates in `README.md`, `CONTRIBUTING.md`, `docs/`, and `docs-site/`.
- Rejects changes outside that documentation surface before committing.

## Secrets And Signing

For unsigned test releases, the current workflow works with `GITHUB_TOKEN` only.

For production-grade signed installers, configure:

- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_ID`
- `APPLE_PASSWORD`
- `APPLE_TEAM_ID`
- Windows signing secrets if Authenticode is required

## Release Procedure

1. Merge validated changes into `main`.
2. Create and push a tag such as `v0.6.1`.
3. Let `release.yml` generate the installers and firmware assets.
4. Verify the uploaded bundles from the GitHub Release page:
  - desktop installers (`deb`, `rpm`, `AppImage`, Windows, macOS)
  - firmware artifacts
  - Arch packaging metadata files (`PKGBUILD`, `.SRCINFO`, `PKGBUILD-bin`, `.SRCINFO-bin`, source tarball)
5. If publishing to AUR, copy those generated files into the respective AUR repositories and push.

## Old Automation Removed

These workflows were removed because they were tied to the Haskell distribution path:

- Release Please automation
- repository metadata sync workflow
