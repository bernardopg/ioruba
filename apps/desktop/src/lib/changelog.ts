export interface ChangelogSection {
  title: string;
  items: string[];
}

export interface ChangelogRelease {
  version: string;
  date: string | null;
  url: string | null;
  sections: ChangelogSection[];
}

const RELEASE_HEADING = /^## \[([^\]]+)\](?:\(([^)]+)\))?(?: \(([^)]+)\))?$/;

export function parseChangelog(raw: string): ChangelogRelease[] {
  const releases: ChangelogRelease[] = [];
  let release: ChangelogRelease | null = null;
  let section: ChangelogSection | null = null;

  function finishRelease() {
    if (!release) {
      return;
    }

    const sections = release.sections.filter((candidate) => candidate.items.length > 0);
    if (sections.length > 0 || release.version.toLowerCase() !== "unreleased") {
      releases.push({ ...release, sections });
    }
  }

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    const heading = RELEASE_HEADING.exec(line);

    if (heading) {
      finishRelease();
      release = {
        version: heading[1],
        url: heading[2] ?? null,
        date: heading[3] ?? null,
        sections: [],
      };
      section = null;
      continue;
    }

    if (!release) {
      continue;
    }

    if (line.startsWith("### ")) {
      section = { title: line.slice(4), items: [] };
      release.sections.push(section);
      continue;
    }

    if (line.startsWith("- ")) {
      section ??= { title: "Changes", items: [] };
      if (!release.sections.includes(section)) {
        release.sections.push(section);
      }
      section.items.push(line.slice(2));
      continue;
    }

    if (line && section?.items.length) {
      const lastIndex = section.items.length - 1;
      section.items[lastIndex] = `${section.items[lastIndex]} ${line}`;
    }
  }

  finishRelease();
  return releases;
}
