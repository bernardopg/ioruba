#!/usr/bin/env node
/**
 * Writes the package-manager manifests for a published release.
 *
 * Digests come from the release's own SHA256SUMS.txt rather than being
 * recomputed here: that file is already generated and attested by the release
 * workflow, so reusing it keeps every published hash traceable to one source
 * and avoids re-downloading a few hundred megabytes of installers.
 *
 * Usage:
 *   node scripts/packaging/generate.mjs \
 *     --release-json release.json --sums SHA256SUMS.txt --out dist/manifests
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { buildManifests } from "./manifests.mjs";

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`Malformed arguments near "${key ?? ""}"`);
    }
    args[key.slice(2)] = value;
  }

  for (const required of ["release-json", "sums", "out"]) {
    if (!args[required]) {
      throw new Error(`Missing --${required}`);
    }
  }

  return args;
}

/** `<digest>  <name>` lines to a name→digest map. */
export function parseSums(contents) {
  const digests = new Map();

  for (const line of contents.split("\n")) {
    const match = line.trim().match(/^([0-9a-f]{64})\s+\*?(.+)$/i);
    if (match) {
      // `sha256sum ./*` (the release workflow's safe form) writes `./name`.
      // Release API names never carry that prefix, so normalize it at the
      // boundary instead of making every manifest caller know about it.
      digests.set(match[2].trim().replace(/^\.\//, ""), match[1].toLowerCase());
    }
  }

  return digests;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const release = JSON.parse(await readFile(args["release-json"], "utf8"));
  const digests = parseSums(await readFile(args.sums, "utf8"));

  const version = String(release.tag_name ?? "").replace(/^v/, "");
  if (!version) {
    throw new Error("Release payload has no tag_name");
  }

  const releasedAt = String(release.published_at ?? "");
  if (Number.isNaN(Date.parse(releasedAt))) {
    throw new Error("Release payload has no valid published_at timestamp");
  }

  // Assets without a digest are dropped rather than defaulted: a manifest with
  // a wrong or empty hash fails at install time on a user's machine, which is
  // a much worse place to find out than here.
  const assets = (release.assets ?? [])
    .filter((asset) => digests.has(asset.name))
    .map((asset) => ({
      name: asset.name,
      url: asset.browser_download_url,
      sha256: digests.get(asset.name)
    }));

  const repo = process.env.GITHUB_REPOSITORY || "bernardopg/ioruba";
  const manifests = buildManifests({ version, repo, releasedAt, assets });

  for (const [relative, contents] of Object.entries(manifests)) {
    const target = join(args.out, relative);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, contents, "utf8");
    console.log(`wrote ${target}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`::error::${error.message}`);
    process.exit(1);
  });
}
