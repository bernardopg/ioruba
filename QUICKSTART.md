# Quick Start

This is the fastest path from a fresh clone to a working Ioruba session on the **active Linux stack**.

> **Heads up**
> Real system-audio control currently depends on the Linux `pactl` backend. On macOS and Windows, the desktop shell is still useful for UI review and demo mode, but audio control is not implemented yet.

## 1. What you need

### Software

- Node.js `22` recommended (same major version used in CI)
- `npm`
- Rust stable + Cargo
- `arduino-cli`
- `pactl` available on `PATH`

### Hardware

- `Arduino Nano ATmega328P`
- `3x 10k` linear potentiometers
- USB data cable
- jumper wires and a breadboard or enclosure

Quick version check:

```bash
node --version
npm --version
rustc --version
cargo --version
arduino-cli version
pactl info
```

## 2. Install repository dependencies

```bash
npm install
```

## 3. Prepare Linux serial permissions

Depending on the distro, add your user to `dialout` or `uucp`:

```bash
sudo usermod -a -G dialout $USER
sudo usermod -a -G uucp $USER
```

Log out and back in after changing group membership.

## 4. Wire and flash the controller

If you still need to assemble the hardware, start with:

- [docs/guides/hardware-setup.md](docs/guides/hardware-setup.md)
- [NANO_SETUP.md](NANO_SETUP.md)

Detect the board:

```bash
arduino-cli board list
```

Compile the current firmware:

```bash
arduino-cli compile --fqbn arduino:avr:nano firmware/arduino/ioruba-controller
```

Upload for a standard Nano:

```bash
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:nano firmware/arduino/ioruba-controller
```

Upload for common Nano clones with the old bootloader:

```bash
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:nano:cpu=atmega328old firmware/arduino/ioruba-controller
```

## 5. Validate the repository

Run the main automated checks before launching the desktop shell:

```bash
npm run verify
```

If you only want to make sure the firmware still compiles from the root workspace:

```bash
npm run firmware:compile
```

## 6. Launch the desktop app

Frontend only:

```bash
npm run desktop:dev
```

Full Tauri desktop shell:

```bash
npm run desktop:watch
```

Use the Tauri shell for real serial sessions, persistence, and backend validation.

## 7. Confirm everything is working

When the app opens, this is the expected flow:

- the app discovers serial ports or respects your preferred port
- the status card moves through connection states instead of staying idle forever
- the runtime receives a firmware handshake before or alongside knob frames
- the `Watch` tab shows frames such as `512|768|1023`
- the telemetry chart reacts when you turn the knobs
- the active profile is stored as JSON and survives restarts
- `Atualizar áudio` refreshes the Linux audio inventory
- turning the knobs updates targets such as master volume, apps, or microphone input

Default profile mapping:

| Knob | Default target                        |
| ---- | ------------------------------------- |
| 1    | Default output / master volume        |
| 2    | `Spotify`, `Google Chrome`, `Firefox` |
| 3    | `default_microphone`                  |

## 8. Know where the app stores data

The desktop app persists two important files:

- `ioruba-state.json` — active profile and runtime state
- `ioruba-watch.log` — structured watch events, automatically trimmed to about `1 MiB`

Locations:

- Linux: `~/.config/io.ioruba.desktop/`
- macOS: `~/Library/Application Support/io.ioruba.desktop/`
- Windows: `%APPDATA%\\io.ioruba.desktop\\`

## 9. Build the desktop app locally

For a local Tauri build without final installers:

```bash
npm run desktop:tauri:build
```

If you change the source app icon in [apps/desktop/src-tauri/icons/app-icon.svg](apps/desktop/src-tauri/icons/app-icon.svg), regenerate every derived asset first:

```bash
npm run desktop:icons
```

## 10. Quick troubleshooting

### Tauri fails to compile on Linux

Install the WebKit/GTK development packages required by Tauri:

```bash
sudo pacman -S --needed \
  webkit2gtk-4.1 \
  gtk3 \
  librsvg \
  appmenu-gtk-module \
  libappindicator-gtk3 \
  xdotool
```

On Arch, the tray path depends on `libappindicator-gtk3`. This matches the current Tauri 2 Linux prerequisites.

## 11. Smoke test as an end user on Arch

Try to build an installable Linux artifact from the repository root:

```bash
npm --workspace @ioruba/desktop run tauri build -- --bundles appimage
```

The AppImage is written under:

```bash
apps/desktop/src-tauri/target/release/bundle/appimage/
```

Run it as a user would:

```bash
./apps/desktop/src-tauri/target/release/bundle/appimage/Ioruba_*.AppImage
```

What to verify in this pass:

- the app opens normally outside `tauri dev`
- closing the main window does not kill the process
- the app remains available in the tray
- left click or the `Abrir Ioruba` tray action restores the window
- `Sair` from the tray really exits the process
- persistence, serial connection, and `Atualizar áudio` still behave the same

Known limitation on current Arch hosts:

- the AppImage bundling step can still fail inside `linuxdeploy` because the embedded `strip` does not understand newer Arch libraries with `.relr.dyn`
- when that happens, treat the release binary at `apps/desktop/src-tauri/target/release/ioruba-desktop` as the local smoke-test target for tray/background behavior
- for public AppImage artifacts, prefer building in CI or in an older Linux base image instead of on a bleeding-edge Arch workstation

### The app opens but no packets arrive

- confirm the board is flashing the current sketch
- confirm the board answers with `HELLO board=...; fw=...; protocol=...; knobs=...`
- confirm the board is sending `512|768|1023`
- confirm `9600` baud
- check the knob wiring on `A0`, `A1`, and `A2`
- verify the selected serial port in the app
- retry with the old-bootloader Nano profile if you use a clone

### Audio targets do not move

- confirm `pactl info` works
- make sure target applications are actively playing audio
- refresh the inventory from the desktop app
- inspect the JSON profile in the `Config` tab

### You are on macOS or Windows

That path is currently best treated as **UI/demo validation only**. The desktop shell may build and open, but the real audio backend is intentionally marked unsupported outside Linux.

## 12. Verify a release download

Every release ships a `SHA256SUMS.txt` alongside the binary installers. Before installing, verify the download:

```bash
# Download SHA256SUMS.txt and the installer into the same directory, then:
sha256sum --check SHA256SUMS.txt --ignore-missing
```

GitHub also publishes SLSA build provenance attestations for each binary. Verify with the GitHub CLI:

```bash
gh attestation verify Ioruba_0.6.9_amd64.deb \
  --repo bernardopg/ioruba
```

Replace the filename with the artifact you downloaded. A passing verification confirms the file was produced by the official release workflow and has not been tampered with.

## 13. Update and recovery

### Updating to a new release

**Debian/Ubuntu (.deb):**

```bash
sudo dpkg -i Ioruba_<version>_amd64.deb
```

**Fedora/RHEL (.rpm):**

```bash
sudo rpm -Uvh Ioruba-<version>-1.x86_64.rpm
```

**AppImage:**

Replace the existing `.AppImage` file and re-mark it executable:

```bash
chmod +x Ioruba_<version>_amd64.AppImage
```

No uninstall step required — the new file replaces the old one in place.

**Arch Linux (AUR):**

```bash
# ioruba-desktop (build from source):
paru -Syu ioruba-desktop

# ioruba-desktop-bin (prebuilt AppImage):
paru -Syu ioruba-desktop-bin
```

### Recovering from a broken bundle

If the app fails to start after an update, your configuration is stored separately from the binary and survives reinstallation.

**Back up your configuration first:**

```bash
cp -r ~/.config/io.ioruba.desktop/ ~/ioruba-config-backup/
```

**Recover a valid state file:**

If `ioruba-state.json` is corrupted, delete it — the app recreates it with safe defaults on next launch:

```bash
rm ~/.config/io.ioruba.desktop/ioruba-state.json
```

Your `ioruba-watch.log` (the event log) is safe to delete at any time:

```bash
rm ~/.config/io.ioruba.desktop/ioruba-watch.log
```

**Full reset (last resort):**

```bash
# Back up first, then:
rm -rf ~/.config/io.ioruba.desktop/
```

The app will rebuild all defaults on next launch. Re-enter your serial port preference and profile configuration.

**Reinstall the binary:**

Download the latest installer from [Releases](https://github.com/bernardopg/ioruba/releases) and install as described above. Your configuration directory is untouched by reinstallation.

### Tray icon not appearing after update

If the system tray icon disappears after an update, the app may be running in the background without a visible tray host. Check with:

```bash
pgrep -a ioruba-desktop
```

If the process is running, kill it and relaunch. See [Desktop Environment tray notes](#tray-support-by-desktop-environment) in this file and the troubleshooting playbook at [docs/debug/support.md](docs/debug/support.md).

## 14. Tray support by desktop environment

The app keeps running in the background when you close the main window and exposes itself through the system tray. Tray behavior varies by desktop environment.

### Hyprland (Wayland)

Works without a tray host. The app registers a `CloseRequested` handler to hide the window instead of exiting. Use the global shortcut **Ctrl+Alt+I** to toggle the window when the compositor does not provide a `StatusNotifierWatcher`.

### KDE Plasma (Wayland and X11)

Native StatusNotifier support. The tray icon appears without any extra packages or extensions.

### GNOME (Wayland and X11)

GNOME does not display StatusNotifier tray icons by default. Install the **AppIndicator and KStatusNotifierItem Support** extension:

- From GNOME Extensions: [extensions.gnome.org/extension/615](https://extensions.gnome.org/extension/615/appindicator-support/)
- On Ubuntu: `sudo apt install gnome-shell-extension-appindicator`
- On Fedora: `sudo dnf install gnome-shell-extension-appindicator`
- On Arch: `paru -S gnome-shell-extension-appindicator`

Enable the extension in GNOME Extensions or `gnome-extensions-app`, then log out and back in. The Ioruba tray icon will appear in the top bar.

Until the extension is active, use the global shortcut **Ctrl+Alt+I** to toggle the main window.

### Other environments

Any desktop that implements the StatusNotifierItem/AppIndicator protocol should display the tray icon without additional configuration. Environments without tray support can still use **Ctrl+Alt+I** to toggle the window.

## Next reads

- [README.md](README.md) for the repository overview
- [NANO_SETUP.md](NANO_SETUP.md) for firmware and serial details
- [docs/guides/profile-examples.md](docs/guides/profile-examples.md) for JSON profile samples
- [docs/debug/support.md](docs/debug/support.md) for troubleshooting playbooks
- [TESTING.md](TESTING.md) for the validation matrix
- [docs/migration/logic-audit.md](docs/migration/logic-audit.md) for migration parity coverage
