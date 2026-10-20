# Release preparation — 2026-10-20

This batch updates dependencies/workflows, redesigns the mixer and adds Linux,
serial and firmware regression coverage. User-facing notes are in the
`1.10.0` section of [CHANGELOG.md](../../CHANGELOG.md).

## Evidence

- [Dependency snapshot](dependency-update-2026-10-19.md).
- [Linux and firmware audit](linux-runtime-audit-2026-10-20.md).
- [Visual review](visual-redesign-2026-10-20.md).
- [Tray, autostart and export selectors](linux-shell-review-2026-10-20.md).

Latest desktop suite: 153 tests. Previous full verification also passed 67
shared tests and 49 Rust tests. Native checks passed with the Nano connected;
the desktop-shell extension passed 15 reported results (14 cases and suite
parent). Coverage is measured including unimported files, not imported-only.
Read the individual reports for evidence scope and artifact paths.

## Windows updater advisory backport

The initial release gate failed at cargo audit on zip 4.6.1:
RUSTSEC-2026-0367/0368/0369. Upstream already merged
[PR #3698](https://github.com/tauri-apps/plugins-workspace/pull/3698), while
stable updater 2.14.1 was still queued in release PR #3712.

Ioruba now vendors crates.io updater 2.14.0 and backports only its Windows
`zip = "9"` requirement. `Cargo.toml` and `Cargo.toml.orig` contain the dependency change; the
upstream changelog only has trailing whitespace normalized. No updater
implementation or signature verification is changed. Root lockfile resolves zip 9.0.5. Provenance and removal conditions
are in [vendor README](../../apps/desktop/src-tauri/vendor/README.md).

Cargo audit passes without vulnerabilities; four unmaintained-dependency
warnings remain. All 25 upstream updater unit tests pass, including signed
version, payload integrity and tampering checks. The zip crate also passes
`cargo check --target x86_64-pc-windows-gnu -p zip --locked`.
Final local validation with this backport: `npm run release:check` passed
end-to-end (220 TypeScript tests, 74 Rust tests including 25 updater tests,
npm/cargo audits, host firmware tests and AVR build matrix, shell/installer/
packaging checks, secret scans and documentation build). `actionlint` and
`git diff --check` passed. The rebuilt Linux release binary passed the
15-result native desktop-shell suite; artifacts are at
`/tmp/ioruba-native-test-YhCOib/`. These are local results, not remote CI proof.

Full local Windows updater cross-check requires missing MinGW GCC; native
Windows/macOS CI now explicitly runs updater unit tests. Passing zip's target
check does not establish updater/installer runtime behavior on Windows.

## Before tagging

1. Select the next desktop version and synchronize root and desktop
   `package.json`, `package-lock.json`, Cargo package/lock and `tauri.conf.json`.
   Release preparation sets desktop/root to 1.10.0; the private shared package
   keeps its independent 0.6.4 version. Firmware source is 0.6.3, protocol 2.
2. Move `Unreleased` notes to a dated version heading, preserving older entries.
3. Run `npm run release:check` with Node 26.12.0/npm 12.2.0 and the documented
   Rust/Arduino/security tooling; require remote CI to pass on the pushed head.
4. Tag the reviewed commit only after version consistency passes. The tag
   workflow builds artifacts and mandatory updater signatures/checksums.
5. Verify published checksums, `.sig` files and complete `latest.json`; exercise
   updating from the previous release on Linux and Windows. Regenerate package
   manifests from release checksums rather than editing digests manually.

This preparation is now used for release v1.10.0. The installed AUR package and
Nano firmware were not replaced. Windows/macOS runtime, fresh logout/login,
panel-icon pixel clicks and published updater/installers remain release checks;
Linux Xvfb/D-Bus evidence does not certify those paths. Platform code signing is
intentionally not used; Tauri updater signing remains mandatory as described in
[release distribution](../guides/release-distribution.md).

## Published outcome

Release v1.10.0 completed successfully. See [published validation](release-1.10.0-validation.md) for artifact checks, distribution state, real Linux package/update proof and remaining platform limits.
