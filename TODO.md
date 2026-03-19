# TODO

Updated for the current repository state on `2026-03-18`.

## Done Recently

- [x] Functional GTK desktop app for the Arduino Nano 3-knob setup
- [x] Support for both serial protocols: `P1/P2/P3` and `A0|A1|A2`
- [x] Animated knob dials and app icons in the GTK UI
- [x] PT-BR and English UI with system-locale detection and manual switching
- [x] Demo mode and refreshed README screenshots
- [x] Firmware heartbeat so the host can distinguish idle knobs from missing firmware
- [x] Haskell tests for config parsing, protocol parsing, and mixer math

## Desktop App

- [ ] Render icons inside the target dropdown rows, not only in the selected knob header
- [ ] Add named presets so users can switch between profiles like streaming, music, and calls
- [ ] Add first-run onboarding for "Nano not found", "no active apps", and "microphone unavailable"
- [ ] Add a compact diagnostics drawer with reconnect count, last packet time, and current protocol
- [ ] Add optional logarithmic curves and inverted knob direction per target
- [ ] Add a raw serial monitor panel for debugging hardware noise and dead zones
- [ ] Add keyboard-accessible target remapping and accessibility labels beyond the language switcher
- [ ] Add automated UI smoke tests for startup, demo mode, and translation switching

## Firmware and Hardware

- [ ] Make Nano upload more robust for clones by documenting and optionally auto-detecting the correct bootloader profile
- [ ] Add a firmware banner with protocol name and version so the host can report exactly what is connected
- [ ] Add EEPROM-backed calibration for per-knob min/max ranges
- [ ] Add configurable dead zones and smoothing constants without editing source
- [ ] Add a recovery path for boards that need manual reset during upload
- [ ] Validate and document common Nano clone chipsets like FT232R and CH340

## Haskell Runtime

- [ ] Implement real PipeWire/PulseAudio control in `src/Audio/PulseAudio.hs`
- [ ] Implement sink enumeration and volume control in `src/Audio/Sink.hs`
- [ ] Implement microphone/source enumeration and control in `src/Audio/Source.hs`
- [ ] Wire `app/Main.hs` into a real serial-to-audio event loop
- [ ] Replace GUI placeholders with a real GTK window in `src/GUI/MainWindow.hs`
- [ ] Implement settings UI in `src/GUI/Settings.hs`
- [ ] Implement theme handling in `src/GUI/Themes.hs`
- [ ] Implement visualizer rendering in `src/GUI/Visualizer.hs`
- [ ] Implement profile loading and saving in `src/Config/Profiles.hs`
- [ ] Expand config validation coverage beyond the parser tests already added

## Tasks, Docs, and Supporting Modules

- [ ] Implement persistence in `src/Tasks/Persistence.hs`
- [ ] Implement notifications in `src/Tasks/Notifications.hs`
- [ ] Finish the task manager persistence hooks in `src/Tasks/Manager.hs`
- [ ] Implement the interactive tutorial in `src/Docs/Interactive.hs`
- [ ] Implement generated docs in `src/Docs/Generator.hs`
- [ ] Replace TODO logging stubs in `src/Utils/Logging.hs` with structured logging

## Packaging and Release

- [ ] Publish an Arch/AUR package for the GTK desktop app
- [ ] Add a release artifact for the recommended Nano sketch
- [ ] Add CI coverage for the Python/GTK legacy app alongside the Haskell checks
- [ ] Decide whether to salvage or retire the large historic housekeeping PR before future release work
- [ ] Add a clear support matrix for:
  - GTK desktop app
  - Haskell runtime
  - firmware variants

## Repository Cleanup

- [x] Clean up or close stale branches and PRs that no longer match the current project direction
- [ ] Decide whether the legacy sketch should eventually move to its own matching Arduino sketch directory
- [ ] Keep root docs aligned so the working desktop app is not confused with the incomplete Haskell UI
