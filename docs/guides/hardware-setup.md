# Hardware Setup Guide

Use this guide when you want to assemble the **physical controller** for Ioruba.

## Build target

The active repository is designed around a practical `Arduino Nano + 3 potentiometers` build that feeds the Tauri desktop app.

## Bill of materials

- `1x Arduino Nano ATmega328P`
- `3x 10k` linear potentiometers
- `1x USB data cable`
- jumper wires
- breadboard, perfboard, or enclosure

## Wiring map

| Control | Left pin | Center pin | Right pin |
| --- | --- | --- | --- |
| Knob 1 | `GND` | `A0` | `5V` |
| Knob 2 | `GND` | `A1` | `5V` |
| Knob 3 | `GND` | `A2` | `5V` |

> If clockwise/counter-clockwise movement feels reversed, swap the two outer pins on that potentiometer.

## Quick ASCII layout

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

## Assembly checklist

- keep all three potentiometers on a shared `GND`
- keep all three potentiometers on a shared `5V`
- connect only the center pin of each knob to an analog input
- use a USB **data** cable, not a charge-only cable
- leave enough slack if you plan to mount everything in an enclosure

## What the firmware expects

The current firmware reads the three analog inputs and emits lines such as:

```text
512|768|1023
```

That maps directly to the active desktop runtime. The runtime also accepts the older legacy packet style, but the current build target is the full-frame format above.

## After the hardware is wired

Next steps:

1. flash the board using [NANO_SETUP.md](../../NANO_SETUP.md)
2. start the app with `npm run desktop:watch`
3. verify the `Watch` tab receives serial frames
4. on Linux, confirm the default targets react as expected

Default profile behavior:

- knob 1 controls `master`
- knob 2 targets applications like `Spotify`, `Google Chrome`, and `Firefox`
- knob 3 targets `default_microphone`

## Troubleshooting

### No serial output

- check the USB cable first
- confirm the firmware is flashed
- confirm `9600` baud
- try the Arduino serial monitor before blaming the desktop app

### Upload fails

- try the old bootloader Nano profile
- press `RESET` just before upload begins
- check whether another app is already holding `/dev/ttyUSB0`

### Permission denied on Linux

```bash
sudo usermod -a -G dialout $USER
sudo usermod -a -G uucp $USER
```

Log out and back in before testing again.

## Related guides

- [../../QUICKSTART.md](../../QUICKSTART.md)
- [../../NANO_SETUP.md](../../NANO_SETUP.md)
- [../../TESTING.md](../../TESTING.md)
