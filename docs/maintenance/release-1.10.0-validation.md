# Ioruba 1.10.0 — published release validation

Published on 2026-10-20: [release v1.10.0](https://github.com/bernardopg/ioruba/releases/tag/v1.10.0).
Tag source: `71fe96069bbedebbce31b82967fc9fcadb8244e6`. Firmware: 0.6.3, protocol 2.
Root/desktop versions and lockfiles agree; the private shared package remains independently versioned at 0.6.4.

## Gates and artifacts

- [Release workflow](https://github.com/bernardopg/ioruba/actions/runs/39442168355): success, including the reused CI gate, all four desktop builds, firmware, checksums/attestations, updater, package manifests and AUR.
- [Source CI](https://github.com/bernardopg/ioruba/actions/runs/39441568219): success. CodeQL and Secret Scan also passed on the release source.
- Local `npm run release:check`: passed, including 220 TypeScript and 74 Rust tests, 25 of which are upstream updater tests. npm/cargo audits found no vulnerabilities; four unmaintained-crate warnings remain.
- Downloaded all 12 binary/firmware entries in `SHA256SUMS.txt` and recomputed SHA-256. Every checksum matched, including GitHub asset digests where present.
- Verified provenance of all 12 using `gh attestation verify`, constrained to repository `bernardopg/ioruba`, workflow `.github/workflows/release.yml`, ref `refs/tags/v1.10.0` and the source digest above.
- Verified all seven detached updater signatures with Minisign and the public key embedded in the release configuration. Checked the signed `latest.json` artifact references/signature values for Linux x86_64, Windows x86_64, macOS ARM64 and Intel.
- Debian metadata and both macOS Info.plists report version 1.10.0. GitHub's latest stable release points to v1.10.0.

## Runtime and update proof

The executable extracted from the published `.deb` passed all 15 reported native Linux results (14 cases plus parent), with `IORUBA_EXPECT_VERSION=1.10.0` checking the runtime version over IPC. This includes real isolated audio targets, 54 responsive layouts, navigation/focus, persistence, demo, tray, login and GTK save/cancel selectors. Artifacts: `/tmp/ioruba-native-test-oDX6Qh/`.

A verified copy of the published 1.9.6 AppImage was updated through the real updater backend to 1.10.0. The resulting temporary AppImage hash matches the official published 1.10.0 AppImage exactly:

```text
df022ebe3eb4a91d8f89b4e8b298e224fb123ccb3016c3203f484e9fd1b3833c
```

The 1.9.6 executable was copied out of the extracted AppImage without byte changes and run against the host WebKit so it could be driven by the installed WebDriver; `APPIMAGE` pointed at the writable temporary AppImage. Using AppRun directly hit a bundled-WebKit/WebDriver automation protocol mismatch (`Automation.resolveBrowsingContext` unavailable). The successful update establishes signed download/install and the resulting artifact, not GUI automation compatibility of the bundled WebKit. Proof: `/tmp/ioruba-native-test-QBQwJj/signed-update-result.json`.

## Distribution

- AUR RPC confirms `ioruba-desktop` and `ioruba-desktop-bin` at `1.10.0-1`.
- Homebrew tap `Casks/ioruba.rb` and Scoop `ioruba.json` match the attached release manifests byte-for-byte, including URLs and checksums.
- The three winget manifests are attached to the release. Availability in Microsoft's community repository is not established by this validation.
- Release notes and updater notes use documentation links pinned to v1.10.0. Artifact URLs and signatures were retained.

## Limits

No Windows/macOS GUI installer or live upgrade was run locally; native CI builds/tests and artifact signatures were checked. No logout/reboot or pixel click on the desktop tray was performed. The user's installed package and connected Nano firmware were not replaced. Platform code signing is intentionally absent as documented in the distribution guide; mandatory Tauri updater signing is intact.

Local verification files and downloaded assets: `/tmp/ioruba-release-1.10.0/`. Temporary evidence may be removed by the system. This report does not treat those limits as completed tests.
