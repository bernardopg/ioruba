import type {
  MixerProfile,
  NoiseReductionLevel,
  SliderConfig,
  SliderStateMap,
  SliderUpdate
} from "./types";

export function clampSliderValue(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1023, Math.round(value)));
}

export function sliderValueToNormalized(value: number): number {
  return clampSliderValue(value) / 1023;
}

export function sliderValueToPercent(value: number): number {
  return Math.round(sliderValueToNormalized(value) * 100);
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
  rawValue: number
): number {
  const normalized = sliderValueToNormalized(rawValue);
  return slider.inverted ? 1 - normalized : normalized;
}

export function mergeSliderPacket(
  previousState: SliderStateMap,
  values: number[],
  sliderCount: number
): SliderStateMap {
  const nextState: SliderStateMap = { ...previousState };

  for (let index = 0; index < sliderCount; index += 1) {
    if (typeof values[index] === "number") {
      nextState[index] = clampSliderValue(values[index]);
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
