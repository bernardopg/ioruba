/**
 * Package-manager manifests generated from a published GitHub release.
 *
 * Every one of these is a small file that restates the same handful of facts
 * (version, download URL, sha256) in a different syntax, and each one is a
 * silent breakage if it drifts from the release. Deriving all of them from one
 * asset list keeps them honest, and keeps the generator testable — the release
 * workflow only supplies the inputs.
 *
 * Pure functions on purpose: no fs, no network, no process.
 */

/**
 * @typedef {object} ReleaseAsset
 * @property {string} name
 * @property {string} url    Browser download URL.
 * @property {string} sha256 Hex digest, lowercase.
 */

/**
 * @typedef {object} ReleaseInput
 * @property {string} version  Semver without the leading `v`.
 * @property {string} repo     `owner/name`.
 * @property {string} releasedAt ISO-8601 publication timestamp.
 * @property {ReleaseAsset[]} assets
 */

const HOMEPAGE_FOR = (repo) => `https://github.com/${repo}`;

/** Finds exactly one asset matching `pattern`, or throws naming what it saw. */
export function requireAsset(assets, pattern, description) {
  const matches = assets.filter((asset) => pattern.test(asset.name));

  if (matches.length === 1) {
    return matches[0];
  }

  const available = assets.map((asset) => asset.name).join(", ") || "(none)";

  // Ambiguity is as much of a bug as absence: two matches means the pattern is
  // wrong, and picking the first would bake a coin flip into a manifest that
  // users install from.
  throw new Error(
    matches.length === 0
      ? `No ${description} in the release. Available assets: ${available}`
      : `Ambiguous ${description}: ${matches
          .map((asset) => asset.name)
          .join(", ")}`
  );
}

/**
 * Builds the `#{arch}`-interpolated URL a cask needs from the two real asset
 * URLs, instead of assuming the filenames embed `version`.
 *
 * The cask has one `url` stanza for both architectures, so a template is
 * unavoidable. Reconstructing it from `version` is what broke v1.8.3: the tag
 * said 1.8.3, the bundles were named 1.8.2, and the cask pointed at
 * `Ioruba_1.8.3_x64.app.tar.gz`, which 404s. Deriving the template from the
 * names that were actually published -- and asserting the two differ only by
 * the architecture token -- keeps the cask installable even if that invariant
 * is ever violated again upstream of this generator.
 */
function archTemplatedUrl(intel, arm) {
  const template = (asset, token) => {
    const slash = asset.url.lastIndexOf("/");
    const base = asset.url.slice(0, slash);
    const name = asset.url.slice(slash + 1);
    return `${base}/${name.replace(token, "#{arch}")}`;
  };

  const fromIntel = template(intel, "x64");
  const fromArm = template(arm, "aarch64");

  if (fromIntel !== fromArm) {
    throw new Error(
      `macOS bundles must differ only by architecture; got ${intel.url} and ${arm.url}`
    );
  }

  return fromIntel;
}

/**
 * Homebrew cask for macOS.
 *
 * Points at the `.app.tar.gz` bundles rather than a `.dmg`, because the `.dmg`
 * is best-effort in CI while the tarballs always ship. `depends_on arch:` picks
 * the right one per machine.
 *
 * The app is unsigned and unnotarized by project policy (no Apple Developer ID),
 * so the cask carries the same quarantine strip the one-line installer does.
 */
export function homebrewCask({ version, repo, assets }) {
  const intel = requireAsset(assets, /_x64\.app\.tar\.gz$/, "x64 .app bundle");
  const arm = requireAsset(
    assets,
    /_aarch64\.app\.tar\.gz$/,
    "aarch64 .app bundle"
  );

  return `cask "ioruba" do
  arch arm: "aarch64", intel: "x64"

  version "${version}"
  sha256 arm:   "${arm.sha256}",
         intel: "${intel.sha256}"

  url "${archTemplatedUrl(intel, arm)}",
      verified: "github.com/${repo}/"
  name "Ioruba"
  desc "Tactile audio mixer for Arduino-based control surfaces"
  homepage "${HOMEPAGE_FOR(repo)}"

  depends_on macos: ">= :catalina"

  app "Ioruba.app"

  # The bundle is unsigned and unnotarized by project policy, so Gatekeeper
  # would refuse to open it.
  postflight do
    system_command "/usr/bin/xattr",
                   args: ["-dr", "com.apple.quarantine", "#{appdir}/Ioruba.app"],
                   sudo: false
  end

  zap trash: [
    "~/Library/Application Support/io.ioruba.desktop",
    "~/Library/Preferences/io.ioruba.desktop.plist",
    "~/Library/Saved Application State/io.ioruba.desktop.savedState",
  ]
end
`;
}

/** Scoop manifest (Windows), installed from the NSIS setup executable. */
export function scoopManifest({ version, repo, assets }) {
  const setup = requireAsset(assets, /_x64-setup\.exe$/, "x64 NSIS installer");

  // `autoupdate` is the template Scoop expands for *future* versions, so it has
  // to be written in terms of $version. Deriving it from the URL that actually
  // shipped -- rather than hand-writing the filename layout -- means the
  // template cannot drift from Tauri's bundle naming. A literal replacement
  // function avoids `$` being read as a regex replacement pattern.
  const autoupdateUrl = setup.url.replaceAll(version, () => "$version");

  return `${JSON.stringify(
    {
      version,
      description: "Tactile audio mixer for Arduino-based control surfaces",
      homepage: HOMEPAGE_FOR(repo),
      license: "MIT",
      architecture: {
        "64bit": {
          url: setup.url,
          hash: setup.sha256
        }
      },
      // NSIS accepts `/D=<directory>` only as its final argument. Without it,
      // it installs in its default location outside Scoop's managed directory.
      installer: {
        script: [
          "$exe = \"$dir\\\\$fname\"",
          "Start-Process -FilePath $exe -ArgumentList \"/S /D=$dir\" -Wait",
          "Remove-Item $exe"
        ]
      },
      uninstaller: {
        script: [
          "& \"$dir\\\\Uninstall Ioruba.exe\" /S"
        ]
      },
      checkver: {
        github: HOMEPAGE_FOR(repo)
      },
      autoupdate: {
        architecture: {
          "64bit": {
            url: autoupdateUrl
          }
        }
      }
    },
    null,
    2
  )}\n`;
}

/**
 * winget manifests: three files under one version directory, in the schema
 * version microsoft/winget-pkgs currently accepts.
 *
 * Returned as a map of relative path to contents; submission is a pull request
 * to that repository, which needs a fork and a token this project does not
 * have, so the workflow publishes them as release assets instead.
 */
export function wingetManifests({ version, repo, releasedAt, assets }) {
  const installer = requireAsset(
    assets,
    /_x64-setup\.exe$/,
    "x64 NSIS installer"
  );

  const identifier = "BernardoGomes.Ioruba";
  // Keep this aligned with the current winget-pkgs multiple-manifest schema.
  const schema = "1.12.0";
  const releaseDate = new Date(releasedAt).toISOString().slice(0, 10);
  const dir = `manifests/b/BernardoGomes/Ioruba/${version}`;

  const header = (type) =>
    `# yaml-language-server: $schema=https://aka.ms/winget-manifest.${type}.${schema}.schema.json

PackageIdentifier: ${identifier}
PackageVersion: ${version}`;

  return {
    [`${dir}/${identifier}.installer.yaml`]: `${header("installer")}
InstallerType: nullsoft
Scope: user
InstallModes:
  - interactive
  - silent
UpgradeBehavior: install
ReleaseDate: ${releaseDate}
Installers:
  - Architecture: x64
    InstallerUrl: ${installer.url}
    InstallerSha256: ${installer.sha256.toUpperCase()}
ManifestType: installer
ManifestVersion: ${schema}
`,
    [`${dir}/${identifier}.locale.en-US.yaml`]: `${header("defaultLocale")}
PackageLocale: en-US
Publisher: Bernardo Gomes
PublisherUrl: https://github.com/bernardopg
PackageName: Ioruba
PackageUrl: ${HOMEPAGE_FOR(repo)}
License: MIT
LicenseUrl: https://github.com/${repo}/blob/main/LICENSE
ShortDescription: Tactile audio mixer for Arduino-based control surfaces
Description: >-
  Ioruba turns an Arduino with potentiometers, buttons and encoders into a
  hardware mixer for your desktop audio, mapping each knob to a sink, source
  or application.
Moniker: ioruba
Tags:
  - audio
  - mixer
  - arduino
  - volume
ManifestType: defaultLocale
ManifestVersion: ${schema}
`,
    [`${dir}/${identifier}.yaml`]: `${header("version")}
DefaultLocale: en-US
ManifestType: version
ManifestVersion: ${schema}
`
  };
}

/** Every manifest for a release, as a path to contents map. */
export function buildManifests(release) {
  return {
    "homebrew/Casks/ioruba.rb": homebrewCask(release),
    "scoop/ioruba.json": scoopManifest(release),
    ...Object.fromEntries(
      Object.entries(wingetManifests(release)).map(([path, contents]) => [
        `winget/${path}`,
        contents
      ])
    )
  };
}
