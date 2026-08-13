# Ioruba Documentation

Ioruba is a tactile desktop audio controller built from microcontroller hardware, a cross-platform Tauri app, shared TypeScript domain logic, and native Rust audio backends.

Choose a path below. The Markdown in this repository is the canonical documentation; `npm run docs:prepare-site` generates the GitHub Pages source from it.

## Start here

- [README](../README.md) — product overview, platform support, installation, architecture, and repository map
- [Quick start](../QUICKSTART.md) — first installation/source build, controller connection, and audio setup
- [Hardware setup](guides/hardware-setup.md) — wiring, supported boards, knobs, buttons, and encoders
- [Arduino Nano setup](../NANO_SETUP.md) — compile, flash, and validate the reference controller

## Configure and operate

- [Profile examples and target matching](guides/profile-examples.md) — current JSON schema, slider targets, controls, and Linux matching rules
- [Support playbook](debug/support.md) — serial, audio, state, update, tray, and platform troubleshooting
- [Testing guide](../TESTING.md) — local commands, CI jobs, hardware smoke tests, and release validation

## Architecture and maintenance

- [Audio backend contract](guides/audio-backend-contract.md) — typed Rust ↔ TypeScript commands and platform dispatch
- [Release distribution](guides/release-distribution.md) — release artifacts, signed updater, package managers, macOS signing, and AUR details
- [Translation guide](guides/translation-guide.md) — PT-BR source strings, English/Spanish maps, and validation
- [Contributing](../CONTRIBUTING.md) — repository conventions and pull-request checklist

## Project status

- [Product roadmap](roadmap.md) — product direction and non-goals
- [Executable backlog](../TODO.md) — open implementation work and completed scrum context
- [Changelog](../CHANGELOG.md) — release history
- [Funding](../FUNDING.md) — ways to support maintenance

## Languages

- [PT-BR documentation index](translations/pt-br/README.md)

## Historical design records

Files under `docs/plans/` capture decisions and implementation context at a point in time. They are not current user manuals; use the documents above for present behavior.
