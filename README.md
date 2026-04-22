<div align="center">

[![Release workflow](https://github.com/bernardopg/ioruba/actions/workflows/release.yml/badge.svg)](https://github.com/bernardopg/ioruba/actions/workflows/release.yml)
[![CI workflow](https://github.com/bernardopg/ioruba/actions/workflows/ci.yml/badge.svg)](https://github.com/bernardopg/ioruba/actions/workflows/ci.yml)
[![Version](https://img.shields.io/github/package-json/v/bernardopg/ioruba?filename=package.json&label=version)](package.json)
[![Project status](https://img.shields.io/badge/status-active%20development-2ea043)](TODO.md)
[![Last commit](https://img.shields.io/github/last-commit/bernardopg/ioruba?label=last%20commit)](https://github.com/bernardopg/ioruba/commits/main)
[![License: MIT](https://img.shields.io/badge/license-MIT-0A66C2)](LICENSE)

<br />

[![GitHub Sponsors](https://img.shields.io/badge/GitHub%20Sponsors-30363D?logo=GitHub-Sponsors&logoColor=EA4AAA)](https://github.com/sponsors/bernardopg)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/WctwoM9eMU)

<br />

[![Tauri 2](https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=fff)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-%23000000.svg?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![C++](https://img.shields.io/badge/C++-%2300599C.svg?logo=c%2B%2B&logoColor=white)](https://isocpp.org/)
[![Arduino Nano](https://img.shields.io/badge/Arduino%20Nano-00979D?logo=arduino&logoColor=white)](https://www.arduino.cc/)
[![Node.js 22](https://img.shields.io/badge/Node.js-22-5FA04E?logo=node.js&logoColor=white)](https://nodejs.org/en)
[![PT-BR Docs](https://img.shields.io/badge/docs-PT--BR-0A66C2?logo=readthedocs&logoColor=white)](docs/translations/pt-br/README.md)

<br />

[![Linux: Supported](https://img.shields.io/badge/Linux-supported-3FB950?logo=linux&logoColor=black)](#platform-support)
[![macOS: Partial](https://img.shields.io/badge/macOS-partial-A0A0A0?logo=apple&logoColor=white)](#platform-support)
[![Windows: Partial](https://img.shields.io/badge/Windows-partial-0078D6?logo=windows11&logoColor=white)](#platform-support)
[![Arch Linux](https://img.shields.io/badge/Arch%20Linux-compatible-1793D1?logo=arch-linux&logoColor=fff)](#platform-support)

</div>

# Ioruba

Ioruba transforms an **Arduino Nano + 3 knobs** into a tactile desktop control deck.
The active stack is a **Tauri 2 + React + TypeScript** desktop app backed by a **Rust** audio layer (using `pactl` on Linux) and **Arduino C++** firmware for the physical controller.

> **Current platform status**
> Real audio control is production‑ready on **Linux** via `pactl`.
> macOS and Windows builds are useful for UI review, packaging checks, and demo mode, but they do **not** yet provide a functional audio backend.

## 📚 Quick links

- [Releases](https://github.com/bernardopg/ioruba/releases)
- [Quick Start](QUICKSTART.md)
- [Hardware Setup](docs/guides/hardware-setup.md)
- [Nano Setup](NANO_SETUP.md)
- [Profile Examples](docs/guides/profile-examples.md)
- [Translation Guide](docs/guides/translation-guide.md)
- [PT‑BR Docs](docs/translations/pt-br/README.md)
- [Support & Debugging](docs/debug/support.md)
- [Testing](TESTING.md)
- [Contributing](CONTRIBUTING.md)
- [Funding](FUNDING.md)
- [Roadmap](TODO.md)

![Ioruba visual reference](/docs/assets/screenshot.png)
_Archived screenshot – provides a visual reference for the tactile dashboard direction._

---

## 🎛️ Why this repository exists

The project preserves the hands‑on feel of a small mixer while modernising the software stack:

- **Desktop runtime** – `apps/desktop` (Tauri 2, React, TypeScript, Zustand)
- **Firmware** – `firmware/arduino/ioruba-controller` (Arduino Nano C++)
- **Shared logic** – `packages/shared` (TypeScript domain types, protocol parsing, runtime math)
- **Linux audio backend** – Rust implementation using `pactl` (master, application, source, sink targets)
- **Persistence** – JSON profiles stored in the app’s config directory
- **CI** – validates TypeScript, Rust, and firmware compilation
- **Legacy** – an archived Python/GTK prototype remains under `legacy/` for historical reference

## ✅ What you get today

- Serial packets like `512|768|1023` (three 10‑bit values)
- Firmware handshake: `HELLO board=...; fw=...; protocol=...; knobs=...`
- Backward compatibility with legacy packet format `P1:512`
- Live telemetry and a persistent watch log inside the desktop app
- Editable JSON profiles (stored per‑platform config directory)
- Demo mode for UI validation without touching system audio
- Linux audio target handling for **master**, **application**, **source**, and **sink**
- CI for desktop/shared validation plus firmware compilation
- Tagged release workflows producing desktop bundles (`deb`, `rpm`, `AppImage`), firmware artifacts, and Arch packaging metadata (`PKGBUILD` + `.SRCINFO`)

## 🖥️ Platform support

| Platform | Status    | Notes                                                                                             |
|----------|-----------|---------------------------------------------------------------------------------------------------|
| Linux    | ✅ Supported | Main production path: serial workflow, `pactl` audio backend, demo mode, hardware validation.    |
| macOS    | ⚠️ Partial  | Desktop shell and demo‑mode validation work; real audio control not yet implemented.             |
| Windows  | ⚠️ Partial  | Desktop shell and demo‑mode validation work; real audio control not yet implemented.             |

> **Note:** Linux is the only platform with a production‑ready audio backend (`pactl`) at this time.

## ⚡ Fast installation

Pre‑built installers are published under the latest release:
[https://github.com/bernardopg/ioruba/releases/latest](https://github.com/bernardopg/ioruba/releases/latest)

### Arch Linux (AUR)

```bash
# Source build
yay -S ioruba-desktop

# Prebuilt AppImage
yay -S ioruba-desktop-bin
```

### Debian / Ubuntu / Linux Mint / Pop!_OS

```bash
curl -s https://api.github.com/repos/bernardopg/ioruba/releases/latest \
  | jq -r '.assets[] | select(.name | test("\\.deb$")) | .browser_download_url' \
  | xargs -n1 curl -LO

sudo apt install ./Ioruba_*_amd64.deb
```

### Fedora / RHEL / CentOS Stream / openSUSE (RPM)

```bash
curl -s https://api.github.com/repos/bernardopg/ioruba/releases/latest \
  | jq -r '.assets[] | select(.name | test("\\.rpm$")) | .browser_download_url' \
  | xargs -n1 curl -LO

# If you use dnf (Fedora/RHEL):
sudo dnf install ./Ioruba-*.x86_64.rpm
# For zypper (openSUSE) or yum (older CentOS), substitute accordingly.
```

### Any Linux distro (AppImage)

```bash
curl -s https://api.github.com/repos/bernardopg/ioruba/releases/latest \
  | jq -r '.assets[] | select(.name | test("\\.AppImage$")) | .browser_download_url' \
  | xargs -n1 curl -LO

chmod +x Ioruba_*.AppImage
./Ioruba_*.AppImage
```

### Windows

Download from the latest release:
- `Ioruba_..._x64-setup.exe`
- `Ioruba_..._x64_en-US.msi`

### macOS (Apple Silicon)

Download from the latest release:
- `Ioruba_..._aarch64.dmg`
- `Ioruba_aarch64.app.tar.gz`

> **Reminder:** On macOS and Windows the app runs in UI/demo mode only; audio control requires Linux.

## 🧰 Prerequisites (for source builds)

- **Node.js** `22` (same major used in CI) + `npm`
- **Rust** stable + `cargo`
- `arduino-cli`
- `pactl` (Linux only, for audio backend)
- Git

## 🚀 Quick start (source)

```bash
# 1️⃣ Clone & install
git clone https://github.com/bernardopg/ioruba.git
cd ioruba
npm install

# 2️⃣ Verify the stack
npm run verify   # runs typecheck, tests, Rust checks, and desktop build

# 3️⃣ Compile firmware (optional if you already have a flashed board)
npm run firmware:compile

# 4️⃣ Launch the desktop app
npm run desktop:dev   # Vite frontend only (fast iteration)
npm run desktop:watch # Full Tauri desktop shell (serial, persistence, backend)

# 5️⃣ Hardware setup
#   - Wire the controller → see docs/guides/hardware-setup.md
#   - Flash the Nano   → see NANO_SETUP.md
#   - Example profiles → docs/guides/profile-examples.md
```

### What to confirm when the app opens

1. The app detects serial ports (or uses your preferred port).
2. The status card progresses through connection states (not stuck on “idle”).
3. The runtime receives the firmware handshake (`HELLO …`) alongside knob frames.
4. The **Watch** tab shows frames like `512|768|1023`.
5. Turning knobs moves the telemetry chart.
6. The active profile is saved as JSON and survives restarts.
7. Clicking **Atualizar áudio** refreshes the Linux audio inventory.
8. Knobs control the configured targets (master volume, apps, microphone, etc.).

Default profile mapping:

| Knob | Default label      | Target                                         |
|------|--------------------|------------------------------------------------|
| 1    | Master Volume      | Default output / master volume                 |
| 2    | Applications       | Spotify, Google Chrome, Firefox                |
| 3    | Microphone         | Default microphone input                       |

## 📂 Where the app stores data

The desktop app persists two files in the platform‑specific config directory:

- `ioruba-state.json` – active profile and runtime state
- `ioruba-watch.log` – structured watch events (auto‑trimmed to ~1 MiB)

| OS      | Path                                                     |
|---------|----------------------------------------------------------|
| Linux   | `~/.config/io.ioruba.desktop/`                           |
| macOS   | `~/Library/Application Support/io.ioruba.desktop/`       |
| Windows | `%APPDATA%\\io.ioruba.desktop\\`                         |

## 🧰 Common npm scripts

| Script                         | Description                                                            |
|--------------------------------|------------------------------------------------------------------------|
| `npm run verify`               | Full validation: typecheck, tests, Rust, desktop build.               |
| `npm run desktop:dev`          | Starts the Vite frontend (UI work).                                    |
| `npm run desktop:watch`        | Starts the full Tauri desktop shell (development).                    |
| `npm run desktop:icons`        | Regenerates desktop/icon assets from `app-icon.svg`.                  |
| `npm run desktop:tauri:build`  | Builds the Tauri app locally (no installers).                         |
| `npm run firmware:compile`     | Compiles the Arduino Nano firmware.                                   |
| `npm run rust:test`            | Runs the Rust backend tests.                                          |
| `npm run rust:audit`           | Audits the Rust lockfile (includes local glib backport).              |

## 🗂️ Repository map

| Path                                 | Purpose                                                                    |
|--------------------------------------|----------------------------------------------------------------------------|
| `apps/desktop`                       | Tauri 2 desktop app, React UI, Zustand state, telemetry dashboards.       |
| `apps/desktop/src-tauri`             | Rust commands (persistence, watch logging, Linux audio control).          |
| `packages/shared`                    | Shared domain types, defaults, runtime math, protocol parsing.            |
| `firmware/arduino/ioruba-controller` | Arduino firmware for Nano‑compatible boards.                               |
| `docs/guides`                        | Practical setup guides (hardware, Nano, profiles, translations).          |
| `docs/migration`                     | Migration planning and parity audit material.                              |
| `legacy`                             | Archived Python/GTK prototype and historical leftovers.                   |
| `docs/debug/support.md`              | Support playbook for serial, audio, and profile‑debug issues.             |
| `TESTING.md`                         | Automated checks, smoke tests, release validation matrix.                 |

## 📚 Documentation map

| Document                                                          | When you need…                                                            |
|-------------------------------------------------------------------|---------------------------------------------------------------------------|
| [QUICKSTART.md](QUICKSTART.md)                                    | Fastest path from zero to a running app (Linux).                         |
| [NANO_SETUP.md](NANO_SETUP.md)                                    | Flashing and validating the Arduino Nano.                                |
| [docs/guides/hardware-setup.md](docs/guides/hardware-setup.md)    | Wiring the physical controller (potentiometers, breadboard/enclosure).   |
| [docs/guides/profile-examples.md](docs/guides/profile-examples.md)| Ready‑to‑paste JSON profile samples and Linux target‑matching rules.     |
| [docs/guides/translation-guide.md](docs/guides/translation-guide.md)| How translations work in the desktop app and validation steps.          |
| [docs/translations/pt-br/README.md](docs/translations/pt-br/README.md)| Portuguese translation index for docs and root manuals.                  |
| [docs/debug/support.md](docs/debug/support.md)                    | Troubleshooting serial, audio, and profile‑related issues.               |
| [TESTING.md](TESTING.md)                                          | Automated checks, smoke tests, and release validation.                   |
| [docs/migration/logic-audit.md](docs/migration/logic-audit.md)    | Parity coverage with the archived Python/GTK implementation.             |
| [CONTRIBUTING.md](CONTRIBUTING.md)                                | Guidelines for contributing code, docs, translations, etc.               |
| [FUNDING.md](FUNDING.md)                                          | How to support the project (GitHub Sponsors, Buy Me a Coffee, etc.).     |
| [TODO.md](TODO.md)                                                | Roadmap and upcoming features.                                           |

## 🗃️ Legacy archive

The repository retains one archived implementation for historical reference:

- `legacy/arduino-audio-controller`

Deeper migration context lives in `docs/migration`. The **active** product surface resides in:
- `apps/desktop`
- `packages/shared`
- `firmware/arduino/ioruba-controller`

## 📜 License

MIT © Bernardo Gomes
