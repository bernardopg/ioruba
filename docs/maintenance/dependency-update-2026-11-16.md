# Dependency update — 2026-11-16

Consolidates the open Dependabot PRs (#192 TruffleHog, #193 npm minor/patch
group, #194 serial plugin JS 4.x, #195 tauri-plugin-opener, #196 zip) and the
updates Dependabot did not track. Checked npm `latest`, crates.io non-yanked
stable releases, Node's release index and upstream GitHub Action releases/tags.
Prereleases were not selected (Tauri 3.0 is still alpha, so the app stays on
the Tauri 2.x stable line).

## Updates

- Node.js 26.12.1 → 26.13.1; npm 12.2.1 → 12.2.2. Synchronized `.nvmrc`,
  root engines/packageManager, CI/release/Pages setup and contributor guides.
- Rust floor (`rust-version`) 1.99.1 → 1.100.0, the current stable.
- Serial plugin: Rust 3.0.9 (vendored) → 4.2.2 and JavaScript 3.0.8 → 4.2.2.
  Upstream `serialplugin-core` 0.2.2 forwards stream lines byte-for-byte with
  their terminators and holds a split line until its terminator or a batch
  flush (its own regression test `line_router_keeps_terminators_and_joins_split_lines`).
  The app already buffers chunks and splits on `\r?\n`, so the local framing
  patch, its vendored copy and the Dependabot ignore entry were removed. The
  `SerialPort` methods the app calls (`available_ports`, `open`, `watch`,
  `write`, `close`, auto-reconnect) keep their signatures; the default
  permission set only gains `allow-ble-scan`.
- Updater: vendored 2.14.0 backport → upstream 2.14.1, which ships the same
  zip 9 and base64 0.23 requirements. The vendored crate, its workspace member
  and its CI/`rust:test` gates were removed.
- Tauri 2.12.5 → 2.12.6; tauri-build 2.7.4 → 2.7.5; tauri-plugin-opener
  2.7.2 → 2.7.3; tauri-plugin-dialog 2.8.4 and tauri-plugin-single-instance
  2.5.5 floors aligned with the lockfile. `cargo update` moved compatible
  transitive crates (zip 9.6.1 among them) and dropped OpenSSL/native-tls.
- npm: @tauri-apps/api and CLI 2.12.5, plugin-opener 2.7.3, Zustand 5.1.0,
  Lucide React 1.73.0, Vite 8.3.8, @vitejs/plugin-react 6.3.0,
  @tailwindcss/vite 4.3.5, jsdom 31.0.1. Regenerated the npm lockfile.
- Arduino CLI 1.5.1 → 1.6.0 (SHA-256 verified against the release checksums);
  cargo-audit 0.22.2 → 0.23.0; TruffleHog Action 3.99.8 → 3.99.9.

Remaining Actions were already on their latest stable releases.

## Intentionally retained

- GLib 0.18.5 security backport: Tauri still resolves the GTK3 stack.
- Transitive constraints owned by upstream crates were not forcibly overridden.

## Validation

Using Node 26.13.1 and npm 12.2.2:

- `npm run release:check` passed: npm audit (0 vulnerabilities), verify
  (67 shared and 153 desktop tests, 46 Rust tests, frontend build), cargo
  audit, firmware host tests, AVR compile matrix, shellcheck, installer and
  packaging tests, gitleaks, TruffleHog and `docs:prepare-site`.
- `cargo fmt --check` and `cargo clippy --all-targets -D warnings` passed.
- Cargo Audit: no vulnerabilities; four unmaintained warnings remain for
  proc-macro-error, zbus_names, zvariant and zvariant_derive (six before).
- `npm run desktop:tauri:build` produced the release binary.
- `IORUBA_TEST_SERIAL_PORT=/dev/ttyUSB0 xvfb-run -a npm run test:linux:app`:
  12 passed, including the physical Nano handshake and frame stream over the
  4.2.2 serial plugin.

Windows/macOS native builds were left to CI.
