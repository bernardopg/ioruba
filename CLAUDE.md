# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Ioruba turns an Arduino Nano + 3 potentiometer knobs into a tactile desktop audio control deck. Active stack: Tauri 2 + React 19 + TypeScript desktop app, Rust audio backend (`pactl` on Linux), Arduino C++ firmware. Real audio control is Linux-only; macOS/Windows run in UI/demo mode.

## Commands

npm workspaces monorepo (`apps/*`, `packages/*`). Run from the repo root.

```bash
npm install                  # setup
npm run verify               # full gate: shared+desktop typecheck, shared+desktop tests, Rust tests, desktop build
npm run ci                   # verify + firmware compile

npm run desktop:dev          # Vite frontend only (port 1420, fast UI iteration)
npm run desktop:watch        # full Tauri shell (serial, persistence, audio backend)
npm run desktop:tauri:build  # local Tauri binary (--no-bundle); required check for desktop-shell changes

npm run shared:test          # vitest in packages/shared
npm run desktop:test         # vitest in apps/desktop
npm run rust:test            # cargo test (apps/desktop/src-tauri)
npm run firmware:compile     # arduino-cli compile --fqbn arduino:avr:nano

npm run desktop:icons        # regenerate icon assets after editing src-tauri/icons/app-icon.svg
```

Single test file (vitest):

```bash
npm --workspace @ioruba/desktop run test -- src/lib/serial.test.ts
npm --workspace @ioruba/shared run test -- src/protocol.test.ts
```

Single Rust test: `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml <test_name>`

## Architecture

Data flow: firmware → serial → shared protocol parsing → Zustand store → Rust commands → pactl.

- **`firmware/arduino/ioruba-controller/`** — single `.ino`. Emits a `HELLO board=...; fw=...; protocol=...; knobs=...` handshake, then frames like `512|768|1023` (three 10-bit values). Legacy format `P1:512` is still supported by the parser.
- **`packages/shared/`** — TypeScript domain layer consumed as raw source (`main: ./src/index.ts`, no build step): `protocol.ts` (packet/handshake parsing), `runtime.ts` (knob→value math), `types.ts`, `validation.ts`, `defaults.ts`, `mixer.ts`. Protocol or runtime-math changes belong here, not in the app.
- **`apps/desktop/src/`** — React UI. Key pieces:
  - `store/ioruba-store.ts` — Zustand store, central runtime state.
  - `lib/serial.ts` + `hooks/use-serial-runtime.ts` — serial connection via `tauri-plugin-serialplugin`.
  - `lib/backend.ts` — typed wrappers around Tauri `invoke` commands.
  - `lib/profile-config.ts` — JSON profile editing/validation.
  - `lib/i18n.ts` — translations (en/pt-BR).
- **`apps/desktop/src-tauri/src/`** — Rust backend: `lib.rs` (Tauri commands, persistence of `ioruba-state.json`), `watch.rs` (structured watch log, auto-trimmed ~1 MiB), `audio/linux.rs` (pactl backend: master/application/source/sink targets), `audio/unsupported.rs` (mac/win stub).
- **`legacy/`** — archived Python/GTK prototype. Reference only; never extend it, and don't reintroduce old root-level build tooling outside `legacy/`.

App data lives in the platform config dir (Linux: `~/.config/io.ioruba.desktop/`): `ioruba-state.json` and `ioruba-watch.log`.

## Conventions

- Before a PR: `npm run verify` must pass; `npm run desktop:tauri:build` for desktop-shell changes; firmware must compile when firmware files changed.
- Add tests next to the code that changed (`packages/shared`, `apps/desktop`, or `src-tauri`).
- Update docs when paths, commands, or runtime behavior change. PT-BR doc mirrors live in `docs/translations/pt-br/`.
- UI direction (`.impeccable.md`): instrument-panel/studio-lab aesthetic, copper + teal accents, connection state always obvious. Avoid neon/gamer styling, glassmorphism, generic SaaS card grids.
- Node 22 is the CI baseline. `RUSTSEC-2024-0429` (glib `GHSA-wrw7-89jp-8q8g`) is fixed at the source via the vendored `glib-0.18.5` backport in `[patch.crates-io]` (see `src-tauri/vendor/README.md`), so `npm run rust:audit` runs without an `--ignore` for it. Remove the vendor override once the Tauri Linux stack moves to `glib >= 0.20`.
