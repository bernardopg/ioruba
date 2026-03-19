# Hardware Setup Guide

This repository currently targets the `Arduino Nano + 3 potentiometers` build.

## Required Components

- 1x Arduino Nano ATmega328P
- 3x 10k linear potentiometers
- 1x USB cable for the Nano
- jumper wires
- breadboard or enclosure

## Wiring

### Potentiometer 1

- left pin -> `GND`
- middle pin -> `A0`
- right pin -> `5V`

### Potentiometer 2

- left pin -> `GND`
- middle pin -> `A1`
- right pin -> `5V`

### Potentiometer 3

- left pin -> `GND`
- middle pin -> `A2`
- right pin -> `5V`

## ASCII Diagram

```text
Arduino Nano
┌──────────────────────┐
│ A0 ───── knob 1      │
│ A1 ───── knob 2      │
│ A2 ───── knob 3      │
│ 5V ───── all right pins
│ GND ──── all left pins
│ USB ──── computer
└──────────────────────┘
```

## Firmware

Recommended sketch:

```bash
arduino-cli compile --fqbn arduino:avr:nano arduino/ioruba-nano-3knobs
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:nano arduino/ioruba-nano-3knobs
```

If a clone needs the old bootloader:

```bash
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:nano:cpu=atmega328old arduino/ioruba-nano-3knobs
```

## Expected Serial Output

```text
512|768|1023
```

The GTK desktop app also accepts the legacy `P1:512` format.

## Troubleshooting

### No serial output

- check the USB cable
- confirm `9600` baud
- confirm the sketch is flashed
- try the Arduino serial monitor first

### Upload fails

- try the old bootloader variant
- press reset before upload
- check whether another app is holding `/dev/ttyUSB0`

### Permission denied

```bash
sudo usermod -a -G dialout $USER
sudo usermod -a -G uucp $USER
```

Then log out and back in.

## Next Steps

Once hardware is working:

1. Run `stack exec test-serial /dev/ttyUSB0`
2. Install the GTK desktop app with `legacy/arduino-audio-controller/install_local.sh`
3. Launch `audio-controller-gui`
