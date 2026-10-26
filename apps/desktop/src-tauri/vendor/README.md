# Vendored Rust Crates

`glib-0.18.5` is vendored here to backport the fix for `GHSA-wrw7-89jp-8q8g`
(`RUSTSEC-2024-0429`) while Tauri's Linux runtime still depends on the GTK3
stack.

## Source and fix

- Source: crates.io `glib` `0.18.5`
- Backported fix: <https://github.com/gtk-rs/gtk-rs-core/pull/1343>

## Removal condition

Remove this vendor override once `tauri` / `tauri-runtime-wry` / `wry` stop
resolving Linux builds through the GTK3 `glib 0.18.x` line.

You do not have to poll for that by hand. When the graph stops resolving through
`glib 0.18.x`, the patch stops applying and every `cargo` invocation prints:

```
warning: patch `glib v0.18.5 (.../vendor/glib-0.18.5)` was not used in the crate graph
```

That warning is the signal to delete `vendor/glib-0.18.5` and the
`[patch.crates-io]` block in `Cargo.toml`. Until it appears, the backport is
still load-bearing: the `glib` 0.18 line ended at `0.18.5` with no upstream
patch release, the fix landed only in `glib >= 0.20`, and `gtk 0.18.2` — the
final GTK3 binding release — requires `glib ^0.18`, so no version bump anywhere
in the stack can replace this.

## Serial plugin 3.0.9

Vendored from https://crates.io/crates/tauri-plugin-serialplugin/3.0.9.
Keep the existing LineRouter patch and its two regression tests (and adjust the upstream binary-route test to expect preserved
newlines): upstream still
strips ordinary line endings and flushes partial frames prematurely. Enable
Tauri's test feature in dependencies, as in our previous vendor, so the existing
`cargo test -p tauri-plugin-serialplugin line_router_` gate remains runnable.
Remove this override once upstream preserves framing and passes these tests.

## Updater 2.14.0: zip 9 and base64 0.23 patches

- Source: crates.io `tauri-plugin-updater` 2.14.0, with licenses and original
  `.cargo_vcs_info.json` retained. Registry marker and the crate's standalone
  lockfile are omitted; the application lockfile is authoritative.
- Zip patch: the Windows `zip` requirement changes from `4` to `9`, in both
  normalized/original manifests (trailing whitespace in the upstream changelog
  is normalized), matching upstream
  https://github.com/tauri-apps/plugins-workspace/pull/3698 (merged 2026-10-16).
- Purpose: remove RUSTSEC-2026-0367/0368/0369 without suppressing advisories.
  Application lockfile resolves zip 9.1.2. Updater Rust/JS implementation,
  mandatory signature verification, platform features and public key stay intact.
- Base64 patch: both normalized/original manifests require `base64 0.23`,
  resolving 0.23.1 and removing the updater's 0.22.1 dependency. No production
  source changes are required. Regression tests cover padded signature text,
  malformed padding/input and non-UTF-8 payload rejection, alongside existing
  signed-version and tamper-rejection tests. Updater tests run on Linux,
  Windows and macOS in CI.
- The crate is a workspace member so its upstream unit tests can run with the
  application's dependency patches: `cargo test --manifest-path
  apps/desktop/src-tauri/Cargo.toml -p tauri-plugin-updater --lib --locked`.
- Removal: once a stable 2.x updater containing #3698 is published (currently
  queued for 2.14.1), update the registry dependency, delete this vendor override,
  workspace member and vendor directory, and retain updater tests through an
  appropriate upstream/native CI gate. Re-run audits and platform checks.
