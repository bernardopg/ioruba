# Installed AUR package and physical Nano — 2026-10-20

## Firmware update completed

Device: FTDI FT232R A5069RR4, `/dev/ttyUSB0`, Nano ATmega328P old bootloader at 57600 baud. Application protocol remains 115200 baud, version 2, three knobs, 10-bit ADC.

Backed up full 32 KiB flash and 1024-byte EEPROM before upload under `~/.local/state/ioruba/firmware-backups/2026-10-20/`. Uploaded the release v1.10.0 `ioruba-controller.ino.hex` (firmware 0.6.3), SHA256 `1330219c15ed84cecc70bda65223b4b0d0754a4703d21891f5fd87fd0d5d03c7`, without bootloader or fuse writes. Arduino CLI upload verification and a separate avrdude readback both succeeded (6730 bytes). EEPROM after upload matched the backup byte-for-byte.

Handshake changed only `fw=0.6.2` to `fw=0.6.3`: threshold 4, deadzone 7, smoothing 75, minima 0/0/0 and maxima 1023/1023/1023 were preserved. The installed app auto-connected on the real Wayland session and recorded the 0.6.3 handshake and continuous frames.

## Installed software verification

`ioruba-desktop-bin 1.10.0-1` is installed. `pacman -Qkk` reports zero altered files. `/opt/ioruba/ioruba.AppImage` SHA256 matches the verified published asset: `df022ebe3eb4a91d8f89b4e8b298e224fb123ccb3016c3203f484e9fd1b3833c`.

Executed the actual `/usr/bin/ioruba-desktop` compatibility launcher in the native integration suite, with temporary settings/HOME and isolated audio targets. The AppImage bundles WebKit 2.50.4. System WebKitWebDriver produced `Automation.resolveBrowsingContext was not found`; an official Ubuntu 2.50.4 driver extracted temporarily and checked against the package page SHA256 enabled automation without replacing system libraries. Its ICU dependencies came from the unchanged installed AppImage extraction.

Upstream WebKit versions differ in trailing newlines in rendered labels, so the test now trims labels. Mixer, editing focus, nine sections at six widths, contrast, demo, keyboard/dialog focus, language/theme persistence, invalid JSON rejection, real sink/source/application audio, tray, selectors and physical Nano handshake/frames passed on the installed package. Initial suite artifact directory: `/tmp/ioruba-native-test-7lRZZN/`; the stricter login regression is under `/tmp/ioruba-native-test-ddezy7/`.

## Confirmed AUR login defect — not fixed in the installed release

The generated entry points to:

```text
Exec=/home/bitter/.cache/ioruba/appimage-runtime/<sha>/squashfs-root/usr/bin/ioruba-desktop --autostart
```

It bypasses `/usr/bin/ioruba-desktop` and the AppRun compatibility setup. Executing that entry separately fails with `Unable to spawn a new child process ... WebKitNetworkProcess (No such file or directory)` and exit 133. Core dumps were disabled for this reproduction.

The old test used `entry.includes(binary)`, so the cached path falsely matched `/usr/bin/ioruba-desktop`. It now compares the complete Exec line and fails for this installed AUR package. The separate test that explicitly passes `--autostart` to the wrapper does not prove that the generated login entry works. This finding narrows the earlier release report's autostart claim: that report validated the Debian executable, not the AUR wrapper's generated entry.

The user's login preference was already disabled and is preserved. A production correction must make managed AppImage login use the stable compatibility launcher and execute the generated entry in its regression test. This audit does not mark that fix as delivered.

## Limits

No new manual sweep of the physical knobs or independent ADC voltage measurement was done. No user calibration was inferred or changed. Real Wayland serial boot was observed in logs; GUI automation ran on an isolated X11 display. Cua could identify the Wayland window but could not attest its screenshot/accessibility surface, so it was not used as visual proof.
