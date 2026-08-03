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
