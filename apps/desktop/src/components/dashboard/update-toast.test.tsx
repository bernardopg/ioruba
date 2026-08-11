// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UpdateToast } from "./update-toast";
import type { SignedUpdateState } from "@/hooks/use-signed-updater";
import { useIorubaStore } from "@/store/ioruba-store";

const signedUpdate = {
  available: true,
  version: "1.8.0",
  installing: false,
  error: null,
  dismiss: vi.fn(),
  install: vi.fn(async () => undefined),
} satisfies SignedUpdateState;

describe("UpdateToast", () => {
  afterEach(cleanup);

  beforeEach(() => {
    signedUpdate.dismiss.mockClear();
    signedUpdate.install.mockClear();
    useIorubaStore.setState(useIorubaStore.getInitialState());
  });

  it("offers to install a Tauri-verified update instead of opening an arbitrary URL", () => {
    render(<UpdateToast language="en" signedUpdate={signedUpdate} />);

    expect(screen.getByText("Update available")).toBeTruthy();
    expect(
      screen.getByText("v1.8.0 was verified by Ioruba's signature.")
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Update and restart" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Open release" })).toBeNull();
  });

  it("installs only after an explicit user action", () => {
    render(<UpdateToast language="pt-BR" signedUpdate={signedUpdate} />);

    expect(signedUpdate.install).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Atualizar e reiniciar" }));
    expect(signedUpdate.install).toHaveBeenCalledOnce();
  });

  it("dismisses the signed update without changing the disk-replacement notice", () => {
    render(<UpdateToast language="pt-BR" signedUpdate={signedUpdate} />);

    fireEvent.click(screen.getByRole("button", { name: "Depois" }));
    expect(signedUpdate.dismiss).toHaveBeenCalledOnce();
  });
});
