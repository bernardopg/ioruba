---
title: "Getting Started"
lang: en
layout: doc
permalink: /guides/getting-started.html
source_path: QUICKSTART.md
---
# Getting Started with Ioruba

The canonical, complete guide is the generated [Quick Start](../root/QUICKSTART.html). This short route keeps old bookmarks working.

## Fast path

1. [Install Ioruba](../root/README.html#install) or clone the repository and run `npm install`.
2. [Wire the controller](hardware-setup.html).
3. [Flash the Nano](../root/NANO_SETUP.html) at the current default of **115200 baud**.
4. Launch an installed app or run `npm run desktop:watch`.
5. Confirm the protocol-2 handshake and frames such as `512|768|1023` in Watch.
6. Configure targets in **Settings → Profile editor**.

Linux supports master/application/sink/source targets through `pactl`; Windows and macOS currently support default-output master volume only.

Continue to the [full Quick Start](../root/QUICKSTART.html) for permissions, profiles, calibration, desktop behavior, recovery, and troubleshooting.
