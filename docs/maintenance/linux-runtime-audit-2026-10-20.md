# Ioruba Linux and firmware audit — 2026-10-20

## Scope and environment

Tested the checkout's rebuilt production Tauri binary on this Arch Linux machine,
using its real WebKitGTK 2.54.1, native IPC and PipeWire 1.6.9 PulseAudio interface.
The installed AUR package is `ioruba-desktop-bin 1.9.6-1`; this audit does not replace
or certify that installed AppImage. Dependency upgrades from the preceding work
remain in the same uncommitted checkout.

Physical controller: FTDI FT232R A5069RR4, `/dev/ttyUSB0`, Ioruba Nano,
ATmega328P, firmware 0.6.2, protocol 2, three knobs on A0/A1/A2, ADC 10-bit,
115200 baud, no buttons or encoders. Firmware tuning reported threshold 4,
deadzone 7, smoothing 75, calibration 0..1023 on all channels.

## Reproduced and fixed

1. RP2040 advertised 12-bit ADC data without setting the converter's resolution.
   Arduino-Pico defaults to 10-bit. Explicitly call `analogReadResolution` on
   RP2040/ESP32, matching the announced resolution; firmware source is now 0.6.3.
   The host sketch test failed before and passed after this fix. AVR behavior
   remains unchanged. [Arduino-Pico ADC reference](https://arduino-pico.readthedocs.io/en/latest/analog.html).
2. Desktop audio IPC normalized every controller as 10-bit, saturating 12-bit
   values early. The serial runtime now passes the handshake's ADC maximum into
   the shared normalizer. Tests cover the 12-bit midpoint, inversion, 10-bit
   behavior and propagation through the serial hook.
3. Failed settings writes had no rejection handler or user diagnostic. The
   persistence hook now logs the backend failure; tests cover hydration safety,
   edit coalescing and disk errors.
4. Repeated changelog section headings produced duplicate React keys. Sections
   now have distinct keys; a fixture with repeated headings reproduces the old
   failure and passes with the fix.
5. Diagnostics' follow-end switch had no accessible name in actual WebKit.
   Added its translated label. Native axe caught the failure and passed after.
6. Language changes updated text but left the document's accessibility language
   at pt-BR. The root language now tracks the active profile. The native test
   reproduced pt-BR vs en, then verified English, Spanish and Portuguese.
7. Root test wrappers did not forward coverage flags correctly through npm 12.
   Forwarding is fixed; coverage explicitly includes source never imported by
   tests, with baseline regression thresholds in desktop/shared configs.

## Real runtime evidence

The app booted against real `pactl`, connected to the physical Nano and received
its protocol-2 handshake and continuous data. The user moved all three knobs.
The captured watch log contains 134 sampled frames with observed raw ranges
0..980, 0..1023 and 23..1023. These are sampled logs, not a guaranteed measurement
of the absolute endpoints. Session statistics reached 399 ticks / 179 changing
samples; no error-level runtime events were present in the captured movement log.
The third channel warrants guided calibration: its sampled lower endpoint was
above zero. Its calibration was not guessed or changed from sampled data.

Native audio IPC updated an actual temporary null sink to 37%, its monitor source
to 46%, a real pacat application stream to 29%, and toggled mute. Values were read
back with pactl and asserted. Missing applications returned an idle warning.
Temporary sinks, streams and drivers were removed after testing; real saved
profiles were checked against the pre-test baseline. The initial master level
was restored after the first connection to the existing user profile; subsequent
automated runs used isolated settings and harmless audio targets.

Physical serial checks passed for HELLO, invalid CONFIG rejection, oversized
command error and recovery, RAW ON capture, and RAW OFF restoration. No firmware
upload or calibration/EEPROM update was performed. The physical firmware remains
0.6.2; source 0.6.3 was compiled/tested, with its functional change targeting
RP2040/ESP32 resolution setup.

## Tests and coverage

- `npm run verify`: 67 shared + 146 desktop tests, typechecks, 45 application Rust
  tests, 4 serial routing Rust tests and production frontend build passed.
- Native Linux suite: 9 reported tests including the parent; real boot/audio,
  all nine sections, keyboard navigation, demo telemetry, Escape/focus restoration,
  live language/theme persistence, invalid JSON protection and physical handshake.
- Axe WCAG 2 A/AA scans: no detected violations on the nine native sections.
  `color-contrast` remained incomplete; this is not a full accessibility certification.
- Desktop coverage on the full-source denominator: lines 57.34% -> 61.34%,
  statements 62.36%, branches 56.15%, functions 61.85% after changes. The earlier
  imported-only line metric (61.89%) was not a comparable baseline. Shared line
  coverage is 84.81%, with 75.64% branch coverage.
- Firmware parser/default/wide, pin guards and actual-sketch host tests passed,
  including button debounce and encoder events in a separate controls build.
- Firmware source 0.6.3 compiled for Nano, Uno, Mega, Leonardo, Micro, ESP32,
  RP2040 and ESP8266. Installed core indexes were refreshed using their vendor URLs.
- Linux Clippy with warnings denied, rustfmt, actionlint, ShellCheck, installer
  checks and 28 packaging tests passed.

Two Pi/Kimi K3 delegated reviews hit the provider's five-hour quota and did not
finish. Four serial-helper tests written before the frontend review stopped were
reviewed and retained; the remaining fixes and tests were completed directly.

Evidence from this run is retained in `/tmp/ioruba-linux-audit` (physical serial,
watch log and manual native screenshots) and `/tmp/ioruba-native-test-1WBJul`
(final native suite screenshots and per-section axe results). These are local,
temporary artifacts; rerunning the suite produces a fresh directory.

## Remaining limits and risks

The tests are operational and improved, but not complete: desktop line coverage
is about 61%, not 100%. Native file-picker import/export, tray restore, autostart
across logout/reboot, global shortcuts, an actual signed update/restart and
MPRIS next/previous on a playing media application still need dedicated tests.
The native E2E suite is available locally; existing GitHub CI runs the firmware
runtime tests and coverage gates, but this audit did not run remote CI.

Buttons/encoders were tested in the actual sketch with host I/O stubs and compiled
on supported targets; the connected Nano reports zero of those controls, so no
physical button/encoder proof exists. Only the Nano was physically exercised;
RP2040/ESP32 resolution was checked with a failing-then-passing host test,
upstream documentation and compilation, not physical boards.

The previous audit's Rust security blocker remains: the latest Tauri updater
pulls Windows-only zip 4.6.1 with three advisories. GLib's compatible GTK3 security
backport remains necessary. No audit ignore or security gate bypass was added.
