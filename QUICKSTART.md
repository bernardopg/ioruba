# Quick Start Guide

The main path in this repository is now the Haskell runtime in `app/` and `src/`.

This guide assumes:

- `Arduino Nano ATmega328P`
- `3x B10K` potentiometers on `A0`, `A1`, and `A2`
- Linux with PipeWire or PulseAudio available through `pactl`

## 1. Check prerequisites

```bash
stack --version
pactl info
arduino-cli version
```

If `stack` is missing:

```bash
curl -sSL https://get.haskellstack.org/ | sh
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
arduino-cli compile --fqbn arduino:avr:nano arduino/ioruba-nano-3knobs
```

Upload for standard Nano boards:

```bash
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:nano arduino/ioruba-nano-3knobs
```

Upload for classic Nano clones with the old bootloader:

```bash
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:nano:cpu=atmega328old arduino/ioruba-nano-3knobs
```

## 4. Build the runtime

```bash
stack build
stack test
```

## 5. Pick a config

The runtime will prefer `config/nano-3knobs.yaml` when it exists.

Useful config files:

- `config/nano-3knobs.yaml`: practical default for the 3-knob Nano setup
- `config/ioruba.yaml`: alternate root config for local remapping
- `config/example.yaml`: example schema variant for editing from scratch

To use a custom file explicitly:

```bash
stack exec ioruba -- --config config/ioruba.yaml
```

## 6. Run the runtime

```bash
stack exec ioruba
```

Expected behavior:

- auto-detects `/dev/ttyUSB0` or `/dev/ttyACM0`
- reconnects automatically if the board disappears
- renders a live terminal dashboard
- maps knob 1 to `master`
- maps knob 2 to configured applications
- maps knob 3 to `default_microphone`

## 7. Smoke-test the serial path

```bash
stack exec test-serial /dev/ttyUSB0
```

If you want to test without hardware:

```bash
python3 scripts/arduino-simulator.py --mode static | stack exec test-serial /dev/stdin
```

## Troubleshooting

If upload fails:

- use `arduino:avr:nano:cpu=atmega328old`
- press `RESET` right before upload starts
- make sure no other app is holding `/dev/ttyUSB0`

If the runtime starts but shows no packets:

- verify the board is sending `512|768|1023`
- confirm `9600` baud
- run `stack exec test-serial /dev/ttyUSB0` first
- check the knob wiring on `A0`, `A1`, and `A2`

If audio targets do not move:

- confirm `pactl info` works
- make sure the target apps actually have active audio streams
- check the names configured in `config/*.yaml`

## Next Steps

- Read [README.md](README.md) for the product-level overview
- Read [NANO_SETUP.md](NANO_SETUP.md) for firmware and wiring details
- Read [TESTING.md](TESTING.md) for simulator and end-to-end checks
- Read [TODO.md](TODO.md) for the remaining backlog
