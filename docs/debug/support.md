# Support Playbook

Use this document when you need a practical triage checklist for the active Ioruba stack.

## 🧾 What to collect first

Before opening an issue or debugging a broken session, capture:

- operating system and version
- whether you are using a real Nano or demo mode
- the current profile JSON from the `Config` tab
- the latest lines from `ioruba-watch.log`
- output of:

```bash
node --version
npm --version
pactl info
arduino-cli board list
```

Useful config locations:

- Linux: `~/.config/io.ioruba.desktop/`
- macOS: `~/Library/Application Support/io.ioruba.desktop/`
- Windows: `%APPDATA%\\io.ioruba.desktop\\`

## 🔌 Serial problems

### Symptom: no controller found

Check:

- the board is powered through a real USB data cable
- the sketch in `firmware/arduino/ioruba-controller` is flashed
- the board appears in `arduino-cli board list`
- your Linux user is in `dialout` and/or `uucp`

Commands:

```bash
arduino-cli board list
ls -l /dev/ttyUSB* /dev/ttyACM* 2>/dev/null
```

### Symptom: port busy or permission denied

Check whether another tool is holding the port:

```bash
fuser -v /dev/ttyUSB0
```

Fix Linux permissions if needed:

```bash
sudo usermod -a -G dialout $USER
sudo usermod -a -G uucp $USER
```

Then log out and back in.

## 🎛️ Audio problems on Linux

### Symptom: backend unavailable

The current production audio path depends on `pactl`.

Check:

```bash
pactl info
```

If that fails, install a PulseAudio-compatible interface such as PipeWire Pulse or PulseAudio utilities.

### Symptom: applications do not move

Check:

```bash
pactl list short sink-inputs
```

Tips:

- keep the target app actively playing audio
- refresh the inventory in the desktop app
- use stable application names in the profile JSON

### Symptom: microphone or output target does not move

Check:

```bash
pactl list short sinks
pactl list short sources
pactl get-default-sink
pactl get-default-source
```

Prefer `default_output` and `default_microphone` when you want profiles to survive device changes.

## 🧩 Profile JSON problems

### Symptom: profile does not save

The editor already performs inline validation. Common causes are:

- invalid JSON syntax
- duplicated slider `id`
- empty `name`
- invalid `kind`
- invalid enum values in `audio` or `ui`

Reference examples:

- [../guides/profile-examples.md](../guides/profile-examples.md)

## 📈 Runtime and watch-log problems

If the UI opens but behavior still feels wrong:

- inspect the `Watch` tab
- compare the last serial line with the controller movement
- check whether the app is stuck in `searching`, `connecting`, `connected`, or `demo`
- verify that `ioruba-watch.log` is being written to the config directory

## 🖥️ Non-Linux platforms

On macOS and Windows, treat the current app as:

- valid for layout review
- valid for demo mode
- valid for persistence checks
- **not yet** production-ready for real system-audio control

## Related docs

- [../../README.md](../../README.md)
- [../../QUICKSTART.md](../../QUICKSTART.md)
- [../guides/profile-examples.md](../guides/profile-examples.md)
- [../../TESTING.md](../../TESTING.md)