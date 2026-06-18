// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConnectionHealthIndicator } from "@/components/dashboard/connection-health";

afterEach(cleanup);

describe("ConnectionHealthIndicator", () => {
  it("shows a live signal and online tone when connected with a fresh frame", () => {
    vi.spyOn(Date, "now").mockReturnValue(10_000);
    render(
      <ConnectionHealthIndicator
        language="pt-BR"
        lastFrameAt={9_500}
        status="connected"
        statusText="ok"
      />
    );

    const region = screen.getByRole("status");
    expect(region.getAttribute("data-health")).toBe("online");
    expect(screen.getByText("Conectado")).not.toBeNull();
    expect(screen.getByText(/ao vivo/i)).not.toBeNull();
    vi.restoreAllMocks();
  });

  it("reports the frame age when the signal is stale", () => {
    vi.spyOn(Date, "now").mockReturnValue(20_000);
    render(
      <ConnectionHealthIndicator
        language="pt-BR"
        lastFrameAt={15_000}
        status="connected"
        statusText="ok"
      />
    );

    expect(screen.getByText(/5s atrás/i)).not.toBeNull();
    vi.restoreAllMocks();
  });

  it("renders an offline tone and no signal before any frame", () => {
    render(
      <ConnectionHealthIndicator
        language="pt-BR"
        lastFrameAt={null}
        status="disconnected"
        statusText="off"
      />
    );

    const region = screen.getByRole("status");
    expect(region.getAttribute("data-health")).toBe("offline");
    expect(screen.getByText(/sem sinal/i)).not.toBeNull();
  });

  it("renders English copy when requested", () => {
    render(
      <ConnectionHealthIndicator
        language="en"
        lastFrameAt={null}
        status="connecting"
        statusText="linking"
      />
    );

    expect(screen.getByText("Connecting")).not.toBeNull();
    expect(screen.getByText(/no signal/i)).not.toBeNull();
  });
});
