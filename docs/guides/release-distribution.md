# Release distribution

The tag workflow builds the supported desktop artifacts, attests them, publishes
`SHA256SUMS.txt`, and only then generates package-manager manifests. The checksum
is the trust boundary: installers and manifests must quote the digest of the
published executable, never a locally recomputed value.

## Generated package-manager manifests

After a release, the workflow uploads these additional assets:

| Asset | Consumer | What to do |
| --- | --- | --- |
| `ioruba.rb` | Homebrew | Automatically committed to [`bernardopg/homebrew-ioruba`](https://github.com/bernardopg/homebrew-ioruba); users run `brew tap bernardopg/ioruba && brew install --cask ioruba`. |
| `ioruba.json` | Scoop | Automatically committed to [`bernardopg/scoop-ioruba`](https://github.com/bernardopg/scoop-ioruba); users run `scoop bucket add ioruba https://github.com/bernardopg/scoop-ioruba && scoop install ioruba`. |
| `BernardoGomes.Ioruba*.yaml` (three files) | winget | Attached to the release and submitted as a PR to [`microsoft/winget-pkgs`](https://github.com/microsoft/winget-pkgs), where Microsoft validates and reviews it. |

They are generated from the release API plus its `SHA256SUMS.txt` by
[`scripts/packaging/generate.mjs`](../../scripts/packaging/generate.mjs). The
pure renderer is covered by
[`scripts/packaging/manifests.test.mjs`](../../scripts/packaging/manifests.test.mjs).
Do not edit digest, URL, or version by hand: regenerate from the release if a
mistake is found.

The Homebrew tap and Scoop bucket are public repositories owned by the project.
Each has an **isolated write-only deploy key**: the release workflow cannot use
one key to modify the other or the source repository. The known GitHub ED25519
host key is pinned; the workflow never trusts `ssh-keyscan` output.

winget uses Microsoft’s public community repository and requires its review. The
initial submission is [PR #415149](https://github.com/microsoft/winget-pkgs/pull/415149).
Future manifests remain attached to every release; fully automated upstream PRs
would require a dedicated, least-privilege GitHub App or fine-grained token for
the project fork, neither of which should be substituted by a broad personal
credential.

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

## In-app updater

The updater is enabled and fail-closed. `tauri-plugin-updater` verifies every
candidate against the public key embedded in `tauri.conf.json`; the private key
and its password exist only as `TAURI_SIGNING_PRIVATE_KEY` and
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` repository secrets. The original encrypted
key pair is retained outside the repository at `~/.config/ioruba/updater/` with
mode 600 and must be backed up before the machine is retired — losing it would
strand installed clients on the current update chain.

Every platform build uploads a detached `.sig`. A separate job waits for the
whole build matrix, then creates exactly one `latest.json` from the complete set
of signed Linux and Windows artifacts (and macOS artifacts when present). This
avoids the known parallel-matrix race where several jobs delete and upload the
same `latest.json`. Missing signatures fail the release instead of publishing a
partial manifest.

The app checks this endpoint every six hours, offers an explicit **Update and
restart** action, verifies the artifact before installing it, and relaunches
only after a successful verification. Browser/dev mode keeps the informational
GitHub release check; it never treats an arbitrary URL as an installable update.

The first tag after this change is the end-to-end production verification: check
that its release contains `latest.json` and `.sig` files, then install it from a
previous Ioruba build on Linux and Windows. Apple notarization remains separate.
