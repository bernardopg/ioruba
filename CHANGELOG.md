# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.6.7](https://github.com/bernardopg/ioruba/compare/v0.6.6...v0.6.7) (2026-04-22)

### Bug Fixes

- fixed close-to-tray behavior on Wayland compositors (notably Hyprland): the close request from `xdg_toplevel.close` (window button, `killactive`, Alt+F4) previously raced the JS-side `onCloseRequested` handler and could terminate the process; the interception now lives in the Rust backend via `WindowEvent::CloseRequested` with `api.prevent_close()` followed by `window.hide()`, guaranteeing the runtime stays alive in the tray regardless of webview readiness
- fixed the responsive shell layout: the sidebar no longer reserves 300px only at `xl+` while forcing oversized headings, and the knobs grid no longer truncates card titles to `M...`/`A...` or clips the rightmost panel out of the viewport
- fixed `KnobPanel` overflow by dropping the forced `2xl:grid-cols-[170px_minmax(0,1fr)]` horizontal layout and the `xl:col-span-2 2xl:col-span-1` asymmetric trick; content now stacks cleanly and the dial scales down to fit constrained columns

### Features

- added a global shortcut (`Ctrl+Alt+I`) that toggles the main window visibility, serving as a robust fallback when the Wayland compositor does not provide a `StatusNotifierWatcher` (common on bare Hyprland installs without waybar/ironbar)
- added `tauri-plugin-global-shortcut` with the `global-shortcut:default` capability wired into the runtime
- added a `toggle_main_window` helper that shows/focuses the window when hidden or unfocused, and hides it to the tray when already focused

### Changed

- simplified `useBackgroundTray` hook: the React side no longer calls `preventDefault()`/`hide()` itself since the Rust handler now owns the lifecycle, eliminating a subtle race between the two layers and keeping the frontend responsibility limited to logging the close request in the watch log
- redesigned the sidebar for constrained viewports: breakpoint moved from `xl` to `lg`, width reduced to ~16rem, nav items collapse descriptions to the active entry only, and padding/radius tightened; below `lg` the nav collapses into a horizontal chip row
- reduced hero typography (`md:text-5xl` → `md:text-3xl xl:text-4xl`) and hero padding/radius so the ribbon and home cards fit standard Tauri window dimensions without forcing overflow
- restructured the control section grid (`2xl:grid-cols-[...]` → `xl:grid-cols-[...]`) and stacked the knobs column vertically in the control view to prevent three-up layouts inside a narrow sub-column
- tightened `mini-status`, `quick-jump-card` and `sidebar-nav-item` spacing for denser information per row
- logged a warning when the global shortcut fails to register (e.g., compositor already binding `Ctrl+Alt+I`) so users can see the cause in the watch panel

## [0.6.6](https://github.com/bernardopg/ioruba/compare/v0.6.5...v0.6.6) (2026-04-22)

### Changed

- synchronized repository documentation

### Features

- added an automated documentation update workflow

## [0.6.4](https://github.com/bernardopg/ioruba/compare/v0.6.3...v0.6.4) (2026-04-21)

### Bug Fixes

- fixed `arch-pkgbuild` job computing sha256sum from a local `git archive` tarball instead of the actual GitHub-generated tarball; the two differ in metadata so hashes never matched, causing `makepkg` verification to fail on install; replaced with a `curl` download of the real `archive/refs/tags/vN.N.N.tar.gz` before hashing

## [0.6.3](https://github.com/bernardopg/ioruba/compare/v0.6.2...v0.6.3) (2026-04-21)

### Bug Fixes

- fixed `aur-publish` job failing to download `.SRCINFO` and `.SRCINFO-bin` assets: GitHub silently renames dot-prefixed files on upload (`.SRCINFO` → `default.SRCINFO`); release assets are now uploaded as `SRCINFO`/`SRCINFO-bin` (no leading dot) and renamed back to `.SRCINFO` after download in the `aur-publish` step

## [0.6.2](https://github.com/bernardopg/ioruba/compare/v0.6.1...v0.6.2) (2026-04-21)

### Bug Fixes

- fixed PKGBUILD-bin generation: nested `<<'LAUNCHER'` heredoc inside `<<EOF` caused YAML indentation stripping to break the heredoc delimiter, producing a syntactically invalid PKGBUILD; replaced with `run-appimage-compat.sh` fetched as a source entry and a two-line `printf` wrapper
- fixed `.SRCINFO` source lines using literal `${pkgver}` instead of the expanded version number
- fixed `.SRCINFO` and `.SRCINFO-bin` missing `provides`, `conflicts`, and `replaces` fields
- fixed `PKGBUILD-bin` missing `provides=ioruba`, `conflicts=ioruba-desktop-bin`, and `replaces=ioruba`
- added missing `libayatana-appindicator3-dev` to CI Linux dependency list, preventing silent build failures

### Features

- added `aur-publish` job to the release workflow: automatically clones `ioruba-desktop` and `ioruba-desktop-bin` AUR repos and pushes updated PKGBUILDs after each release, eliminating manual AUR publishing

## [0.6.1](https://github.com/bernardopg/ioruba/compare/v0.6.0...v0.6.1) (2026-04-20)

### Changed

- split the desktop release workflow so the AppImage upload runs in its own job, isolating it from the other installers
- added a timeout guard to the desktop bundle jobs to avoid indefinite hangs during release publication

### Bug Fixes

- kept the AppImage publish step from blocking the deb/rpm/Windows/macOS release assets

## [0.6.0](https://github.com/bernardopg/ioruba/compare/v0.5.0...v0.6.0) (2026-04-20)

### Changed

- modernized the docs site, navigation, and page-generation workflow for GitHub Pages
- refreshed the Portuguese documentation set to align with the GitHub migration and README updates
- added Dependabot coverage for the docs and workflow surface
- refreshed TypeScript, Vitest, and GitHub Actions dependencies after Dependabot resolution

### Features

- added PT-BR documentation translations across the root docs, guides, migration notes, and support materials
- added an AppImage compatibility script and updated the desktop launcher and release flow

### Bug Fixes

- allowed the repository smoke workflow to include the scripts directory
- stabilized GitHub Actions usage across CI, CodeQL, and Pages deployment

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

- refresh the desktop control deck UI and live watch workflow
- persist watch logs and improve serial runtime diagnostics

### Bug Fixes

- keep Arduino serial sessions stable during idle periods and port discovery
- backport the Linux `glib` fix for `GHSA-wrw7-89jp-8q8g`

## [0.2.3](https://github.com/bernardopg/ioruba/compare/v0.2.2...v0.2.3) (2026-03-19)

### Bug Fixes

- preserve docker release artifact permissions ([2815390](https://github.com/bernardopg/ioruba/commit/28153905da65343efa4a78954a008b0e30ca1679))

## [0.2.2](https://github.com/bernardopg/ioruba/compare/v0.2.1...v0.2.2) (2026-03-19)

### Bug Fixes

- ship installable release artifacts ([d474351](https://github.com/bernardopg/ioruba/commit/d4743513bd184fd63e14e3679cc09bf569d4357c))

## [0.2.1](https://github.com/bernardopg/ioruba/compare/v0.2.0...v0.2.1) (2026-03-19)

### Bug Fixes

- pass tag name when uploading manual release assets ([08b7291](https://github.com/bernardopg/ioruba/commit/08b72914c1dd1d66d9fdbaf7c26c841f203e009a))
- support chained and manual release artifact runs ([42e42f8](https://github.com/bernardopg/ioruba/commit/42e42f8249eb56c182589337db2c82d8b97fb82f))

## [0.2.0](https://github.com/bernardopg/ioruba/compare/v0.1.0...v0.2.0) (2026-03-19)

### Features

- add Arduino Nano support with 3 potentiometers ([d04715b](https://github.com/bernardopg/ioruba/commit/d04715ba07441f23e29146bf434465604627f250))
- implement serial communication with Arduino ([2739438](https://github.com/bernardopg/ioruba/commit/2739438ee62e16fb263fe6bf02de5894dccbfc6c))
- polish runtime docs and release surface ([66138ba](https://github.com/bernardopg/ioruba/commit/66138baaeaee40310fa33b79d33b335ba5abeb72))
- refresh nano controller app and docs ([89d854d](https://github.com/bernardopg/ioruba/commit/89d854d7f556698f9e5c9de32ac663d78741e901))
- ship haskell runtime and modernize repo surface ([dd34cae](https://github.com/bernardopg/ioruba/commit/dd34cae5d2ef47202fbf29b376d70828b5b6b15b))

### Bug Fixes

- keep ci focused on actionable checks ([cdab0aa](https://github.com/bernardopg/ioruba/commit/cdab0aa493e5bf75412a822502978b9a6b15d161))
- keep release-please versioning on package yaml ([ae44855](https://github.com/bernardopg/ioruba/commit/ae44855ec6776dbc62baf29065452fc2227ca3f9))
- make CI fail faster and pass HLint ([bcae458](https://github.com/bernardopg/ioruba/commit/bcae458dc478c6773568ab3f8843d133ad1cbcf4))
- make metadata sync skip cleanly without token ([d59f445](https://github.com/bernardopg/ioruba/commit/d59f445c37c2c9212e8685f402699671b7b5687f))
- make release-please update generic version files ([d7c871d](https://github.com/bernardopg/ioruba/commit/d7c871d8cb5d361c2ff5b759e785aebdc0a90728))
- stabilize automation and hlint compliance ([0c7c114](https://github.com/bernardopg/ioruba/commit/0c7c11461a621bea55e568c7514f5ae5e374ba6a))

## [0.1.0] - 2025-12-22

### Added

- Initial tagged baseline before the current Haskell-first productization pass

[Unreleased]: https://github.com/bernardopg/ioruba/compare/v0.6.7...HEAD
[0.6.7]: https://github.com/bernardopg/ioruba/releases/tag/v0.6.7
[0.6.6]: https://github.com/bernardopg/ioruba/releases/tag/v0.6.6
[0.6.4]: https://github.com/bernardopg/ioruba/releases/tag/v0.6.4
[0.6.3]: https://github.com/bernardopg/ioruba/releases/tag/v0.6.3
[0.6.2]: https://github.com/bernardopg/ioruba/releases/tag/v0.6.2
[0.6.1]: https://github.com/bernardopg/ioruba/releases/tag/v0.6.1
[0.6.0]: https://github.com/bernardopg/ioruba/releases/tag/v0.6.0
[0.5.0]: https://github.com/bernardopg/ioruba/releases/tag/v0.5.0
[0.4.0]: https://github.com/bernardopg/ioruba/releases/tag/v0.4.0
[0.3.0]: https://github.com/bernardopg/ioruba/releases/tag/v0.3.0
[0.1.0]: https://github.com/bernardopg/ioruba/releases/tag/v0.1.0
