// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UpdateToast } from "./update-toast";
import type { SignedUpdateState } from "@/hooks/use-signed-updater";
import { useIorubaStore } from "@/store/ioruba-store";

const openUrl = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl }));

const signedUpdate = {
  available: true,
  version: "1.8.0",
  installing: false,
  error: null,
  managed: false,
  dismiss: vi.fn(),
  install: vi.fn(async () => undefined),
} satisfies SignedUpdateState;

describe("UpdateToast", () => {
  afterEach(cleanup);

  beforeEach(() => {
    signedUpdate.dismiss.mockClear();
    signedUpdate.install.mockClear();
    openUrl.mockClear();
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

  // Um clique em "Atualizar e reiniciar" numa instalacao pacman/AUR baixava
  // ~84 MB e so entao falhava com EACCES, sem nada visivel na interface.
  it("points a package-managed install at the release page instead of installing", () => {
    render(
      <UpdateToast
        language="en"
        signedUpdate={{ ...signedUpdate, managed: true }}
      />,
    );

    expect(
      screen.getByText(
        "This installation is managed by your system package manager. Update through it.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Update and restart" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "View release on GitHub" }));
    expect(signedUpdate.install).not.toHaveBeenCalled();
    expect(openUrl).toHaveBeenCalledWith(
      "https://github.com/bernardopg/ioruba/releases/tag/v1.8.0",
    );
  });

  // O detalhe do erro so ia para o watch log, entao a falha parecia um clique
  // sem efeito.
  it("surfaces the real installation failure reason", () => {
    render(
      <UpdateToast
        language="en"
        signedUpdate={{ ...signedUpdate, error: "Permission denied (os error 13)" }}
      />,
    );

    expect(screen.getByText(/Permission denied \(os error 13\)/)).toBeTruthy();
  });
});
