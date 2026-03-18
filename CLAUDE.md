# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ioruba** is a functional reimplementation of the deej audio mixer project, designed specifically for Linux with cross-platform support. It provides hardware-based audio control through Arduino with a modern GTK-based GUI.

**Core Technologies:**
- **Language:** Haskell (Stack build system)
- **GUI:** GTK+ 3 with gi-gtk bindings
- **Audio:** PulseAudio/PipeWire via libpulse bindings
- **Hardware:** Serial communication with Arduino (via serialport library)
- **Config:** YAML for configuration files

The archived Python/GTK4 prototype from `arduino_audio_controller` is preserved under `legacy/arduino-audio-controller/` for reference.

## Development Commands

### Build and Run
```bash
# Build the project
stack build

# Build with optimizations
stack build --fast

# Run the application
stack run

# Run with specific config
stack run -- --config config/custom.yaml

# Clean build artifacts
stack clean
```

### Testing
```bash
# Run all tests
stack test

# Run specific test suite
stack test :ioruba-test

# Run tests with coverage
stack test --coverage

# Run property tests only
stack test --ta "-p Audio"
```

### Development
```bash
# Start REPL with project loaded
stack ghci

# Run linter (HLint)
stack exec -- hlint src/

# Format code (ormolu)
find src -name "*.hs" -exec ormolu -i {} \;

# Type check without building
stack build --fast --test --no-run-tests --bench --no-run-benchmarks
```

### Documentation
```bash
# Generate Haddock documentation
stack haddock --open

# Build user documentation
cd docs && make html
```

## Architecture

### Module Structure

The codebase follows a pure functional architecture with clear separation of concerns:

**Core Audio System (src/Audio/)**
- `PulseAudio.hs` - FFI bindings and integration with PulseAudio/PipeWire
- `Mixer.hs` - Pure functional volume mixing logic
- `Sink.hs` - Audio sink management (applications, master volume)
- `Source.hs` - Audio source management (microphone input)

**Hardware Communication (src/Hardware/)**
- `Serial.hs` - Serial port communication with Arduino
- `Protocol.hs` - Parsing slider values from Arduino (pipe-separated format)
- `Device.hs` - Device detection and management

**GUI (src/GUI/)**
- `MainWindow.hs` - Main application window
- `Visualizer.hs` - Real-time audio level visualization
- `Settings.hs` - Settings dialog and preference management
- `Themes.hs` - Dark/light theme switching

**Configuration (src/Config/)**
- `Types.hs` - Configuration data types
- `Parser.hs` - YAML/TOML configuration parsing
- `Profiles.hs` - Audio profile management (work, gaming, etc.)
- `Validation.hs` - Configuration validation with detailed error messages

**Task System (src/Tasks/)**
- `Manager.hs` - Task tracking and categorization
- `Notifications.hs` - Desktop notifications for reminders
- `Persistence.hs` - SQLite-based task storage

**Documentation System (src/Docs/)**
- `Generator.hs` - Automatic documentation generation
- `Interactive.hs` - In-app tutorial system

**Utilities (src/Utils/)**
- `Logging.hs` - Structured logging with fast-logger
- `Error.hs` - Error handling types and utilities

### Data Flow

1. **Arduino → Application:**
   - Arduino sends slider values via USB serial (format: `0|512|1023|...`)
   - `Hardware.Serial` reads and buffers serial data
   - `Hardware.Protocol` parses values into `SliderState`
   - Values flow through STM channels for thread-safe communication

2. **Application → Audio System:**
   - Pure `Mixer` functions compute volume levels from slider positions
   - `Audio.PulseAudio` effects apply volumes to sinks/sources
   - Configuration maps sliders to applications

3. **GUI Updates:**
   - Audio levels trigger GTK main loop callbacks
   - `Visualizer` updates use Cairo for smooth rendering
   - All state changes go through STM for concurrency safety

### Key Design Patterns

**Pure Functional Core:**
- Business logic in `Audio.Mixer`, `Config.Validation` is pure
- Side effects isolated in `IO` actions at edges
- Property-based testing for pure functions

**STM for Concurrency:**
- Audio thread, serial thread, and GUI thread communicate via STM channels
- Lock-free, composable concurrent operations
- `TVar` for shared state (current volumes, slider positions)

**Configuration as Code:**
- Profiles defined in YAML with schema validation
- Hot-reload support for config changes
- Rollback mechanism for invalid configurations

**Effect System:**
- Uses `ReaderT` pattern for dependency injection
- `AppM` monad provides access to application context
- Testable by mocking effects

## Important Conventions

### Naming
- Pure functions: descriptive names (`calculateVolume`, `validateConfig`)
- Effectful actions: suffix with action verb (`loadConfig`, `applyVolume`)
- Types: PascalCase with descriptive names (`SliderConfig`, `AudioSink`)

### Error Handling
- Use `Either` for recoverable errors with detailed error types
- `Maybe` only when absence is semantically meaningful
- Exceptions only for truly exceptional situations (hardware failures)

### Testing
- QuickCheck properties for pure functions
- Integration tests for audio/serial I/O in `test/Integration/`
- Mock implementations in `test/Mocks/` for testing without hardware

### File Organization
- One module per file matching directory structure
- Exports explicit, no implicit exports
- Internal helpers in `*.Internal` modules

## Linux-Specific Considerations

**Audio System Detection:**
The application automatically detects PulseAudio vs PipeWire at runtime. Both use the same libpulse API, but PipeWire may have different sink/source naming conventions.

**Serial Permissions:**
User must be in `dialout` group to access serial ports without root:
```bash
sudo usermod -a -G dialout $USER
```

**Desktop Integration:**
- `.desktop` file installed to `~/.local/share/applications/`
- DBus integration for notifications
- SystemTray support via libappindicator

## Configuration Files

**Main Config (`config/ioruba.yaml`):**
Defines slider mappings, serial port, audio profiles. See example in `config/example.yaml`.

**Profiles (`config/profiles/*.yaml`):**
Named audio scenarios that can be quickly switched.

**GUI State (`~/.config/ioruba/state.yaml`):**
Window position, theme preference, last used profile.

## Arduino Integration

The Arduino sketch is in `arduino/ioruba-mixer/`. It reads analog pins and sends values at 9600 baud:
```
0|512|1023|768|256
```

Upload to Arduino using Arduino IDE or `platformio`:
```bash
cd arduino/ioruba-mixer
pio run --target upload
```

## Common Development Workflows

**Adding a New Audio Sink Type:**
1. Add constructor to `Sink` type in `src/Audio/Sink.hs`
2. Implement `applySinkVolume` for new type
3. Add parser in `src/Config/Parser.hs`
4. Add tests in `test/Audio/SinkSpec.hs`

**Adding GUI Component:**
1. Create module in `src/GUI/`
2. Build widget structure in `buildWidget` function
3. Wire up GTK signals to STM state updates
4. Add to main window in `src/GUI/MainWindow.hs`

**Adding Configuration Option:**
1. Add field to `Config` type in `src/Config/Types.hs`
2. Add YAML parser in `src/Config/Parser.hs`
3. Add validator in `src/Config/Validation.hs`
4. Update example config and documentation
