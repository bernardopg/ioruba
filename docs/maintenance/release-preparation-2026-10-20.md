# Release preparation — 2026-10-20

This batch updates dependencies/workflows, redesigns the mixer and adds Linux,
serial and firmware regression coverage. User-facing notes are in the
`Unreleased` section of [CHANGELOG.md](../../CHANGELOG.md).

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

## Publication blocker found by the final gate

`npm run release:check` passed npm audit, TypeScript checks/tests, Rust tests
and the web build, then failed at `cargo audit`. The refreshed advisory database
reports three vulnerabilities in `zip 4.6.1`: RUSTSEC-2026-0367,
RUSTSEC-2026-0368 and RUSTSEC-2026-0369. `cargo tree --target all -i zip`
identifies `tauri-plugin-updater 2.14.0` as its parent; that plugin requires
`zip = "4"` only on Windows. The advisories require zip >=9.0.0, so a compatible
lockfile update cannot resolve them. No advisory suppression was added.

Do not publish until the Windows updater dependency is fixed and the complete
release gate passes. Linux runtime results do not clear a Windows dependency
vulnerability. Four additional unmaintained-dependency warnings were reported.

## Before tagging

1. Select the next desktop version and synchronize root, desktop and shared
   `package.json`, `package-lock.json`, Cargo package/lock and `tauri.conf.json`.
   This commit retains desktop 1.9.6; firmware source is 0.6.3, protocol 2.
2. Move `Unreleased` notes to a dated version heading, preserving older entries.
3. Run `npm run release:check` with Node 26.12.0/npm 12.2.0 and the documented
   Rust/Arduino/security tooling; require remote CI to pass on the pushed head.
4. Tag the reviewed commit only after version consistency passes. The tag
   workflow builds artifacts and mandatory updater signatures/checksums.
5. Verify published checksums, `.sig` files and complete `latest.json`; exercise
   updating from the previous release on Linux and Windows. Regenerate package
   manifests from release checksums rather than editing digests manually.

No tag/release is published by this preparation. The installed AUR package and
Nano firmware were not replaced. Windows/macOS runtime, fresh logout/login,
panel-icon pixel clicks and published updater/installers remain release checks;
Linux Xvfb/D-Bus evidence does not certify those paths. Platform code signing is
intentionally not used; Tauri updater signing remains mandatory as described in
[release distribution](../guides/release-distribution.md).
