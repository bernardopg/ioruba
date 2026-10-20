// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSignedUpdater } from "./use-signed-updater";
import { useIorubaStore } from "@/store/ioruba-store";
const mocks = vi.hoisted(() => ({ check: vi.fn(), managed: vi.fn(), relaunch: vi.fn(), native: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ isTauri: mocks.native }));
vi.mock("@tauri-apps/plugin-updater", () => ({ check: mocks.check }));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: mocks.relaunch }));
vi.mock("@/lib/backend", () => ({ isManagedInstall: mocks.managed }));
const candidate = () => ({ version: "2.0.0", close: vi.fn().mockResolvedValue(undefined), downloadAndInstall: vi.fn().mockResolvedValue(undefined) });
describe("signed updater lifecycle", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.native.mockReturnValue(true); mocks.managed.mockResolvedValue(false);
    mocks.check.mockResolvedValue(null); mocks.relaunch.mockResolvedValue(undefined);
    useIorubaStore.setState(useIorubaStore.getInitialState());
  });
  afterEach(cleanup);
  it("does not check when release notifications are disabled", () => {
    renderHook(() => useSignedUpdater(false)); expect(mocks.check).not.toHaveBeenCalled();
  });
  it("does not invoke the native updater in a browser", () => {
    mocks.native.mockReturnValue(false);
    const { result } = renderHook(() => useSignedUpdater(true));
    expect(result.current.available).toBe(false); expect(mocks.check).not.toHaveBeenCalled();
  });
  it("releases a dismissed candidate without downloading it", async () => {
    const update = candidate(); mocks.check.mockResolvedValue(update);
    const { result } = renderHook(() => useSignedUpdater(true));
    await waitFor(() => expect(result.current.version).toBe("2.0.0"));
    act(() => result.current.dismiss());
    expect(result.current.available).toBe(false); expect(update.close).toHaveBeenCalledOnce();
    expect(update.downloadAndInstall).not.toHaveBeenCalled();
  });
  it("never replaces a package-managed installation", async () => {
    const update = candidate(); mocks.check.mockResolvedValue(update); mocks.managed.mockResolvedValue(true);
    const { result } = renderHook(() => useSignedUpdater(true));
    await waitFor(() => expect(result.current.managed && result.current.available).toBe(true));
    await act(() => result.current.install());
    expect(update.downloadAndInstall).not.toHaveBeenCalled(); expect(mocks.relaunch).not.toHaveBeenCalled();
  });
  it("reports a download failure without relaunching", async () => {
    const update = candidate(); update.downloadAndInstall.mockRejectedValue(new Error("signature rejected")); mocks.check.mockResolvedValue(update);
    const { result } = renderHook(() => useSignedUpdater(true));
    await waitFor(() => expect(result.current.available).toBe(true));
    await act(() => result.current.install());
    expect(result.current.error).toBe("signature rejected"); expect(result.current.installing).toBe(false);
    expect(mocks.relaunch).not.toHaveBeenCalled();
  });
  it("closes a late candidate after the hook unmounts", async () => {
    const update = candidate(); let resolve!: (value: ReturnType<typeof candidate>) => void;
    mocks.check.mockReturnValue(new Promise<ReturnType<typeof candidate>>(r => { resolve = r; }));
    const { unmount } = renderHook(() => useSignedUpdater(true)); unmount();
    await act(async () => { resolve(update); });
    expect(update.close).toHaveBeenCalledOnce();
  });
});
