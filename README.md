# Iaruba - Functional Audio Mixer for Linux

<div align="center">

[![CI](https://github.com/bernardopg/iaruba/actions/workflows/ci.yml/badge.svg)](https://github.com/bernardopg/iaruba/actions/workflows/ci.yml)
![License](https://img.shields.io/github/license/bernardopg/iaruba)
![Haskell](https://img.shields.io/badge/language-Haskell-purple.svg)
![Platform](https://img.shields.io/badge/platform-Linux-green.svg)
![GHC](https://img.shields.io/badge/GHC-9.6.6-blue.svg)

**A modern, functional reimplementation of hardware-based audio control with a GTK GUI**

[Features](#features) | [Installation](#installation) | [Quick Start](#quick-start) | [Documentation](#documentation) | [Contributing](#contributing)

</div>

---

## Overview

**Iaruba** is a Linux-native audio control system that bridges physical hardware (Arduino-based sliders) with your system's audio. Inspired by [deej](https://github.com/omriharel/deej), Iaruba is built from the ground up in Haskell with a focus on:

- **Functional purity** - Predictable, testable, maintainable code
- **Modern UI/UX** - Clean GTK-based interface with dark/light themes
- **Linux-first** - Full PulseAudio and PipeWire support
- **Extensibility** - Profiles and rich configuration

Control individual application volumes, master output, microphone input, and more with physical sliders connected to an Arduino.

## Features

### Core Functionality
- **Hardware Integration** - USB serial communication with Arduino-based sliders
- **Granular Audio Control** - Per-application volume, master volume, mic input
- **Real-time Visualization** - Live audio level meters
- **Profile System** - Quick-switch between audio configurations (work, gaming, streaming)

### Modern Interface
- **GTK+ 3 GUI** - Native Linux look and feel
- **Dark/Light Themes** - Automatic or manual theme switching
- **System Tray Integration** - Minimize to tray, quick controls

### Configuration Management
- **YAML-based Config** - Human-readable, version-controllable
- **Validation** - Detailed error messages for invalid configurations
- **Multiple Profiles** - Named audio scenarios for different use cases

## Installation

### Prerequisites

**System Dependencies:**
```bash
# Debian/Ubuntu
sudo apt install libpulse-dev libgtk-3-dev libappindicator3-dev

# Fedora
sudo dnf install pulseaudio-libs-devel gtk3-devel libappindicator-gtk3-devel

# Arch Linux
sudo pacman -S libpulse gtk3 libappindicator-gtk3
```

**Haskell Stack:**
```bash
curl -sSL https://get.haskellstack.org/ | sh
```

**Arduino Setup:**
```bash
# Add user to dialout group for serial access
sudo usermod -a -G dialout $USER
# Log out and back in for changes to take effect
```

### Build from Source

```bash
# Clone the repository
git clone https://github.com/bernardopg/iaruba.git
cd iaruba

# Build
stack build

# Run tests
stack test

# Install to ~/.local/bin
stack install

# Run
iaruba
```

### Hardware Setup

1. **Build the Arduino Circuit:**
   - Connect potentiometers to analog pins A0-A4
   - See [`docs/guides/hardware-setup.md`](docs/guides/hardware-setup.md) for wiring diagrams

2. **Upload Arduino Sketch:**
   ```bash
   cd arduino/iaruba-mixer
   # Using Arduino IDE: Open iaruba-mixer.ino and upload
   # OR using PlatformIO:
   pio run --target upload
   ```

3. **Configure Serial Port:**
   - Edit `config/iaruba.yaml`
   - Set `serial_port` to your Arduino device (e.g., `/dev/ttyUSB0`)

## Quick Start

1. **Launch Iaruba:**
   ```bash
   iaruba
   ```

2. **Test without hardware** (using the simulator):
   ```bash
   python3 scripts/arduino-simulator.py
   ```

3. **Configure Slider Mappings** in `config/iaruba.yaml`:

```yaml
serial:
  port: /dev/ttyUSB0
  baud_rate: 9600

sliders:
  - id: 0
    name: "Master Volume"
    targets:
      - type: master

  - id: 1
    name: "Music"
    targets:
      - type: application
        name: "Spotify"

  - id: 2
    name: "Browser"
    targets:
      - type: application
        name: "Firefox"

  - id: 3
    name: "Communications"
    targets:
      - type: application
        name: "Discord"

  - id: 4
    name: "Microphone"
    targets:
      - type: source
        name: "default_microphone"
```

## Project Structure

```
iaruba/
├── src/
│   ├── Audio/        # PulseAudio/PipeWire integration
│   ├── Config/       # Configuration management
│   ├── GUI/          # GTK interface components
│   ├── Hardware/     # Serial communication with Arduino
│   ├── Tasks/        # Task management system
│   ├── Docs/         # Documentation generation
│   └── Utils/        # Shared utilities (logging, errors)
├── app/              # Application entry points
├── test/             # Test suites (Hspec + QuickCheck)
├── arduino/          # Arduino firmware sketches
├── config/           # Example configurations and profiles
├── docs/             # User documentation and guides
├── scripts/          # Development and testing utilities
└── assets/           # Desktop integration files
```

## Development

### Running Tests

```bash
# All tests
stack test

# With verbose output
stack test --ta "--format progress"

# Watch mode (using ghcid)
ghcid --command "stack ghci iaruba:lib iaruba:test:iaruba-test" --test "main"
```

### Code Style

We use [Ormolu](https://github.com/tweag/ormolu) for formatting and [HLint](https://github.com/ndmitchell/hlint) for linting:

```bash
# Format all code
make format

# Run linter
make lint

# Build and test
make build test
```

## Documentation

- **[Hardware Setup Guide](docs/guides/hardware-setup.md)** - Wiring diagrams and Arduino setup
- **[Arduino Nano 3-Knob Setup](NANO_SETUP.md)** - Compact 3-knob variant
- **[Quick Start Guide](QUICKSTART.md)** - Get running in 5 minutes
- **[Contributing](CONTRIBUTING.md)** - How to contribute
- **[Changelog](CHANGELOG.md)** - Version history
- **[Architecture](CLAUDE.md)** - Detailed architecture overview

## Roadmap

- [ ] Windows support via WASAPI
- [ ] macOS support via CoreAudio
- [ ] MIDI controller support
- [ ] Web interface for remote control
- [ ] Equalizer presets per application

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and add tests
4. Run `stack test && make format && make lint`
5. Commit and push
6. Create a Pull Request

## Inspiration

- [deej](https://github.com/omriharel/deej) - The original hardware audio mixer
- [PulseAudio](https://www.freedesktop.org/wiki/Software/PulseAudio/) - Linux audio server
- [PipeWire](https://pipewire.org/) - Modern multimedia framework

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- **Issues:** [GitHub Issues](https://github.com/bernardopg/iaruba/issues)
- **Discussions:** [GitHub Discussions](https://github.com/bernardopg/iaruba/discussions)
- **Security:** See [SECURITY.md](SECURITY.md)
