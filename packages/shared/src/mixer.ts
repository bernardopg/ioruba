import type {
  MixerProfile,
  NoiseReductionLevel,
  SliderConfig,
  SliderStateMap,
  SliderUpdate
} from "./types";

const SLIDER_MAX = 1023;
const EDGE_SNAP_THRESHOLD = 7;

export function clampSliderValue(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(SLIDER_MAX, Math.round(value)));
}

function snapSliderEdge(value: number): number {
  const clamped = clampSliderValue(value);

  if (clamped <= EDGE_SNAP_THRESHOLD) {
    return 0;
  }

  if (clamped >= SLIDER_MAX - EDGE_SNAP_THRESHOLD) {
    return SLIDER_MAX;
  }

  return clamped;
}

export function sliderValueToNormalized(value: number): number {
  return snapSliderEdge(value) / SLIDER_MAX;
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

export function sliderToAppliedPercent(
  slider: SliderConfig,
  rawValue: number
): number {
  return sliderValueToPercent(sliderToAppliedNormalized(slider, rawValue) * SLIDER_MAX);
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
