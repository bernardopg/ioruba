// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AudioBackendBanner } from "@/components/dashboard/audio-backend-banner";

afterEach(() => {
  cleanup();
});

describe("AudioBackendBanner", () => {
  it("does not render when the audio backend is available", () => {
    const { container } = render(
      <AudioBackendBanner backend="pactl" diagnostics={[]} />
    );

    expect(container.firstChild).toBeNull();
  });

  it("shows Linux installation guidance when pactl is missing", () => {
    render(
      <AudioBackendBanner
        backend="unsupported"
        diagnostics={[
          "Install pipewire-pulse or pulseaudio-utils so pactl becomes available"
        ]}
      />
    );

    expect(
      screen.getByRole("alert", { name: /backend de áudio indisponível/i })
    ).not.toBeNull();
    expect(screen.getByText(/não encontrou o pactl/i)).not.toBeNull();
    expect(screen.getByText(/sudo pacman -S pipewire-pulse/i)).not.toBeNull();
    expect(screen.queryByText(/fallback disponível/i)).toBeNull();
  });

  it("shows explicit fallback guidance on platforms without a native backend", () => {
    render(
      <AudioBackendBanner
        backend="unsupported"
        diagnostics={["No native audio backend is implemented for this platform"]}
        language="en"
      />
    );

    expect(
      screen.getByRole("alert", { name: /audio backend unavailable/i })
    ).not.toBeNull();
    expect(
      screen.getByText(/does not have a native audio backend yet/i)
    ).not.toBeNull();
    expect(screen.getByText(/available fallback/i)).not.toBeNull();
    expect(screen.getByText(/use demo mode/i)).not.toBeNull();
    expect(screen.queryByText(/sudo pacman/i)).toBeNull();
  });
});
