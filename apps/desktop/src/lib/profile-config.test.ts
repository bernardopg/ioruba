import { describe, expect, it } from "vitest";

import {
  createProfileFromDefault,
  duplicateProfileConfig,
  parseProfileDraft,
  removeProfileById,
  replaceActiveProfile,
  selectProfileById,
  serializeProfileDraft
} from "./profile-config";
import { defaultPersistedState, defaultProfile } from "@ioruba/shared";

describe("profile config", () => {
  it("parses a minimal profile draft and fills optional defaults", () => {
    const draft = JSON.stringify(
      {
        id: "custom-profile",
        name: "Custom",
        sliders: defaultProfile.sliders
      },
      null,
      2
    );

    const result = parseProfileDraft(draft);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.serial).toEqual(defaultProfile.serial);
      expect(result.value.audio).toEqual(defaultProfile.audio);
      expect(result.value.ui).toEqual(defaultProfile.ui);
    }
  });

  it("rejects invalid slider targets", () => {
    const draft = JSON.stringify(
      {
        ...defaultProfile,
        sliders: [
          {
            ...defaultProfile.sliders[0],
            targets: [{ kind: "application" }]
          }
        ]
      },
      null,
      2
    );

    const result = parseProfileDraft(draft);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("targets[0].name");
    }
  });

  it("replaces the active profile without losing selection when the id changes", () => {
    const persisted = {
      ...defaultPersistedState,
      profiles: [
        { ...defaultProfile, id: "first-profile", name: "First" },
        { ...defaultProfile, id: "second-profile", name: "Second" }
      ],
      selectedProfileId: "second-profile"
    };

    const nextPersisted = replaceActiveProfile(persisted, {
      ...defaultProfile,
      id: "renamed-profile",
      name: "Renamed"
    });

    expect(nextPersisted.selectedProfileId).toBe("renamed-profile");
    expect(nextPersisted.profiles[0]?.id).toBe("first-profile");
    expect(nextPersisted.profiles[1]?.id).toBe("renamed-profile");
    expect(serializeProfileDraft(nextPersisted.profiles[1] ?? defaultProfile)).toContain(
      "Renamed"
    );
  });

  it("creates a new default-based profile with unique name and id", () => {
    const nextProfile = createProfileFromDefault([
      defaultProfile,
      { ...defaultProfile, id: "novo-perfil", name: "Novo perfil" }
    ]);

    expect(nextProfile.name).toBe("Novo perfil 2");
    expect(nextProfile.id).toBe("novo-perfil-2");
    expect(nextProfile.sliders).toEqual(defaultProfile.sliders);
    expect(nextProfile).not.toBe(defaultProfile);
  });

  it("duplicates an existing profile with a fresh identity", () => {
    const duplicate = duplicateProfileConfig(defaultProfile, [defaultProfile]);

    expect(duplicate.id).not.toBe(defaultProfile.id);
    expect(duplicate.name).toContain(defaultProfile.name);
    expect(duplicate.sliders).toEqual(defaultProfile.sliders);
    expect(duplicate).not.toBe(defaultProfile);
  });

  it("selects and removes profiles safely", () => {
    const persisted = {
      ...defaultPersistedState,
      profiles: [
        { ...defaultProfile, id: "first-profile", name: "First" },
        { ...defaultProfile, id: "second-profile", name: "Second" }
      ],
      selectedProfileId: "first-profile"
    };

    const selected = selectProfileById(persisted, "second-profile");
    const removed = removeProfileById(selected, "second-profile");

    expect(selected.selectedProfileId).toBe("second-profile");
    expect(removed.selectedProfileId).toBe("first-profile");
    expect(removed.profiles).toHaveLength(1);
  });
});
