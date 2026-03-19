import { invoke } from "@tauri-apps/api/core";
import {
  defaultPersistedState,
  normalizePersistedState,
  sliderToAppliedNormalized,
  type AudioInventory,
  type AudioTarget,
  type MixerProfile,
  type PersistedState,
  type SliderUpdate
} from "@ioruba/shared";

interface SliderBatchRequest {
  sliders: Array<{
    sliderId: number;
    sliderName: string;
    normalizedValue: number;
    targets: AudioTarget[];
  }>;
}

interface SliderBatchResponse {
  outcomes: Record<number, string>;
}

export async function loadPersistedState(): Promise<PersistedState> {
  const raw = await invoke<string>("load_persisted_state");
  if (!raw) {
    return defaultPersistedState;
  }

  return normalizePersistedState(JSON.parse(raw) as Partial<PersistedState>);
}

export async function savePersistedState(state: PersistedState): Promise<void> {
  await invoke("save_persisted_state", {
    payload: JSON.stringify(state, null, 2)
  });
}

export async function listAudioInventory(): Promise<AudioInventory> {
  return invoke<AudioInventory>("list_audio_inventory");
}

export async function applySliderTargetsBatch(
  profile: MixerProfile,
  updates: SliderUpdate[]
): Promise<Record<number, string>> {
  if (updates.length === 0) {
    return {};
  }

  const payload: SliderBatchRequest = {
    sliders: updates
      .map((update) => {
        const slider = profile.sliders.find(
          (candidate) => candidate.id === update.sliderId
        );
        if (!slider) {
          return null;
        }

        return {
          sliderId: slider.id,
          sliderName: slider.name,
          normalizedValue: sliderToAppliedNormalized(slider, update.rawValue),
          targets: slider.targets
        };
      })
      .filter(
        (value): value is SliderBatchRequest["sliders"][number] => value !== null
      )
  };

  const response = await invoke<SliderBatchResponse>("apply_slider_targets_batch", {
    request: payload
  });

  return response.outcomes;
}
