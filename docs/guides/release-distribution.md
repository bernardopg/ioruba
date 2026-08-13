# Release distribution

The tag workflow first reuses the complete CI workflow as a gate, then builds
the supported desktop and firmware artifacts, publishes signed updater metadata,
release notes, attestations, and `SHA256SUMS.txt`, and finally generates
package-manager manifests. The published checksum is the trust boundary:
installers fail closed when `SHA256SUMS.txt` or the exact asset entry is missing,
and manifests must quote the digest of the release asset rather than a digest
copied or recomputed by hand. Public Windows releases also fail closed unless
the Authenticode certificate secret is provisioned; macOS signing/notarization
remains the explicitly documented exception below.

## Generated package-manager manifests

Current desktop artifacts are Linux `.deb`/`.rpm`/AppImage, Windows MSI/NSIS,
and macOS Apple Silicon/Intel `.app.tar.gz` archives. The release also includes
firmware output, updater signatures, `latest.json`, checksums, provenance, and
package metadata.

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

For every tag, verify that the release contains `latest.json` and each required
`.sig`, then test an update from the previous Ioruba build on Linux and Windows.
Test macOS when the corresponding signed/notarized distribution path is enabled.
Apple code signing and notarization remain separate from Tauri updater signing.

## AUR: the PKGBUILD must opt out of LTO

`arch-pkgbuild` in `.github/workflows/release.yml` generates the `ioruba-desktop`
PKGBUILD, which builds from source on the user's machine. That PKGBUILD must
always carry `options=('!lto' '!debug')`.

Arch's stock `/etc/makepkg.conf` ships `OPTIONS=(... lto)` with
`LTOFLAGS="-flto=auto"`, and makepkg injects that flag into `CFLAGS`. The `cc`
crate — used by the `ring` crate's `build.rs` — then compiles ring's C and
assembly sources into GIMPLE bitcode (`.gnu.lto_*` sections) instead of native
ELF objects. Cargo drives the final link through `rust-lld`, which cannot run
GCC's LTO front-end, so every ring symbol comes back undefined:

```text
rust-lld: error: undefined symbol: ring_core_0_17_14__x25519_sc_mask
rust-lld: error: undefined symbol: ring_core_0_17_14__OPENSSL_cpuid_setup
...
```

The linker is a red herring — forcing `bfd` via `RUSTFLAGS` reproduces the same
wall of errors. Only removing `-flto` from `CFLAGS` fixes it. Regressed in
`1.8.0-1`; fixed in `1.8.0-2`.

When editing the published package directly, work in the AUR clone
(`git push origin HEAD:master`) and regenerate the metadata with
`makepkg --printsrcinfo > .SRCINFO` before committing. The `-bin` package
installs a prebuilt AppImage and is unaffected.
