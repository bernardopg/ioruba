// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StatusPill } from "@/components/dashboard/status-pill";
import { useIorubaStore } from "@/store/ioruba-store";

vi.mock("@/hooks/use-app-version", () => ({
  useAppVersion: () => "1.5.3",
}));

describe("StatusPill", () => {
  beforeEach(() => {
    useIorubaStore.setState(useIorubaStore.getInitialState());
    const state = useIorubaStore.getState();
    useIorubaStore.setState({
      snapshot: {
        ...state.snapshot,
        connectionPort: "/dev/ttyUSB0",
        status: "connected",
        statusText: "Controlador conectado",
        diagnostics: {
          ...state.snapshot.diagnostics,
          backend: "pactl",
          lastSerialLine: "512|300|900",
        },
      },
    });
  });

  afterEach(cleanup);

  it("shows the runtime version and expands device telemetry", () => {
    render(<StatusPill />);

    const trigger = screen.getByRole("button", {
      name: "Detalhes do status do Ioruba",
    });
    expect(screen.getByText("v1.5.3")).not.toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(trigger);

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("/dev/ttyUSB0")).not.toBeNull();
    expect(screen.getByText("pactl")).not.toBeNull();
    expect(screen.getByText("512|300|900")).not.toBeNull();

    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("512|300|900")).toBeNull();
  });
});
