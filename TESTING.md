# Testing Guide

This document is the practical validation matrix for the **active** Ioruba stack.

> **Important**
> Real audio control is currently implemented on **Linux** only. On macOS and Windows, focus testing on UI behavior, packaging, and demo mode rather than audio-backend parity.

## 1. Fast validation path

If you want the main local release gate from the root workspace, run:

```bash
npm run verify
npm run firmware:compile
```

That covers:

- shared typecheck
- desktop typecheck
- shared tests
- desktop tests
- Rust tests
- desktop production build
- firmware compilation

## 2. Full validation loop

Use this when you want each step explicitly:

```bash
npm run shared:typecheck
npm run desktop:typecheck
npm run shared:test
npm run desktop:test
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
npm run desktop:build
npm run firmware:compile
```

## 3. Desktop runtime validation

Launch the full desktop shell from the repository root:

```bash
npm run desktop:watch
```

What to verify:

- the app loads the persisted JSON profile
- it auto-detects serial ports or respects the preferred port
- the status area moves through realistic connection states
- demo mode generates telemetry without touching system audio
- the `Watch` tab records meaningful structured events
- real packets update the chart and knob cards
- changing the JSON profile persists across restarts

## 4. Serial protocol validation

### Test with a real Nano

1. Flash [firmware/arduino/ioruba-controller/ioruba-controller.ino](firmware/arduino/ioruba-controller/ioruba-controller.ino)
2. Confirm the board appears as `/dev/ttyUSB0`, `/dev/ttyUSB1`, or `/dev/ttyACM0`
3. Start the desktop app with `npm run desktop:watch`
4. Connect through the preferred port selector if auto-detection does not pick the right port

Current expected packet format:

```text
512|768|1023
```

The runtime also accepts the legacy format:

```text
P1:512
P2:768
P3:1023
```

What to confirm:

- knob movement appears in the telemetry chart
- last serial line updates in diagnostics
- no repeated disconnect loop happens while the controller is idle

## 5. Linux audio backend checks

Before blaming the UI, inspect the host audio stack:

```bash
pactl info
pactl list short sink-inputs
pactl list short sinks
pactl list short sources
```

Interpretation:

- `pactl info` must succeed
- `pactl list short sink-inputs` must show live app streams if app-target control is expected
- the default sink and source should exist if `master` or `default_microphone` are mapped
- `Atualizar áudio` in the desktop app should reflect the current inventory without crashing

## 6. Firmware validation

Compile the firmware:

```bash
arduino-cli compile --fqbn arduino:avr:nano firmware/arduino/ioruba-controller
```

Upload to a classic Nano clone if needed:

```bash
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:nano:cpu=atmega328old firmware/arduino/ioruba-controller
```

## 7. Persistence validation

During a manual smoke test, also verify:

- `ioruba-state.json` is written in the app config directory
- `ioruba-watch.log` is written in the same directory
- the watch log remains capped instead of growing forever

Typical config directories:

- Linux: `~/.config/io.ioruba.desktop/`
- macOS: `~/Library/Application Support/io.ioruba.desktop/`
- Windows: `%APPDATA%\\io.ioruba.desktop\\`

## 8. Troubleshooting

### Permission denied on `/dev/ttyUSB0`

```bash
sudo usermod -a -G dialout $USER
sudo usermod -a -G uucp $USER
```

Then log out and back in.

### Tauri build fails on Linux

Install the WebKit/GTK development packages:

```bash
sudo pacman -S --needed webkit2gtk-4.1 gtk3 librsvg
```

### No data from the board

- confirm `9600` baud
- verify the firmware is flashed
- check the knob wiring on `A0`, `A1`, and `A2`
- inspect the Arduino Serial Monitor first
- confirm no other process is holding the device file

### No app volume changes on Linux

- make sure the target application is actively playing audio
- confirm the application names inside the profile JSON
- check `pactl list short sink-inputs`
- refresh the inventory from the desktop app before retesting

### Running on macOS or Windows

Treat that test pass as partial by design:

- desktop launch and layout should work
- demo mode should work
- persistence should work
- audio inventory should report an unsupported backend instead of pretending to work

## 9. Recommended release gate

Before cutting a public release, verify:

1. `npm run verify` passes
2. `npm run firmware:compile` passes
3. the desktop app works with a real Nano on Linux
4. the Linux audio backend applies `master`, `application`, `source`, and `sink` targets as expected
5. GitHub Actions CI succeeds
6. tagged release workflows still produce desktop bundles and firmware artifacts

If you need a support checklist for manual triage, read [docs/debug/support.md](docs/debug/support.md).
