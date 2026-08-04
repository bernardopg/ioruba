# Profile Examples And Linux Target Matching

Use this guide when you want practical JSON samples for the current Ioruba profile editor.

## 🎚️ Example: master volume only

```json
{
  "id": "master-only",
  "name": "Master Only",
  "serial": {
    "preferredPort": null,
    "baudRate": 9600,
    "autoConnect": true,
    "heartbeatTimeoutMs": 3000
  },
  "sliders": [
    {
      "id": 0,
      "name": "Master Volume",
      "targets": [{ "kind": "master" }]
    }
  ],
  "audio": {
    "noiseReduction": "default",
    "smoothTransitions": true,
    "transitionDurationMs": 50
  },
  "ui": {
    "language": "pt-BR",
    "theme": "system",
    "showVisualizers": true,
    "telemetryWindow": 120
  }
}
```

## 🧩 Example: applications + microphone + output sink

```json
{
  "id": "streaming-desk",
  "name": "Streaming Desk",
  "serial": {
    "preferredPort": "/dev/ttyUSB0",
    "baudRate": 9600,
    "autoConnect": true,
    "heartbeatTimeoutMs": 3000
  },
  "sliders": [
    {
      "id": 0,
      "name": "Apps",
      "targets": [
        { "kind": "application", "name": "Spotify" },
        { "kind": "application", "name": "Firefox" },
        { "kind": "application", "name": "Discord" }
      ]
    },
    {
      "id": 1,
      "name": "Mic",
      "targets": [{ "kind": "source", "name": "default_microphone" }]
    },
    {
      "id": 2,
      "name": "Speakers",
      "targets": [{ "kind": "sink", "name": "default_output" }]
    }
  ],
  "audio": {
    "noiseReduction": "default",
    "smoothTransitions": true,
    "transitionDurationMs": 50
  },
  "ui": {
    "language": "pt-BR",
    "theme": "system",
    "showVisualizers": true,
    "telemetryWindow": 120
  }
}
```

## 🔇 Example: targeted mute controls

Controls (buttons and encoders) accept an optional `target` that directs a `mute` action at a specific sink, source, or application. Without `target`, mute toggles the default output.

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
      "name": "Mute headphones",
      "event": "press",
      "action": "mute",
      "target": { "kind": "sink", "name": "bluez" }
    },
    {
      "input": "button",
      "id": 2,
      "name": "Mute mic",
      "event": "press",
      "action": "mute",
      "target": { "kind": "source", "name": "default_microphone" }
    },
    {
      "input": "button",
      "id": 3,
      "name": "Mute master",
      "event": "press",
      "action": "mute"
    }
  ]
}
```

The `target` object follows the same `AudioTarget` shape and matching rules as slider targets (see below). A control with a malformed `target` (missing `name`, unknown `kind`) is dropped during validation rather than silently falling back to master; in the in-app profile editor the same malformed `target` is reported as a validation error instead of being saved.

`target` is only valid with `action: "mute"`. The `next`/`prev` actions drive the MPRIS media player, which has no audio node to aim at, so a control that pairs them with a target is rejected (validation error in the profile editor, dropped binding when loading persisted state).

**Platform support**: on Linux all target kinds work; on Windows only `master` (or no target) is accepted — a specific target returns `supported: false`.

You do not need the JSON editor for any of this: **Settings › Profile editor › Buttons and encoders** adds bindings, switches between button and encoder, and picks the mute target from the live audio inventory.

## 🔎 Linux matching rules

The current Linux backend applies targets with the following logic:

### `master`

- maps to `pactl set-sink-volume @DEFAULT_SINK@ ...`

### `application`

- matches against both the Pulse/PipeWire application name and the display name
- matching is case-insensitive
- partial matches are accepted
- if no active sink input matches, the result is reported as `app idle: ...`

### `source`

- `default_microphone` first tries the current default source
- if no default source is available, it falls back to the first non-monitor source
- custom names are matched case-insensitively against source name and description

### `sink`

- `default_output` uses the current default sink
- custom names are matched case-insensitively against sink name and description

## 💡 Practical tips

- prefer stable application names such as `Spotify`, `Firefox`, or `Discord`
- refresh the inventory in the desktop app before debugging a matching problem
- keep at least one active audio stream open if you want `application` targets to be discoverable
- use `default_microphone` and `default_output` when you want the profile to survive device changes better

## Related docs

- [../../README.md](../../README.md)
- [../../QUICKSTART.md](../../QUICKSTART.md)
- [../../TESTING.md](../../TESTING.md)