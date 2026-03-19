# Ioruba

Ioruba is now a desktop control deck built with `Tauri 2 + React + TypeScript`, driven by `Arduino C++` firmware for a 3-knob hardware mixer.

The migration replaces the old Python/Haskell runtime path, with special attention to the friction that existed on Arch Linux:

- desktop runtime moved to `apps/desktop`
- firmware consolidated in `firmware/arduino/ioruba-controller`
- shared domain logic ported to `packages/shared`
- Linux audio backend rewritten in Rust using `pactl`
- serial communication moved to the Tauri serial plugin
- JSON persistence replaces split YAML + UI-state storage
- old Haskell/runtime and repo-surface tooling archived under `legacy/`

[Releases](https://github.com/bernardopg/ioruba/releases) | [Funding](FUNDING.md) | [Quick Start](QUICKSTART.md) | [Testing](TESTING.md)

## Repository Layout

- `apps/desktop`: Tauri 2 desktop app, React UI, Zustand store, Recharts telemetry
- `apps/desktop/src-tauri`: Rust commands for persistence and Linux audio control
- `packages/shared`: serial protocol, runtime math, defaults, and migration-safe models
- `firmware/arduino/ioruba-controller`: Arduino firmware for Nano-compatible boards
- `docs/migration`: migration plan, GitHub plan, and logic audit
- `legacy/haskell-runtime`: archived Haskell runtime, configs, release scripts, and GTK/TUI experiments
- `legacy/github-automation`: archived Pages and Release Please automation from the pre-Tauri repo surface
- `legacy/arduino-audio-controller`: archived Python/GTK prototype kept for parity reference

## What Works In The New Stack

- pipe-separated serial packets such as `512|768|1023`
- legacy packet compatibility for `P1:512`
- noise reduction and first-packet behavior ported from Haskell logic
- master, application, source, and sink targets handled by the Rust backend on Linux
- demo mode with synthetic telemetry
- JSON profile persistence in the app config directory
- GitHub Actions for Linux CI, firmware compile, and cross-platform Tauri releases

## Local Development

Install dependencies and run checks:

```bash
npm install
npm run verify
```

Run the desktop app in development:

```bash
npm run desktop:dev
cd apps/desktop && npm run tauri dev
```

Compile firmware:

```bash
arduino-cli compile --fqbn arduino:avr:nano firmware/arduino/ioruba-controller
```

## Migration Coverage

The audit of Python/Haskell coverage is tracked here:

- [docs/migration/complete-plan.md](docs/migration/complete-plan.md)
- [docs/migration/github-plan.md](docs/migration/github-plan.md)
- [docs/migration/logic-audit.md](docs/migration/logic-audit.md)

## Legacy Reference

The old implementations are kept only as archive material:

- Haskell runtime and packaging: `legacy/haskell-runtime`
- Python/GTK prototype: `legacy/arduino-audio-controller`
- Pages and Release Please tooling: `legacy/github-automation`

## License

MIT
