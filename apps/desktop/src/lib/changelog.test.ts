import { describe, expect, it } from "vitest";

import changelogRaw from "../../../../CHANGELOG.md?raw";
import { parseChangelog } from "@/lib/changelog";

describe("parseChangelog", () => {
  it("parses the real Keep a Changelog document", () => {
    const releases = parseChangelog(changelogRaw);

    // Ancorado numa entrada historica, nao na mais recente: prender o teste ao
    // topo do arquivo fazia todo commit de release quebrar a suite por um
    // motivo que nada tem a ver com o parser.
    const v182 = releases.find((release) => release.version === "1.8.2");
    expect(v182).toBeDefined();
    expect(v182?.date).toBe("2026-08-13");
    expect(v182?.url).toContain("/compare/v1.8.1...v1.8.2");
    expect(v182?.sections[0]?.title).toBe("Security");
    expect(v182?.sections[0]?.items[0]).toContain("RUSTSEC-2026-0221");

    // O topo do arquivo continua sendo um release real e em ordem decrescente.
    expect(releases[0]?.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(releases.indexOf(v182!)).toBeGreaterThan(-1);
    expect(releases.some((release) => release.version === "Unreleased")).toBe(false);
  });

  it("joins wrapped bullet lines without treating prose as a new release", () => {
    const releases = parseChangelog(`## [2.0.0](https://example.com) (2026-01-01)

### Changed

- First line
  continued detail
`);

    expect(releases).toEqual([
      {
        version: "2.0.0",
        url: "https://example.com",
        date: "2026-01-01",
        sections: [{ title: "Changed", items: ["First line continued detail"] }],
      },
    ]);
  });
});
