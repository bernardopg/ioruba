#!/bin/bash
export PYTHONPATH="/usr/lib/python3.13/site-packages:$PYTHONPATH"
cd ~/development/arduino_audio_controller
source venv/bin/activate
python audio_controller_gui.py
