# Contributing to Ioruba

## Active stack

The current product path lives in:

- `apps/desktop` for the Tauri + React desktop app
- `apps/desktop/src-tauri` for the Rust backend
- `packages/shared` for protocol and runtime logic shared by the UI
- `firmware/arduino/ioruba-controller` for the Arduino firmware

Anything under `legacy/` is archived reference material and should only be touched when you are documenting or comparing past behavior.

## Local setup

Install dependencies:

```bash
npm install
```

Recommended validation pass:

```bash
npm run verify
```

If you are changing the desktop shell itself, also build the Tauri binary:

```bash
npm run desktop:tauri:build
```

If you edit the app icon source at [apps/desktop/src-tauri/icons/app-icon.svg](apps/desktop/src-tauri/icons/app-icon.svg), regenerate all derived desktop, Android, iOS, `icns`, and `ico` assets with:

```bash
npm run desktop:icons
```

If you are changing firmware:

```bash
arduino-cli compile --fqbn arduino:avr:nano firmware/arduino/ioruba-controller
```

## Workflow

1. Keep changes focused on the active stack unless the task explicitly targets `legacy/`.
2. Update docs when paths, commands, or runtime behavior change.
3. Prefer adding tests alongside `packages/shared`, `apps/desktop`, or `apps/desktop/src-tauri` when behavior changes.
4. Regenerate generated assets, including desktop icons, whenever their source files change.
5. Do not reintroduce root-level Haskell build files or old release tooling outside `legacy/`.

## Pull requests

Before opening a PR, make sure:

- `npm run verify` passes
- `npm run desktop:tauri:build` passes for desktop-shell changes
- firmware still compiles when firmware files changed
- docs reflect the current repository layout
