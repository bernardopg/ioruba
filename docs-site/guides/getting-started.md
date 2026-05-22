---
title: "Getting Started"
lang: en
layout: doc
permalink: /guides/getting-started.html
source_path: docs/guides/getting-started.md
---
# Getting Started with Ioruba

This guide walks you through your first Ioruba session, from unboxing to controlling your desktop audio.

## Prerequisites

### Software

- **Node.js 22** + npm
- **Rust** stable + cargo
- **arduino-cli**
- **pactl** (Linux only)

### Hardware

- Arduino Nano ATmega328P
- 3x 10k linear potentiometers
- USB data cable (not charge-only)
- Jumper wires and breadboard

## Step 1: Install dependencies

```bash
git clone https://github.com/bernardopg/ioruba.git
cd ioruba
npm install
```

## Step 2: Wire the hardware

Follow the [Hardware Setup Guide](hardware-setup.html) to connect the potentiometers to the Nano.

Quick reference:

| Knob | Left | Center | Right |
|------|------|--------|-------|
| 1 | GND | A0 | 5V |
| 2 | GND | A1 | 5V |
| 3 | GND | A2 | 5V |

## Step 3: Flash the firmware

```bash
# Compile
arduino-cli compile --fqbn arduino:avr:nano firmware/arduino/ioruba-controller

# Upload
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:nano firmware/arduino/ioruba-controller
```

## Step 4: Launch the app

```bash
npm run desktop:watch
```

## Step 5: Verify it works

When the app opens, confirm:

1. Serial port is detected
2. Status progresses through connection states
3. Watch tab shows `512|768|1023` frames
4. Turning knobs updates the telemetry chart
5. Audio targets respond (on Linux)

## Common issues

### No serial connection

```bash
# Check permissions
sudo usermod -a -G dialout $USER
sudo usermod -a -G uucp $USER
```

### No audio control on Linux

```bash
# Verify pactl
pactl info

# Install if needed (Arch)
sudo pacman -S pulseaudio
```

### Upload fails

Try the old bootloader profile:

```bash
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:nano:cpu=atmega328old firmware/arduino/ioruba-controller
```

## Next steps

- [Profile Examples](profile-examples.html) — configure your knobs
- [Support Playbook](../debug/support.html) — troubleshooting
- [Testing Guide](../../root/TESTING.html) — validation

