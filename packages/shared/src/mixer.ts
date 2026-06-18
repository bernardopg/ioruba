import type {
  MixerProfile,
  NoiseReductionLevel,
  SliderConfig,
  SliderStateMap,
  SliderUpdate
} from "./types";

const EDGE_SNAP_THRESHOLD = 7;

/** Resolução padrão do ADC, em bits — AVR (Nano/Uno/Mega/Leonardo) lê 10-bit. */
export const DEFAULT_ADC_BITS = 10;

/** Valor bruto máximo da resolução padrão (10-bit → 1023). */
export const DEFAULT_ADC_MAX = adcMaxForBits(DEFAULT_ADC_BITS);

/**
 * Teto absoluto de valor bruto aceito do firmware. Cobre até 16-bit, dando
 * folga acima de 12-bit (ESP32/RP2040) sem travar a leitura num único ADC. A
 * normalização para porcentagem usa o `adcMax` ativo da placa, não este teto.
 */
export const MAX_SUPPORTED_ADC_VALUE = 0xffff;

/** Valor bruto máximo para uma resolução de ADC em bits (ex.: 12 → 4095). */
export function adcMaxForBits(bits: number): number {
  return (1 << bits) - 1;
}

export function clampSliderValue(
  value: number,
  adcMax: number = DEFAULT_ADC_MAX
): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(adcMax, Math.round(value)));
}

function snapSliderEdge(value: number, adcMax: number = DEFAULT_ADC_MAX): number {
  const clamped = clampSliderValue(value, adcMax);

  if (clamped <= EDGE_SNAP_THRESHOLD) {
    return 0;
  }

  if (clamped >= adcMax - EDGE_SNAP_THRESHOLD) {
    return adcMax;
  }

  return clamped;
}

export function sliderValueToNormalized(
  value: number,
  adcMax: number = DEFAULT_ADC_MAX
): number {
  return snapSliderEdge(value, adcMax) / adcMax;
}

export function sliderValueToPercent(
  value: number,
  adcMax: number = DEFAULT_ADC_MAX
): number {
  return Math.round(sliderValueToNormalized(value, adcMax) * 100);
}

export function applyNoiseReduction(
  level: NoiseReductionLevel,
  previousValue: number,
  nextValue: number
): number {
  const thresholds: Record<NoiseReductionLevel, number> = {
    low: 5,
    default: 10,
    high: 20
  };

  return Math.abs(nextValue - previousValue) > thresholds[level]
    ? nextValue
    : previousValue;
}

export function sliderToAppliedNormalized(
  slider: SliderConfig,
  rawValue: number,
  adcMax: number = DEFAULT_ADC_MAX
): number {
  const normalized = sliderValueToNormalized(rawValue, adcMax);
  return slider.inverted ? 1 - normalized : normalized;
}

export function sliderToAppliedPercent(
  slider: SliderConfig,
  rawValue: number,
  adcMax: number = DEFAULT_ADC_MAX
): number {
  return Math.round(sliderToAppliedNormalized(slider, rawValue, adcMax) * 100);
}

export function mergeSliderPacket(
  previousState: SliderStateMap,
  values: number[],
  sliderCount: number,
  adcMax: number = DEFAULT_ADC_MAX
): SliderStateMap {
  const nextState: SliderStateMap = { ...previousState };

  for (let index = 0; index < sliderCount; index += 1) {
    if (typeof values[index] === "number") {
      nextState[index] = clampSliderValue(values[index], adcMax);
    }
  }

  return nextState;
}

export function resolveFilteredUpdates(
  profile: MixerProfile,
  currentValues: SliderStateMap,
  previousAppliedValues: SliderStateMap
): SliderUpdate[] {
  return profile.sliders
    .map((slider) => {
      const currentValue = currentValues[slider.id];
      if (typeof currentValue !== "number") {
        return null;
      }

      const previousValue = previousAppliedValues[slider.id];
      if (typeof previousValue !== "number") {
        return {
          sliderId: slider.id,
          rawValue: currentValue
        } satisfies SliderUpdate;
      }

      const filteredValue = applyNoiseReduction(
        profile.audio.noiseReduction,
        previousValue,
        currentValue
      );

      if (filteredValue === previousValue) {
        return null;
      }

      return {
        sliderId: slider.id,
        rawValue: filteredValue
      } satisfies SliderUpdate;
    })
    .filter((value): value is SliderUpdate => value !== null);
}
