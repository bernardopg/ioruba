# Hardware Setup Guide

This guide will walk you through building the physical hardware for Ioruba.

## Required Components

- 1x Arduino Uno (or compatible)
- 5x 10kΩ linear potentiometers
- 1x USB A-to-B cable
- Breadboard and jumper wires (optional, for prototyping)
- Enclosure (optional, for finished build)

## Wiring Diagram

### Basic Setup (Breadboard)

```
Arduino Uno
┌─────────────────┐
│                 │
│  A0 ──────┬─────┤  Potentiometer 1
│           │     │  - Left:  GND
│  A1 ──────┼──┬──┤  - Middle: Signal (to analog pin)
│           │  │  │  - Right: 5V
│  A2 ──────┼──┼─┬┤
│           │  │ ││
│  A3 ──────┼──┼─┼┼┐
│           │  │ │││
│  A4 ──────┼──┼─┼┼┼┐
│           │  │ ││││
│  5V  ─────┴──┴─┴┴┴┴──── All potentiometer right pins
│                 │
│  GND ───────────────── All potentiometer left pins
│                 │
│  USB ──────────────── To computer
│                 │
└─────────────────┘
```

## Step-by-Step Instructions

### 1. Connect Power Rails

1. Connect Arduino's **5V** pin to the breadboard's positive rail (red)
2. Connect Arduino's **GND** pin to the breadboard's negative rail (blue/black)

### 2. Wire Potentiometers

For each potentiometer (repeat 5 times for A0-A4):

1. **Left pin** → GND rail (negative)
2. **Middle pin** → Arduino analog pin (A0, A1, A2, A3, or A4)
3. **Right pin** → 5V rail (positive)

### 3. Connect Arduino to Computer

1. Connect USB cable to Arduino
2. Connect other end to computer
3. Note the device path (e.g., `/dev/ttyUSB0` on Linux)

### 4. Upload Firmware

```bash
cd arduino/ioruba-mixer
# Using Arduino IDE: Open ioruba-mixer.ino and click Upload
# OR using PlatformIO:
pio run --target upload
```

### 5. Test Hardware

1. Open Arduino IDE Serial Monitor (9600 baud)
2. Turn potentiometers
3. You should see values like: `512|768|1023|0|256`

## Troubleshooting

### No Serial Output

- Check USB connection
- Verify correct COM port selected in Arduino IDE
- Ensure baud rate is 9600

### Erratic Values

- Check potentiometer connections
- Ensure solid breadboard connections
- Try increasing `NOISE_THRESHOLD` in firmware

### Permission Denied (Linux)

```bash
# Add user to dialout group
sudo usermod -a -G dialout $USER
# Log out and back in
```

## Advanced: Custom PCB

For a permanent installation, consider designing a custom PCB with:
- Screw terminals for potentiometers
- On-board voltage regulation
- LED indicators
- Professional enclosure

Files for a reference PCB design will be added in future releases.

## Enclosure Ideas

- 3D printed case (STL files coming soon)
- Laser-cut acrylic panels
- Repurposed project box
- Custom wood enclosure

## Next Steps

Once hardware is working:
1. Configure `config/ioruba.yaml` with your serial port
2. Run Ioruba and test slider mapping
3. Create custom profiles for different use cases
