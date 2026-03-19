# Testing Guide for Ioruba

## Core validation loop

For a clean local validation pass, run:

```bash
stack build
stack test
python .github/scripts/build_pages.py
python .github/scripts/sync_repo_metadata.py --dry-run
```

## Serial communication

### Test with the real Nano

1. Flash [arduino/ioruba-nano-3knobs/ioruba-nano-3knobs.ino](arduino/ioruba-nano-3knobs/ioruba-nano-3knobs.ino)
2. Confirm the board appears as `/dev/ttyUSB0` or `/dev/ttyACM0`
3. Run:

```bash
stack exec test-serial /dev/ttyUSB0
```

Expected packet format:

```text
512|768|1023
```

The runtime also accepts the legacy format:

```text
P1:512
P2:768
P3:1023
```

### Test without hardware

Pipe simulator output directly into the serial test utility:

```bash
python3 scripts/arduino-simulator.py --mode static | stack exec test-serial /dev/stdin
```

Use a named pipe when you want to mimic a more realistic serial source:

```bash
mkfifo /tmp/ioruba-sim
python3 scripts/arduino-simulator.py > /tmp/ioruba-sim &
stack exec test-serial /tmp/ioruba-sim
```

## Runtime validation

Run the full Haskell runtime:

```bash
stack exec ioruba
```

What to verify:

- it loads `config/nano-3knobs.yaml` or your explicit `--config` file
- it auto-detects the Nano serial port
- it reconnects if the device disappears
- knob updates change the live dashboard
- app and microphone targets resolve without crashing

If you only want a short smoke run:

```bash
timeout 5s stack exec ioruba
```

## Audio backend checks

Before blaming the runtime, check the host audio stack:

```bash
pactl info
wpctl status
pactl list short sink-inputs
```

Interpretation:

- `pactl info` must succeed
- `wpctl status` should show your active PipeWire graph
- `pactl list short sink-inputs` should list app streams if you expect knob-to-app control

## Pages and metadata

Build the static site locally:

```bash
python .github/scripts/build_pages.py
find .site-dist -maxdepth 2 -type f | sort
```

Dry-run repository metadata sync:

```bash
python .github/scripts/sync_repo_metadata.py --dry-run
```

## Troubleshooting

### Permission denied on `/dev/ttyUSB0`

```bash
sudo usermod -a -G dialout $USER
sudo usermod -a -G uucp $USER
```

Then log out and back in.

### Upload fails with `not in sync`

- try `arduino:avr:nano:cpu=atmega328old`
- press `RESET` right before upload starts
- run `fuser -v /dev/ttyUSB0` to confirm nothing else owns the port

### No data from the board

- confirm `9600` baud
- verify the firmware is flashed
- check the knob wiring on `A0`, `A1`, and `A2`
- inspect Arduino IDE Serial Monitor first

### No app volume changes

- make sure the target application is actively playing audio
- confirm the configured application names in `config/*.yaml`
- check `pactl list short sink-inputs`

## Recommended release gate

Before merging a release PR or cutting a public release, verify:

1. `stack build` passes
2. `stack test` passes
3. the Nano runtime works on real hardware
4. `python .github/scripts/build_pages.py` passes
5. repository metadata dry-run still matches the intended public copy
