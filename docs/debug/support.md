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

## 🔄 Update and recovery

### Updating to a new version

Download the installer from [Releases](https://github.com/bernardopg/ioruba/releases) and install over the existing version:

- `.deb`: `sudo dpkg -i Ioruba_<version>_amd64.deb`
- `.rpm`: `sudo rpm -Uvh Ioruba-<version>-1.x86_64.rpm`
- AppImage: replace the old file, `chmod +x` the new one
- AUR: `paru -Syu ioruba-desktop` or `paru -Syu ioruba-desktop-bin`

Your configuration at `~/.config/io.ioruba.desktop/` is untouched by reinstallation.

### Verifying a downloaded binary

Every release includes `SHA256SUMS.txt`. Verify before installing:

```bash
sha256sum --check SHA256SUMS.txt --ignore-missing
```

GitHub also publishes SLSA provenance attestations. Verify with the GitHub CLI:

```bash
gh attestation verify Ioruba_<version>_amd64.deb --repo bernardopg/ioruba
```

### Recovering from a broken state

Back up first:

```bash
cp -r ~/.config/io.ioruba.desktop/ ~/ioruba-config-backup/
```

**Corrupted `ioruba-state.json`:** delete it — the app recreates safe defaults on next launch:

```bash
rm ~/.config/io.ioruba.desktop/ioruba-state.json
```

**Full reset (last resort):**

```bash
rm -rf ~/.config/io.ioruba.desktop/
```

`ioruba-watch.log` can be deleted at any time without side effects. Reinstalling the binary never touches the config directory.

## 🖥️ Tray support by desktop environment

### Hyprland

Works without a tray host. The window hides on close instead of exiting. Use **Ctrl+Alt+I** to toggle the window when no `StatusNotifierWatcher` is available.

### KDE Plasma

Native StatusNotifier support — tray icon appears without extra packages or extensions.

### GNOME

GNOME does not show StatusNotifier icons by default. Install the **AppIndicator and KStatusNotifierItem Support** extension:

```bash
# Ubuntu
sudo apt install gnome-shell-extension-appindicator

# Fedora
sudo dnf install gnome-shell-extension-appindicator

# Arch
paru -S gnome-shell-extension-appindicator
```

Enable in GNOME Extensions or `gnome-extensions-app`, then log out and back in.

Extension: [extensions.gnome.org/extension/615](https://extensions.gnome.org/extension/615/appindicator-support/)

Until the extension is active, use **Ctrl+Alt+I** to toggle the main window.

### Other environments

Any StatusNotifierItem/AppIndicator-compatible environment shows the tray icon natively. Environments without a tray host can use **Ctrl+Alt+I** as a fallback.

## 🖥️ Non-Linux platforms

On Windows, treat the current app as partial audio support:

- valid for layout review
- valid for demo mode
- valid for persistence checks
- real default-output (`master`) volume control through Core Audio
- app/source/sink targets should report unsupported outcomes

On macOS, treat the current app as:

- valid for layout review
- valid for demo mode
- valid for persistence checks
- **not yet** production-ready for real system-audio control

## Related docs

- [../../README.md](../../README.md)
- [../../QUICKSTART.md](../../QUICKSTART.md)
- [../guides/profile-examples.md](../guides/profile-examples.md)
- [../../TESTING.md](../../TESTING.md)
