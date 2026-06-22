---
title: "Ioruba Documentation"
lang: en
layout: home
permalink: /
source_path: docs/index.md
---
# Ioruba Documentation

Ioruba turns an `Arduino Nano + 3 knobs` into a tactile control deck for desktop audio workflows.

This GitHub Pages hub is organized for the real path users take in the project:

1. understand the product surface,
2. wire and flash the hardware,
3. validate the desktop app,
4. troubleshoot audio and serial issues,
5. contribute, translate, and ship updates.

## 🚀 Start here

- [Quick Start Guide](root/QUICKSTART.html) — fastest path to a working session
- [Project README](root/README.html) — full repository overview
- [Nano Setup](root/NANO_SETUP.html) — flash the Arduino board

## 📖 Practical guides

- [Hardware Setup](guides/hardware-setup.html) — wiring the potentiometers
- [Profile Examples](guides/profile-examples.html) — JSON profiles and Linux target matching
- [Translation Guide](guides/translation-guide.html) — how translations work
- [Support Playbook](debug/support.html) — troubleshooting serial, audio, and profiles

## ⚙️ Project operations

- [Testing](root/TESTING.html) — validation matrix and smoke tests
- [Contributing](root/CONTRIBUTING.html) — guidelines for contributors
- [Funding](root/FUNDING.html) — support the project
- [Roadmap](root/TODO.html) — upcoming features
- [Changelog](root/CHANGELOG.html) — release history

## 🔄 Migration notes

- [Complete Migration Plan](migration/complete-plan.html)
- [GitHub Migration Plan](migration/github-plan.html)
- [Logic Parity Audit](migration/logic-audit.html)

## 🌐 Portuguese docs

- [PT-BR Index](translations/pt-br/README.html)

---

## 📋 Quick reference

### Default knob mapping

| Knob | Target |
|------|--------|
| 1 | Master volume |
| 2 | Applications (Spotify, Chrome, Firefox) |
| 3 | Default microphone |

### Serial protocol

```
HELLO board=Ioruba Nano; fw=0.5.1; protocol=2; knobs=3; threshold=4; deadzone=7; smooth=75
512|768|1023
```

### Common commands

```bash
# Install dependencies
npm install

# Verify the stack
npm run verify

# Compile firmware
npm run firmware:compile

# Launch desktop app
npm run desktop:watch
```

### Config directory

- Linux: `~/.config/io.ioruba.desktop/`
- macOS: `~/Library/Application Support/io.ioruba.desktop/`
- Windows: `%APPDATA%\\io.ioruba.desktop\\`

