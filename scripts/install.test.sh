#!/usr/bin/env bash
# Tests for the asset-selection logic in scripts/install.sh.
#
# The installer is piped straight into `sh` from a README one-liner, so picking
# the wrong asset is not a warning — it is an x86_64 binary landing on an arm64
# machine. These tests source the script as a library (IORUBA_INSTALL_SH_LIB=1
# stops it from running `main`) and drive the helpers against fixture release
# payloads, so no network is involved.
#
# The variables assigned below (release_json, VERSION, OS, ARCH, ...) are the
# inputs the sourced install.sh helpers read. shellcheck analyses this file on
# its own and cannot see those readers, so it calls every one of them unused.
# shellcheck disable=SC2034

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

failures=0
checks=0

check() {
    local label="$1" expected="$2" actual="$3"
    checks=$((checks + 1))
    if [ "$expected" = "$actual" ]; then
        printf '  ok   %s\n' "$label"
    else
        printf '  FAIL %s\n       expected: %s\n       actual:   %s\n' \
            "$label" "$expected" "$actual"
        failures=$((failures + 1))
    fi
}

# A release payload shaped like the real GitHub API response, listing only the
# assets the project actually publishes today (linux x86_64, windows, macOS on
# both arches).
release_fixture() {
    local base="https://github.com/bernardopg/ioruba/releases/download/v1.7.1"
    local name
    printf '{"assets":['
    local first=1
    for name in \
        "Ioruba_1.7.1_amd64.AppImage" \
        "Ioruba_1.7.1_amd64.deb" \
        "Ioruba-1.7.1-1.x86_64.rpm" \
        "Ioruba_1.7.1_x64-setup.exe" \
        "Ioruba_1.7.1_x64_en-US.msi" \
        "Ioruba_1.7.1_x64.app.tar.gz" \
        "Ioruba_1.7.1_aarch64.app.tar.gz" \
        "SHA256SUMS.txt"; do
        [ "$first" = 1 ] || printf ','
        first=0
        printf '{"browser_download_url": "%s/%s"}' "$base" "$name"
    done
    printf ']}'
}

IORUBA_INSTALL_SH_LIB=1
export IORUBA_INSTALL_SH_LIB
# shellcheck source=/dev/null
. "${SCRIPT_DIR}/install.sh"
# install.sh sets -e for its own run. Several checks below deliberately drive
# helpers that abort, so errexit has to come back off in the harness.
set +e

release_json="$(release_fixture)"
VERSION="v1.7.1"

echo "asset_url_for"
check "picks the amd64 AppImage" \
    "Ioruba_1.7.1_amd64.AppImage" \
    "$(basename "$(asset_url_for '_(amd64|x86_64)\.AppImage$')")"

check "picks the aarch64 macOS bundle, not the x64 one" \
    "Ioruba_1.7.1_aarch64.app.tar.gz" \
    "$(basename "$(asset_url_for '_aarch64\.app\.tar\.gz$')")"

check "returns nothing when no asset matches" \
    "" \
    "$(asset_url_for '_arm64\.deb$')"

release_json='{"assets":[{"browser_download_url":"https://example.invalid/Ioruba_a.AppImage"},{"browser_download_url":"https://example.invalid/Ioruba_b.AppImage"}]}'
check "refuses an ambiguous asset match" \
    "" \
    "$(asset_url_for '\.AppImage$')"
release_json="$(release_fixture)"

echo "require_asset_url"
OS="Linux"; ARCH="x86_64"
check "resolves an existing asset" \
    "Ioruba_1.7.1_amd64.deb" \
    "$(basename "$(require_asset_url '_amd64\.deb$' 'amd64 .deb' 2>/dev/null)")"

# The regression this whole change is about: the old patterns ended in
# `|\.deb$`, so an arm64 host with no arm64 build fell through to the amd64
# asset and installed it.
OS="Linux"; ARCH="aarch64"
arm_stdout="$(require_asset_url '_arm64\.deb$' 'arm64 .deb' 2>/dev/null)"
check "refuses to substitute another architecture" "" "$arm_stdout"

arm_stderr="$(require_asset_url '_arm64\.deb$' 'arm64 .deb' 2>&1 >/dev/null)"
check "names the missing artifact" "yes" \
    "$(case "$arm_stderr" in *"No arm64 .deb in release v1.7.1"*) echo yes ;; *) echo no ;; esac)"

check "reports the host it gave up on" "yes" \
    "$(case "$arm_stderr" in *"Nothing to install for Linux aarch64"*) echo yes ;; *) echo no ;; esac)"

check "lists what the release does ship" "yes" \
    "$(case "$arm_stderr" in *"Ioruba_1.7.1_amd64.deb"*) echo yes ;; *) echo no ;; esac)"

echo "resolve_arch"
ARCH="aarch64"; resolve_arch
check "maps aarch64 to tauri tokens" "arm64 aarch64 aarch64" "$DEB_ARCH $RPM_ARCH $MAC_ARCH"

ARCH="arm64"; resolve_arch
check "maps darwin's arm64 spelling too" "arm64 aarch64 aarch64" "$DEB_ARCH $RPM_ARCH $MAC_ARCH"

ARCH="x86_64"; resolve_arch
check "maps x86_64 to tauri tokens" "amd64 x86_64 x64" "$DEB_ARCH $RPM_ARCH $MAC_ARCH"

ARCH="riscv64"
check "rejects an architecture with no builds" "1" \
    "$( (resolve_arch) >/dev/null 2>&1; echo $?)"

echo "checksum_for"
sums_file="$(mktemp)"
trap 'rm -f "$sums_file"' EXIT
printf '%s  ./Ioruba_1.7.1_amd64.deb\n%s  Ioruba_1.7.1_amd64.deb.bak\n' \
    "$(printf 'a%.0s' {1..64})" "$(printf 'b%.0s' {1..64})" > "$sums_file"
check "normalizes sha256sum's ./ filename prefix" "$(printf 'a%.0s' {1..64})" \
    "$(checksum_for "Ioruba_1.7.1_amd64.deb" "$sums_file")"
check "does not accept a longer filename as a checksum match" "" \
    "$(checksum_for "Ioruba_1.7.1_amd64" "$sums_file")"

rm -f "$sums_file"
trap - EXIT

echo "verify_checksum"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
printf 'payload' > "$tmp/Ioruba.AppImage"
release_json='{"assets":[]}'
VERSION="v1.8.2"
check "refuses an install when SHA256SUMS.txt is missing" "1" \
    "$( (verify_checksum "$tmp/Ioruba.AppImage") >/dev/null 2>&1; echo $?)"

release_json='{"assets":[{"browser_download_url":"https://example.invalid/SHA256SUMS.txt"}]}'
# shellcheck disable=SC2329 # Invoked indirectly by verify_checksum.
checksum_for() { return 0; }
# shellcheck disable=SC2329 # Invoked indirectly by verify_checksum.
curl() { printf '%064d  ./different-file\n' 0 > "$4"; }
check "refuses an install when the exact checksum entry is missing" "1" \
    "$( (verify_checksum "$tmp/Ioruba.AppImage") >/dev/null 2>&1; echo $?)"
unset -f checksum_for curl
rm -rf "$tmp"
trap - EXIT

echo "empty release"
release_json='{"assets":[]}'
OS="Darwin"; ARCH="arm64"
check "handles a release with no assets at all" "1" \
    "$( (require_asset_url '_aarch64\.app\.tar\.gz$' 'aarch64 .app bundle') >/dev/null 2>&1; echo $?)"

printf '\n%d checks, %d failures\n' "$checks" "$failures"
[ "$failures" -eq 0 ]
