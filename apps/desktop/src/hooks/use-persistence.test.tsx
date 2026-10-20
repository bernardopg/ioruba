// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { defaultPersistedState } from "@ioruba/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePersistence } from "./use-persistence";
import { useIorubaStore } from "@/store/ioruba-store";

const { save } = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("@/lib/backend", () => ({ savePersistedState: save }));
function Harness() { usePersistence(); return null; }

describe("persisted settings", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    save.mockReset().mockResolvedValue(undefined);
    useIorubaStore.setState({ hydrated: false, watchLog: [], persisted: structuredClone(defaultPersistedState) });
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("does not overwrite settings before hydration", async () => {
    render(<Harness />);
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(save).not.toHaveBeenCalled();
  });

  it("coalesces rapid edits and saves the latest state", async () => {
    useIorubaStore.setState({ hydrated: true });
    render(<Harness />);
    await act(() => vi.advanceTimersByTimeAsync(200));
    act(() => useIorubaStore.setState(s => ({ persisted: { ...s.persisted, notificationsEnabled: false } })));
    await act(() => vi.advanceTimersByTimeAsync(249));
    expect(save).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(save).toHaveBeenCalledOnce();
    expect(save.mock.calls[0][0].notificationsEnabled).toBe(false);
  });

  it("reports disk failures instead of leaving an unhandled rejection", async () => {
    save.mockRejectedValue(new Error("disk full"));
    useIorubaStore.setState({ hydrated: true });
    render(<Harness />);
    await act(() => vi.advanceTimersByTimeAsync(250));
    expect(useIorubaStore.getState().watchLog).toEqual(expect.arrayContaining([
      expect.objectContaining({ scope: "backend", level: "error", detail: "disk full" }),
    ]));
  });
});
