# Quick Start Guide

There are two valid entry points in this repository:

- the functional GTK desktop app in `legacy/arduino-audio-controller/`
- the Haskell scaffold in `src/` and `app/`

If your goal is to use the Nano with 3 knobs today, use the GTK path. This guide keeps the Haskell flow for development and smoke tests.

## Prerequisites Check

```bash
# Check if Stack is installed
stack --version

# Install Stack if needed
curl -sSL https://get.haskellstack.org/ | sh
```

## Serial Access

Make sure your user can read the serial device used by the Arduino/USB adapter:

```bash
sudo usermod -a -G dialout $USER
# Arch-based systems often use uucp instead:
sudo usermod -a -G uucp $USER
```

## Build and Run

```bash
# Build the project
stack build

# Validate the documented config schema
stack exec ioruba -- --config config/example.yaml
```

## Configure Your Setup

1. **Find your Arduino device:**
   ```bash
   ls /dev/ttyUSB* /dev/ttyACM*
   # Should show something like /dev/ttyUSB0
   ```

2. **Edit config:**
   ```bash
   cp config/example.yaml config/ioruba.yaml
   nano config/ioruba.yaml
   # Update serial.port to match your device
   ```

3. **Upload Arduino firmware:**
   - Open `arduino/ioruba-nano-3knobs/ioruba-nano-3knobs.ino` in Arduino IDE
   - Select your board (Tools → Board → Arduino Nano)
   - Select your port (Tools → Port → /dev/ttyUSB0)
   - Click Upload

4. **Run the serial monitor utility:**
   ```bash
   stack exec test-serial /dev/ttyUSB0
   ```

## Verify It Works

1. Move your physical sliders
2. Check serial output in Arduino IDE Serial Monitor (should show values like `512|768|1023`)
3. Run `stack exec test-serial /dev/ttyUSB0`
4. Confirm the terminal prints slider values and percentages
5. Run `stack exec ioruba` to validate the configured port path and config file

## Test Without Hardware

```bash
python3 scripts/arduino-simulator.py --mode static | stack exec test-serial /dev/stdin
```

## Troubleshooting

**Build fails with missing dependencies?**
- Run: `stack build --only-dependencies` first

**Permission denied accessing /dev/ttyUSB0?**
```bash
sudo usermod -a -G dialout $USER
# Log out and back in
```

**No audio control?**
- That is expected in the current Haskell app. The audio-control modules are still scaffolded.

**Can't see knobs moving in the desktop app?**
- Verify Arduino serial output in Serial Monitor
- Check config file has correct serial port
- Use `stack exec test-serial /dev/ttyUSB0` first
- Then launch `audio-controller-gui`; the GTK app is the functional UI path today

## Next Steps

- Read [README.md](README.md) for full documentation
- Read [NANO_SETUP.md](NANO_SETUP.md) for the Nano-specific flow
- Read [TESTING.md](TESTING.md) for simulator and FIFO workflows
- Check [docs/guides/hardware-setup.md](docs/guides/hardware-setup.md) for hardware details
- Track the full backlog in [TODO.md](TODO.md)
