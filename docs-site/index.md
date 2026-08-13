---
title: "Ioruba Documentation"
lang: en
layout: home
permalink: /
source_path: docs/index.md
---
# Ioruba Documentation

Build, configure, troubleshoot, and contribute to the Ioruba tactile desktop audio controller.

> Canonical content lives in the repository Markdown files. This Pages site is generated with `npm run docs:prepare-site`.

## Start here

- [Project overview](root/README.html) — product, platforms, installation, architecture
- [Quick start](root/QUICKSTART.html) — install/build, flash, connect, and configure
- [Hardware setup](guides/hardware-setup.html) — supported boards and wiring
- [Nano setup](root/NANO_SETUP.html) — reference controller firmware

## Configure and troubleshoot

- [Profile examples](guides/profile-examples.html) — profile schema, targets, and controls
- [Support playbook](debug/support.html) — serial, audio, state, update, and tray diagnosis
- [Testing](root/TESTING.html) — local checks, CI, hardware, and releases

## Architecture and project

- [Audio backend contract](guides/audio-backend-contract.html)
- [Release distribution](guides/release-distribution.html)
- [Translation guide](guides/translation-guide.html)
- [Contributing](root/CONTRIBUTING.html)
- [Roadmap](roadmap.html) and [executable backlog](root/TODO.html)
- [Changelog](root/CHANGELOG.html)

## Languages

- [PT-BR documentation](translations/pt-br/README.html)

## Quick reference

```text
Current firmware: 0.6.1
Serial default: 115200 baud
Protocol: 2
Reference frame: 512|768|1023
```

```bash
npm install
npm run verify
npm run firmware:compile
npm run desktop:watch
```
