<div align="center">

<a href="https://github.com/bernardopg/ioruba/actions/workflows/release.yml">
  <img alt="Release workflow" src="https://github.com/bernardopg/ioruba/actions/workflows/release.yml/badge.svg" />
</a>
<a href="https://github.com/bernardopg/ioruba/actions/workflows/ci.yml">
  <img alt="CI workflow" src="https://github.com/bernardopg/ioruba/actions/workflows/ci.yml/badge.svg" />
</a>
<a href="package.json">
  <img alt="Version" src="https://img.shields.io/github/package-json/v/bernardopg/ioruba?filename=package.json&label=version" />
</a>
<a href="TODO.md">
  <img alt="Project status" src="https://img.shields.io/badge/status-active%20development-2ea043" />
</a>
<a href="https://github.com/bernardopg/ioruba/commits/main">
  <img alt="Last commit" src="https://img.shields.io/github/last-commit/bernardopg/ioruba?label=last%20commit" />
</a>
<a href="LICENSE">
  <img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-0A66C2" />
</a>

<br />

<a href="https://github.com/sponsors/bernardopg">
  <img alt="GitHub Sponsors" src="https://img.shields.io/badge/GitHub%20Sponsors-30363D?logo=GitHub-Sponsors&logoColor=EA4AAA" />
</a>
<a href="https://www.buymeacoffee.com/WctwoM9eMU">
  <img alt="Buy Me a Coffee" src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?logo=buy-me-a-coffee&logoColor=black" />
</a>

<br />

<a href="https://tauri.app/">
  <img alt="Tauri 2" src="https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=fff" />
</a>
<a href="https://www.rust-lang.org/">
  <img alt="Rust" src="https://img.shields.io/badge/Rust-%23000000.svg?logo=rust&logoColor=white" />
</a>
<a href="https://www.typescriptlang.org/">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff" />
</a>
<a href="https://isocpp.org/">
  <img alt="C++" src="https://img.shields.io/badge/C++-%2300599C.svg?logo=c%2B%2B&logoColor=white" />
</a>
<a href="https://www.arduino.cc/">
  <img alt="Arduino Nano" src="https://img.shields.io/badge/Arduino%20Nano-00979D?logo=arduino&logoColor=white" />
</a>
<a href="https://nodejs.org/en">
  <img alt="Node.js 22" src="https://img.shields.io/badge/Node.js-22-5FA04E?logo=node.js&logoColor=white" />
</a>

<br />

<a href="#platform-support">
  <img alt="Linux: Supported" src="https://img.shields.io/badge/Linux-supported-3FB950?logo=linux&logoColor=black" />
</a>
<a href="#platform-support">
  <img alt="macOS: Partial" src="https://img.shields.io/badge/macOS-partial-A0A0A0?logo=apple&logoColor=white" />
</a>
<a href="#platform-support">
  <img alt="Windows: Partial" src="https://img.shields.io/badge/Windows-partial-0078D6?logo=windows11&logoColor=white" />
</a>
<a href="#platform-support">
  <img alt="Arch Linux" src="https://img.shields.io/badge/Arch%20Linux-compatible-1793D1?logo=arch-linux&logoColor=fff" />
</a>

</div>

# Ioruba

Ioruba transforms an `Arduino Nano + 3 knobs` into a tactile desktop control deck. The active product path is a `Tauri 2 + React + TypeScript` app backed by Rust for system-audio operations and `Arduino C++` firmware for the physical controller.

> **Current platform status**
> Real audio control is implemented for **Linux** through `pactl`. macOS and Windows builds are still useful for UI review, packaging checks, and demo mode, but they do **not** provide a production-ready audio backend yet.

[Releases](https://github.com/bernardopg/ioruba/releases) · [Quick Start](QUICKSTART.md) · [Hardware Setup](docs/guides/hardware-setup.md) · [Nano Setup](NANO_SETUP.md) · [Profile Examples](docs/guides/profile-examples.md) · [Support](docs/debug/support.md) · [Testing](TESTING.md) · [Contributing](CONTRIBUTING.md) · [Funding](FUNDING.md) · [Roadmap](TODO.md)

<p align="center">
  <img src="apps/desktop/src-tauri/icons/icon.png" alt="Ioruba app icon" width="112" />
</p>

## ✨ Visual reference

![Ioruba visual reference](legacy/arduino-audio-controller/screenshots/knob-deck-pt-br.png)

> 📸 Until a fresh capture of the current Tauri app is published, the archived screen above remains a useful visual reference for the product's tactile dashboard direction.

## 🎛️ Why this repository exists

The project keeps the hardware feel of a small mixer while modernizing the software stack that drives it:

- the active desktop runtime lives in `apps/desktop`
- the firmware is consolidated in `firmware/arduino/ioruba-controller`
- shared protocol and runtime logic live in `packages/shared`
- the Linux audio backend was rewritten in Rust using `pactl`
- persistence moved from split YAML/UI state to a local JSON profile model
- migration history and parity notes now live in `docs/migration`
- one archived Python/GTK prototype is still kept under `legacy/`

## ✅ What you get today

- serial packets such as `512|768|1023`
- firmware handshake metadata with board name, firmware version, protocol version, and knob count
- compatibility with the legacy packet format `P1:512`
- live telemetry and a persistent watch log inside the desktop app
- editable JSON profiles stored in the app config directory
- demo mode for UI validation without touching system audio
- Linux audio target handling for `master`, `application`, `source`, and `sink`
- CI for desktop/shared validation plus firmware compilation
- tagged release workflows for desktop bundles and firmware artifacts

<a id="platform-support"></a>
## 🖥️ Platform support

| Platform | Status    | Notes                                                                                            |
| -------- | --------- | ------------------------------------------------------------------------------------------------ |
| Linux    | Supported | Main production path: serial workflow, `pactl` audio backend, demo mode, and hardware validation |
| macOS    | Partial   | Desktop shell and demo-mode validation are useful; real audio control is not implemented         |
| Windows  | Partial   | Desktop shell and demo-mode validation are useful; real audio control is not implemented         |

## 🎚️ Default profile at a glance

The shipped default profile is intentionally simple and can be edited from the app's JSON configuration panel:

| Knob | Default label   | Target                                    |
| ---- | --------------- | ----------------------------------------- |
| 1    | `Master Volume` | Default output volume                     |
| 2    | `Applications`  | `Spotify`, `Google Chrome`, and `Firefox` |
| 3    | `Microphone`    | `default_microphone`                      |

## 🚀 Quick start

Install dependencies and validate the active stack:

```bash
npm install
npm run verify
```

Compile the firmware for the current controller sketch:

```bash
npm run firmware:compile
```

Run the desktop app:

```bash
npm run desktop:dev
npm run desktop:watch
```

- `npm run desktop:dev` starts the frontend only
- `npm run desktop:watch` starts the full Tauri desktop shell

If you are setting up real hardware, follow these guides next:

- [QUICKSTART.md](QUICKSTART.md) for the end-to-end Linux workflow
- [NANO_SETUP.md](NANO_SETUP.md) for board flashing and serial checks
- [docs/guides/hardware-setup.md](docs/guides/hardware-setup.md) for wiring the physical controller
- [docs/guides/profile-examples.md](docs/guides/profile-examples.md) for ready-to-paste JSON profiles

## 🧰 Common commands

| Command                       | What it does                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- |
| `npm run verify`              | Runs shared + desktop typecheck, shared + desktop tests, Rust tests, and the desktop production build |
| `npm run desktop:dev`         | Starts the Vite frontend for UI work                                                                  |
| `npm run desktop:watch`       | Starts the full Tauri desktop app in development                                                      |
| `npm run desktop:icons`       | Regenerates every desktop icon asset from `apps/desktop/src-tauri/icons/app-icon.svg`                 |
| `npm run desktop:tauri:build` | Builds the Tauri desktop app locally without bundling installers                                      |
| `npm run firmware:compile`    | Compiles the Arduino Nano firmware                                                                    |
| `npm run rust:test`           | Runs Rust backend tests                                                                               |
| `npm run rust:audit`          | Audits the Rust lockfile while accounting for the local `glib` backport                               |

## 🗂️ Repository map

| Path                                 | Purpose                                                                |
| ------------------------------------ | ---------------------------------------------------------------------- |
| `apps/desktop`                       | Tauri 2 desktop app, React UI, Zustand state, and telemetry dashboards |
| `apps/desktop/src-tauri`             | Rust commands for persistence, watch logging, and Linux audio control  |
| `packages/shared`                    | Shared domain types, defaults, runtime math, and protocol parsing      |
| `firmware/arduino/ioruba-controller` | Arduino firmware for Nano-compatible boards                            |
| `docs/guides`                        | Practical setup guides                                                 |
| `docs/migration`                     | Migration planning and parity audit material                           |
| `legacy`                             | Archived Python/GTK prototype and small historical leftovers           |

## 🧪 Persistence and diagnostics

The app stores its runtime files in the platform config directory:

- watch log: `ioruba-watch.log`
- active profile state: `ioruba-state.json`

Typical locations:

- Linux: `~/.config/io.ioruba.desktop/`
- macOS: `~/Library/Application Support/io.ioruba.desktop/`
- Windows: `%APPDATA%\\io.ioruba.desktop\\`

The watch log is trimmed automatically to roughly `1 MiB`, so it stays useful for diagnostics without growing forever.

## 🖼️ Desktop icons

When you edit [apps/desktop/src-tauri/icons/app-icon.svg](apps/desktop/src-tauri/icons/app-icon.svg), regenerate the desktop, Android, iOS, `icns`, and `ico` assets with:

```bash
npm run desktop:icons
```

That command rewrites the generated files under [apps/desktop/src-tauri/icons](apps/desktop/src-tauri/icons).

## 🛡️ Security note for Linux builds

The current Linux Tauri stack still resolves through GTK3 `glib 0.18.x`, so the repository carries a local backport of `GHSA-wrw7-89jp-8q8g` under `apps/desktop/src-tauri/vendor/glib-0.18.5` until upstream moves. Use the following command to audit the current lockfile with that backport in mind:

```bash
npm run rust:audit
```

## 📚 Documentation map

| Document                                                           | Use it when you need...                                        |
| ------------------------------------------------------------------ | -------------------------------------------------------------- |
| [docs/guides/profile-examples.md](docs/guides/profile-examples.md) | Real JSON profile samples and Linux target matching rules      |
| [QUICKSTART.md](QUICKSTART.md)                                     | The fastest path from zero to a running app                    |
| [NANO_SETUP.md](NANO_SETUP.md)                                     | Flashing and validating the Arduino Nano                       |
| [docs/guides/hardware-setup.md](docs/guides/hardware-setup.md)     | Physical wiring and assembly                                   |
| [docs/debug/support.md](docs/debug/support.md)                     | A support playbook for serial, audio, and profile-debug issues |
| [TESTING.md](TESTING.md)                                           | Automated checks, smoke tests, and release validation          |
| [docs/migration/logic-audit.md](docs/migration/logic-audit.md)     | Parity coverage with archived implementations                  |

## 🗃️ Legacy archive

The repository still keeps one archived implementation for historical reference:

- `legacy/arduino-audio-controller`

Deeper migration context lives in `docs/migration`. The active product surface lives in `apps/desktop`, `packages/shared`, and `firmware/arduino/ioruba-controller`.

## License

MIT
