# Dependency update — 2026-10-26

Checked npm `latest`, crates.io non-yanked stable releases, Node's release index,
and upstream GitHub Action releases/tags. Prereleases were not selected.

## Updates

- Node.js 26.12.0 → 26.12.1; npm 12.2.0 → 12.2.1. Synchronized `.nvmrc`,
  root engines/packageManager, CI/release/Pages setup and contributor guides.
- Vite 8.3.4 → 8.3.5; Zustand 5.0.15 → 5.0.16; Lucide React 1.59.0 → 1.61.0;
  Tauri CLI 2.12.3 → 2.12.4. Regenerated the npm lockfile.
- Tauri Rust 2.12.4 → 2.12.5; tauri-build 2.7.3 → 2.7.4. Cargo updated
  36 compatible direct/transitive packages, including zip 9.1.2.
- Swatinem/rust-cache 2.9.2 → 2.9.3; CodeQL Action 4.39.0 → 4.39.1;
  TruffleHog 3.99.3 → 3.99.7. Actions remain pinned to verified commit SHAs.

Other direct npm dependencies, Rust toolchain 1.99.1, Arduino CLI 1.5.1,
remaining Actions and cargo-audit 0.22.2 were already current stable releases.
The `github/codeql-action` latest-release endpoint also exposes bundle releases;
the Action itself was checked against its v4 release tag.

## Intentionally retained

- GLib 0.18.5 security backport: Tauri still resolves the GTK3 stack.
- Serial plugin 3.0.9 line-framing patch: still the newest stable Rust release;
  its JavaScript API package remains at its independently published latest 3.0.8.
- Updater 2.14.0 zip 9 backport: no newer stable updater release is available.
- Transitive constraints owned by upstream crates were not forcibly overridden.
- Existing Dependabot schedules/grouping remain unchanged.

## Validation

Using Node 26.12.1 and npm 12.2.1:

- `npm ci`; workspace typechecks; 67 shared and 153 desktop tests passed.
- Frontend production build and `docs:prepare-site` passed.
- `npm outdated --workspaces`: no outdated packages; `npm audit`: zero vulnerabilities.
- Locked Rust application tests: 46 passed; serial framing tests: 4 passed;
  updater tests: 25 passed.
- Cargo Audit: no vulnerabilities; four unmaintained warnings remain for
  proc-macro-error, zbus_names, zvariant and zvariant_derive. No advisories suppressed.
- Firmware host tests (parser, pins, wide configuration and three runtime variants)
  passed; compilation passed for Nano, Uno, Mega, Leonardo and Micro.
- Packaging tests: 28 passed; `actionlint` and `git diff --check` passed.

Windows/macOS native builds, full desktop installer packaging and remote GitHub
Actions execution were not performed locally.
