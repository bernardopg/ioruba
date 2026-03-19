#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
BIN_DIR="$HOME/.local/bin"
APPS_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons/hicolor/128x128/apps"

mkdir -p "$BIN_DIR" "$APPS_DIR" "$ICON_DIR"

cat >"$BIN_DIR/audio-controller-gui" <<EOF
#!/usr/bin/env bash
exec "$SCRIPT_DIR/audio_controller_gui_wrapper.sh" "\$@"
EOF
chmod +x "$BIN_DIR/audio-controller-gui"

install -m 0644 "$SCRIPT_DIR/icon.png" "$ICON_DIR/audio-controller.png"
install -m 0644 "$SCRIPT_DIR/audio-controller.desktop" "$APPS_DIR/audio-controller.desktop"

update-desktop-database "$APPS_DIR" >/dev/null 2>&1 || true
gtk-update-icon-cache "$HOME/.local/share/icons/hicolor" >/dev/null 2>&1 || true

echo "Launcher instalado em: $APPS_DIR/audio-controller.desktop"
echo "Comando instalado em: $BIN_DIR/audio-controller-gui"
