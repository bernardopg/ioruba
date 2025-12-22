# Quick Start Guide

Get Iarubá up and running in 5 minutes!

## Prerequisites Check

```bash
# Check if Stack is installed
stack --version

# Install Stack if needed
curl -sSL https://get.haskellstack.org/ | sh
```

## Install System Dependencies

### Debian/Ubuntu
```bash
sudo apt install libpulse-dev libgtk-3-dev libappindicator3-dev
```

### Fedora
```bash
sudo dnf install pulseaudio-libs-devel gtk3-devel libappindicator-gtk3-devel
```

### Arch Linux
```bash
sudo pacman -S libpulse gtk3 libappindicator-gtk3
```

## Build and Run

```bash
# Build the project
stack build

# Run with example config
stack run -- --config config/example.yaml
```

## Configure Your Setup

1. **Find your Arduino device:**
   ```bash
   ls /dev/ttyUSB* /dev/ttyACM*
   # Should show something like /dev/ttyUSB0
   ```

2. **Edit config:**
   ```bash
   cp config/example.yaml config/iaruba.yaml
   nano config/iaruba.yaml
   # Update serial.port to match your device
   ```

3. **Upload Arduino firmware:**
   - Open `arduino/iaruba-mixer/iaruba-mixer.ino` in Arduino IDE
   - Select your board (Tools → Board → Arduino Uno)
   - Select your port (Tools → Port → /dev/ttyUSB0)
   - Click Upload

4. **Run Iarubá:**
   ```bash
   stack run
   ```

## Verify It Works

1. Move your physical sliders
2. Check serial output in Arduino IDE Serial Monitor (should show values like `512|768|1023|0|256`)
3. Launch Iarubá
4. Play audio and adjust sliders
5. Verify volume changes in your applications

## Troubleshooting

**Build fails with missing dependencies?**
- Run: `stack build --only-dependencies` first

**Permission denied accessing /dev/ttyUSB0?**
```bash
sudo usermod -a -G dialout $USER
# Log out and back in
```

**No audio control?**
- Check if PulseAudio/PipeWire is running: `pactl info`
- List sinks: `pactl list sinks short`

**Can't see sliders moving in app?**
- Verify Arduino serial output in Serial Monitor
- Check config file has correct serial port
- Increase log level in config

## Next Steps

- Read [README.md](README.md) for full documentation
- Check [docs/guides/hardware-setup.md](docs/guides/hardware-setup.md) for hardware details
- Explore profile system in `config/profiles/`
- Join our community (links in README)

Happy mixing!
