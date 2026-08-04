// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProfileWorkbench } from "@/components/config/profile-workbench";
import { parseProfileDraft, serializeProfileDraft } from "@/lib/profile-config";
import {
  defaultPersistedState,
  defaultProfile,
  emptyAudioInventory,
  resolveActiveProfile,
  type MixerProfile
} from "@ioruba/shared";

afterEach(() => {
  cleanup();
});

/**
 * Renderiza o editor visual já sincronizado com `profile` e devolve o espião de
 * `setConfigDraft`, por onde toda edição estruturada sai serializada.
 */
function renderEditor(profile?: MixerProfile) {
  const persisted = {
    ...structuredClone(defaultPersistedState),
    profiles: [profile ?? structuredClone(defaultProfile)]
  };
  const activeProfile = resolveActiveProfile(persisted);
  const configDraft = serializeProfileDraft(activeProfile);
  const draftValidation = parseProfileDraft(configDraft);

  if (!draftValidation.ok) {
    throw new Error("expected a valid draft for the workbench test");
  }

  const setConfigDraft = vi.fn();

  render(
    <ProfileWorkbench
      activeProfile={activeProfile}
      appendWatchLog={vi.fn()}
      applyConfigDraft={vi.fn()}
      applyPreset={vi.fn()}
      audioInventory={emptyAudioInventory}
      availablePorts={[]}
      configDraft={configDraft}
      createProfile={vi.fn()}
      draftIsDirty={false}
      draftStatusHint="Perfil salvo"
      draftStatusLabel="Perfil salvo"
      draftStatusTone="positive"
      draftValidation={draftValidation}
      duplicateActiveProfile={vi.fn()}
      exportActiveProfile={vi.fn()}
      importProfileFromFile={vi.fn()}
      language="pt-BR"
      persisted={persisted}
      removeActiveProfile={vi.fn()}
      resetProfile={vi.fn()}
      selectProfile={vi.fn()}
      setConfigDraft={setConfigDraft}
      view="editor"
    />
  );

  return { setConfigDraft };
}

function lastDraft(setConfigDraft: ReturnType<typeof vi.fn>): MixerProfile {
  const draft = setConfigDraft.mock.calls.at(-1)?.[0];
  if (typeof draft !== "string") {
    throw new Error("expected setConfigDraft to receive a serialized profile");
  }

  const parsed = parseProfileDraft(draft);
  if (!parsed.ok) {
    throw new Error(`expected a valid serialized profile, got: ${parsed.error}`);
  }

  return parsed.value;
}

describe("profile workbench control editor", () => {
  it("adds a button binding that defaults to muting the default output", () => {
    const { setConfigDraft } = renderEditor();

    fireEvent.click(screen.getByRole("button", { name: /adicionar botão/i }));

    const profile = lastDraft(setConfigDraft);
    expect(profile.controls).toEqual([
      {
        input: "button",
        id: 0,
        name: "Botão 1",
        event: "press",
        action: "mute"
      }
    ]);
  });

  it("attaches an application target to a mute binding", () => {
    const profile = structuredClone(defaultProfile);
    profile.controls = [
      { input: "button", id: 0, name: "Mute", event: "press", action: "mute" }
    ];

    const { setConfigDraft } = renderEditor(profile);

    fireEvent.change(screen.getByLabelText(/alvo do mute/i), {
      target: { value: "application" }
    });

    expect(lastDraft(setConfigDraft).controls[0]?.target).toEqual({
      kind: "application",
      name: "Spotify"
    });
  });

  it("drops the target when the action stops being mute", () => {
    const profile = structuredClone(defaultProfile);
    profile.controls = [
      {
        input: "button",
        id: 0,
        name: "Mute Spotify",
        event: "press",
        action: "mute",
        target: { kind: "application", name: "Spotify" }
      }
    ];

    const { setConfigDraft } = renderEditor(profile);

    fireEvent.change(screen.getByLabelText(/^ação$/i), { target: { value: "next" } });

    const control = lastDraft(setConfigDraft).controls[0];
    expect(control?.action).toBe("next");
    expect(control?.target).toBeUndefined();
  });

  it("keeps id, name and target when switching a button into an encoder", () => {
    const profile = structuredClone(defaultProfile);
    profile.controls = [
      {
        input: "button",
        id: 2,
        name: "Mute mic",
        event: "release",
        action: "mute",
        target: { kind: "source", name: "default_microphone" }
      }
    ];

    const { setConfigDraft } = renderEditor(profile);

    fireEvent.change(screen.getByLabelText(/tipo de entrada/i), {
      target: { value: "encoder" }
    });

    expect(lastDraft(setConfigDraft).controls[0]).toEqual({
      input: "encoder",
      id: 2,
      name: "Mute mic",
      direction: "clockwise",
      action: "mute",
      target: { kind: "source", name: "default_microphone" }
    });
  });
});
