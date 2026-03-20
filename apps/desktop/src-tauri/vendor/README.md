## Vendored Rust Crates

`glib-0.18.5` is vendored here to backport the fix for `GHSA-wrw7-89jp-8q8g`
(`RUSTSEC-2024-0429`) while Tauri's Linux runtime still depends on the GTK3
stack.

Source:
- crates.io `glib` `0.18.5`

Backported upstream fix:
- https://github.com/gtk-rs/gtk-rs-core/pull/1343

Removal condition:
- remove this vendor override once `tauri` / `tauri-runtime-wry` / `wry` stop
  resolving Linux builds through the GTK3 `glib 0.18.x` line.
