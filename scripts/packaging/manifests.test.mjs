import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseSums } from "./generate.mjs";
import {
  buildManifests,
  homebrewCask,
  requireAsset,
  scoopManifest,
  wingetManifests
} from "./manifests.mjs";

const REPO = "bernardopg/ioruba";
const VERSION = "1.7.1";

function asset(name, sha256) {
  return {
    name,
    url: `https://github.com/${REPO}/releases/download/v${VERSION}/${name}`,
    sha256
  };
}

function release(extra = []) {
  return {
    version: VERSION,
    repo: REPO,
    releasedAt: "2026-08-10T22:00:00.000Z",
    assets: [
      asset("Ioruba_1.7.1_x64.app.tar.gz", "a".repeat(64)),
      asset("Ioruba_1.7.1_aarch64.app.tar.gz", "b".repeat(64)),
      asset("Ioruba_1.7.1_x64-setup.exe", "c".repeat(64)),
      asset("Ioruba_1.7.1_x64_en-US.msi", "d".repeat(64)),
      asset("Ioruba_1.7.1_amd64.AppImage", "e".repeat(64)),
      ...extra
    ]
  };
}

describe("parseSums", () => {
  it("accepts GNU checksum lines, including the binary-mode marker", () => {
    const sums = parseSums(
      `${"a".repeat(64)}  ./Ioruba_1.7.1_x64-setup.exe\n${"b".repeat(64)} *Ioruba_1.7.1_x64.app.tar.gz\n`
    );

    assert.equal(sums.get("Ioruba_1.7.1_x64-setup.exe"), "a".repeat(64));
    assert.equal(sums.get("Ioruba_1.7.1_x64.app.tar.gz"), "b".repeat(64));
  });

  it("ignores malformed and non-SHA256 lines", () => {
    const sums = parseSums("not a digest\nabc  file\n");
    assert.equal(sums.size, 0);
  });
});

describe("requireAsset", () => {
  it("returns the single match", () => {
    const found = requireAsset(release().assets, /_x64-setup\.exe$/, "installer");
    assert.equal(found.name, "Ioruba_1.7.1_x64-setup.exe");
  });

  it("names what the release shipped when nothing matches", () => {
    assert.throws(
      () => requireAsset(release().assets, /\.dmg$/, ".dmg"),
      /No \.dmg in the release.*Ioruba_1\.7\.1_x64-setup\.exe/s
    );
  });

  it("refuses to guess between two matches", () => {
    // Picking the first would bake a coin flip into a manifest users install
    // from, so ambiguity has to be as loud as absence.
    const assets = release([asset("Ioruba_1.7.1_x64-setup.exe.bak", "f".repeat(64))]).assets;
    assert.throws(
      () => requireAsset(assets, /x64-setup\.exe/, "installer"),
      /Ambiguous installer/
    );
  });
});

describe("homebrewCask", () => {
  it("carries both architectures' digests", () => {
    const cask = homebrewCask(release());

    assert.match(cask, /arch arm: "aarch64", intel: "x64"/);
    assert.match(cask, new RegExp(`arm:\\s+"${"b".repeat(64)}"`));
    assert.match(cask, new RegExp(`intel: "${"a".repeat(64)}"`));
  });

  it("interpolates version and arch in the url rather than hardcoding one build", () => {
    const cask = homebrewCask(release());

    assert.match(cask, /Ioruba_#\{version\}_#\{arch\}\.app\.tar\.gz/);
    assert.match(cask, /version "1\.7\.1"/);
  });

  it("strips quarantine, because the bundle is not notarized", () => {
    assert.match(homebrewCask(release()), /com\.apple\.quarantine/);
  });

  it("fails loudly when an architecture is missing", () => {
    const onlyIntel = {
      ...release(),
      assets: release().assets.filter((a) => !a.name.includes("aarch64"))
    };

    assert.throws(() => homebrewCask(onlyIntel), /No aarch64 \.app bundle/);
  });
});

describe("scoopManifest", () => {
  it("is valid JSON pointing at the NSIS installer", () => {
    const parsed = JSON.parse(scoopManifest(release()));

    assert.equal(parsed.version, VERSION);
    assert.equal(parsed.architecture["64bit"].hash, "c".repeat(64));
    assert.match(parsed.architecture["64bit"].url, /_x64-setup\.exe$/);
  });

  it("installs silently into Scoop's managed directory", () => {
    const parsed = JSON.parse(scoopManifest(release()));
    assert.ok(
      parsed.installer.script.some((line) => line.includes("/S /D=$dir"))
    );
    assert.ok(parsed.uninstaller.script.some((line) => line.includes("/S")));
  });
});

describe("wingetManifests", () => {
  it("emits the three required files under one version directory", () => {
    const files = Object.keys(wingetManifests(release()));

    assert.equal(files.length, 3);
    for (const suffix of [".installer.yaml", ".locale.en-US.yaml", ".yaml"]) {
      assert.ok(
        files.some((file) => file.endsWith(`BernardoGomes.Ioruba${suffix}`)),
        `missing ${suffix}`
      );
    }
    assert.ok(files.every((file) => file.includes(`/Ioruba/${VERSION}/`)));
  });

  it("uppercases the installer digest, as the schema requires", () => {
    const files = wingetManifests(release());
    const installer = files[
      `manifests/b/BernardoGomes/Ioruba/${VERSION}/BernardoGomes.Ioruba.installer.yaml`
    ];

    assert.match(installer, new RegExp(`InstallerSha256: ${"C".repeat(64)}`));
  });

  it("agrees on identifier, version and release date across all three files", () => {
    for (const contents of Object.values(wingetManifests(release()))) {
      assert.match(contents, /PackageIdentifier: BernardoGomes\.Ioruba/);
      assert.match(contents, new RegExp(`PackageVersion: ${VERSION}`));
    }

    assert.match(
      Object.values(wingetManifests(release())).join(""),
      /ReleaseDate: 2026-08-10/
    );
  });
});

describe("buildManifests", () => {
  it("produces every manifest under a namespaced path", () => {
    const files = buildManifests(release());

    assert.ok(files["homebrew/Casks/ioruba.rb"]);
    assert.ok(files["scoop/ioruba.json"]);
    assert.equal(
      Object.keys(files).filter((path) => path.startsWith("winget/")).length,
      3
    );
  });

  it("never writes an empty file", () => {
    for (const [path, contents] of Object.entries(buildManifests(release()))) {
      assert.ok(contents.trim().length > 0, `${path} is empty`);
      assert.ok(contents.endsWith("\n"), `${path} has no trailing newline`);
    }
  });
});
