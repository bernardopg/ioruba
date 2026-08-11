import { describe, expect, it } from "vitest";

import changelogRaw from "../../../../CHANGELOG.md?raw";
import { parseChangelog } from "@/lib/changelog";

describe("parseChangelog", () => {
  it("parses the real Keep a Changelog document", () => {
    const releases = parseChangelog(changelogRaw);

    expect(releases[0]?.version).toBe("1.8.0");
    expect(releases[0]?.date).toBe("2026-08-10");
    expect(releases[0]?.url).toContain("/compare/v1.7.1...v1.8.0");
    expect(releases[0]?.sections[0]?.title).toBe("Added");
    expect(releases[0]?.sections[0]?.items[0]).toContain("signed in-app updates");
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
