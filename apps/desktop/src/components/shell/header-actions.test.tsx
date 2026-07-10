// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HeaderActions } from "@/components/shell/header-actions";
import { useIorubaStore } from "@/store/ioruba-store";

vi.mock("@/hooks/use-app-version", () => ({
  useAppVersion: () => "1.5.3",
}));

describe("HeaderActions", () => {
  beforeEach(() => {
    useIorubaStore.setState(useIorubaStore.getInitialState());
  });

  afterEach(cleanup);

  it("opens the changelog dialog and restores focus when it closes", () => {
    render(<HeaderActions language="pt-BR" />);
    const trigger = screen.getByRole("button", { name: "Abrir changelog" });

    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Changelog" })).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("clears the unread indicator when notifications are opened", () => {
    useIorubaStore.getState().pushNotification({
      id: "release-1.6.0",
      kind: "release",
      title: "Nova versão disponível",
      detail: "v1.6.0",
      read: false,
      createdAt: 1,
    });

    const { container } = render(<HeaderActions language="pt-BR" />);
    expect(container.querySelector(".notification-dot")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Abrir notificações" }));

    expect(screen.getByRole("heading", { name: "Notificações" })).not.toBeNull();
    expect(container.querySelector(".notification-dot")).toBeNull();
    expect(useIorubaStore.getState().notifications[0]?.read).toBe(true);
  });
});
