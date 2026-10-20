# Dependency update — 2026-10-19

Versions were checked against npm's `latest` dist-tags, crates.io stable releases,
GitHub action release tags and the official Node.js distribution index.

- Node.js 26.12.0 and npm 12.2.0: `.nvmrc`, root engine/package-manager
  metadata and every Node-based workflow. Workflows explicitly install npm 12
  because Node 26.12.0 ships npm 11.
- All direct npm dependencies in desktop/shared now declare the current stable
  release. The root lockfile was regenerated and installed with `npm ci`.
- Rust dependencies and the desktop Cargo.lock were updated, including Tauri
  2.12.4, tauri-build 2.7.3 and updater 2.14.0. Rust minimum is now 1.99.1.
- Serial plugin Rust 3.0.9 / JavaScript 3.0.8. The Rust crate remains vendored:
  upstream still strips stream delimiters. The existing framing patch and two
  regression tests were carried forward. See `src-tauri/vendor/README.md`.
- CodeQL Action 4.39.0, TruffleHog 3.99.3 and the rust-toolchain action SHA were
  updated. Other Actions, Arduino CLI 1.5.1 and cargo-audit 0.22.2 were already
  current. Actions remain pinned by commit SHA.
- macOS CI/release runners now use `macos-latest`; Ubuntu/Windows already use
  their latest labels. There are no project-owned Dockerfiles/container images.
- Arduino installed cores were refreshed; AVR 1.8.8, ESP32 3.3.12,
  RP2040 5.6.0 and ESP8266 3.1.2 were already current.

## Required compatibility exceptions

GLib remains at vendored 0.18.5 with its security backport because Tauri's Linux
GTK3 dependency graph requires 0.18. Installing GLib 0.22 alongside it would not
upgrade GTK3. The graph also pins older compatible transitive versions, including
`toml_datetime =0.6.3` through `proc-macro-crate 2.0.2`; forcing TOML 0.8.23 fails
resolution. Such transitive crates are not all at their globally newest major.

`cargo audit` fails with three advisories in Windows-only `zip 4.6.1`, pulled by
the newest `tauri-plugin-updater 2.14.0`: RUSTSEC-2026-0367, RUSTSEC-2026-0368 and
RUSTSEC-2026-0369 (fixed in zip >=9). No ignore was added and the CI audit gate
remains enabled. A fixed updater release or a separately validated upstream
backport is needed. Unmaintained-crate warnings also remain for proc-macro-error,
zbus_names, zvariant and zvariant_derive.

## Validation

- Node 26.12.0 / npm 12.2.0; npm outdated: no outdated workspace dependencies.
- npm audit, including development dependencies: zero vulnerabilities.
- TypeScript typechecks and 195 tests passed; Vite production build passed.
- Rust application tests: 45 passed; serial routing tests: 4 passed.
- Firmware host tests, installer tests and 28 packaging tests passed.
- ShellCheck, actionlint and Rust formatting passed.
- Rust Clippy with `--all-targets -- -D warnings` passed on Linux.
- AVR Nano/Uno/Mega/Leonardo/Micro, ESP32, RP2040 and ESP8266 firmware compiled locally.

No GitHub-hosted workflow, Windows/macOS build, release publication, hardware
flash or physical audio/serial validation was performed in this update.
