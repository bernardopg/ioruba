# Quick Start

This is the fastest path from a fresh clone to a working Ioruba session on the **active Linux stack**.

> **Heads up**
> Real system-audio control currently depends on the Linux `pactl` backend. On macOS and Windows, the desktop shell is still useful for UI review and demo mode, but audio control is not implemented yet.

## 1. What you need

### Software

- Node.js `22` recommended (same major version used in CI)
- `npm`
- Rust stable + Cargo
- `arduino-cli`
- `pactl` available on `PATH`

### Hardware

- `Arduino Nano ATmega328P`
- `3x 10k` linear potentiometers
- USB data cable
- jumper wires and a breadboard or enclosure

Quick version check:

```bash
node --version
npm --version
rustc --version
cargo --version
arduino-cli version
pactl info
```

## 2. Install repository dependencies

```bash
npm install
```

## 3. Prepare Linux serial permissions

Depending on the distro, add your user to `dialout` or `uucp`:

```bash
sudo usermod -a -G dialout $USER
sudo usermod -a -G uucp $USER
```

Log out and back in after changing group membership.

## 4. Wire and flash the controller

If you still need to assemble the hardware, start with:

- [docs/guides/hardware-setup.md](docs/guides/hardware-setup.md)
- [NANO_SETUP.md](NANO_SETUP.md)

Detect the board:

```bash
arduino-cli board list
```

Compile the current firmware:

```bash
arduino-cli compile --fqbn arduino:avr:nano firmware/arduino/ioruba-controller
```

Upload for a standard Nano:

```bash
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:nano firmware/arduino/ioruba-controller
```

Upload for common Nano clones with the old bootloader:

```bash
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:nano:cpu=atmega328old firmware/arduino/ioruba-controller
```

## 5. Validate the repository

Run the main automated checks before launching the desktop shell:

```bash
npm run verify
```

If you only want to make sure the firmware still compiles from the root workspace:

```bash
npm run firmware:compile
```

## 6. Launch the desktop app

Frontend only:

```bash
npm run desktop:dev
```

Full Tauri desktop shell:

```bash
npm run desktop:watch
```

Use the Tauri shell for real serial sessions, persistence, and backend validation.

## 7. Confirm everything is working

When the app opens, this is the expected flow:

- the app discovers serial ports or respects your preferred port
- the status card moves through connection states instead of staying idle forever
- the runtime receives a firmware handshake before or alongside knob frames
- the `Watch` tab shows frames such as `512|768|1023`
- the telemetry chart reacts when you turn the knobs
- the active profile is stored as JSON and survives restarts
- `Atualizar áudio` refreshes the Linux audio inventory
- turning the knobs updates targets such as master volume, apps, or microphone input

Default profile mapping:

| Knob | Default target                        |
| ---- | ------------------------------------- |
| 1    | Default output / master volume        |
| 2    | `Spotify`, `Google Chrome`, `Firefox` |
| 3    | `default_microphone`                  |

## 8. Know where the app stores data

The desktop app persists two important files:

- `ioruba-state.json` — active profile and runtime state
- `ioruba-watch.log` — structured watch events, automatically trimmed to about `1 MiB`

Locations:

- Linux: `~/.config/io.ioruba.desktop/`
- macOS: `~/Library/Application Support/io.ioruba.desktop/`
- Windows: `%APPDATA%\\io.ioruba.desktop\\`

## 9. Build the desktop app locally

For a local Tauri build without final installers:

```bash
npm run desktop:tauri:build
```

If you change the source app icon in [apps/desktop/src-tauri/icons/app-icon.svg](apps/desktop/src-tauri/icons/app-icon.svg), regenerate every derived asset first:

```bash
npm run desktop:icons
```

## 10. Quick troubleshooting

### Tauri fails to compile on Linux

Install the WebKit/GTK development packages required by Tauri:

```bash
sudo pacman -S --needed webkit2gtk-4.1 gtk3 librsvg
```

### The app opens but no packets arrive

- confirm the board is flashing the current sketch
- confirm the board answers with `HELLO board=...; fw=...; protocol=...; knobs=...`
- confirm the board is sending `512|768|1023`
- confirm `9600` baud
- check the knob wiring on `A0`, `A1`, and `A2`
- verify the selected serial port in the app
- retry with the old-bootloader Nano profile if you use a clone

### Audio targets do not move

- confirm `pactl info` works
- make sure target applications are actively playing audio
- refresh the inventory from the desktop app
- inspect the JSON profile in the `Config` tab

### You are on macOS or Windows

That path is currently best treated as **UI/demo validation only**. The desktop shell may build and open, but the real audio backend is intentionally marked unsupported outside Linux.

## Next reads

- [README.md](README.md) for the repository overview
- [NANO_SETUP.md](NANO_SETUP.md) for firmware and serial details
- [docs/guides/profile-examples.md](docs/guides/profile-examples.md) for JSON profile samples
- [docs/debug/support.md](docs/debug/support.md) for troubleshooting playbooks
- [TESTING.md](TESTING.md) for the validation matrix
- [docs/migration/logic-audit.md](docs/migration/logic-audit.md) for migration parity coverage
