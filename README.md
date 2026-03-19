# Ioruba

Linux audio controller for an Arduino Nano with 3 B10K potentiometers on `A0`, `A1`, and `A2`.

The repository currently has two tracks:

- `legacy/arduino-audio-controller/`: the functional GTK4 desktop app recommended for real use today
- `src/`, `app/`, and `config/`: the Haskell reimplementation, still useful for config validation and serial smoke tests, but not yet the full mixer runtime

## Screenshot Gallery

### Desktop overview (pt-BR)

![Desktop overview in pt-BR](assets/screenshots/desktop-overview-pt-br.png)

### Knob deck with app icons

![Knob deck with animated dials and app icons](assets/screenshots/knob-deck-pt-br.png)

### English layout

![English layout](assets/screenshots/english-layout.png)

## What Works Today

- Responsive GTK4/LibAdwaita desktop UI
- Animated DJ-style dials for the 3 physical knobs
- Autodetection of serial ports like `/dev/ttyUSB0` and `/dev/ttyACM0`
- Mapping each knob to master output, microphone input, or active applications
- App icons for configured targets such as Chrome and Spotify
- PipeWire/PulseAudio control through `pulsectl`
- Two firmware protocols:
  - legacy `P1:512`, `P2:768`, `P3:1023`
  - current `512|768|1023`
- Multilanguage UI:
  - auto-detects system language
  - supports `pt-BR` and `en`
  - falls back to English when the system locale is not supported
  - can be switched live from the header bar
- Demo mode for previews and screenshot generation

## Recommended Hardware

- 1x Arduino Nano ATmega328P
- 3x B10K potentiometers
- Wiring:
  - knob 1 wiper -> `A0`
  - knob 2 wiper -> `A1`
  - knob 3 wiper -> `A2`
  - side pins -> `5V` and `GND`

Detailed wiring and upload notes live in [NANO_SETUP.md](NANO_SETUP.md).

## Recommended Firmware

Use [arduino/ioruba-nano-3knobs/ioruba-nano-3knobs.ino](arduino/ioruba-nano-3knobs/ioruba-nano-3knobs.ino).

That sketch now:

- smooths analog noise
- sends a heartbeat every `500ms`
- helps the desktop UI distinguish idle knobs from missing firmware

The legacy sketch at [legacy/arduino-audio-controller/arduino_audio_controller.ino](legacy/arduino-audio-controller/arduino_audio_controller.ino) is still available for the original `P1/P2/P3` protocol.

## Quick Start

### 1. Flash the Nano

```bash
arduino-cli compile --fqbn arduino:avr:nano arduino/ioruba-nano-3knobs
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:nano arduino/ioruba-nano-3knobs
```

If upload fails on a Nano clone:

- try `arduino:avr:nano:cpu=atmega328old`
- press reset right before upload
- make sure no app is holding the serial port open

### 2. Install the desktop app

```bash
cd legacy/arduino-audio-controller
./install_local.sh
```

This installs:

- the launcher `audio-controller-gui`
- the desktop entry `Controlador de Audio`
- the icon under `~/.local/share/icons/`

### 3. Run it

```bash
audio-controller-gui
```

Useful flags:

```bash
audio-controller-gui --demo
audio-controller-gui --lang en
```

## Haskell Track

The Haskell codebase is still valuable, but it is not the full end-user app yet.

What it currently does:

- parses and validates YAML config
- supports serial smoke testing from a real device, `stdin`, or FIFO
- has passing tests for config parsing, protocol parsing, and mixer math

What it does not do yet:

- drive real PipeWire/PulseAudio volumes end-to-end
- provide the desktop GUI shown in the screenshots above

Use it for development checks:

```bash
stack test
stack exec test-serial /dev/ttyUSB0
stack exec ioruba
```

## Documentation

- [NANO_SETUP.md](NANO_SETUP.md): wiring, flashing, and serial troubleshooting
- [TODO.md](TODO.md): complete implementation backlog for the desktop app and Haskell runtime
- [legacy/arduino-audio-controller/README.md](legacy/arduino-audio-controller/README.md): focused guide for the current GTK app
- [QUICKSTART.md](QUICKSTART.md): Haskell quick start
- [TESTING.md](TESTING.md): serial and simulator testing

## Current Status

- Desktop app: functional and recommended
- Firmware: compiles locally; host app supports both old and new protocols
- Haskell runtime: partial and still under implementation

## License

MIT
