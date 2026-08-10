# Release distribution

The tag workflow builds the supported desktop artifacts, attests them, publishes
`SHA256SUMS.txt`, and only then generates package-manager manifests. The checksum
is the trust boundary: installers and manifests must quote the digest of the
published executable, never a locally recomputed value.

## Generated package-manager manifests

After a release, the workflow uploads these additional assets:

| Asset | Consumer | What to do |
| --- | --- | --- |
| `ioruba.rb` | Homebrew | Copy it into the project cask tap as `Casks/ioruba.rb`; then test `brew install --cask <tap>/ioruba`. |
| `ioruba.json` | Scoop | Publish it in the project Scoop bucket, or install it by URL from the release after reviewing it. |
| `BernardoGomes.Ioruba*.yaml` (three files) | winget | Open a PR containing the three files in [`microsoft/winget-pkgs`](https://github.com/microsoft/winget-pkgs). |

They are generated from the release API plus its `SHA256SUMS.txt` by
[`scripts/packaging/generate.mjs`](../../scripts/packaging/generate.mjs). The
pure renderer is covered by
[`scripts/packaging/manifests.test.mjs`](../../scripts/packaging/manifests.test.mjs).
Do not edit digest, URL, or version by hand: regenerate from the release if a
mistake is found.

A Homebrew tap, a Scoop bucket, and a fork/token for `winget-pkgs` are external
publishing authorities. This repository deliberately does **not** pretend that
creating a release asset publishes to any of them. Create those repositories and
add their deployment credentials before automating submissions.

## macOS signing, notarization, and DMG

The workflow already imports a Developer ID certificate when the following
repository secrets exist:

- `APPLE_CERTIFICATE` (base64 `.p12`)
- `APPLE_CERTIFICATE_PASSWORD`
- `KEYCHAIN_PASSWORD`
- `APPLE_ID`, `APPLE_PASSWORD` (app-specific password), and `APPLE_TEAM_ID`

Without the certificate it intentionally uploads an unsigned `.app.tar.gz`.
The one-line macOS installer and generated Homebrew cask remove the quarantine
attribute because Gatekeeper cannot validate an unsigned build.

Do not enable `.dmg` just by changing the bundle list. Tauri's DMG script asks
Finder through AppleScript to lay out the mounted image; that operation has been
intermittently unauthorized on GitHub-hosted macOS runners. Since desktop bundle
failure aborts the whole release, `.app.tar.gz` is the reproducible artifact
until a signed release run verifies a reliable DMG path. When the Apple secrets
are provisioned, run a draft tag on `macos-15`, verify both `codesign --verify
--deep --strict` and `spctl -a -vv`, then add `dmg` and make it a required
release artifact.

## In-app updater: security gate

The in-app updater is intentionally **not enabled** yet. A `latest.json` file
without signatures is a remote-code-execution endpoint, not an update feature.
Before enabling it, all of the following must be provisioned together:

1. Generate a Tauri updater key pair offline; store only
   `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` as
   Actions secrets, and put the corresponding public key in Tauri updater
   configuration.
2. Add `tauri-plugin-updater` and register it in `src-tauri/src/lib.rs`.
3. Configure the updater endpoint as
   `https://github.com/bernardopg/ioruba/releases/latest/download/latest.json`.
4. Pass the signing secrets only to the release bundle step and set
   `includeUpdaterJson: true` only when those secrets are present.
5. Test update verification on Linux, Windows, and both macOS architectures
   against a draft release before changing a public release workflow.

`release.yml` keeps `includeUpdaterJson: false` until this complete chain is
available. That is an explicit fail-closed setting, not a missing release
artifact.
