// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ChangelogDialog } from "./changelog-dialog";

vi.mock("../../../../../CHANGELOG.md?raw", () => ({ default: "## [1.0.0] (2026-10-20)\n### Changed\n- First change\n### Changed\n- Second change\n" }));
vi.mock("@/hooks/use-app-version", () => ({ useAppVersion: () => "1.0.0" }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it("renders repeated changelog headings without duplicate React keys", () => {
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  const { getByText } = render(<ChangelogDialog language="pt-BR" open onOpenChange={() => {}} />);
  expect(getByText("First change")).toBeTruthy();
  expect(getByText("Second change")).toBeTruthy();
  expect(errors).not.toHaveBeenCalled();
});
