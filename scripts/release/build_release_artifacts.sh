#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  echo "Usage: $0 VERSION [OUTPUT_DIR]" >&2
  exit 1
fi

version="$1"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
output_dir="${2:-${repo_root}/release-dist}"
output_dir="$(python3 - <<'PY' "${output_dir}"
import os, sys
print(os.path.abspath(sys.argv[1]))
PY
)"
pkgrel="${IORUBA_PKGREL:-1}"
portable_root_name="ioruba-${version}-linux-x86_64"
portable_root="${output_dir}/${portable_root_name}"
firmware_root_name="ioruba-firmware-${version}"
firmware_root="${output_dir}/${firmware_root_name}"
temp_root="$(mktemp -d "${TMPDIR:-/tmp}/ioruba-release.XXXXXX")"

cleanup() {
  rm -rf "${temp_root}" "${portable_root}" "${firmware_root}"
}

trap cleanup EXIT

require_file() {
  local path="$1"
  if [ ! -f "${path}" ]; then
    echo "Required file not found: ${path}" >&2
    exit 1
  fi
}

copy_doc_set() {
  local destination="$1"
  install -Dm644 "${repo_root}/README.md" "${destination}/README.md"
  install -Dm644 "${repo_root}/CHANGELOG.md" "${destination}/CHANGELOG.md"
  install -Dm644 "${repo_root}/PROJECT_SUMMARY.md" "${destination}/PROJECT_SUMMARY.md"
  install -Dm644 "${repo_root}/LICENSE" "${destination}/LICENSE"
}

copy_firmware_directory() {
  local destination="$1"
  local firmware_file

  mkdir -p "${destination}"
  install -Dm644 "${repo_root}/arduino/ioruba-nano-3knobs/ioruba-nano-3knobs.ino" "${destination}/ioruba-nano-3knobs.ino"
  while IFS= read -r -d '' firmware_file; do
    install -Dm644 "${firmware_file}" "${destination}/$(basename "${firmware_file}")"
  done < <(find "${repo_root}/dist-firmware" -maxdepth 1 -type f -print0)
}

build_portable_bundle() {
  mkdir -p "${portable_root}/bin" "${portable_root}/config" "${portable_root}/firmware" "${portable_root}/docs" "${portable_root}/assets"
  install -Dm755 "${repo_root}/dist/ioruba" "${portable_root}/bin/ioruba"
  install -Dm755 "${repo_root}/dist/test-serial" "${portable_root}/bin/test-serial"
  install -Dm644 "${repo_root}/config/ioruba.yaml" "${portable_root}/config/ioruba.yaml"
  install -Dm644 "${repo_root}/config/nano-3knobs.yaml" "${portable_root}/config/nano-3knobs.yaml"
  install -Dm644 "${repo_root}/config/example.yaml" "${portable_root}/config/example.yaml"
  install -Dm644 "${repo_root}/arduino/ioruba-nano-3knobs/ioruba-nano-3knobs.ino" "${portable_root}/firmware/ioruba-nano-3knobs.ino"
  install -Dm644 "${repo_root}/assets/icon.png" "${portable_root}/assets/icon.png"
  install -Dm644 "${repo_root}/assets/ioruba.desktop" "${portable_root}/assets/ioruba.desktop"
  copy_firmware_directory "${portable_root}/firmware"
  copy_doc_set "${portable_root}/docs"
  (
    cd "${output_dir}"
    tar -czf "${portable_root_name}.tar.gz" "${portable_root_name}"
  )
}

build_firmware_bundle() {
  mkdir -p "${firmware_root}"
  copy_firmware_directory "${firmware_root}"
  (
    cd "${output_dir}"
    tar -czf "${firmware_root_name}.tar.gz" "${firmware_root_name}"
  )
}

build_deb_package() {
  if ! command -v dpkg-deb >/dev/null 2>&1; then
    echo "Skipping .deb package: dpkg-deb is not available on this host."
    return
  fi

  local deb_stage="${temp_root}/deb/ioruba_${version}_amd64"
  local installed_size

  mkdir -p "${deb_stage}/DEBIAN"
  install -Dm755 "${repo_root}/dist/ioruba" "${deb_stage}/usr/bin/ioruba"
  install -Dm755 "${repo_root}/dist/test-serial" "${deb_stage}/usr/bin/test-serial"

  install -Dm644 "${repo_root}/config/ioruba.yaml" "${deb_stage}/etc/ioruba/ioruba.yaml"
  install -Dm644 "${repo_root}/config/nano-3knobs.yaml" "${deb_stage}/usr/share/ioruba/config/nano-3knobs.yaml"
  install -Dm644 "${repo_root}/config/example.yaml" "${deb_stage}/usr/share/ioruba/config/example.yaml"

  copy_firmware_directory "${deb_stage}/usr/share/ioruba/firmware"

  install -Dm644 "${repo_root}/assets/ioruba.desktop" "${deb_stage}/usr/share/applications/ioruba.desktop"
  install -Dm644 "${repo_root}/assets/icon.png" "${deb_stage}/usr/share/icons/hicolor/128x128/apps/ioruba.png"

  install -Dm644 "${repo_root}/README.md" "${deb_stage}/usr/share/doc/ioruba/README.md"
  install -Dm644 "${repo_root}/CHANGELOG.md" "${deb_stage}/usr/share/doc/ioruba/CHANGELOG.md"
  install -Dm644 "${repo_root}/PROJECT_SUMMARY.md" "${deb_stage}/usr/share/doc/ioruba/PROJECT_SUMMARY.md"
  install -Dm644 "${repo_root}/LICENSE" "${deb_stage}/usr/share/doc/ioruba/LICENSE"

  installed_size="$(du -sk "${deb_stage}" | cut -f1)"
  cat > "${deb_stage}/DEBIAN/control" <<EOF
Package: ioruba
Version: ${version}-1
Section: sound
Priority: optional
Architecture: amd64
Maintainer: Bernardo Gomes <bernardopg@users.noreply.github.com>
Depends: libc6, libgmp10
Installed-Size: ${installed_size}
Homepage: https://github.com/bernardopg/ioruba
Description: Tactile Linux audio mixer for Arduino Nano
 Ioruba bridges an Arduino Nano 3-knob controller with Linux audio through
 a distributable Haskell runtime for PipeWire and PulseAudio.
EOF

  dpkg-deb --build --root-owner-group "${deb_stage}" "${output_dir}/ioruba_${version}_amd64.deb"
}

build_arch_package() {
  "${repo_root}/scripts/release/build_arch_package.sh" "${version}" "${output_dir}"
}

write_checksums() {
  (
    cd "${output_dir}"
    find . -maxdepth 1 -type f \
      ! -name '*SHA256SUMS*' \
      -print0 \
      | sort -z \
      | xargs -0 sha256sum > "ioruba-${version}-SHA256SUMS.txt"
  )
}

mkdir -p "${output_dir}"
rm -f "${output_dir}/ioruba-${version}-linux-x86_64.tar.gz" \
      "${output_dir}/ioruba-firmware-${version}.tar.gz" \
      "${output_dir}/ioruba_${version}_amd64.deb" \
      "${output_dir}/ioruba-${version}-SHA256SUMS.txt" \
      "${output_dir}/ioruba-${version}-PKGBUILD" \
      "${output_dir}/ioruba-${version}-SRCINFO" \
      "${output_dir}"/ioruba-*.pkg.tar.zst

require_file "${repo_root}/dist/ioruba"
require_file "${repo_root}/dist/test-serial"
require_file "${repo_root}/config/ioruba.yaml"
require_file "${repo_root}/config/nano-3knobs.yaml"
require_file "${repo_root}/config/example.yaml"
require_file "${repo_root}/assets/ioruba.desktop"
require_file "${repo_root}/assets/icon.png"
require_file "${repo_root}/arduino/ioruba-nano-3knobs/ioruba-nano-3knobs.ino"
if [ ! -d "${repo_root}/dist-firmware" ]; then
  echo "Compiled firmware directory not found: ${repo_root}/dist-firmware" >&2
  exit 1
fi

build_portable_bundle
build_firmware_bundle
build_deb_package
build_arch_package
write_checksums
