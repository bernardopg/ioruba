#!/usr/bin/env sh
set -eu

if [ "$#" -lt 1 ]; then
    echo "Uso: $0 <caminho-do-AppImage> [args...]" >&2
    exit 1
fi

APPIMAGE="$1"
shift || true

if [ ! -f "$APPIMAGE" ]; then
    echo "AppImage nao encontrado: $APPIMAGE" >&2
    exit 1
fi

if [ ! -x "$APPIMAGE" ]; then
    chmod +x "$APPIMAGE"
fi

APPIMAGE_ABS="$(readlink -f "$APPIMAGE")"
APP_BASENAME="$(basename "$APPIMAGE_ABS")"
APP_SHA="$(sha256sum "$APPIMAGE_ABS" | awk '{print $1}')"
CACHE_ROOT="${XDG_CACHE_HOME:-${HOME}/.cache}/ioruba/appimage-runtime"
RUNTIME_DIR="${CACHE_ROOT}/${APP_SHA}"
APPDIR="${RUNTIME_DIR}/squashfs-root"

if [ ! -x "${APPDIR}/AppRun" ]; then
    rm -rf "$RUNTIME_DIR"
    mkdir -p "$RUNTIME_DIR"
    (
        cd "$RUNTIME_DIR"
        "$APPIMAGE_ABS" --appimage-extract >/dev/null
    )
    
    rm -f \
    "${APPDIR}/usr/lib/libwayland-egl.so.1" \
    "${APPDIR}/usr/lib/libwayland-client.so.0" \
    "${APPDIR}/usr/lib/libwayland-cursor.so.0" \
    "${APPDIR}/usr/lib/libwayland-server.so.0"
fi

if [ ! -x "${APPDIR}/AppRun" ]; then
    echo "Falha ao preparar runtime compativel para ${APP_BASENAME}" >&2
    exit 1
fi

exec "${APPDIR}/AppRun" "$@"
