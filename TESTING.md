# Testing Guide

This is the validation matrix for the active Ioruba stack. Run commands from the repository root unless noted otherwise.

> Linux is the only platform with full audio-target coverage. Native CI still compiles and tests the Windows WASAPI and macOS CoreAudio backends, which support default-output (`master`) volume only.

## Validation levels

### Fast local gate

```bash
npm run verify
npm run firmware:compile
```

`verify` runs:

- shared and desktop TypeScript typechecks;
- shared and desktop Vitest suites;
- Rust tests;
- desktop production build.

`firmware:compile` compiles the default Arduino Nano target.

### CI-equivalent root command

```bash
npm run ci
```

This is `verify` plus the default firmware compile. GitHub CI performs additional formatting, linting, coverage, firmware-matrix, native-platform, installer, packaging, and repository checks described below.

### Extended local release gate

```bash
npm run release:check
```

This adds:

- `npm audit` against the complete npm workspace;
- `cargo audit` against the Rust lockfile;
- default and wide host-side firmware parser tests;
- the AVR firmware compile matrix;
- shell script lint;
- installer and package-manifest tests;
- Gitleaks and TruffleHog scans;
- GitHub Pages source generation.

Required tools for the extended gate include `cargo-audit`, `arduino-cli`, `shellcheck`, `gitleaks`, and `trufflehog`.

## Targeted commands

| Area | Command |
| --- | --- |
| Shared typecheck | `npm run shared:typecheck` |
| Shared tests | `npm run shared:test` |
| Desktop typecheck | `npm run desktop:typecheck` |
| Desktop tests | `npm run desktop:test` |
| Rust tests | `npm run rust:test` |
| Rust formatting | `cargo fmt --check --manifest-path apps/desktop/src-tauri/Cargo.toml` |
| Rust lint | `cargo clippy --manifest-path apps/desktop/src-tauri/Cargo.toml --all-targets -- -D warnings` |
| Frontend production build | `npm run desktop:build` |
| Local Tauri binary | `npm run desktop:tauri:build` |
| Nano firmware | `npm run firmware:compile` |
| AVR firmware matrix | `npm run firmware:compile:matrix` |
| Firmware parser (default) | `npm run firmware:test` |
| Firmware parser (8 knobs, 12-bit) | `npm run firmware:test:wide` |
| Installer fixtures | `npm run test:installer` |
| Packaging/updater manifests | `npm run test:packaging` |
| Docs site source | `npm run docs:prepare-site` |

Run one Vitest file:

```bash
npm --workspace @ioruba/desktop run test -- src/lib/serial.test.ts
npm --workspace @ioruba/shared run test -- tests/protocol.test.ts
```

Run one Rust test:

```bash
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml <test_name>
```

## What GitHub CI validates

The reusable `.github/workflows/ci.yml` workflow contains these jobs:

- **Desktop And Shared:** Node 22 install, npm audit, TypeScript checks, tests with coverage, Rust format/clippy/tests, RustSec audit, vendored glib patch guard, frontend build, and docs generation.
- **Firmware Host Tests:** pure C++ config-parser tests for default and wide/12-bit configurations.
- **Firmware AVR matrix:** Nano, Uno, Mega, Leonardo, and Micro.
- **Firmware architecture matrix:** ESP32, RP2040/Pico, and ESP8266.
- **Installer Scripts Lint:** ShellCheck, installer fixtures, package/updater manifest tests, and PSScriptAnalyzer.
- **Native Audio Smoke:** Rust clippy/tests on `windows-latest` and `macos-latest` so cfg-gated audio modules compile on their native platforms.
- **Repo Smoke:** required files and removal of retired root/legacy build surfaces.

Separate workflows run CodeQL and secret scanning.

## Desktop runtime smoke test

Start the native development app:

```bash
npm run desktop:watch
```

Verify:

1. persisted profiles and app settings load;
2. serial auto-detection or preferred-port selection works;
3. connection state changes realistically;
4. demo mode produces telemetry without applying system audio;
5. real frames update controls, telemetry, and session statistics;
6. Hardware reports board, MCU, ADC bits, protocol, and calibration;
7. profile visual editing and advanced JSON validation work;
8. import/export, duplication, presets, and reset behave correctly;
9. Watch records, filters, clears, persists, and exports events;
10. closing the window hides it, the tray/`Ctrl+Alt+I` restores it, and **Quit** ends the process;
11. launch-on-login and update preferences persist;
12. unsupported target kinds produce explicit outcomes instead of silent success.

## Serial and firmware validation

The current reference firmware defaults to 115200 baud and protocol 2:

```text
HELLO board=Ioruba Nano; fw=0.6.1; protocol=2; knobs=3; mcu=ATmega328P; adcBits=10; threshold=4; deadzone=7; smooth=75; mins=0,0,0; maxs=1023,1023,1023
512|768|1023
```

The runtime also accepts:

```text
P1:512
P2:768
P3:1023
```

With real hardware, confirm:

- `HELLO?` returns a valid handshake;
- every configured knob appears in each full frame;
- values span the calibrated range;
- idle heartbeats do not trigger disconnect loops;
- disconnect/reconnect restores reading without a zombie port;
- `EVENTS ON` enables button/encoder events when compiled in;
- calibration changes survive a reset;
- a protocol mismatch is shown as a warning.

Compile all AVR targets:

```bash
npm run firmware:compile:matrix
```

The CI architecture matrix is the source of truth for ESP32/RP2040/ESP8266 toolchain compilation; local commands are in [Hardware setup](docs/guides/hardware-setup.md).

## Audio backend validation

### Linux (`pactl`)

```bash
pactl info
pactl list short sink-inputs
pactl list short sinks
pactl list short sources
pactl get-default-sink
pactl get-default-source
```

Test:

- `master` changes the default sink;
- `application` matches active streams case-insensitively by partial app/display name;
- `sink` and `source` match custom names and descriptions;
- `default_output` and `default_microphone` resolve correctly;
- targeted mute works for master, sink, source, and application;
- `next`/`prev` report availability based on `playerctl`;
- unavailable, idle, partial, and error outcomes are visible in the UI and Watch log;
- bursty knob movement applies promptly and coalesces writes.

### Windows (WASAPI)

Test on Windows:

- `master` changes the default render endpoint volume;
- default-output mute works;
- application/source/sink targets return unsupported outcomes;
- inventory reports backend `windows` and the default endpoint;
- repeated writes work through the dedicated COM thread;
- serial, profiles, telemetry, persistence, tray, packaging, and updater behavior remain functional.

### macOS (CoreAudio)

Test on macOS:

- `master` changes default-output volume;
- application/source/sink targets return unsupported outcomes;
- inventory reports backend `macos`;
- serial, profiles, telemetry, persistence, tray, packaging, and updater behavior remain functional;
- unsigned/non-notarized release behavior is described honestly in the release docs.

## Persistence and recovery validation

Typical configuration directories:

- Linux: `~/.config/io.ioruba.desktop/`;
- macOS: `~/Library/Application Support/io.ioruba.desktop/`;
- Windows: `%APPDATA%\io.ioruba.desktop\`.

Confirm:

- state writes are atomic and valid JSON;
- incompatible/corrupt state creates a backup when replaced;
- legacy profiles using the old 9600 default migrate to 115200;
- `ioruba-watch.log` remains bounded to roughly 1 MiB;
- malformed watch lines are ignored and reported;
- deleting `ioruba-state.json` recreates safe defaults;
- reinstalling/updating does not delete the config directory.

## Release artifact validation

Before publishing a tag:

1. `npm run release:check` passes locally where the required security tools are available.
2. The reusable CI workflow passes on Linux, Windows, and macOS jobs.
3. A real controller passes the Linux serial/audio smoke test.
4. Linux builds `.deb`, `.rpm`, and AppImage; Windows builds MSI and NSIS; macOS builds both architecture-specific app archives.
5. `scripts/validate-appimage.sh --require-launch <AppImage>` passes on the Ubuntu 22.04 release runner.
6. Firmware artifacts compile and upload.
7. Every updater platform artifact has a detached `.sig`, and one complete `latest.json` is published after the bundle matrix.
8. `SHA256SUMS.txt` and GitHub provenance attestations are published.
9. Homebrew, Scoop, winget, and AUR metadata is generated from release checksums rather than handwritten digests.
10. The source AUR `PKGBUILD` retains `options=('!lto' '!debug')`.
11. Release notes match the corresponding `CHANGELOG.md` section.
12. macOS signing/notarization claims match the secrets and artifacts actually produced.

Verify a downloaded artifact:

```bash
sha256sum --check SHA256SUMS.txt --ignore-missing
gh attestation verify <asset> --repo bernardopg/ioruba
```

## Troubleshooting tests

### Serial permission denied

```bash
sudo usermod -a -G dialout "$USER"
sudo usermod -a -G uucp "$USER"
```

Log out and back in.

### No frames

- Confirm 115200 baud.
- Confirm the current firmware is flashed.
- Close other serial monitors.
- Check the data cable and analog wiring.
- Inspect `arduino-cli board list` and `fuser -v /dev/ttyUSB0`.

### Linux application volume does not move

- Keep the target app playing audio.
- Refresh the inventory.
- Compare profile names with `pactl list short sink-inputs`.
- Inspect the target outcome and Watch log.

### Tauri build fails on Linux

Install the [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your distribution, including WebKitGTK 4.1, GTK 3, librsvg, and app-indicator development libraries.

For deeper triage, use the [Support playbook](docs/debug/support.md).

## Native Linux integration (real WebKit and IPC)

Requires Node 26, `tauri-driver`, `WebKitWebDriver`, `pactl`, `pacat`, and a running
Linux desktop/audio session. Install the driver with `cargo install tauri-driver --locked`.
Close other Ioruba instances first: the app enforces a single instance.

```bash
npm run desktop:tauri:build
npm run test:linux:app
# Opt in to a connected controller:
IORUBA_TEST_SERIAL_PORT=/dev/ttyUSB0 npm run test:linux:app
```

The suite launches the production binary in a temporary `XDG_CONFIG_HOME` and
uses an unmatched application target. Audio tests create and remove their own
null sink and silent stream. They never redirect or adjust the default output.
The optional controller test sends the test profile's firmware configuration;
run it on a controller with default calibration, or preserve its tuning first.
Screenshots, native logs and axe results are saved to the printed temporary
artifact directory. Device movement still requires a person. Actual file-picker exports and tray/login behavior require the desktop-shell
opt-in below. Signed installation and hardware flashing are not covered. Axe's contrast check may remain incomplete with CSS Color 4.

`npm run firmware:test:runtime` executes the actual sketch using host I/O stubs
for Nano, RP2040 and a button/encoder build. It checks serial command framing,
rejection/recovery, EEPROM write avoidance, modes, ADC resolution and calibration;
this complements the parser tests and physical checks, not ADC hardware proof.

Desktop and shared coverage include unimported source files and enforce baseline
thresholds. Compare percentages from the same configuration: imported-only
coverage overstates coverage. The current native audit and known gaps are in
[the Linux audit](docs/maintenance/linux-runtime-audit-2026-10-20.md).

### Mixer visual regression checks

The native suite checks all nine sections at 640, 800, 1024, 1280, 1440 and
1920 pixels, asserts no document overflow, and saves mixer screenshots and
`responsive.json`. It verifies initial Mixer selection, destination-edit focus,
and the waiting-for-input state. `contrast.json` records seven core mixer text
selectors in light/dark themes, resolving CSS Color 4 via canvas to sRGB before
calculating contrast. These targeted checks complement axe; they are not a
complete accessibility certification. See the
[visual implementation report](docs/maintenance/visual-redesign-2026-10-20.md).

### Native tray, login and file selectors

```bash
IORUBA_TEST_DESKTOP_SHELL=1 xvfb-run -a npm run test:linux:app
```

Requires `xdotool`, system Python with PyGObject/Gio, libX11, and a real session
D-Bus with `org.kde.StatusNotifierWatcher`, in addition to the native suite
prerequisites. Run with a dedicated Xvfb display: selector keyboard input stays
on that display. The suite also isolates `HOME`, because the autostart library
uses `~/.config/autostart` regardless of `XDG_CONFIG_HOME`.

Checks native close-to-tray, registration/menu callbacks on the actual desktop
D-Bus, restore and Quit; toggles login through the UI and verifies persistence
and the generated/removed desktop entry; relaunches with `--autostart` and checks
hidden startup. Saves profile JSON, session JSON/CSV and watch JSONL through GTK
selectors, parses their contents and checks cancellation. No logout/reboot is
performed. This verifies the launch entry and execution path, not a new session
started by the compositor. The menu is activated through its dbusmenu protocol;
pixel hit testing of the panel icon is not part of the suite.

### Vendored updater security backport

`npm run rust:test` also executes the upstream updater unit tests, including
signature/payload validation. The crate is an explicit workspace member for
these dev-dependencies. Native macOS/Windows CI runs the same test target.
See [vendor provenance and removal conditions](apps/desktop/src-tauri/vendor/README.md#updater-2140-zip-9-backport).
A clean cargo audit is required; do not add advisory exceptions for zip.

For release artifact smoke tests, set `IORUBA_BINARY` to the extracted packaged
executable and `IORUBA_EXPECT_VERSION` to the published version. The native boot
case verifies the runtime version through Tauri IPC, in addition to packaging metadata.
