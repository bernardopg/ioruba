import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildUpdaterManifest } from "./updater-manifest.mjs";

const base = "https://github.com/bernardopg/ioruba/releases/download/v1.8.0";
const assets = [
  "Ioruba_1.8.0_amd64.AppImage",
  "Ioruba_1.8.0_x64-setup.exe",
  "Ioruba_1.8.0_aarch64.app.tar.gz",
  "Ioruba_1.8.0_x64.app.tar.gz",
].map((name) => ({ name, browser_download_url: `${base}/${name}` }));

function release(overrides = {}) {
  return {
    tag_name: "v1.8.0",
    published_at: "2026-08-11T00:00:00Z",
    body: "Release notes",
    assets,
    ...overrides,
  };
}

function signatures() {
  return new Map(assets.map((asset, index) => [`${asset.name}.sig`, `signature-${index}\n`]));
}

describe("buildUpdaterManifest", () => {
  it("emits signed URLs for Linux, Windows and both macOS targets", () => {
    const manifest = buildUpdaterManifest(release(), signatures());

    assert.equal(manifest.version, "1.8.0");
    assert.equal(manifest.notes, "Release notes");
    assert.deepEqual(Object.keys(manifest.platforms).sort(), [
      "darwin-aarch64",
      "darwin-x86_64",
      "linux-x86_64",
      "windows-x86_64",
    ]);
    assert.equal(manifest.platforms["windows-x86_64"].signature, "signature-1");
  });

  it("allows the deliberately unsupported macOS updater targets to be absent", () => {
    const desktopOnly = release({
      assets: assets.filter((asset) => !asset.name.includes(".app.tar.gz")),
    });
    const manifest = buildUpdaterManifest(desktopOnly, signatures());

    assert.deepEqual(Object.keys(manifest.platforms).sort(), [
      "linux-x86_64",
      "windows-x86_64",
    ]);
  });

  it("refuses a release missing a required platform artifact", () => {
    assert.throws(
      () =>
        buildUpdaterManifest(
          release({ assets: assets.filter((asset) => !asset.name.endsWith(".AppImage")) }),
          signatures(),
        ),
      /linux-x86_64 needs exactly one updater asset/,
    );
  });

  it("refuses to publish a URL without its matching detached signature", () => {
    const withoutWindowsSignature = signatures();
    withoutWindowsSignature.delete("Ioruba_1.8.0_x64-setup.exe.sig");

    assert.throws(
      () => buildUpdaterManifest(release(), withoutWindowsSignature),
      /Missing detached signature for Ioruba_1.8.0_x64-setup.exe/,
    );
  });

  // Regressao da v1.8.3: a tag foi criada sobre o commit da v1.8.2 sem bump de
  // versao, entao o manifesto anunciava 1.8.3 apontando para binarios 1.8.2.
  // As assinaturas eram validas, entao o cliente instalava, voltava como 1.8.2
  // e recebia o mesmo toast de novo -- indefinidamente.
  it("refuses a tag whose version does not match the bundled artifacts", () => {
    const staleBundles = release({ tag_name: "v1.8.3" });

    assert.throws(
      () => buildUpdaterManifest(staleBundles, signatures()),
      /nao contem a versao '1\.8\.3'/,
    );
  });
});
