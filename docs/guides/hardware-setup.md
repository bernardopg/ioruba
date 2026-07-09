# Hardware Setup Guide

Use this guide when you want to assemble the **physical controller** for Ioruba.

## Build target

The active repository is designed around a practical `Arduino Nano + 3 potentiometers` build that feeds the Tauri desktop app.

## Bill of materials

- `1x Arduino Nano ATmega328P`
- `3x 10k` linear potentiometers
- optional: momentary push buttons or rotary encoders for `mute` / `next` / `prev`
- `1x USB data cable`
- jumper wires
- breadboard, perfboard, or enclosure

## Wiring map

| Control | Left pin | Center pin | Right pin |
| ------- | -------- | ---------- | --------- |
| Knob 1  | `GND`    | `A0`       | `5V`      |
| Knob 2  | `GND`    | `A1`       | `5V`      |
| Knob 3  | `GND`    | `A2`       | `5V`      |

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

The current firmware reads the three analog inputs, persists tuning and calibration in EEPROM, and emits lines such as:

```text
HELLO board=Ioruba Nano; fw=0.5.1; protocol=2; knobs=3; mcu=ATmega328P; adcBits=10; threshold=4; deadzone=7; smooth=75; mins=0,0,0; maxs=1023,1023,1023
512|768|1023
```

That maps directly to the active desktop runtime. The runtime also accepts the older legacy packet style, but the current build target is the full-frame format above plus the handshake metadata used to sync controller tuning.

The `mcu` and `adcBits` fields are additive protocol-v2 metadata: older firmware that omits them still works (the desktop assumes 10-bit). `adcBits` lets the desktop normalize readings for boards with a different ADC resolution — AVR boards report `10` (`0..1023`), while ESP32 and RP2040/Pico report `12` (`0..4095`). The firmware auto-detects the bit depth from the target architecture; override it at compile time with `-DIORUBA_ADC_BITS=<n>` if needed.

## Optional buttons and encoders

Digital controls are disabled by default. Enable them at compile time:

```bash
arduino-cli compile --fqbn arduino:avr:nano \
  --build-property "compiler.cpp.extra_flags=-DIORUBA_NUM_BUTTONS=1 -DIORUBA_NUM_ENCODERS=1" \
  firmware/arduino/ioruba-controller
```

Default digital pin order:

| Input | Pins | Wiring |
| ----- | ---- | ------ |
| Buttons | `D2 D3 D4 D5 D6 D7 D8 D9` | one side to the pin, the other to `GND`; firmware uses `INPUT_PULLUP` |
| Encoders | `D6/D7`, `D8/D9`, `D10/D11`, `D12/D13` | channel A/B to the pair, common to `GND`; firmware uses `INPUT_PULLUP` |

Avoid overlapping pins when you enable both buttons and encoders. For example, `-DIORUBA_NUM_BUTTONS=2 -DIORUBA_NUM_ENCODERS=1` uses buttons on `D2/D3` and encoder 0 on `D6/D7`.

The desktop opts in by sending `EVENTS ON` after connecting. Until that command is received, the firmware only emits knob frames, which keeps older desktop builds compatible. Once enabled, event frames look like:

```text
EV type=button; id=0; event=press
EV type=encoder; id=0; delta=1
```

Add bindings to a profile with the `controls` array:

```json
"controls": [
  { "input": "button", "id": 0, "name": "Mute", "event": "press", "action": "mute" },
  { "input": "encoder", "id": 0, "name": "Next track", "direction": "clockwise", "action": "next" },
  { "input": "encoder", "id": 0, "name": "Previous track", "direction": "counterclockwise", "action": "prev" }
]
```

On Linux, `mute` uses `pactl set-sink-mute @DEFAULT_SINK@ toggle`; `next` and `prev` use `playerctl` when installed. Windows currently supports `mute` for the default output. Unsupported actions are reported in the watch log instead of failing the serial runtime.

## Supported boards

The reference build is the Nano with 3 knobs, but the firmware is parametric. The number of knobs is set with `-DIORUBA_NUM_KNOBS=<n>` at compile time, and the analog pins are chosen from a per-board table (the first `n` channels). A `static_assert` fails the build if `n` exceeds the board's analog channels.

| Board            | MCU          | ADC bits | Analog channels | Max knobs | Pin order (first knobs use these in order)        |
| ---------------- | ------------ | -------- | --------------- | --------- | -------------------------------------------------- |
| Arduino Nano     | ATmega328P   | 10       | 8               | 8         | `A0 A1 A2 A3 A4 A5 A6 A7`                           |
| Arduino Uno      | ATmega328P   | 10       | 6               | 6         | `A0 A1 A2 A3 A4 A5`                                 |
| Arduino Mega2560 | ATmega2560   | 10       | 16              | 16        | `A0 A1 … A15`                                       |
| Leonardo / Micro | ATmega32U4   | 10       | 12              | 12        | `A0 A1 … A11`                                       |
| ESP32            | ESP32        | 12       | 6 (ADC1 only)   | 6         | `A0 A3 A4 A5 A6 A7` (ADC2 is reserved for Wi-Fi)   |
| RP2040 / Pico    | RP2040       | 12       | 3               | 3         | `A0 A1 A2`                                          |
| ESP8266 (NodeMCU)| ESP8266      | 10       | 1 (A0 only)     | 1         | `A0` (single ADC pin exposed by the Arduino core)   |

Compile for a specific board with `arduino-cli`, e.g. a Mega with 8 knobs:

```bash
arduino-cli compile --fqbn arduino:avr:mega \
  --build-property "compiler.cpp.extra_flags=-DIORUBA_NUM_KNOBS=8" \
  firmware/arduino/ioruba-controller
```

`npm run firmware:compile:matrix` compiles the firmware for every AVR board above in one shot (the same matrix the CI runs).

ESP32, RP2040 and ESP8266 need their own `arduino-cli` cores. CI builds all three in a dedicated `firmware-arch` job; install them locally with:

```bash
# ESP32
arduino-cli core install esp32:esp32 \
  --additional-urls https://espressif.github.io/arduino-esp32/package_esp32_index.json
arduino-cli compile --fqbn esp32:esp32:esp32 firmware/arduino/ioruba-controller

# RP2040 / Pico (earlephilhower core)
arduino-cli core install rp2040:rp2040 \
  --additional-urls https://github.com/earlephilhower/arduino-pico/releases/download/global/package_rp2040_index.json
arduino-cli compile --fqbn rp2040:rp2040:rpipico firmware/arduino/ioruba-controller

# ESP8266 (NodeMCU) — only exposes 1 analog pin, so IORUBA_NUM_KNOBS must be
# overridden to 1 or the static_assert(IORUBA_NUM_KNOBS <= ANALOG_PIN_COUNT) trips.
arduino-cli core install esp8266:esp8266 \
  --additional-urls http://arduino.esp8266.com/stable/package_esp8266com_index.json
arduino-cli compile --fqbn esp8266:esp8266:nodemcuv2 \
  --build-property "build.extra_flags=-DIORUBA_NUM_KNOBS=1" \
  firmware/arduino/ioruba-controller
```

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
