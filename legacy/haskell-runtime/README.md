# Archived Haskell Runtime

This subtree preserves the former Haskell-first application layout exactly so old runtime behavior can still be inspected when comparing against the current Tauri/Rust implementation.

The active product path is no longer here. Use:

- `apps/desktop` for the desktop app
- `apps/desktop/src-tauri` for the Rust backend
- `packages/shared` for the migrated protocol and runtime logic
- `firmware/arduino/ioruba-controller` for the active Nano firmware

The archived Stack project remains available for best-effort inspection and local experiments, for example:

```bash
stack --stack-yaml legacy/haskell-runtime/stack.yaml test
```

Release packaging under `legacy/haskell-runtime/scripts/release` is preserved as historical reference and is no longer part of the active release pipeline.
