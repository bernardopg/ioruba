#!/usr/bin/env node
/** Build Tauri's static latest.json after every platform has uploaded its .sig. */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const TARGETS = [
  { key: "linux-x86_64", pattern: /\.AppImage$/, required: true },
  { key: "windows-x86_64", pattern: /_x64-setup\.exe$/, required: true },
  { key: "darwin-aarch64", pattern: /_aarch64\.app\.tar\.gz$/ },
  { key: "darwin-x86_64", pattern: /_x64\.app\.tar\.gz$/ },
];

function argument(name) {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) {
    throw new Error(`Missing ${name}`);
  }
  return process.argv[index + 1];
}

export function buildUpdaterManifest(release, signatures) {
  const version = String(release.tag_name ?? "").replace(/^v/, "");
  const pubDate = String(release.published_at ?? "");
  if (!version || Number.isNaN(Date.parse(pubDate))) {
    throw new Error("Release must provide a valid tag_name and published_at");
  }

  const platforms = {};
  for (const target of TARGETS) {
    const matches = (release.assets ?? []).filter(
      (asset) => target.pattern.test(asset.name) && !asset.name.endsWith(".sig"),
    );
    if (matches.length === 0 && !target.required) {
      continue;
    }
    if (matches.length !== 1) {
      throw new Error(
        `${target.key} needs exactly one updater asset; found ${matches
          .map((asset) => asset.name)
          .join(", ") || "none"}`,
      );
    }

    const asset = matches[0];

    // A versao do manifesto vem da tag, mas os bundles carregam a versao que
    // estava em tauri.conf.json no momento do build. Quando a tag e criada sem
    // commit de bump (v1.8.3), os dois divergem: o manifesto anuncia a versao
    // nova apontando para um binario antigo, e todo cliente que "atualiza"
    // reinstala a versao que ja tinha e recebe o mesmo toast de novo, para
    // sempre. A assinatura e valida nesse cenario, entao o cliente nao tem como
    // se defender -- a checagem precisa acontecer aqui.
    if (!asset.name.includes(version)) {
      throw new Error(
        `${target.key}: asset '${asset.name}' nao contem a versao '${version}' anunciada pela tag. ` +
          `Isso indica uma tag criada sem commit de bump de versao; publicar este manifesto ` +
          `prenderia os usuarios num loop de atualizacao.`,
      );
    }

    const signature = signatures.get(`${asset.name}.sig`);
    if (!signature) {
      throw new Error(`Missing detached signature for ${asset.name}`);
    }
    if (typeof asset.browser_download_url !== "string") {
      throw new Error(`Missing download URL for ${asset.name}`);
    }

    platforms[target.key] = {
      signature: signature.trim(),
      url: asset.browser_download_url,
    };
  }

  return {
    version,
    notes: typeof release.body === "string" ? release.body : "",
    pub_date: pubDate,
    platforms,
  };
}

async function main() {
  const releasePath = argument("--release-json");
  const signatureDir = argument("--signature-dir");
  const outputPath = argument("--out");
  const release = JSON.parse(await readFile(releasePath, "utf8"));
  const files = await readdir(signatureDir);
  const signatures = new Map(
    await Promise.all(
      files
        .filter((file) => file.endsWith(".sig"))
        .map(async (file) => [file, await readFile(join(signatureDir, file), "utf8")]),
    ),
  );

  await writeFile(
    outputPath,
    `${JSON.stringify(buildUpdaterManifest(release, signatures), null, 2)}\n`,
    "utf8",
  );
}

if (process.argv[1]?.endsWith("updater-manifest.mjs")) {
  main().catch((error) => {
    console.error(`::error::${error.message}`);
    process.exit(1);
  });
}
