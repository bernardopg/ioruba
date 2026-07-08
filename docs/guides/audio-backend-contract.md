# Audio backend contract (Rust ↔ TypeScript)

This guide documents the contract between the desktop frontend and the Rust
audio backends: the Tauri commands, the serialized shapes on both sides, and
how the per-platform dispatch works in `apps/desktop/src-tauri/src/audio/mod.rs`.

## Commands

Three Tauri commands form the whole audio surface. The typed TypeScript
wrappers live in `apps/desktop/src/lib/backend.ts`; never call `invoke`
directly from components.

| Command | TS wrapper | Request | Response |
| --- | --- | --- | --- |
| `list_audio_inventory` | `listAudioInventory()` | — | `AudioInventory` |
| `apply_slider_targets_batch` | `applySliderTargetsBatch(profile, updates)` | `ApplySliderTargetsRequest` | `ApplySliderTargetsResponse` (`outcomes` per slider id) |
| `dispatch_control_action` | `dispatchControlAction(action)` | `ControlAction` | `ControlActionOutcome` |

`applySliderTargetsBatch` converts raw knob values to normalized `0.0..=1.0`
(`sliderToAppliedNormalized`, ADC-resolution aware) before crossing the
boundary — the Rust side never sees raw ADC values.

## Serialization conventions

All types are defined once in Rust (`audio/mod.rs`) and mirrored manually in
`apps/desktop/src/lib/backend.ts` / the shared package. Two serde rules keep
them aligned:

- **Struct fields**: `#[serde(rename_all = "camelCase")]` — `slider_id` in
  Rust is `sliderId` in TS.
- **Enums**: `#[serde(rename_all = "lowercase")]` — plain string unions in TS
  (`"updated" | "idle" | ...`). `AudioTarget` additionally uses
  `#[serde(tag = "kind")]`, so it crosses the boundary as
  `{ "kind": "application", "name": "spotify" }` and `{ "kind": "master" }`.

When you change a type in `audio/mod.rs`, update the TS mirror in the same PR;
`npm run desktop:typecheck` only catches drift where the TS side consumes the
changed field.

## Per-platform dispatch (`audio/mod.rs`)

`mod.rs` owns every shared type plus one public function per command, each
duplicated behind `#[cfg(target_os = ...)]` gates that forward to the matching
platform module:

- `linux.rs` — `pactl` (PulseAudio/PipeWire-pulse). Full coverage: master,
  application, sink and source targets, plus mute/next/prev control actions.
- `windows.rs` — WASAPI via the `windows` crate. Master/default output volume
  and mute only; other targets return `unavailable`.
- `macos.rs` — hand-rolled CoreAudio FFI. Master/default output volume only.
- `unsupported.rs` — compiled on any other OS; reports everything as
  `unavailable` so the UI can render demo mode with explicit banners.
- `common.rs` — cfg-free helpers shared by all backends (`describe_target`,
  `volume_percent`) and `MasterOnlyBackend`, the generic master-only batch
  loop used by Windows and macOS. Being cfg-free, its unit tests run on every
  CI platform.

Only one platform module is ever compiled into a binary. On Linux this means
`windows.rs`/`macos.rs` are **not** compiled by `npm run verify` — the
`native-audio-smoke` CI jobs (windows-latest, macos-15) are the gate that
proves they still build.

## Outcome model

Every applied slider produces a `SliderOutcome`:

- `severity`: `info` (nothing to do) · `success` (all targets updated) ·
  `warning` (partial: unavailable/idle targets) · `error` (at least one failure)
- `targets[]`: one `RuntimeTargetOutcome` per configured target with
  `status` (`updated`/`idle`/`unavailable`/`skipped`/`error`), a human-readable
  `detail`, and the `matched` endpoint names.

The store keeps the latest outcome per slider and surfaces it in the knob
diagnostics panel; the serial runtime logs slow applies (>80 ms) to the watch
log.
