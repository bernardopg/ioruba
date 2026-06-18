#!/usr/bin/env sh
# Ioruba cross-platform installer for Linux and macOS.
#
# Detects the OS and architecture, downloads the matching asset from the latest
# GitHub release (or a tag passed with --version), verifies it against
# SHA256SUMS.txt when available, and installs it:
#   - Linux : AppImage (default, rootless) into ~/.local/bin; or --type deb|rpm
#   - macOS : the .app bundle for the host architecture into /Applications
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/bernardopg/ioruba/main/scripts/install.sh | sh
#   ./install.sh --version v1.1.0 --type deb --dir ~/bin
#
# Environment overrides: IORUBA_REPO, IORUBA_INSTALL_DIR.
set -eu

REPO="${IORUBA_REPO:-bernardopg/ioruba}"
VERSION="latest"
LINUX_TYPE="appimage"
INSTALL_DIR="${IORUBA_INSTALL_DIR:-}"

log() { printf '\033[36m▸\033[0m %s\n' "$1" >&2; }
warn() { printf '\033[33m!\033[0m %s\n' "$1" >&2; }
die() { printf '\033[31m✗\033[0m %s\n' "$1" >&2; exit 1; }

while [ $# -gt 0 ]; do
    case "$1" in
        --version) VERSION="${2:?--version needs a value}"; shift 2 ;;
        --type) LINUX_TYPE="${2:?--type needs a value}"; shift 2 ;;
        --dir) INSTALL_DIR="${2:?--dir needs a value}"; shift 2 ;;
        -h|--help)
            sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'
        exit 0 ;;
        *) die "Unknown argument: $1" ;;
    esac
done

command -v curl >/dev/null 2>&1 || die "curl is required."

OS="$(uname -s)"
ARCH="$(uname -m)"

# Resolve the release tag.
api_base="https://api.github.com/repos/${REPO}/releases"
if [ "$VERSION" = "latest" ]; then
    api_url="${api_base}/latest"
else
    api_url="${api_base}/tags/${VERSION}"
fi

log "Querying ${REPO} release: ${VERSION}"
release_json="$(curl -fsSL "$api_url")" || die "Failed to fetch release metadata."

# Pull the download URL for the first asset whose name matches a pattern.
asset_url_for() {
    # $1: extended-regex pattern matched against asset file names.
    printf '%s\n' "$release_json" \
    | grep -o '"browser_download_url": *"[^"]*"' \
    | sed 's/.*"browser_download_url": *"\([^"]*\)".*/\1/' \
    | grep -E "$1" \
    | head -n1
}

# Map the host architecture to the tokens tauri uses in asset names.
case "$ARCH" in
    x86_64|amd64) DEB_ARCH="amd64"; RPM_ARCH="x86_64"; MAC_ARCH="x64" ;;
    aarch64|arm64) DEB_ARCH="arm64"; RPM_ARCH="aarch64"; MAC_ARCH="aarch64" ;;
    *) die "Unsupported architecture: ${ARCH}" ;;
esac

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# Verify a downloaded file against SHA256SUMS.txt when the release ships one.
verify_checksum() {
    file_path="$1"
    file_name="$(basename "$file_path")"
    sums_url="$(asset_url_for 'SHA256SUMS\.txt$')"
    if [ -z "$sums_url" ]; then
        warn "No SHA256SUMS.txt in this release; skipping checksum verification."
        return 0
    fi
    curl -fsSL "$sums_url" -o "$tmp/SHA256SUMS.txt" || { warn "Could not download checksums."; return 0; }
    expected="$(grep -F "$file_name" "$tmp/SHA256SUMS.txt" | awk '{print $1}' | head -n1)"
    if [ -z "$expected" ]; then
        warn "No checksum entry for ${file_name}; skipping."
        return 0
    fi
    if command -v sha256sum >/dev/null 2>&1; then
        actual="$(sha256sum "$file_path" | awk '{print $1}')"
    else
        actual="$(shasum -a 256 "$file_path" | awk '{print $1}')"
    fi
    [ "$expected" = "$actual" ] || die "Checksum mismatch for ${file_name}."
    log "Checksum verified for ${file_name}."
}

download() {
    url="$1"; out="$2"
    [ -n "$url" ] || die "No matching release asset found for this platform."
    log "Downloading $(basename "$url")"
    curl -fSL --progress-bar "$url" -o "$out"
}

# Resolve an asset URL, download it under its original file name (so the
# checksum entry matches), verify it, and echo the local path.
fetch_asset() {
    url="$1"
    [ -n "$url" ] || die "No matching release asset found for this platform."
    out="$tmp/$(basename "$url")"
    download "$url" "$out"
    verify_checksum "$out"
    printf '%s\n' "$out"
}

install_linux() {
    case "$LINUX_TYPE" in
        appimage)
            out="$(fetch_asset "$(asset_url_for "_(${DEB_ARCH}|${RPM_ARCH})\.AppImage$|\.AppImage$")")"
            dir="${INSTALL_DIR:-$HOME/.local/bin}"
            mkdir -p "$dir"
            install -m 0755 "$out" "$dir/ioruba.AppImage"
            log "Installed to ${dir}/ioruba.AppImage"
            case ":$PATH:" in
                *":$dir:"*) printf '\033[32m✓\033[0m Run: ioruba.AppImage\n' >&2 ;;
                *) warn "Add ${dir} to PATH, then run: ioruba.AppImage" ;;
            esac
        ;;
        deb)
            out="$(fetch_asset "$(asset_url_for "_${DEB_ARCH}\.deb$|\.deb$")")"
            log "Installing .deb (sudo required)"
            sudo apt-get install -y "$out" || sudo dpkg -i "$out"
            printf '\033[32m✓\033[0m Installed. Run: ioruba\n' >&2
        ;;
        rpm)
            out="$(fetch_asset "$(asset_url_for "${RPM_ARCH}\.rpm$|\.rpm$")")"
            log "Installing .rpm (sudo required)"
            sudo rpm -i --replacepkgs "$out" || sudo dnf install -y "$out"
            printf '\033[32m✓\033[0m Installed. Run: ioruba\n' >&2
        ;;
        *) die "Unknown --type '${LINUX_TYPE}' (use appimage, deb, or rpm)." ;;
    esac
}

install_macos() {
    out="$(fetch_asset "$(asset_url_for "_${MAC_ARCH}\.app\.tar\.gz$")")"
    tar -xzf "$out" -C "$tmp"
    app="$(find "$tmp" -maxdepth 1 -name '*.app' | head -n1)"
    [ -n "$app" ] || die "No .app bundle inside the archive."
    dest="${INSTALL_DIR:-/Applications}"
    if [ ! -w "$dest" ]; then
        dest="$HOME/Applications"
        mkdir -p "$dest"
        warn "/Applications not writable; installing to ${dest}"
    fi
    app_name="$(basename "$app")"
    [ -n "$app_name" ] || die "Could not resolve the app bundle name."
    rm -rf "${dest:?}/${app_name}"
    cp -R "$app" "$dest/"
    # Strip the quarantine flag so Gatekeeper does not block an unsigned build.
    xattr -dr com.apple.quarantine "${dest}/${app_name}" 2>/dev/null || true
    printf '\033[32m✓\033[0m Installed to %s/%s\n' "$dest" "$app_name" >&2
}

case "$OS" in
    Linux) install_linux ;;
    Darwin) install_macos ;;
    *) die "Unsupported OS '${OS}'. On Windows use scripts/install.ps1." ;;
esac
