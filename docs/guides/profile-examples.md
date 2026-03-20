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