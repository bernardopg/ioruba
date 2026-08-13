# Profile Examples and Target Matching

Use this guide for the current profile JSON accepted by Ioruba. Most settings are available in **Settings → Profile editor**; advanced JSON is useful for review, backup, and precise edits.

A profile contains:

- `serial` connection settings;
- one or more `sliders` with audio `targets` and optional calibration/inversion;
- optional button/encoder `controls`;
- `audio`, `firmware`, and `ui` settings.

The current default serial rate is **115200 baud**. Profiles saved with the retired 9600 default are migrated automatically.

## Complete three-control example

```json
{
  "id": "streaming-desk",
  "name": "Streaming Desk",
  "serial": {
    "preferredPort": null,
    "baudRate": 115200,
    "autoConnect": true,
    "heartbeatTimeoutMs": 3000
  },
  "sliders": [
    {
      "id": 0,
      "name": "Master",
      "targets": [{ "kind": "master" }],
      "inverted": false,
      "calibration": { "minRaw": 0, "maxRaw": 1023 }
    },
    {
      "id": 1,
      "name": "Apps",
      "targets": [
        { "kind": "application", "name": "Spotify" },
        { "kind": "application", "name": "Firefox" },
        { "kind": "application", "name": "Discord" }
      ],
      "calibration": { "minRaw": 0, "maxRaw": 1023 }
    },
    {
      "id": 2,
      "name": "Microphone",
      "targets": [{ "kind": "source", "name": "default_microphone" }],
      "calibration": { "minRaw": 0, "maxRaw": 1023 }
    }
  ],
  "controls": [],
  "audio": {
    "noiseReduction": "default",
    "smoothTransitions": true,
    "transitionDurationMs": 50
  },
  "firmware": {
    "changeThreshold": 4,
    "edgeDeadzone": 7,
    "smoothingStrength": 75
  },
  "ui": {
    "language": "pt-BR",
    "theme": "system",
    "showVisualizers": true,
    "telemetryWindow": 120
  }
}
```

`calibration.maxRaw` is interpreted against the firmware's ADC resolution. AVR reference builds report 10 bits (`0..1023`); ESP32/RP2040 builds report 12 bits (`0..4095`). Prefer the Hardware calibration wizard over editing these values manually.

## Minimal master-only profile

```json
{
  "id": "master-only",
  "name": "Master Only",
  "serial": {
    "preferredPort": null,
    "baudRate": 115200,
    "autoConnect": true,
    "heartbeatTimeoutMs": 3000
  },
  "sliders": [
    {
      "id": 0,
      "name": "Master Volume",
      "targets": [{ "kind": "master" }],
      "calibration": { "minRaw": 0, "maxRaw": 1023 }
    }
  ],
  "controls": [],
  "audio": {
    "noiseReduction": "default",
    "smoothTransitions": true,
    "transitionDurationMs": 50
  },
  "firmware": {
    "changeThreshold": 4,
    "edgeDeadzone": 7,
    "smoothingStrength": 75
  },
  "ui": {
    "language": "en",
    "theme": "system",
    "showVisualizers": true,
    "telemetryWindow": 120
  }
}
```

## Slider target types

| `kind` | Shape | Current support |
| --- | --- | --- |
| `master` | `{ "kind": "master" }` | Linux, Windows, macOS |
| `application` | `{ "kind": "application", "name": "Spotify" }` | Linux |
| `sink` | `{ "kind": "sink", "name": "default_output" }` | Linux |
| `source` | `{ "kind": "source", "name": "default_microphone" }` | Linux |

A slider may contain multiple targets; one knob value is applied to all matching targets. Outcomes report updated, idle, unavailable, skipped, or error status per target.

## Buttons and encoders

Firmware controls are disabled by default and must be compiled in. Once connected, the desktop sends `EVENTS ON` and maps event frames through `controls`.

```json
{
  "controls": [
    {
      "input": "button",
      "id": 0,
      "name": "Mute Spotify",
      "event": "press",
      "action": "mute",
      "target": { "kind": "application", "name": "Spotify" }
    },
    {
      "input": "button",
      "id": 1,
      "name": "Mute microphone",
      "event": "press",
      "action": "mute",
      "target": { "kind": "source", "name": "default_microphone" }
    },
    {
      "input": "encoder",
      "id": 0,
      "name": "Next track",
      "direction": "clockwise",
      "action": "next"
    },
    {
      "input": "encoder",
      "id": 0,
      "name": "Previous track",
      "direction": "counterclockwise",
      "action": "prev"
    }
  ]
}
```

Rules:

- `target` is optional for `mute`; absent means the default output.
- `target` is invalid for `next` and `prev` because those actions address the media player, not an audio node.
- Linux supports targeted mute for master, application, sink, and source.
- Windows supports default-output/master mute only.
- Unsupported actions are reported without stopping the serial runtime.
- The visual editor can create these bindings from the live audio inventory.

## Linux target matching

### `master`

Maps to the current default sink.

### `application`

- Matches both application and display names.
- Matching is case-insensitive and accepts substrings.
- Only active sink inputs can be discovered.
- No active match is reported as idle rather than as a fatal error.

### `sink`

- `default_output` resolves the current default sink.
- Other names match sink name or description case-insensitively by substring.

### `source`

- `default_microphone` resolves the default source, with a fallback to the first non-monitor source.
- Other names match source name or description case-insensitively by substring.

Inspect available names with:

```bash
pactl list short sink-inputs
pactl list short sinks
pactl list short sources
```

## Profile operations and validation

Ioruba can create a default profile, create from presets, duplicate, import/export, and reset the active profile. Imported profiles receive unique IDs/names when needed.

The advanced editor rejects, among other errors:

- invalid JSON or a non-object root;
- empty/invalid IDs and names;
- duplicate slider IDs;
- empty target arrays or unknown target kinds;
- named target kinds without `name`;
- unsupported enum values;
- malformed controls;
- `target` combined with `next`/`prev`.

Persisted-state normalization is more defensive: invalid profiles/bindings are dropped or replaced with safe defaults so startup can recover.

## Practical recommendations

- Use `default_output` and `default_microphone` for profiles that should survive device changes.
- Use stable application names and keep the app playing while refreshing inventory.
- Keep slider IDs unique and aligned with firmware control order (`0`, `1`, `2`, ...).
- Use calibration rather than compensating for hardware range with target names or unrelated audio settings.
- Export a working profile before major edits.

## Related documentation

- [README](../../README.md)
- [Quick start](../../QUICKSTART.md)
- [Hardware setup](hardware-setup.md)
- [Audio backend contract](audio-backend-contract.md)
- [Testing](../../TESTING.md)
