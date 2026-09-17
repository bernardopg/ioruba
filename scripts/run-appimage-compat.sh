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

# WebKitGTK embutido no AppImage nao cria display EGL contra o Mesa do host
# (EGL_BAD_PARAMETER -> abort -> coredump SIGABRT). Desativa o renderer DMABUF.
# Diagnosticado em 2026-09-14 em sessao local (wrapper instalado a mao) e
# formalizado aqui em 2026-09-17 junto ao fix do strip do AUR: sem esta linha
# o WebKit do bundle aborta no autostart sob Mesa 26 + Iris Xe.
export WEBKIT_DISABLE_DMABUF_RENDERER=1

if [ ! -x "${APPDIR}/AppRun" ]; then
    rm -rf "$RUNTIME_DIR"
    mkdir -p "$RUNTIME_DIR"
    (
        cd "$RUNTIME_DIR"
        "$APPIMAGE_ABS" --appimage-extract >/dev/null
    )
fi

# linuxdeploy bundles parts of the display ABI from the old build image while
# Mesa/EGL comes from the host.  On rolling distros (Mesa 26+) that mixture
# aborts WebKitWebProcess with EGL_BAD_ALLOC and leaves Tauri's grey window
# behind.  These libraries must form one host-provided ABI set.  Run the cleanup
# on every launch so caches created by an older version of this wrapper are
# repaired too.  See tauri-apps/tauri#15976.
for library in \
    libwayland-client.so.0 \
    libwayland-cursor.so.0 \
    libwayland-egl.so.1 \
    libwayland-server.so.0 \
    libxkbcommon.so.0 \
    libxcb-randr.so.0 \
    libxcb-render.so.0 \
    libxcb-shm.so.0 \
    libXau.so.6 \
    libXdmcp.so.6
do
    find "${APPDIR}/usr/lib" -type f -name "$library" -delete 2>/dev/null || true
    find "${APPDIR}/usr/lib" -type l -name "$library" -delete 2>/dev/null || true
done

if [ ! -x "${APPDIR}/AppRun" ]; then
    echo "Falha ao preparar runtime compativel para ${APP_BASENAME}" >&2
    exit 1
fi

exec "${APPDIR}/AppRun" "$@"
