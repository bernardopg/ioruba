import { isTauri, invoke } from "@tauri-apps/api/core";
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

import { type WatchLogEntry } from "@/lib/watch";

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

export async function loadWatchLogEntries(): Promise<WatchLogEntry[]> {
  if (!isTauri()) {
    return [];
  }

  return invoke<WatchLogEntry[]>("load_watch_log_entries");
}

export async function saveWatchLogEntries(
  entries: WatchLogEntry[]
): Promise<void> {
  if (!isTauri()) {
    return;
  }

  await invoke("save_watch_log_entries", {
    entries
  });
}

export async function appendWatchLogEntry(
  entry: WatchLogEntry
): Promise<void> {
  if (!isTauri()) {
    return;
  }

  await invoke("append_watch_log_entry", {
    entry
  });
}

export async function clearWatchLogEntries(): Promise<void> {
  if (!isTauri()) {
    return;
  }

  await invoke("clear_watch_log_entries");
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
