// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useIorubaStore } from "@/store/ioruba-store";
import { KnobPanel } from "./knob-panel";

afterEach(cleanup);
const knob = () => structuredClone(useIorubaStore.getInitialState().snapshot.knobs[0]);
it("shows the applied 12-bit output, rather than the newer uncommitted input", () => {
  const channel = { ...knob(), rawValue: 3072, appliedRawValue: 2048 };
  render(<KnobPanel knob={channel} adcMax={4095} inverted={false} />);
  expect(screen.getByLabelText(/nível enviado ao áudio/i).getAttribute("value")).toBe("50");
  expect(screen.getByText("Detalhes do sinal").parentElement?.hasAttribute("open")).toBe(false);
});
it("explains an inverted channel without presenting its ADC count as audio volume", () => {
  render(<KnobPanel knob={{ ...knob(), rawValue: 0, appliedRawValue: 0 }} adcMax={1023} inverted />);
  expect(screen.getByLabelText(/nível enviado ao áudio/i).getAttribute("value")).toBe("100");
  expect(screen.getByText("Sentido invertido")).toBeTruthy();
});
it("shows the device description and keeps a direct edit action", () => {
  const edit = vi.fn();
  const inventory = { ...useIorubaStore.getInitialState().audioInventory, sinks: [{ name: "alsa_output.machine", description: "Studio speakers" }] };
  render(<KnobPanel knob={{ ...knob(), targets: ["sink:alsa_output.machine"] }} audioInventory={inventory} onEditTargets={edit} />);
  expect(screen.getByText("Saída de áudio · Studio speakers")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /editar destinos/i }));
  expect(edit).toHaveBeenCalledOnce();
});
it("uses translated operational labels in English and Spanish", () => {
  const { rerender } = render(<KnobPanel knob={knob()} language="en" />);
  expect(screen.getByText("Audio destinations")).toBeTruthy();
  rerender(<KnobPanel knob={knob()} language="es" />);
  expect(screen.getByText("Destinos de audio")).toBeTruthy();
});

it("identifies simulated levels and gives a useful next step for an idle application", () => {
  const channel = knob();
  const { rerender } = render(<KnobPanel knob={channel} demoMode />);
  expect(screen.getByLabelText(/nível simulado/i)).toBeTruthy();
  expect(screen.getByText("Simulação")).toBeTruthy();
  channel.outcome = { severity: "warning", summary: "No active stream", targets: [{ target: "app:Spotify", status: "idle", detail: "No active stream", matched: [] }] };
  rerender(<KnobPanel knob={channel} />);
  expect(screen.getByText("Abra o aplicativo e inicie a reprodução.")).toBeTruthy();
});

it("does not claim zero or full audio before receiving a controller reading", () => {
  render(<KnobPanel knob={{ ...knob(), appliedRawValue: 0 }} inverted hasReading={false} />);
  expect(screen.getByLabelText(/nível enviado ao áudio/i).getAttribute("aria-valuetext")).toBe("Aguardando leitura");
  expect(screen.getByText("—")).toBeTruthy();
});
