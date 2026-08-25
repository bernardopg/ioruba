import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractManifestUrls } from "./verify-published-manifests.mjs";

const BASE = "https://github.com/bernardopg/ioruba/releases/download/v1.8.4";

describe("extractManifestUrls", () => {
  it("expands a cask's #{arch} into every architecture it can select", () => {
    const urls = extractManifestUrls([
      {
        path: "homebrew/Casks/ioruba.rb",
        contents: `url "${BASE}/Ioruba_1.8.4_#{arch}.app.tar.gz",\n`
      }
    ]);

    assert.deepEqual(
      urls.map((entry) => entry.url).sort(),
      [
        `${BASE}/Ioruba_1.8.4_aarch64.app.tar.gz`,
        `${BASE}/Ioruba_1.8.4_x64.app.tar.gz`
      ]
    );
  });

  // Scoop's autoupdate block describes the *next* release, so its URL cannot
  // resolve yet and must not fail the current one.
  it("skips $version templates", () => {
    const urls = extractManifestUrls([
      {
        path: "scoop/ioruba.json",
        contents: JSON.stringify({
          architecture: { "64bit": { url: `${BASE}/Ioruba_1.8.4_x64-setup.exe` } },
          autoupdate: {
            architecture: {
              "64bit": {
                url: "https://github.com/bernardopg/ioruba/releases/download/v$version/Ioruba_$version_x64-setup.exe"
              }
            }
          }
        })
      }
    ]);

    assert.deepEqual(urls.map((entry) => entry.url), [
      `${BASE}/Ioruba_1.8.4_x64-setup.exe`
    ]);
  });

  it("ignores homepage and license links that are not downloads", () => {
    const urls = extractManifestUrls([
      {
        path: "winget/BernardoGomes.Ioruba.locale.en-US.yaml",
        contents: `PackageUrl: https://github.com/bernardopg/ioruba
LicenseUrl: https://github.com/bernardopg/ioruba/blob/main/LICENSE
InstallerUrl: ${BASE}/Ioruba_1.8.4_x64-setup.exe
`
      }
    ]);

    assert.deepEqual(urls.map((entry) => entry.url), [
      `${BASE}/Ioruba_1.8.4_x64-setup.exe`
    ]);
  });

  it("reports which manifest each URL came from", () => {
    const urls = extractManifestUrls([
      {
        path: "scoop/ioruba.json",
        contents: `"url": "${BASE}/Ioruba_1.8.4_x64-setup.exe"`
      }
    ]);

    assert.equal(urls[0].path, "scoop/ioruba.json");
  });
});
