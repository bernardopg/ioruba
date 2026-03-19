# Hardware Setup Guide

This repository targets a practical `Arduino Nano + 3 potentiometers` build that feeds the Haskell runtime.

## Required parts

- `1x Arduino Nano ATmega328P`
- `3x 10k linear potentiometers`
- `1x USB cable`
- jumper wires
- breadboard or enclosure

## Wiring

### Knob 1

- left pin -> `GND`
- center pin -> `A0`
- right pin -> `5V`

### Knob 2

- left pin -> `GND`
- center pin -> `A1`
- right pin -> `5V`

### Knob 3

- left pin -> `GND`
- center pin -> `A2`
- right pin -> `5V`

## ASCII diagram

```text
Arduino Nano
┌──────────────────────┐
│ A0 ───── knob 1      │
│ A1 ───── knob 2      │
│ A2 ───── knob 3      │
│ 5V ───── outer pins  │
│ GND ──── outer pins  │
│ USB ──── computer    │
└──────────────────────┘
```

## Firmware

Compile:

```bash
arduino-cli compile --fqbn arduino:avr:nano arduino/ioruba-nano-3knobs
```

Upload for standard Nano boards:

```bash
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:nano arduino/ioruba-nano-3knobs
```

Upload for common clones with the old bootloader:

```bash
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:nano:cpu=atmega328old arduino/ioruba-nano-3knobs
```

## Expected serial output

```text
512|768|1023
```

The runtime also accepts the legacy `P1:512` style protocol.

## Validate the host runtime

Once the hardware is wired and flashed:

```bash
stack exec test-serial /dev/ttyUSB0
stack exec ioruba
```

Expected runtime behavior:

- the Nano is auto-detected
- packets are shown in the dashboard
- knob 1 moves `master`
- knob 2 can target apps
- knob 3 can target `default_microphone`

## Troubleshooting

### No serial output

- check the USB cable
- confirm `9600` baud
- confirm the sketch is flashed
- try the Arduino serial monitor first

### Upload fails

- try the old bootloader variant
- press `RESET` before upload
- check whether another app is holding `/dev/ttyUSB0`

### Permission denied

```bash
sudo usermod -a -G dialout $USER
sudo usermod -a -G uucp $USER
```

Then log out and back in.
