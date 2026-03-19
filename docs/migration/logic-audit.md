# Legacy Logic Audit

This matrix tracks whether the important Python/Haskell behavior was carried into the new codebase.

## Serial Protocol

- Python `parse_line` from `legacy/arduino-audio-controller/audio_controller.py`: implemented in `packages/shared/src/protocol.ts`
- Haskell `sanitizeSerialPayload` and `parseSliderData` from `legacy/haskell-runtime/src/Hardware/Protocol.hs`: implemented in `packages/shared/src/protocol.ts`
- Legacy `P1:512` compatibility: preserved in `parseSliderPacket`

## Slider Math

- Python `map_value`: implemented in `packages/shared/src/mixer.ts`
- Haskell `calculateVolume`: implemented as `sliderValueToNormalized`
- Haskell `applyNoiseReduction`: implemented in `packages/shared/src/mixer.ts`
- Haskell first-packet behavior: preserved by treating missing previous values as immediately applicable

## Runtime Snapshot And Demo

- Haskell `buildRuntimeSnapshot`: implemented in `packages/shared/src/runtime.ts`
- Haskell `buildDemoFrame` behavior: implemented in `packages/shared/src/runtime.ts`
- UI-facing knob summary, targets, outcomes, and diagnostics: exposed through the Zustand store in `apps/desktop/src/store/ioruba-store.ts`

## Persistence And Settings

- Haskell `UiSettings` persistence: migrated to whole-profile JSON persistence through `load_persisted_state` and `save_persisted_state`
- Old split model of YAML config plus UI state: replaced by one JSON payload managed by the desktop app

## Audio Targets

- Haskell `MasterTarget`: implemented in Rust via `pactl set-sink-volume @DEFAULT_SINK@`
- Haskell `ApplicationTarget`: implemented in Rust by resolving sink inputs and setting matching stream volumes
- Haskell `SourceTarget default_microphone`: implemented in Rust with default-source handling and non-monitor fallback
- Haskell `SinkTarget default_output`: implemented in Rust with default-sink handling
- Python `set_master_volume` and `set_app_volume`: preserved in the Rust Linux backend

## Auto-Reconnect And Runtime Control

- Haskell serial reconnect loop: replaced by Tauri serial plugin auto-reconnect plus heartbeat timeout logic in `use-serial-runtime.ts`
- Demo mode toggle: implemented in the Zustand store and runtime hook
- Preferred port persistence: implemented in the persisted profile and connection hook

## Test Coverage Added

- shared protocol and mixer tests in `packages/shared/tests/protocol.test.ts`
- desktop store tests in `apps/desktop/src/store/ioruba-store.test.ts`
- Rust parser tests in `apps/desktop/src-tauri/src/audio/linux.rs`

## Known Gaps

- The new Linux backend is implemented for real audio control.
- Windows and macOS installers are built by CI, but the platform-specific audio backend is currently an explicit stub. The desktop shell still runs there; real per-target audio control remains Linux-first in this migration.
