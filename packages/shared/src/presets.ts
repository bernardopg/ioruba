import type { AudioTarget, MixerProfile } from "./types";

/**
 * Presets prontos para casos de uso comuns. Cada preset descreve apenas a parte
 * de domínio do perfil (sliders + intenção); `id` e `name` finais são resolvidos
 * na aplicação para garantir unicidade dentro da lista de perfis existente.
 *
 * O modelo de hardware tem exatamente 3 knobs (ver firmware), então todo preset
 * mapeia os três sliders de forma consistente: knob 0 = saída principal, knob 1 =
 * fonte/app de mídia, knob 2 = microfone, quando aplicável.
 */
export interface MixerPresetDefinition {
  /** Chave estável para i18n/telemetria. */
  key: string;
  /** Nome base sugerido (sofre desambiguação ao aplicar). */
  name: string;
  /** Descrição curta do caso de uso. */
  description: string;
  sliders: PresetSlider[];
}

interface PresetSlider {
  name: string;
  targets: AudioTarget[];
}

const FULL_RANGE = { minRaw: 0, maxRaw: 1023 } as const;

export const MIXER_PRESETS: readonly MixerPresetDefinition[] = [
  {
    key: "streaming",
    name: "Streaming",
    description:
      "Balanceie áudio do sistema, o app de captura e o microfone durante uma transmissão ao vivo.",
    sliders: [
      { name: "Saída principal", targets: [{ kind: "master" }] },
      {
        name: "Captura / chat",
        targets: [
          { kind: "application", name: "OBS" },
          { kind: "application", name: "Discord" }
        ]
      },
      { name: "Microfone", targets: [{ kind: "source", name: "default_microphone" }] }
    ]
  },
  {
    key: "calls",
    name: "Chamadas",
    description:
      "Controle volume geral, a sala de videoconferência no navegador e o microfone em reuniões.",
    sliders: [
      { name: "Saída principal", targets: [{ kind: "master" }] },
      {
        name: "Reunião",
        targets: [
          { kind: "application", name: "Google Chrome" },
          { kind: "application", name: "Zoom" },
          { kind: "application", name: "Microsoft Teams" }
        ]
      },
      { name: "Microfone", targets: [{ kind: "source", name: "default_microphone" }] }
    ]
  },
  {
    key: "music",
    name: "Música",
    description:
      "Ajuste o volume geral, o player de música e a saída padrão para audição ou produção.",
    sliders: [
      { name: "Saída principal", targets: [{ kind: "master" }] },
      {
        name: "Player",
        targets: [
          { kind: "application", name: "Spotify" },
          { kind: "application", name: "Rhythmbox" }
        ]
      },
      { name: "Saída de áudio", targets: [{ kind: "sink", name: "default_output" }] }
    ]
  }
];

export function findPreset(key: string): MixerPresetDefinition | undefined {
  return MIXER_PRESETS.find((preset) => preset.key === key);
}

/**
 * Materializa um preset em um `MixerProfile` completo a partir de um perfil base
 * (normalmente o `defaultProfile`), preservando configurações de serial/áudio/
 * firmware/ui e substituindo só os sliders. `id` e `name` devem ser definidos
 * pelo chamador (que conhece a lista de perfis para desambiguar).
 */
export function buildPresetProfile(
  preset: MixerPresetDefinition,
  base: MixerProfile,
  id: string,
  name: string
): MixerProfile {
  return {
    ...base,
    id,
    name,
    serial: { ...base.serial },
    audio: { ...base.audio },
    firmware: { ...base.firmware },
    ui: { ...base.ui },
    controls: (base.controls ?? []).map((control) => ({ ...control })),
    sliders: preset.sliders.map((slider, index) => ({
      id: index,
      name: slider.name,
      targets: slider.targets.map((target) => ({ ...target })),
      calibration: { ...FULL_RANGE }
    }))
  };
}
