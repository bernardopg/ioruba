# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Structure & Architecture
This project implements a physical volume mixer using an Arduino Nano and Python.
1.  **Arduino Firmware** (`arduino_audio_controller.ino`): Reads 3 potentiometers (A0, A1, A2) and streams values over Serial in the format `P<n>:<value>` (e.g., `P1:1023`).
2.  **Host Controller** (Python): Interfaces with the Arduino and PulseAudio.
    -   `audio_controller.py`: CLI-based controller.
    -   `audio_controller_gui.py`: GUI-based controller using GTK4 and LibAdwaita.
    -   **Communication:** Serial 9600 baud.
    -   **Audio Backend:** Uses `pulsectl` to interact with PulseAudio/PipeWire.

## Development Workflow

### Python Environment
The project uses a virtual environment for Python dependencies, but relies on system packages for GTK bindings.
- **Activate Env:** `source venv/bin/activate`
- **Install Deps:** `pip install pyserial pulsectl` (Note: `python-gobject`, `gtk4`, `libadwaita` must be installed via system package manager).
- **Run CLI:** `python audio_controller.py` (Args: `-a <app_name>` for customization).
- **Run GUI:** `python audio_controller_gui.py`.

### Arduino Firmware
Firmware is managed via `arduino-cli`.
- **Target Board:** Arduino Nano (ATmega328P Old Bootloader). FQBN: `arduino:avr:nano:cpu=atmega328old`.
- **Compile:** `arduino-cli compile --fqbn arduino:avr:nano:cpu=atmega328old arduino_audio_controller`
- **Upload:** `arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:nano:cpu=atmega328old arduino_audio_controller`
- **Serial Monitor:** `cat /dev/ttyUSB0` (Baud: 9600).

## Key Implementation Details
- **Volume Mapping:** Arduino values (0-1023) are mapped to PulseAudio float volume (0.0-1.0).
- **App Detection:** Partial string matching is used for application names in PulseAudio sink inputs (e.g., "chrome" matches "Google Chrome").
- **GUI Auto-Connect:** The GUI attempts to auto-detect the Arduino port on startup by looking for devices with "USB" or "ACM" in their name.
