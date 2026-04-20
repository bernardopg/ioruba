import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const themeDir = path.join(root, 'docs-site');
const outDir = path.join(root, '.site-src');

const rootDocs = [
  'README.md',
  'QUICKSTART.md',
  'NANO_SETUP.md',
  'TESTING.md',
  'CONTRIBUTING.md',
  'CHANGELOG.md',
  'TODO.md',
  'FUNDING.md',
];

const githubBlobBase = 'https://github.com/bernardopg/ioruba/blob/main';
const markdownMap = new Map();
const assetMap = new Map();

async function rmrf(target) {
  await fs.rm(target, { recursive: true, force: true });
}

async function mkdirp(target) {
  await fs.mkdir(target, { recursive: true });
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else {
      files.push(full);
    }
  }
  return files;
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function stripFrontMatter(content) {
  if (!content.startsWith('---\n')) return content;
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) return content;
  return content.slice(end + 5);
}

function titleFromContent(content, fallback) {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) return heading;
  return fallback
    .replace(/\.md$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function permalinkFor(outputRel) {
  if (outputRel === 'index.md') return '/';
  return `/${toPosix(outputRel).replace(/\.md$/i, '.html')}`;
}

function relativeOutputUrl(fromOutputRel, targetOutputRel, isMarkdown) {
  const fromDir = path.posix.dirname(toPosix(fromOutputRel));
  const target = isMarkdown
    ? toPosix(targetOutputRel).replace(/\.md$/i, '.html')
    : toPosix(targetOutputRel);
  return path.posix.relative(fromDir, target) || path.posix.basename(target);
}

function isExternal(href) {
  return /^(?:[a-z]+:|#|\/\/)/i.test(href);
}

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function copyStatic(sourceDir, targetDir) {
  const files = await walk(sourceDir);
  for (const file of files) {
    const rel = path.relative(sourceDir, file);
    const out = path.join(targetDir, rel);
    await mkdirp(path.dirname(out));
    await fs.copyFile(file, out);
  }
}

async function indexSources() {
  const docFiles = await walk(docsDir);

  for (const file of docFiles) {
    const rel = toPosix(path.relative(docsDir, file));
    const ext = path.extname(file).toLowerCase();
    if (ext === '.md') {
      markdownMap.set(path.resolve(file), rel);
    } else {
      assetMap.set(path.resolve(file), rel);
    }
  }

  for (const file of rootDocs) {
    markdownMap.set(path.join(root, file), `root/${file}`);
  }
}

function rewriteHref(href, sourceAbs, outputRel) {
  const [rawPath, hash = ''] = href.split('#');
  if (!rawPath || isExternal(rawPath)) return href;

  let resolved;
  if (rawPath.startsWith('/docs/')) {
    resolved = path.resolve(root, rawPath.slice(1));
  } else if (rawPath.startsWith('/')) {
    resolved = path.resolve(root, `.${rawPath}`);
  } else {
    resolved = path.resolve(path.dirname(sourceAbs), rawPath);
  }

  const targetHash = hash ? `#${hash}` : '';

  if (markdownMap.has(resolved)) {
    return `${relativeOutputUrl(outputRel, markdownMap.get(resolved), true)}${targetHash}`;
  }

  if (assetMap.has(resolved)) {
    return `${relativeOutputUrl(outputRel, assetMap.get(resolved), false)}${targetHash}`;
  }

  if (resolved.startsWith(root)) {
    const repoRel = toPosix(path.relative(root, resolved));
    return `${githubBlobBase}/${repoRel}${targetHash}`;
  }

  return href;
}

function rewriteMarkdown(content, sourceAbs, outputRel) {
  return content.replace(/(!?\[[^\]]*\]\()([^\)]+)(\))/g, (_match, before, href, after) => {
    const rewritten = rewriteHref(href.trim(), sourceAbs, outputRel);
    return `${before}${rewritten}${after}`;
  });
}

async function writeGeneratedMarkdown(sourceAbs, outputRel, lang, layout) {
  const raw = await fs.readFile(sourceAbs, 'utf8');
  const stripped = stripFrontMatter(raw).trimStart();
  const content = rewriteMarkdown(stripped, sourceAbs, outputRel);
  const title = titleFromContent(content, path.basename(outputRel));
  const frontMatter = [
    '---',
    `title: ${JSON.stringify(title)}`,
    `lang: ${lang}`,
    `layout: ${layout}`,
    `permalink: ${permalinkFor(outputRel)}`,
    `source_path: ${toPosix(path.relative(root, sourceAbs))}`,
    '---',
    '',
  ].join('\n');

  const destination = path.join(outDir, outputRel);
  await mkdirp(path.dirname(destination));
  await fs.writeFile(destination, `${frontMatter}${content}\n`, 'utf8');
}

async function main() {
  await rmrf(outDir);
  await mkdirp(outDir);
  await indexSources();

  for (const [sourceAbs, outputRel] of assetMap) {
    const destination = path.join(outDir, outputRel);
    await mkdirp(path.dirname(destination));
    await fs.copyFile(sourceAbs, destination);
  }

  await copyStatic(themeDir, outDir);

  for (const [sourceAbs, outputRel] of markdownMap) {
    const lang = outputRel.startsWith('translations/pt-br/') ? 'pt-BR' : 'en';
    const layout = outputRel === 'index.md' ? 'home' : 'doc';
    await writeGeneratedMarkdown(sourceAbs, outputRel, lang, layout);
  }

  const hasConfig = await pathExists(path.join(outDir, '_config.yml'));
  if (!hasConfig) {
    throw new Error('docs-site/_config.yml was not copied into .site-src');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
