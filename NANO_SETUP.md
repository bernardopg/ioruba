# Arduino Nano Setup with 3 Potentiometers

This guide matches the hardware flow currently supported by the repository:

- Arduino Nano ATmega328P
- 3 potentiometers
- `A0`, `A1`, `A2`
- `9600` baud serial

## Wiring

### Knob 1

- left pin -> `GND`
- center pin -> `A0`
- right pin -> `5V`

### Knob 2

- left pin -> `GND`
- center pin -> `A1`
- right pin -> `5V`

### Knob 3

- left pin -> `GND`
- center pin -> `A2`
- right pin -> `5V`

## Recommended Firmware

Use:

- [arduino/ioruba-nano-3knobs/ioruba-nano-3knobs.ino](arduino/ioruba-nano-3knobs/ioruba-nano-3knobs.ino)

That sketch now sends:

- smoothed readings
- heartbeat packets every `500ms`
- pipe-separated lines like `512|768|1023`

The desktop app also accepts the legacy `P1:512` protocol.

## Check the Device

List serial devices:

```bash
ls -l /dev/ttyUSB* /dev/ttyACM*
python3 - <<'PY'
import serial.tools.list_ports
for port in serial.tools.list_ports.comports():
    print(port.device, "-", port.description)
PY
```

Typical Nano clone outputs include `FT232R USB UART` or `CH340`.

## Linux Permissions

Depending on the distro, add your user to `dialout` or `uucp`:

```bash
sudo usermod -a -G dialout $USER
sudo usermod -a -G uucp $USER
```

Then log out and back in.

## Compile

```bash
arduino-cli compile --fqbn arduino:avr:nano arduino/ioruba-nano-3knobs
```

## Upload

Default Nano bootloader:

```bash
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:nano arduino/ioruba-nano-3knobs
```

Old bootloader variant for clones:

```bash
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:nano:cpu=atmega328old arduino/ioruba-nano-3knobs
```

## If Upload Fails

The host-side project can still be correct while the board upload fails.

Common symptoms:

- `not in sync`
- `unable to read signature data`
- the board appears as `Unknown` in `arduino-cli board list`

Practical fixes:

- try both Nano processor profiles
- press reset right before upload starts
- make sure no app is holding `/dev/ttyUSB0`
- swap the USB cable
- confirm the board is really a Nano ATmega328P clone and not another FTDI-backed board
- if needed, reburn the bootloader with an ISP programmer

## Validate Serial Output

With the board flashed, you should see lines like:

```text
512|768|1023
```

Quick serial smoke test:

```bash
stack exec test-serial /dev/ttyUSB0
```

## Validate the Desktop App

Install and run:

```bash
legacy/arduino-audio-controller/install_local.sh
audio-controller-gui
```

Expected behavior:

- the app detects the port automatically
- knob 1 can be mapped to master
- knob 2 and knob 3 can be mapped to apps or microphone
- the header language can be switched between `pt-BR` and `en`

## Useful Debug Checks

Is something already holding the port?

```bash
fuser -v /dev/ttyUSB0
```

List active audio applications:

```bash
legacy/arduino-audio-controller/audio_controller_gui_wrapper.sh --demo
```

If the UI connects but reports no readings:

- reflash the Nano
- verify `9600` baud
- confirm the firmware is sending output in the serial monitor
- check whether the knobs are actually wired to `A0`, `A1`, and `A2`
