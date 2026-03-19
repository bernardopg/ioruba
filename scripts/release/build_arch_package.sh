#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 VERSION OUTPUT_DIR" >&2
  exit 1
fi

version="$1"
output_dir="$(python3 - <<'PY' "$2"
import os, sys
print(os.path.abspath(sys.argv[1]))
PY
)"
pkgrel="${IORUBA_PKGREL:-1}"

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
build_root="$(mktemp -d "${TMPDIR:-/tmp}/ioruba-arch-package.XXXXXX")"
context_dir="${build_root}/arch-context"

cleanup() {
  if [ -d "${build_root}" ]; then
    rm -rf "${build_root}" 2>/dev/null || true
  fi
}

trap cleanup EXIT

mkdir -p "${output_dir}" "${context_dir}"

copy_context_file() {
  local source_path="$1"
  local target_name="$2"
  install -Dm644 "${source_path}" "${context_dir}/${target_name}"
}

copy_context_binary() {
  local source_path="$1"
  local target_name="$2"
  install -Dm755 "${source_path}" "${context_dir}/${target_name}"
}

copy_context_binary "${repo_root}/dist/ioruba" "ioruba"
copy_context_binary "${repo_root}/dist/test-serial" "test-serial"
copy_context_file "${repo_root}/assets/ioruba.desktop" "ioruba.desktop"
copy_context_file "${repo_root}/assets/icon.png" "ioruba.png"
copy_context_file "${repo_root}/config/ioruba.yaml" "ioruba.yaml"
copy_context_file "${repo_root}/config/nano-3knobs.yaml" "nano-3knobs.yaml"
copy_context_file "${repo_root}/config/example.yaml" "example.yaml"
copy_context_file "${repo_root}/arduino/ioruba-nano-3knobs/ioruba-nano-3knobs.ino" "ioruba-nano-3knobs.ino"

firmware_hex="$(find "${repo_root}/dist-firmware" -maxdepth 1 -name '*.hex' ! -name '*.with_bootloader.hex' -print -quit)"
if [ -z "${firmware_hex}" ]; then
  echo "No compiled firmware .hex file found in dist-firmware" >&2
  exit 1
fi
copy_context_file "${firmware_hex}" "ioruba-nano-3knobs.ino.hex"
firmware_hex_with_bootloader="$(find "${repo_root}/dist-firmware" -maxdepth 1 -name '*.with_bootloader.hex' -print -quit)"
if [ -z "${firmware_hex_with_bootloader}" ]; then
  echo "No compiled firmware with bootloader .hex file found in dist-firmware" >&2
  exit 1
fi
copy_context_file "${firmware_hex_with_bootloader}" "ioruba-nano-3knobs.ino.with_bootloader.hex"

copy_context_file "${repo_root}/README.md" "README.md"
copy_context_file "${repo_root}/CHANGELOG.md" "CHANGELOG.md"
copy_context_file "${repo_root}/PROJECT_SUMMARY.md" "PROJECT_SUMMARY.md"
copy_context_file "${repo_root}/LICENSE" "LICENSE"
copy_context_file "${repo_root}/packaging/arch/PKGBUILD" "PKGBUILD"

build_with_makepkg() {
  (
    cd "${context_dir}"
    export IORUBA_PKGVER="${version}"
    export IORUBA_PKGREL="${pkgrel}"
    makepkg --force --cleanbuild --nodeps --noconfirm
    makepkg --printsrcinfo > .SRCINFO
  )
}

build_with_docker() {
  local host_uid host_gid
  host_uid="$(id -u)"
  host_gid="$(id -g)"

  docker run --rm \
    -e IORUBA_PKGVER="${version}" \
    -e IORUBA_PKGREL="${pkgrel}" \
    -e HOST_UID="${host_uid}" \
    -e HOST_GID="${host_gid}" \
    -v "${context_dir}:/pkg" \
    -w /pkg \
    archlinux:latest \
    /bin/bash -lc '
      set -euo pipefail

      pacman -Syu --noconfirm base-devel >/dev/null
      group_name="$(getent group "${HOST_GID}" | cut -d: -f1 || true)"
      if [ -z "${group_name}" ]; then
        groupadd -g "${HOST_GID}" builder
        group_name="builder"
      fi

      user_name="$(getent passwd "${HOST_UID}" | cut -d: -f1 || true)"
      if [ -z "${user_name}" ]; then
        useradd -m -u "${HOST_UID}" -g "${HOST_GID}" builder
        user_name="builder"
      else
        usermod -g "${group_name}" "${user_name}"
      fi

      user_home="$(getent passwd "${user_name}" | cut -d: -f6)"
      mkdir -p "${user_home}"
      chown -R "${HOST_UID}:${HOST_GID}" "${user_home}" /pkg

      su "${user_name}" -s /bin/bash -c "cd /pkg && IORUBA_PKGVER=${IORUBA_PKGVER} IORUBA_PKGREL=${IORUBA_PKGREL} makepkg --force --cleanbuild --nodeps --noconfirm"
      su "${user_name}" -s /bin/bash -c "cd /pkg && IORUBA_PKGVER=${IORUBA_PKGVER} IORUBA_PKGREL=${IORUBA_PKGREL} makepkg --printsrcinfo > .SRCINFO"

      chown -R "${HOST_UID}:${HOST_GID}" /pkg
    '
}

if command -v makepkg >/dev/null 2>&1; then
  build_with_makepkg
elif command -v docker >/dev/null 2>&1; then
  build_with_docker
else
  echo "Neither makepkg nor docker is available to build the Arch package" >&2
  exit 1
fi

package_path="$(find "${context_dir}" -maxdepth 1 -name 'ioruba-*.pkg.tar.zst' ! -name 'ioruba-debug-*.pkg.tar.zst' -print -quit)"
if [ -z "${package_path}" ]; then
  echo "Failed to produce an Arch package" >&2
  exit 1
fi

install -Dm644 "${package_path}" "${output_dir}/$(basename "${package_path}")"
install -Dm644 "${context_dir}/PKGBUILD" "${output_dir}/ioruba-${version}-PKGBUILD"
install -Dm644 "${context_dir}/.SRCINFO" "${output_dir}/ioruba-${version}-SRCINFO"
