// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CalibrationWizard } from "@/components/dashboard/calibration-wizard";
import { defaultProfile } from "@ioruba/shared";
import type { MixerProfile, RuntimeKnobSnapshot } from "@ioruba/shared";

function knob(id: number, rawValue: number): RuntimeKnobSnapshot {
  return {
    id,
    name: `Knob ${id}`,
    percent: 0,
    rawValue,
    appliedRawValue: rawValue,
    targets: [],
    outcome: { summary: "", severity: "info", targets: [] },
    accent: "teal"
  };
}

function renderWizard({
  profile,
  knobs,
  live = true,
  onApply = vi.fn()
}: {
  profile: MixerProfile;
  knobs: RuntimeKnobSnapshot[];
  live?: boolean;
  onApply?: (profile: MixerProfile) => void;
}) {
  return render(
    <CalibrationWizard
      adcMax={1023}
      knobs={knobs}
      language="pt-BR"
      live={live}
      onApply={onApply}
      profile={profile}
    />
  );
}

afterEach(cleanup);

describe("CalibrationWizard", () => {
  it("disables calibration while there is no live signal", () => {
    const profile = structuredClone(defaultProfile);
    renderWizard({
      profile,
      knobs: profile.sliders.map((slider) => knob(slider.id, 500)),
      live: false
    });

    for (const button of screen.getAllByRole("button", { name: "Calibrar" })) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("captures min and max from the observed extremes and applies to the profile", () => {
    const profile = structuredClone(defaultProfile);
    const firstSlider = profile.sliders[0];
    const onApply = vi.fn();
    const knobsAt = (raw: number) =>
      profile.sliders.map((slider) => knob(slider.id, raw));

    const view = renderWizard({ profile, knobs: knobsAt(500), onApply });

    fireEvent.click(screen.getAllByRole("button", { name: "Calibrar" })[0]);

    // Passo mínimo: o knob desce até 12 e volta; o extremo observado fica em 12.
    for (const raw of [300, 12, 80]) {
      view.rerender(
        <CalibrationWizard
          adcMax={1023}
          knobs={knobsAt(raw)}
          language="pt-BR"
          live
          onApply={onApply}
          profile={profile}
        />
      );
    }
    fireEvent.click(screen.getByRole("button", { name: "Capturar" }));

    // Passo máximo: sobe até 1010 e recua; o extremo fica em 1010.
    for (const raw of [600, 1010, 940]) {
      view.rerender(
        <CalibrationWizard
          adcMax={1023}
          knobs={knobsAt(raw)}
          language="pt-BR"
          live
          onApply={onApply}
          profile={profile}
        />
      );
    }
    fireEvent.click(screen.getByRole("button", { name: "Capturar" }));

    fireEvent.click(screen.getByRole("button", { name: "Aplicar ao perfil" }));

    expect(onApply).toHaveBeenCalledTimes(1);
    const applied = onApply.mock.calls[0][0] as MixerProfile;
    expect(applied.sliders[0].calibration).toEqual({ minRaw: 12, maxRaw: 1010 });
    // Os demais sliders ficam intocados.
    expect(applied.sliders[1]?.calibration).toEqual(
      profile.sliders[1]?.calibration
    );
    expect(applied.sliders[0].id).toBe(firstSlider.id);
  });

  it("blocks applying when the captured span is too short", () => {
    const profile = structuredClone(defaultProfile);
    const onApply = vi.fn();
    const knobsAt = (raw: number) =>
      profile.sliders.map((slider) => knob(slider.id, raw));

    renderWizard({ profile, knobs: knobsAt(500), onApply });

    fireEvent.click(screen.getAllByRole("button", { name: "Calibrar" })[0]);
    // Captura mínimo e máximo sem mover o knob: faixa 0.
    fireEvent.click(screen.getByRole("button", { name: "Capturar" }));
    fireEvent.click(screen.getByRole("button", { name: "Capturar" }));

    const apply = screen.getByRole("button", {
      name: "Aplicar ao perfil"
    }) as HTMLButtonElement;
    expect(apply.disabled).toBe(true);
    fireEvent.click(apply);
    expect(onApply).not.toHaveBeenCalled();
  });
});
