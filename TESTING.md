# Testing Guide for Ioruba

## Testing Serial Communication

### Option 1: Test with Arduino Simulator (No Hardware Required)

The easiest way to test without Arduino hardware:

```bash
# Method A: Using named pipes
mkfifo /tmp/arduino-sim
./scripts/arduino-simulator.py > /tmp/arduino-sim &
stack exec test-serial /tmp/arduino-sim

# Method B: Using socat (virtual serial ports)
# Terminal 1: Create virtual serial ports
socat -d -d pty,raw,echo=0,link=/tmp/vserial1 pty,raw,echo=0,link=/tmp/vserial2

# Terminal 2: Run simulator
./scripts/arduino-simulator.py > /tmp/vserial1

# Terminal 3: Run test program
stack exec test-serial /tmp/vserial2
```

### Option 2: Test with Real Arduino

1. **Upload Firmware:**
   ```bash
   # Open Arduino IDE
   # File → Open → arduino/ioruba-mixer/ioruba-mixer.ino
   # Tools → Board → Arduino Uno (or your board)
   # Tools → Port → /dev/ttyUSB0 (or your port)
   # Click Upload
   ```

2. **Find Arduino Port:**
   ```bash
   ls /dev/ttyUSB* /dev/ttyACM*
   # Should show something like /dev/ttyUSB0
   ```

3. **Test Serial Monitor:**
   ```bash
   # In Arduino IDE: Tools → Serial Monitor
   # Set baud rate to 9600
   # You should see: 512|768|1023|0|256
   ```

4. **Run Ioruba Test:**
   ```bash
   stack exec test-serial /dev/ttyUSB0
   ```

## Expected Output

```
🔌 Connecting to Arduino on /dev/ttyUSB0 at 9600 baud...
✅ Connected!
📊 Reading slider values... (Ctrl+C to exit)

🎚️  Sliders: [0: 512] [1: 768] [2:1023] [3:   0] [4: 256]
   Volumes: [0: 50%] [1: 75%] [2:100%] [3:  0%] [4: 25%]

🎚️  Sliders: [0: 515] [1: 770] [2:1020] [3:   5] [4: 260]
   Volumes: [0: 50%] [1: 75%] [2: 99%] [3:  0%] [4: 25%]
...
```

## Troubleshooting

### Permission Denied on /dev/ttyUSB0

```bash
# Add yourself to dialout group
sudo usermod -a -G dialout $USER

# Log out and back in, then verify
groups | grep dialout
```

### No Data from Arduino

1. Check wiring - potentiometers connected to A0-A4
2. Check baud rate (should be 9600)
3. Try Arduino serial monitor first
4. Check if firmware is uploaded correctly

### Parse Errors

If you see parse errors, the Arduino might be sending data in wrong format. Expected format:
```
512|768|1023|0|256
```

### Simulator Not Working

```bash
# Make sure Python 3 is installed
python3 --version

# Make script executable
chmod +x scripts/arduino-simulator.py

# Test directly
./scripts/arduino-simulator.py --mode static
# Should output: 512|512|512|512|512
```

## Testing Different Modes

### Random Mode (Default)
```bash
./scripts/arduino-simulator.py --mode random
```
Simulates natural slider movements with small random changes.

### Sweep Mode
```bash
./scripts/arduino-simulator.py --mode sweep
```
All sliders sweep through their full range.

### Static Mode
```bash
./scripts/arduino-simulator.py --mode static
```
Sliders stay at middle position (512).

## Integration Test

Once serial communication works, test the full application:

```bash
# Run main application
stack exec ioruba

# In another terminal, move sliders
# Application should adjust volume
```

## Next Steps

After serial communication is working:
1. Test PulseAudio integration
2. Test volume control
3. Test profile switching
4. Test GUI (when implemented)
