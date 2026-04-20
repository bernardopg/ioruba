# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.0](https://github.com/bernardopg/ioruba/compare/v0.4.0...v0.5.0) (2026-04-20)

### Changed
- synchronized the workspace versioning and release metadata for the 0.5.0 cut
- refreshed the documentation set for the current desktop, firmware, testing, and migration flow

### Features
- added PT-BR/EN translation helpers, a translation guide, and accessibility shell coverage for the desktop app
- expanded the release workflow to ship AppImage and Arch packaging metadata alongside the existing desktop and firmware artifacts

### Bug Fixes
- stabilized CodeQL workflow configuration and Dependabot update resolution
- improved the Linux packaging dependency path for the current release flow

## [0.4.0](https://github.com/bernardopg/ioruba/compare/v0.3.0...v0.4.0) (2026-04-19)

### Changed
- refreshed the repository documentation to match the active Tauri desktop stack, Linux-first audio support, and current hardware workflow
- added the Arduino Nano Type-C circuit diagram and updated the Nano, hardware, testing, and release docs for the new firmware handshake and Arch smoke-test flow

### Features
- persist knob calibration and firmware tuning in EEPROM
- add tray/background handling and launch-on-login support on Linux
- expose firmware thresholds, deadzone, smoothing, and per-knob calibration in the desktop profile workbench
- expand the serial handshake to report controller config with protocol v2

### Bug Fixes
- keep the release and CI workflows pinned to current GitHub Actions versions
- preserve legacy `P1:512` packets while adding controller config support to the serial parser
- align Linux desktop packaging metadata with tray and indicator requirements

### Security
- upgraded `vite` from `7.3.1` to `7.3.2` in the desktop toolchain
- resolved GitHub/Dependabot advisories `GHSA-p9ff-h696-f583`, `GHSA-v2wj-q39q-566r`, and `GHSA-4w7w-66w2-5vf9`
- confirmed the npm toolchain reports `0` open audit vulnerabilities after the upgrade
- documented that the remaining Rust audit findings are upstream/transitive warnings in the current Tauri + GTK3 Linux stack, not newly introduced project-level advisories

## [0.3.0](https://github.com/bernardopg/ioruba/compare/v0.2.3...v0.3.0) (2026-03-20)


### Features

* refresh the desktop control deck UI and live watch workflow
* persist watch logs and improve serial runtime diagnostics


### Bug Fixes

* keep Arduino serial sessions stable during idle periods and port discovery
* backport the Linux `glib` fix for `GHSA-wrw7-89jp-8q8g`

## [0.2.3](https://github.com/bernardopg/ioruba/compare/v0.2.2...v0.2.3) (2026-03-19)


### Bug Fixes

* preserve docker release artifact permissions ([2815390](https://github.com/bernardopg/ioruba/commit/28153905da65343efa4a78954a008b0e30ca1679))

## [0.2.2](https://github.com/bernardopg/ioruba/compare/v0.2.1...v0.2.2) (2026-03-19)


### Bug Fixes

* ship installable release artifacts ([d474351](https://github.com/bernardopg/ioruba/commit/d4743513bd184fd63e14e3679cc09bf569d4357c))

## [0.2.1](https://github.com/bernardopg/ioruba/compare/v0.2.0...v0.2.1) (2026-03-19)


### Bug Fixes

* pass tag name when uploading manual release assets ([08b7291](https://github.com/bernardopg/ioruba/commit/08b72914c1dd1d66d9fdbaf7c26c841f203e009a))
* support chained and manual release artifact runs ([42e42f8](https://github.com/bernardopg/ioruba/commit/42e42f8249eb56c182589337db2c82d8b97fb82f))

## [0.2.0](https://github.com/bernardopg/ioruba/compare/v0.1.0...v0.2.0) (2026-03-19)


### Features

* add Arduino Nano support with 3 potentiometers ([d04715b](https://github.com/bernardopg/ioruba/commit/d04715ba07441f23e29146bf434465604627f250))
* implement serial communication with Arduino ([2739438](https://github.com/bernardopg/ioruba/commit/2739438ee62e16fb263fe6bf02de5894dccbfc6c))
* polish runtime docs and release surface ([66138ba](https://github.com/bernardopg/ioruba/commit/66138baaeaee40310fa33b79d33b335ba5abeb72))
* refresh nano controller app and docs ([89d854d](https://github.com/bernardopg/ioruba/commit/89d854d7f556698f9e5c9de32ac663d78741e901))
* ship haskell runtime and modernize repo surface ([dd34cae](https://github.com/bernardopg/ioruba/commit/dd34cae5d2ef47202fbf29b376d70828b5b6b15b))


### Bug Fixes

* keep ci focused on actionable checks ([cdab0aa](https://github.com/bernardopg/ioruba/commit/cdab0aa493e5bf75412a822502978b9a6b15d161))
* keep release-please versioning on package yaml ([ae44855](https://github.com/bernardopg/ioruba/commit/ae44855ec6776dbc62baf29065452fc2227ca3f9))
* make CI fail faster and pass HLint ([bcae458](https://github.com/bernardopg/ioruba/commit/bcae458dc478c6773568ab3f8843d133ad1cbcf4))
* make metadata sync skip cleanly without token ([d59f445](https://github.com/bernardopg/ioruba/commit/d59f445c37c2c9212e8685f402699671b7b5687f))
* make release-please update generic version files ([d7c871d](https://github.com/bernardopg/ioruba/commit/d7c871d8cb5d361c2ff5b759e785aebdc0a90728))
* stabilize automation and hlint compliance ([0c7c114](https://github.com/bernardopg/ioruba/commit/0c7c11461a621bea55e568c7514f5ae5e374ba6a))

## [0.1.0] - 2025-12-22

### Added
- Initial tagged baseline before the current Haskell-first productization pass

[Unreleased]: https://github.com/bernardopg/ioruba/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/bernardopg/ioruba/releases/tag/v0.5.0
[0.4.0]: https://github.com/bernardopg/ioruba/releases/tag/v0.4.0
[0.3.0]: https://github.com/bernardopg/ioruba/releases/tag/v0.3.0
[0.1.0]: https://github.com/bernardopg/ioruba/releases/tag/v0.1.0
