# TODO

Updated for the current repository state on `2026-03-18`.

## Done Recently

- [x] Haskell runtime now builds as the primary executable
- [x] Serial-to-audio event loop implemented in `app/Main.hs`
- [x] PipeWire and PulseAudio control wired through `pactl`
- [x] Live terminal dashboard added for runtime status and knob feedback
- [x] Support for both serial protocols: `P1/P2/P3` and `512|768|1023`
- [x] Pages site generated from `docs/config.yaml`
- [x] Release Please, release bundle workflow, and funding surface added
- [x] Metadata sync tooling added for repo description, homepage, and topics
- [x] Firmware heartbeat keeps the runtime from confusing idle hardware with a dead board
- [x] Haskell tests for config parsing, protocol parsing, and mixer math

## Firmware and Hardware

- [ ] Add EEPROM-backed calibration for per-knob min/max ranges
- [ ] Add firmware banner/version handshake so the runtime can report board and protocol metadata explicitly
- [ ] Add configurable dead zones and smoothing constants without editing source
- [ ] Improve Nano clone upload recovery with a more guided reset workflow
- [ ] Validate and document common Nano clone chipsets like FT232R and CH340

## Haskell Runtime

- [ ] Add named profiles and profile switching in `src/Config/Profiles.hs`
- [ ] Add optional target curves, inversion presets, and smoothing profiles per knob
- [ ] Add better stream selection heuristics for multiple browser profiles or duplicate app names
- [ ] Add persistent runtime state and last-known target resolution
- [ ] Decide whether to keep the polished TUI as the main shell or layer a native Haskell GUI on top later
- [ ] If a native GUI is revived, replace the prototype modules in `src/GUI/Settings.hs`, `src/GUI/Themes.hs`, and `src/GUI/Visualizer.hs`
- [ ] Expand config validation coverage beyond the parser tests already added

## Tasks, Docs, and Supporting Modules

- [ ] Implement persistence in `src/Tasks/Persistence.hs`
- [ ] Implement notifications in `src/Tasks/Notifications.hs`
- [ ] Finish the task manager persistence hooks in `src/Tasks/Manager.hs`
- [ ] Implement the interactive tutorial in `src/Docs/Interactive.hs`
- [ ] Implement generated docs in `src/Docs/Generator.hs`
- [ ] Replace TODO logging stubs in `src/Utils/Logging.hs` with structured logging

## Packaging and Release

- [ ] Publish Linux install packages beyond raw release tarballs
- [ ] Add Debian/Ubuntu packaging metadata for desktop distribution
- [ ] Add CI smoke coverage that boots the runtime with a serial simulator
- [ ] Add release signing and provenance for binaries and firmware bundles
- [ ] Add a clear support matrix for:
  - Haskell runtime
  - firmware variants
  - legacy compatibility path

## Repository Cleanup

- [x] Clean up or close stale branches and PRs that no longer match the current project direction
- [x] Remove obsolete `GITHUB_SETUP.md`
- [ ] Keep marketing copy, site metadata, and repo settings synced as the product evolves
- [ ] Decide how aggressively to archive or split the legacy GTK implementation
