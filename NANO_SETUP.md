# Arduino Nano Setup with 3 Potentiometers

This guide matches the hardware path that now drives the Haskell runtime:

- `Arduino Nano ATmega328P`
- `3x B10K` potentiometers
- `A0`, `A1`, and `A2`
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

## Recommended firmware

Use:

- [arduino/ioruba-nano-3knobs/ioruba-nano-3knobs.ino](arduino/ioruba-nano-3knobs/ioruba-nano-3knobs.ino)

That sketch sends:

- smoothed readings
- heartbeat packets every `500ms`
- pipe-separated lines like `512|768|1023`

The runtime still accepts the legacy `P1:512` protocol for compatibility.

## Check the device

List serial devices:

```bash
ls -l /dev/ttyUSB* /dev/ttyACM*
python3 - <<'PY'
import serial.tools.list_ports
for port in serial.tools.list_ports.comports():
    print(port.device, "-", port.description)
PY
```

Typical Nano clone labels include `FT232R USB UART` or `CH340`.

## Linux permissions

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

Standard Nano profile:

```bash
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:nano arduino/ioruba-nano-3knobs
```

Old bootloader profile for clones:

```bash
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:nano:cpu=atmega328old arduino/ioruba-nano-3knobs
```

## If upload fails

Common symptoms:

- `not in sync`
- `unable to read signature data`
- the board appears as `Unknown` in `arduino-cli board list`

Practical fixes:

- try both Nano processor profiles
- press `RESET` right before upload starts
- make sure no app is holding `/dev/ttyUSB0`
- swap the USB cable
- confirm the board really is a Nano-compatible `ATmega328P`
- if necessary, reburn the bootloader with an ISP programmer

## Validate serial output

With the board flashed, you should see:

```text
512|768|1023
```

Quick serial smoke test:

```bash
stack exec test-serial /dev/ttyUSB0
```

## Validate the Haskell runtime

Run:

```bash
stack exec ioruba
```

Expected behavior:

- the runtime auto-detects the serial port
- a live dashboard appears in the terminal
- knob 1 controls `master`
- knob 2 can control configured application streams
- knob 3 controls `default_microphone`

## Useful debug checks

Is something already holding the port?

```bash
fuser -v /dev/ttyUSB0
```

List active audio applications:

```bash
pactl list short sink-inputs
```

If the runtime connects but reports no readings:

- reflash the Nano
- verify `9600` baud
- confirm the firmware is sending output in the serial monitor
- check whether the knobs are wired to `A0`, `A1`, and `A2`
