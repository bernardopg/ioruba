import { describe, expect, it } from "vitest";

import { isNewerVersion } from "@/hooks/use-release-check";

describe("isNewerVersion", () => {
  it("compares semantic version number segments", () => {
    expect(isNewerVersion("v1.6.0", "1.5.3")).toBe(true);
    expect(isNewerVersion("1.5.10", "1.5.3")).toBe(true);
    expect(isNewerVersion("1.5.3", "1.5.3")).toBe(false);
    expect(isNewerVersion("1.4.9", "1.5.3")).toBe(false);
  });
});
