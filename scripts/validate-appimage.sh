#!/usr/bin/env sh
set -eu

REQUIRE_LAUNCH=0

if [ "${1:-}" = "--require-launch" ]; then
    REQUIRE_LAUNCH=1
    shift
fi

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 [--require-launch] <path-to-AppImage>" >&2
    exit 1
fi

APPIMAGE="$1"

if [ ! -f "$APPIMAGE" ]; then
    echo "AppImage not found: $APPIMAGE" >&2
    exit 1
fi

if [ ! -x "$APPIMAGE" ]; then
    chmod +x "$APPIMAGE"
fi

APPIMAGE_ABS="$(readlink -f "$APPIMAGE")"
WORKDIR="$(mktemp -d)"
LOG_FILE="${WORKDIR}/appimage-launch.log"

cleanup() {
    rm -rf "$WORKDIR"
}
trap cleanup EXIT INT TERM

(
    cd "$WORKDIR"
    "$APPIMAGE_ABS" --appimage-extract >/dev/null
)

APPDIR="${WORKDIR}/squashfs-root"

if [ ! -x "${APPDIR}/AppRun" ]; then
    echo "Extracted AppImage does not contain an executable AppRun." >&2
    exit 1
fi

if ! find "$APPDIR" -maxdepth 4 -type f -name "*.desktop" | grep -q .; then
    echo "Extracted AppImage does not contain a desktop entry." >&2
    exit 1
fi

if [ ! -d "${APPDIR}/usr/bin" ] ||
! find "${APPDIR}/usr/bin" -maxdepth 1 -type f -perm -111 | grep -q .; then
    echo "Extracted AppImage does not contain an executable payload in usr/bin." >&2
    exit 1
fi

if [ "$REQUIRE_LAUNCH" -eq 0 ]; then
    echo "AppImage structure is valid: ${APPIMAGE_ABS}"
    exit 0
fi

if ! command -v xvfb-run >/dev/null 2>&1; then
    echo "--require-launch needs xvfb-run in PATH." >&2
    exit 1
fi

set +e
if command -v dbus-run-session >/dev/null 2>&1; then
    GDK_BACKEND=x11 \
    NO_AT_BRIDGE=1 \
    WEBKIT_DISABLE_DMABUF_RENDERER=1 \
    xvfb-run -a dbus-run-session -- timeout 15s "${APPDIR}/AppRun" >"$LOG_FILE" 2>&1
else
    GDK_BACKEND=x11 \
    NO_AT_BRIDGE=1 \
    WEBKIT_DISABLE_DMABUF_RENDERER=1 \
    xvfb-run -a timeout 15s "${APPDIR}/AppRun" >"$LOG_FILE" 2>&1
fi
STATUS="$?"
set -e

case "$STATUS" in
    0|124)
        echo "AppImage launch smoke passed: ${APPIMAGE_ABS}"
    ;;
    *)
        echo "AppImage launch smoke failed with exit code ${STATUS}." >&2
        cat "$LOG_FILE" >&2
        exit "$STATUS"
    ;;
esac
