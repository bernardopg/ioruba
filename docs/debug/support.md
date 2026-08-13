# Support Playbook

Use this playbook to diagnose Ioruba before opening an issue. Start with the smallest failing layer: hardware → serial → profile/runtime → audio backend → desktop integration/update.

## Collect a useful support bundle

Record:

- Ioruba version and installation method;
- operating system, version, architecture, and desktop environment;
- board model and firmware handshake;
- serial port and configured baud rate;
- whether demo mode works;
- relevant profile excerpt (redact personal device names if needed);
- exported Watch log around the failure;
- exact reproduction steps and expected/actual behavior.

Useful commands:

```bash
node --version
npm --version
arduino-cli board list
```

On Linux audio issues, also collect:

```bash
pactl info
pactl list short sink-inputs
pactl list short sinks
pactl list short sources
```

Config directories:

- Linux: `~/.config/io.ioruba.desktop/`;
- macOS: `~/Library/Application Support/io.ioruba.desktop/`;
- Windows: `%APPDATA%\io.ioruba.desktop\`.

Do not post secrets, full home-directory paths, or unrelated device identifiers without review.

## Serial diagnosis

### No controller detected

1. Use a USB **data** cable.
2. Confirm the board has power.
3. Run `arduino-cli board list`.
4. Check Linux device nodes:

   ```bash
   ls -l /dev/ttyUSB* /dev/ttyACM* 2>/dev/null
   ```

5. Confirm the active sketch is flashed.
6. Select the port manually in Ioruba if auto-detection chooses another device.

### Permission denied on Linux

```bash
sudo usermod -a -G dialout "$USER"
sudo usermod -a -G uucp "$USER"
```

Use the group required by your distribution, then log out and back in.

### Port busy

```bash
fuser -v /dev/ttyUSB0
```

Close Arduino Serial Monitor, another Ioruba instance, or any process holding the port. Ioruba normally enforces a single desktop instance, but external serial tools can still conflict.

### Connected but no frames

- Confirm the profile uses **115200 baud** for current firmware.
- Confirm a serial monitor at 115200 receives the handshake and frames.
- Close the monitor before reopening Ioruba.
- Check that the handshake begins with `HELLO` and reports protocol 2.
- Check knob count against the number of sliders in the active profile.
- For the Nano reference build, inspect `A0`, `A1`, and `A2` wiring.
- Export Watch entries around connect/disconnect; look for open/close/reconnect errors.

Expected current reference output:

```text
HELLO board=Ioruba Nano; fw=0.6.1; protocol=2; knobs=3; mcu=ATmega328P; adcBits=10; threshold=4; deadzone=7; smooth=75; mins=0,0,0; maxs=1023,1023,1023
512|768|1023
```

Profiles containing the retired 9600 default should migrate automatically. If a custom profile deliberately uses another rate, it is preserved.

### Upload fails

- Try `arduino:avr:nano` and `arduino:avr:nano:cpu=atmega328old`.
- Press RESET immediately before upload.
- Close all serial clients.
- Replace the cable.
- Reburn the bootloader if both Nano profiles fail.

See [Nano setup](../../NANO_SETUP.md).

## Hardware readings

### Values do not reach 0% or 100%

Run the Hardware calibration wizard for each knob. Confirm the captured span is not too narrow and that profile calibration matches the firmware handshake.

### Values move backward

Either swap the potentiometer's two outer pins or set the slider's `inverted` option.

### Values jitter

- Verify a common ground and short analog wiring.
- Keep signal wires away from noisy power paths.
- Run calibration.
- Inspect raw readings before increasing smoothing.
- Confirm the correct `adcBits` for the board.

## Linux audio diagnosis

### Backend unavailable

Ioruba requires a PulseAudio-compatible `pactl` interface (PulseAudio or PipeWire Pulse):

```bash
pactl info
```

If this fails, install/enable the distribution's PulseAudio utilities or PipeWire Pulse compatibility service.

### Master volume does not move

```bash
pactl get-default-sink
pactl get-sink-volume @DEFAULT_SINK@
```

Confirm the profile target is `{ "kind": "master" }` or a valid sink target. Inspect the latest target outcome in Ioruba.

### Application volume does not move

```bash
pactl list short sink-inputs
```

The application must be actively playing audio. Refresh the audio inventory, then match a stable application/display-name substring. An inactive app correctly reports an idle outcome.

### Microphone or output target does not move

```bash
pactl list short sinks
pactl list short sources
pactl get-default-sink
pactl get-default-source
```

Use `default_output` and `default_microphone` for portable profiles. Custom names match endpoint names/descriptions case-insensitively by substring.

### Mute or media action fails

- Default and targeted mute use `pactl` on Linux.
- `next`/`prev` require `playerctl` and an MPRIS-compatible player.
- A `target` is valid only with `mute`.
- Check Watch for an explicit unsupported/error outcome.

## Windows and macOS

Current native support is intentionally narrower:

- Windows: WASAPI default-output (`master`) volume and mute.
- macOS: CoreAudio default-output (`master`) volume.
- Application/source/sink volume targets are Linux-only.

On either platform, serial, profiles, demo mode, telemetry, persistence, tray, release notifications, and signed updater flows should still work. Unsupported targets must report an explicit outcome.

## Profile and state diagnosis

### Profile does not save

The advanced editor validates inline. Common causes:

- invalid JSON;
- empty ID/name;
- duplicate slider IDs;
- missing/empty targets;
- named targets without `name`;
- invalid enum values;
- malformed controls;
- `target` attached to `next` or `prev`.

Compare with [Profile examples](../guides/profile-examples.md).

### App starts with defaults or reports corrupt state

Ioruba writes state atomically and may create `ioruba-state.backup.*.json` before replacing an incompatible/corrupt file.

1. Close Ioruba.
2. Back up the config directory.
3. Inspect the backup and `ioruba-state.json` as JSON.
4. To reset only state, remove `ioruba-state.json` and relaunch.

Linux example:

```bash
cp -a ~/.config/io.ioruba.desktop ~/ioruba-config-backup
rm ~/.config/io.ioruba.desktop/ioruba-state.json
```

The app recreates safe defaults. Reinstallation does not normally remove configuration.

### Watch log problems

`ioruba-watch.log` is JSON Lines and is automatically trimmed to about 1 MiB. Malformed lines are ignored and reported. It is safe to delete the file while Ioruba is closed.

Use the in-app export for a clean support attachment.

## Tray and window behavior

Closing the window hides Ioruba; it does not quit. Use the tray or **Ctrl+Alt+I** to toggle the main window. Use **Quit** / **Sair** to end the process.

### GNOME tray missing

Install and enable **AppIndicator and KStatusNotifierItem Support**:

- Ubuntu: `sudo apt install gnome-shell-extension-appindicator`;
- Fedora: `sudo dnf install gnome-shell-extension-appindicator`;
- Arch: `paru -S gnome-shell-extension-appindicator`;
- extension page: <https://extensions.gnome.org/extension/615/appindicator-support/>.

Log out and back in. Until then, use **Ctrl+Alt+I**.

### KDE Plasma / Hyprland / other environments

KDE supports StatusNotifier natively. Hyprland can use the global shortcut even without a tray host. Other environments need StatusNotifierItem/AppIndicator support for an icon; the shortcut remains the fallback.

### Updated binary behaves strangely while old process is running

Quit the existing process completely and relaunch. Ioruba detects a replaced executable and can restart cleanly, but stale desktop launchers or manually copied binaries can still point at an old path.

## Installation and update diagnosis

### Verify a download

```bash
sha256sum --check SHA256SUMS.txt --ignore-missing
gh attestation verify <asset> --repo bernardopg/ioruba
```

### Signed in-app update fails

- Confirm the host can reach GitHub Releases.
- Export Watch entries containing the updater error.
- Verify the release includes `latest.json`, the platform artifact, and its `.sig`.
- Do not bypass a signature failure; install a verified release asset manually.
- Browser-only `desktop:dev` does not run the native signed updater.

### AppImage does not launch

Run:

```bash
scripts/validate-appimage.sh <path-to-AppImage>
```

On bleeding-edge Arch systems, local bundling may hit a `linuxdeploy`/`.relr.dyn` incompatibility. Public release AppImages are built and launch-checked on Ubuntu 22.04.

### macOS Gatekeeper warning

Current release app archives may be unsigned and not notarized. The one-line installer/Homebrew cask handles quarantine for this documented distribution path, but users should still verify checksums/provenance. Do not claim notarization until the release guide's signing gate is complete.

## Open an issue

If the problem remains, open a [GitHub issue](https://github.com/bernardopg/ioruba/issues) with the support bundle from the first section. Prefer a minimal profile and short Watch excerpt that reproduces the problem.

## Related documentation

- [README](../../README.md)
- [Quick start](../../QUICKSTART.md)
- [Profile examples](../guides/profile-examples.md)
- [Testing](../../TESTING.md)
- [Release distribution](../guides/release-distribution.md)
