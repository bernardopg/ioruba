#!/usr/bin/env python3
"""
Arduino Simulator for Iarubá
Simulates an Arduino sending slider values over serial.
"""

import time
import random
import argparse
import sys

def simulate_sliders(num_sliders=5, mode='random', interval=0.05):
    """
    Simulate slider values and print them in Arduino format.

    Args:
        num_sliders: Number of sliders to simulate
        mode: 'random', 'sweep', or 'static'
        interval: Time between updates in seconds
    """

    # Initialize slider values
    values = [512] * num_sliders  # Start at middle position

    print(f"🎚️  Arduino Simulator Started ({mode} mode)", file=sys.stderr)
    print(f"   Simulating {num_sliders} sliders", file=sys.stderr)
    print(f"   Update interval: {interval * 1000}ms", file=sys.stderr)
    print(f"   Output: stdout (pipe to socat or serial port)", file=sys.stderr)
    print("", file=sys.stderr)

    iteration = 0

    try:
        while True:
            if mode == 'random':
                # Random walk - small incremental changes
                for i in range(num_sliders):
                    change = random.randint(-50, 50)
                    values[i] = max(0, min(1023, values[i] + change))

            elif mode == 'sweep':
                # Sweep through values
                for i in range(num_sliders):
                    values[i] = int(512 + 511 * (iteration % 100) / 100)

            elif mode == 'static':
                # Keep values constant
                pass

            # Format and output values
            output = '|'.join(str(v) for v in values)
            print(output, flush=True)

            iteration += 1
            time.sleep(interval)

    except KeyboardInterrupt:
        print("\n🛑 Simulator stopped", file=sys.stderr)
        sys.exit(0)

def main():
    parser = argparse.ArgumentParser(
        description='Simulate Arduino slider output for Iarubá testing',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  # Random slider movements
  %(prog)s --mode random

  # Sweep through values
  %(prog)s --mode sweep

  # Test with socat (creates virtual serial ports)
  socat -d -d pty,raw,echo=0 pty,raw,echo=0
  # Then run simulator on one end and test-serial on the other

  # Pipe directly to test program
  %(prog)s | stack exec test-serial /dev/stdin
        '''
    )

    parser.add_argument(
        '--sliders', '-s',
        type=int,
        default=5,
        help='Number of sliders to simulate (default: 5)'
    )

    parser.add_argument(
        '--mode', '-m',
        choices=['random', 'sweep', 'static'],
        default='random',
        help='Simulation mode (default: random)'
    )

    parser.add_argument(
        '--interval', '-i',
        type=float,
        default=0.05,
        help='Update interval in seconds (default: 0.05 = 50ms)'
    )

    args = parser.parse_args()

    simulate_sliders(
        num_sliders=args.sliders,
        mode=args.mode,
        interval=args.interval
    )

if __name__ == '__main__':
    main()
