# Complete Migration Plan

## Target Architecture

### Hardware and firmware

- Keep the Nano-class hardware path.
- Replace the active firmware with `firmware/arduino/ioruba-controller/ioruba-controller.ino`.
- Preserve the existing serial contract:
  - full-frame `512|768|1023`
  - legacy `P1:512`
- Keep smoothing and noise resistance inside the firmware and again in the desktop runtime.

### Desktop app

- Move the main product path to `apps/desktop`.
- Use `Tauri 2 + React + TypeScript`.
- Use `Tailwind` for theming and layout.
- Use local modern UI primitives in `src/components/ui`.
- Use `Zustand` for runtime/session state.
- Use `Recharts` for knob telemetry and trend history.
- Use `tauri-plugin-serialplugin` for serial communication.
- Use JSON persistence through Rust commands and the Tauri config directory.

### Backend logic

- Port the Haskell/Python runtime math into `packages/shared`.
- Port Linux audio control into Rust commands under `apps/desktop/src-tauri/src/audio`.
- Keep the app transport split:
  - serial in Tauri plugin
  - audio and persistence in Rust invoke commands

## Migration Steps

1. Inventory legacy Python/Haskell behavior and freeze the required parity surface.
2. Create the shared TypeScript domain layer for protocol, defaults, runtime math, and snapshots.
3. Create the Tauri desktop shell and React UI.
4. Port Linux audio-target application into Rust.
5. Replace YAML/UI-state persistence with one persisted JSON model.
6. Rebuild CI and release workflows around Node, Rust, Arduino, and Tauri.
7. Update the documentation to reflect the new repository structure.
8. Archive the retired runtime and obsolete automation into `legacy/`.
9. Test shared logic, desktop state, Rust backend, and firmware build.

## Delivered In This Repository Update

- new desktop app scaffold in `apps/desktop`
- new shared domain package in `packages/shared`
- new Arduino firmware in `firmware/arduino/ioruba-controller`
- new GitHub Actions for CI and release
- migration audit and GitHub rollout plan in `docs/migration`
- archived Haskell runtime under `legacy/haskell-runtime`
- archived Pages and Release Please tooling under `legacy/github-automation`

## Remaining Practical Follow-up

- generate production icon assets for all Tauri bundle formats
- sign macOS and Windows installers in GitHub using the correct secrets
- decide whether the product copy should explicitly state that real per-target audio control is Linux-first until non-Linux backends exist
