# Quick Start Guide

This guide follows the migrated stack:

- `Arduino Nano ATmega328P`
- `3x B10K` potentiometers on `A0`, `A1`, and `A2`
- `apps/desktop` for the Tauri desktop app
- `firmware/arduino/ioruba-controller` for the firmware
- Linux with `pactl` available for real audio control

## 1. Check prerequisites

```bash
node --version
npm --version
rustc --version
cargo --version
pactl info
arduino-cli version
```

## 2. Confirm serial access

Depending on the distro, add your user to `dialout` or `uucp`:

```bash
sudo usermod -a -G dialout $USER
sudo usermod -a -G uucp $USER
```

Then log out and back in.

## 3. Flash the Nano

Compile:

```bash
arduino-cli compile --fqbn arduino:avr:nano firmware/arduino/ioruba-controller
```

Upload for standard Nano boards:

```bash
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:nano firmware/arduino/ioruba-controller
```

Upload for classic Nano clones with the old bootloader:

```bash
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:nano:cpu=atmega328old firmware/arduino/ioruba-controller
```

## 4. Install dependencies

```bash
npm install
```

## 5. Run verification

```bash
npm run verify
```

## 6. Launch the desktop app

Frontend only:

```bash
npm run desktop:dev
```

Full Tauri desktop shell:

```bash
cd apps/desktop
npm run tauri dev
```

Expected behavior:

- auto-detects `/dev/ttyUSB*` or `/dev/ttyACM*`
- accepts `512|768|1023` frames and legacy `P1:512`
- persists the active profile as JSON
- exposes a demo mode without touching system audio
- applies real Linux audio updates through Rust + `pactl`

## 7. Build installers locally

```bash
cd apps/desktop
npm run tauri build -- --no-bundle
```

## Troubleshooting

If Tauri fails to compile on Linux, install the WebKit/GTK development packages:

```bash
sudo pacman -S --needed webkit2gtk-4.1 gtk3 librsvg
```

If the app starts but shows no packets:

- confirm the board is sending `512|768|1023`
- confirm `9600` baud
- check the knob wiring on `A0`, `A1`, and `A2`
- verify the selected serial port inside the desktop app

If audio targets do not move:

- confirm `pactl info` works
- make sure target applications have active audio streams
- inspect the profile JSON in the Config tab

## Next Steps

- Read [README.md](README.md) for the new repository layout
- Read [NANO_SETUP.md](NANO_SETUP.md) for firmware details
- Read [TESTING.md](TESTING.md) for the validation matrix
- Read [docs/migration/logic-audit.md](docs/migration/logic-audit.md) for parity coverage
