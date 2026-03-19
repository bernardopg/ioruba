# Testing Guide for Ioruba

## Core validation loop

For a clean local validation pass, run:

```bash
npm run shared:typecheck
npm run desktop:typecheck
npm run shared:test
npm run desktop:test
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
npm run desktop:build
npm run firmware:compile
```

## Serial protocol validation

### Test with the real Nano

1. Flash [firmware/arduino/ioruba-controller/ioruba-controller.ino](firmware/arduino/ioruba-controller/ioruba-controller.ino)
2. Confirm the board appears as `/dev/ttyUSB0` or `/dev/ttyACM0`
3. Start the desktop app and connect through the preferred port selector

Expected packet format:

```text
512|768|1023
```

The migrated runtime also accepts the legacy format:

```text
P1:512
P2:768
P3:1023
```

## Desktop runtime validation

Run the app:

```bash
cd apps/desktop
npm run tauri dev
```

What to verify:

- the app loads the persisted JSON profile
- it auto-detects serial ports
- demo mode generates live telemetry without touching audio
- real packets update the chart and knob cards
- Linux audio targets resolve without crashing
- changing the active profile JSON is persisted across restarts

## Rust backend checks

Before blaming the UI, check the host audio stack:

```bash
pactl info
pactl list short sink-inputs
pactl list short sinks
pactl list short sources
```

Interpretation:

- `pactl info` must succeed
- `pactl list short sink-inputs` must show live app streams if app-target control is expected
- default sink and source must exist if `master` or `default_microphone` are mapped

## Firmware validation

Compile the firmware:

```bash
arduino-cli compile --fqbn arduino:avr:nano firmware/arduino/ioruba-controller
```

Upload to a classic Nano clone:

```bash
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:nano:cpu=atmega328old firmware/arduino/ioruba-controller
```

## Troubleshooting

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
- inspect Arduino IDE Serial Monitor first

### No app volume changes

- make sure the target application is actively playing audio
- confirm the application names inside the profile JSON
- check `pactl list short sink-inputs`

## Recommended release gate

Before cutting a public release, verify:

1. `npm run verify` passes
2. `npm run firmware:compile` passes
3. the desktop app works with a real Nano
4. the Linux audio backend applies `master`, `application`, and `source` targets
5. the GitHub Actions matrix succeeds on Linux, Windows, and macOS
