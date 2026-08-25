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

  it("templates only the arch, taking the rest of the url from the real asset", () => {
    const cask = homebrewCask(release());

    assert.match(
      cask,
      /url "https:\/\/github\.com\/bernardopg\/ioruba\/releases\/download\/v1\.7\.1\/Ioruba_1\.7\.1_#\{arch\}\.app\.tar\.gz"/
    );
    assert.match(cask, /version "1\.7\.1"/);
  });

  // Regressao da v1.8.3: a tag foi criada sem commit de bump, entao os bundles
  // sairam como 1.8.2 enquanto o release dizia 1.8.3. O cask reconstruia a URL
  // a partir de `version` e apontava para Ioruba_1.8.3_x64.app.tar.gz, que
  // retorna 404 -- `brew install --cask ioruba` quebrava por completo.
  it("stays installable when the tag and the bundle version disagree", () => {
    const drifted = {
      version: "1.8.3",
      repo: REPO,
      releasedAt: "2026-08-23T19:22:04.000Z",
      assets: [
        {
          name: "Ioruba_1.8.2_x64.app.tar.gz",
          url: `https://github.com/${REPO}/releases/download/v1.8.3/Ioruba_1.8.2_x64.app.tar.gz`,
          sha256: "a".repeat(64)
        },
        {
          name: "Ioruba_1.8.2_aarch64.app.tar.gz",
          url: `https://github.com/${REPO}/releases/download/v1.8.3/Ioruba_1.8.2_aarch64.app.tar.gz`,
          sha256: "b".repeat(64)
        }
      ]
    };

    const cask = homebrewCask(drifted);

    // A URL segue o arquivo que existe de fato, nao a versao anunciada.
    assert.match(cask, /download\/v1\.8\.3\/Ioruba_1\.8\.2_#\{arch\}\.app\.tar\.gz/);
    assert.doesNotMatch(cask, /Ioruba_1\.8\.3_/);
  });

  it("refuses macOS bundles that differ by more than the architecture", () => {
    const inconsistent = {
      ...release(),
      assets: [
        {
          name: "Ioruba_1.7.1_x64.app.tar.gz",
          url: `https://github.com/${REPO}/releases/download/v1.7.1/Ioruba_1.7.1_x64.app.tar.gz`,
          sha256: "a".repeat(64)
        },
        {
          name: "Ioruba_1.7.0_aarch64.app.tar.gz",
          url: `https://github.com/${REPO}/releases/download/v1.7.1/Ioruba_1.7.0_aarch64.app.tar.gz`,
          sha256: "b".repeat(64)
        }
      ]
    };

    assert.throws(
      () => homebrewCask(inconsistent),
      /must differ only by architecture/
    );
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

  // O bloco autoupdate e o que o Scoop expande nas proximas versoes. Escrito a
  // mao, ele repetia a suposicao que quebrou o cask do Homebrew.
  it("derives the autoupdate template from the url that actually shipped", () => {
    const parsed = JSON.parse(scoopManifest(release()));

    assert.equal(
      parsed.autoupdate.architecture["64bit"].url,
      `https://github.com/${REPO}/releases/download/v$version/Ioruba_$version_x64-setup.exe`
    );
    // O literal da versao publicada nao pode vazar para o template.
    assert.doesNotMatch(parsed.autoupdate.architecture["64bit"].url, /1\.7\.1/);
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
