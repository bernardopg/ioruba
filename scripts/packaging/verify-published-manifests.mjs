#!/usr/bin/env node
/**
 * Verifies that every concrete download URL in the generated package-manager
 * manifests actually resolves.
 *
 * The generator already takes digests from `SHA256SUMS.txt`, so a wrong hash is
 * structurally impossible. What it could not catch is a URL that is *shaped*
 * correctly but points at a file that was never published: in v1.8.3 the
 * Homebrew cask asked for `Ioruba_1.8.3_x64.app.tar.gz` while the release only
 * contained `Ioruba_1.8.2_*`, so `brew install --cask ioruba` returned 404 for
 * every user. Nothing in the pipeline noticed, because the manifests were only
 * checked for shape.
 *
 * URL extraction is a pure function so it can be unit tested; only `main`
 * touches the network.
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

/** Architectures a Homebrew cask's `#{arch}` can expand to, per `arch` stanza. */
const CASK_ARCHES = ["aarch64", "x64"];

const URL_PATTERN = /https:\/\/github\.com\/[^\s"',)]+/g;

/**
 * Concrete, checkable URLs found in `files`.
 *
 * Two kinds of URL are deliberately excluded:
 *
 * - Scoop `autoupdate` templates, which contain `$version` and describe the
 *   *next* release rather than this one. Their shape is covered by unit tests.
 * - Plain project/homepage links, which are not download URLs.
 *
 * @param {{path: string, contents: string}[]} files
 * @returns {{path: string, url: string}[]}
 */
export function extractManifestUrls(files) {
  const found = [];

  for (const { path, contents } of files) {
    for (const match of contents.matchAll(URL_PATTERN)) {
      const url = match[0];

      if (!url.includes("/releases/download/")) {
        continue;
      }

      // `$version` only appears in Scoop's autoupdate block.
      if (url.includes("$version")) {
        continue;
      }

      if (url.includes("#{arch}")) {
        for (const arch of CASK_ARCHES) {
          found.push({ path, url: url.replaceAll("#{arch}", arch) });
        }
        continue;
      }

      found.push({ path, url });
    }
  }

  return found;
}

function argument(name) {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) {
    throw new Error(`Missing ${name}`);
  }
  return process.argv[index + 1];
}

async function readDirectoryRecursive(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await readDirectoryRecursive(path)));
    } else {
      files.push({ path, contents: await readFile(path, "utf8") });
    }
  }

  return files;
}

async function main() {
  const manifestDir = argument("--manifest-dir");
  const files = await readDirectoryRecursive(manifestDir);
  const urls = extractManifestUrls(files);

  if (urls.length === 0) {
    throw new Error(`No download URLs found under ${manifestDir}`);
  }

  const failures = [];

  for (const { path, url } of urls) {
    // GitHub redirects release downloads to a signed object-storage URL, so
    // follow redirects and treat only the final status as the answer.
    const response = await fetch(url, { method: "HEAD", redirect: "follow" });

    if (!response.ok) {
      failures.push(`${path}: HTTP ${response.status} for ${url}`);
      continue;
    }

    console.log(`ok  ${response.status}  ${url}`);
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`::error::${failure}`);
    }
    throw new Error(
      `${failures.length} manifest URL(s) do not resolve. Publishing these would ` +
        `break installation for every user of that package manager.`
    );
  }

  console.log(`\nAll ${urls.length} manifest download URLs resolve.`);
}

if (process.argv[1]?.endsWith("verify-published-manifests.mjs")) {
  main().catch((error) => {
    console.error(`::error::${error.message}`);
    process.exit(1);
  });
}
