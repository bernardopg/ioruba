#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv"
PYTHON_BIN="$VENV_DIR/bin/python"
PIP_BIN="$VENV_DIR/bin/pip"
LOG_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/ioruba-controlador"
LOG_FILE="$LOG_DIR/gui.log"

mkdir -p "$LOG_DIR"

if [[ ! -x "$PYTHON_BIN" ]]; then
  python3 -m venv --system-site-packages "$VENV_DIR"
fi

if ! "$PYTHON_BIN" -c "import gi, pulsectl, serial" >/dev/null 2>&1; then
  "$PIP_BIN" install --disable-pip-version-check -r "$SCRIPT_DIR/requirements.txt"
fi

cd "$SCRIPT_DIR"

if [[ -t 1 ]]; then
  exec "$PYTHON_BIN" "$SCRIPT_DIR/audio_controller_gui.py" "$@"
else
  exec "$PYTHON_BIN" "$SCRIPT_DIR/audio_controller_gui.py" "$@" >>"$LOG_FILE" 2>&1
fi
