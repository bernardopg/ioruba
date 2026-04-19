import {
  defaultProfile,
  resolveActiveProfile,
  type AudioTarget,
  type FirmwareCalibration,
  type FirmwareSettings,
  type MixerProfile,
  type PersistedState,
  type SerialSettings,
  type SliderConfig,
  type UiSettings
} from "@ioruba/shared";

type ValidationSuccess<T> = {
  ok: true;
  value: T;
};

type ValidationFailure = {
  ok: false;
  error: string;
};

export type DraftValidationResult = ValidationSuccess<MixerProfile> | ValidationFailure;

export function parseProfileDraft(draft: string): DraftValidationResult {
  if (!draft.trim()) {
    return failure("O JSON do perfil nao pode ficar vazio");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(draft);
  } catch (error) {
    return failure(`JSON invalido: ${toErrorMessage(error)}`);
  }

  if (!isRecord(parsed)) {
    return failure("O perfil precisa ser um objeto JSON");
  }

  const id = readString(parsed.id, "id");
  if (!id.ok) {
    return id;
  }

  const name = readString(parsed.name, "name");
  if (!name.ok) {
    return name;
  }

  const serial = parseSerialSettings(parsed.serial);
  if (!serial.ok) {
    return serial;
  }

  const audio = parseAudioSettings(parsed.audio);
  if (!audio.ok) {
    return audio;
  }

  const firmware = parseFirmwareSettings(parsed.firmware);
  if (!firmware.ok) {
    return firmware;
  }

  const ui = parseUiSettings(parsed.ui);
  if (!ui.ok) {
    return ui;
  }

  const sliders = parseSliders(parsed.sliders);
  if (!sliders.ok) {
    return sliders;
  }

  return {
    ok: true,
    value: {
      id: id.value,
      name: name.value,
      serial: serial.value,
      audio: audio.value,
      firmware: firmware.value,
      ui: ui.value,
      sliders: sliders.value
    }
  };
}

export function serializeProfileDraft(profile: MixerProfile): string {
  return JSON.stringify(profile, null, 2);
}

export function cloneProfile(profile: MixerProfile): MixerProfile {
  return {
    ...profile,
    serial: {
      ...profile.serial
    },
    audio: {
      ...profile.audio
    },
    firmware: {
      ...profile.firmware
    },
    ui: {
      ...profile.ui
    },
    sliders: profile.sliders.map((slider) => ({
      ...slider,
      calibration: slider.calibration
        ? {
            ...slider.calibration
          }
        : undefined,
      targets: slider.targets.map((target) => ({ ...target }))
    }))
  };
}

export function createProfileFromDefault(profiles: MixerProfile[]): MixerProfile {
  const name = buildUniqueProfileName("Novo perfil", profiles);
  const profile = cloneProfile(defaultProfile);

  return {
    ...profile,
    id: buildUniqueProfileId(name, profiles),
    name
  };
}

export function duplicateProfileConfig(
  sourceProfile: MixerProfile,
  profiles: MixerProfile[]
): MixerProfile {
  const name = buildUniqueProfileName(`${sourceProfile.name} copia`, profiles);
  const profile = cloneProfile(sourceProfile);

  return {
    ...profile,
    id: buildUniqueProfileId(name, profiles),
    name
  };
}

export function selectProfileById(
  persisted: PersistedState,
  profileId: string
): PersistedState {
  if (!persisted.profiles.some((profile) => profile.id === profileId)) {
    return persisted;
  }

  return {
    ...persisted,
    selectedProfileId: profileId
  };
}

export function removeProfileById(
  persisted: PersistedState,
  profileId: string
): PersistedState {
  if (persisted.profiles.length <= 1) {
    return persisted;
  }

  const nextProfiles = persisted.profiles.filter((profile) => profile.id !== profileId);
  if (nextProfiles.length === 0) {
    return persisted;
  }

  const selectedProfileId =
    persisted.selectedProfileId === profileId ||
    !nextProfiles.some((profile) => profile.id === persisted.selectedProfileId)
      ? nextProfiles[0].id
      : persisted.selectedProfileId;

  return {
    ...persisted,
    profiles: nextProfiles,
    selectedProfileId
  };
}

export function replaceActiveProfile(
  persisted: PersistedState,
  nextProfile: MixerProfile
): PersistedState {
  const activeProfile = resolveActiveProfile(persisted);
  const nextProfiles =
    persisted.profiles.length === 0
      ? [nextProfile]
      : persisted.profiles.map((profile) =>
          profile.id === activeProfile.id ? nextProfile : profile
        );

  return {
    ...persisted,
    selectedProfileId: nextProfile.id,
    profiles: nextProfiles
  };
}

function parseSerialSettings(candidate: unknown): ValidationSuccess<SerialSettings> | ValidationFailure {
  if (candidate === undefined) {
    return success(defaultProfile.serial);
  }

  if (!isRecord(candidate)) {
    return failure("serial precisa ser um objeto");
  }

  const preferredPort = readNullableString(candidate.preferredPort, "serial.preferredPort");
  if (!preferredPort.ok) {
    return preferredPort;
  }

  const baudRate = readPositiveInteger(
    candidate.baudRate,
    "serial.baudRate",
    defaultProfile.serial.baudRate
  );
  if (!baudRate.ok) {
    return baudRate;
  }

  const autoConnect = readBoolean(
    candidate.autoConnect,
    "serial.autoConnect",
    defaultProfile.serial.autoConnect
  );
  if (!autoConnect.ok) {
    return autoConnect;
  }

  const heartbeatTimeoutMs = readPositiveInteger(
    candidate.heartbeatTimeoutMs,
    "serial.heartbeatTimeoutMs",
    defaultProfile.serial.heartbeatTimeoutMs
  );
  if (!heartbeatTimeoutMs.ok) {
    return heartbeatTimeoutMs;
  }

  return success({
    preferredPort: preferredPort.value,
    baudRate: baudRate.value,
    autoConnect: autoConnect.value,
    heartbeatTimeoutMs: heartbeatTimeoutMs.value
  });
}

function parseAudioSettings(candidate: unknown): ValidationSuccess<MixerProfile["audio"]> | ValidationFailure {
  if (candidate === undefined) {
    return success(defaultProfile.audio);
  }

  if (!isRecord(candidate)) {
    return failure("audio precisa ser um objeto");
  }

  const noiseReduction = readEnum(
    candidate.noiseReduction,
    "audio.noiseReduction",
    ["low", "default", "high"] as const,
    defaultProfile.audio.noiseReduction
  );
  if (!noiseReduction.ok) {
    return noiseReduction;
  }

  const smoothTransitions = readBoolean(
    candidate.smoothTransitions,
    "audio.smoothTransitions",
    defaultProfile.audio.smoothTransitions
  );
  if (!smoothTransitions.ok) {
    return smoothTransitions;
  }

  const transitionDurationMs = readNonNegativeInteger(
    candidate.transitionDurationMs,
    "audio.transitionDurationMs",
    defaultProfile.audio.transitionDurationMs
  );
  if (!transitionDurationMs.ok) {
    return transitionDurationMs;
  }

  return success({
    noiseReduction: noiseReduction.value,
    smoothTransitions: smoothTransitions.value,
    transitionDurationMs: transitionDurationMs.value
  });
}

function parseFirmwareSettings(
  candidate: unknown
): ValidationSuccess<FirmwareSettings> | ValidationFailure {
  if (candidate === undefined) {
    return success(defaultProfile.firmware);
  }

  if (!isRecord(candidate)) {
    return failure("firmware precisa ser um objeto");
  }

  const changeThreshold = readNonNegativeInteger(
    candidate.changeThreshold,
    "firmware.changeThreshold",
    defaultProfile.firmware.changeThreshold
  );
  if (!changeThreshold.ok) {
    return changeThreshold;
  }

  const edgeDeadzone = readNonNegativeInteger(
    candidate.edgeDeadzone,
    "firmware.edgeDeadzone",
    defaultProfile.firmware.edgeDeadzone
  );
  if (!edgeDeadzone.ok) {
    return edgeDeadzone;
  }

  const smoothingStrength = readIntegerInRange(
    candidate.smoothingStrength,
    "firmware.smoothingStrength",
    0,
    100,
    defaultProfile.firmware.smoothingStrength
  );
  if (!smoothingStrength.ok) {
    return smoothingStrength;
  }

  return success({
    changeThreshold: changeThreshold.value,
    edgeDeadzone: edgeDeadzone.value,
    smoothingStrength: smoothingStrength.value
  });
}

function parseUiSettings(candidate: unknown): ValidationSuccess<UiSettings> | ValidationFailure {
  if (candidate === undefined) {
    return success(defaultProfile.ui);
  }

  if (!isRecord(candidate)) {
    return failure("ui precisa ser um objeto");
  }

  const language = readEnum(
    candidate.language,
    "ui.language",
    ["pt-BR", "en"] as const,
    defaultProfile.ui.language
  );
  if (!language.ok) {
    return language;
  }

  const theme = readEnum(
    candidate.theme,
    "ui.theme",
    ["system", "light", "dark"] as const,
    defaultProfile.ui.theme
  );
  if (!theme.ok) {
    return theme;
  }

  const showVisualizers = readBoolean(
    candidate.showVisualizers,
    "ui.showVisualizers",
    defaultProfile.ui.showVisualizers
  );
  if (!showVisualizers.ok) {
    return showVisualizers;
  }

  const telemetryWindow = readPositiveInteger(
    candidate.telemetryWindow,
    "ui.telemetryWindow",
    defaultProfile.ui.telemetryWindow
  );
  if (!telemetryWindow.ok) {
    return telemetryWindow;
  }

  return success({
    language: language.value,
    theme: theme.value,
    showVisualizers: showVisualizers.value,
    telemetryWindow: telemetryWindow.value
  });
}

function parseSliders(candidate: unknown): ValidationSuccess<SliderConfig[]> | ValidationFailure {
  if (!Array.isArray(candidate)) {
    return failure("sliders precisa ser uma lista");
  }

  if (candidate.length === 0) {
    return failure("sliders precisa ter pelo menos um item");
  }

  const sliders: SliderConfig[] = [];
  const seenIds = new Set<number>();

  for (let index = 0; index < candidate.length; index += 1) {
    const sliderResult = parseSlider(candidate[index], `sliders[${index}]`);
    if (!sliderResult.ok) {
      return sliderResult;
    }

    if (seenIds.has(sliderResult.value.id)) {
      return failure(`sliders[${index}].id duplicado: ${sliderResult.value.id}`);
    }

    seenIds.add(sliderResult.value.id);
    sliders.push(sliderResult.value);
  }

  return success(sliders);
}

function parseSlider(candidate: unknown, path: string): ValidationSuccess<SliderConfig> | ValidationFailure {
  if (!isRecord(candidate)) {
    return failure(`${path} precisa ser um objeto`);
  }

  const id = readNonNegativeInteger(candidate.id, `${path}.id`);
  if (!id.ok) {
    return id;
  }

  const name = readString(candidate.name, `${path}.name`);
  if (!name.ok) {
    return name;
  }

  const targets = parseTargets(candidate.targets, `${path}.targets`);
  if (!targets.ok) {
    return targets;
  }

  const inverted =
    candidate.inverted === undefined
      ? false
      : typeof candidate.inverted === "boolean"
        ? candidate.inverted
        : null;
  if (inverted === null) {
    return failure(`${path}.inverted precisa ser true ou false`);
  }

  const calibration = parseCalibration(candidate.calibration, `${path}.calibration`);
  if (!calibration.ok) {
    return calibration;
  }

  return success({
    id: id.value,
    name: name.value,
    targets: targets.value,
    inverted,
    calibration: calibration.value
  });
}

function parseCalibration(
  candidate: unknown,
  path: string
): ValidationSuccess<FirmwareCalibration> | ValidationFailure {
  if (candidate === undefined) {
    return success({
      minRaw: 0,
      maxRaw: 1023
    });
  }

  if (!isRecord(candidate)) {
    return failure(`${path} precisa ser um objeto`);
  }

  const minRaw = readIntegerInRange(candidate.minRaw, `${path}.minRaw`, 0, 1023, 0);
  if (!minRaw.ok) {
    return minRaw;
  }

  const maxRaw = readIntegerInRange(
    candidate.maxRaw,
    `${path}.maxRaw`,
    0,
    1023,
    1023
  );
  if (!maxRaw.ok) {
    return maxRaw;
  }

  if (minRaw.value >= maxRaw.value) {
    return failure(`${path} precisa ter minRaw menor que maxRaw`);
  }

  return success({
    minRaw: minRaw.value,
    maxRaw: maxRaw.value
  });
}

function parseTargets(candidate: unknown, path: string): ValidationSuccess<AudioTarget[]> | ValidationFailure {
  if (!Array.isArray(candidate) || candidate.length === 0) {
    return failure(`${path} precisa ser uma lista com pelo menos um alvo`);
  }

  const targets: AudioTarget[] = [];
  for (let index = 0; index < candidate.length; index += 1) {
    const targetResult = parseTarget(candidate[index], `${path}[${index}]`);
    if (!targetResult.ok) {
      return targetResult;
    }
    targets.push(targetResult.value);
  }

  return success(targets);
}

function parseTarget(candidate: unknown, path: string): ValidationSuccess<AudioTarget> | ValidationFailure {
  if (!isRecord(candidate)) {
    return failure(`${path} precisa ser um objeto`);
  }

  if (candidate.kind === "master") {
    return success({ kind: "master" });
  }

  if (candidate.kind === "application" || candidate.kind === "source" || candidate.kind === "sink") {
    const name = readString(candidate.name, `${path}.name`);
    if (!name.ok) {
      return name;
    }

    return success({
      kind: candidate.kind,
      name: name.value
    });
  }

  return failure(
    `${path}.kind precisa ser master, application, source ou sink`
  );
}

function readString(candidate: unknown, path: string): ValidationSuccess<string> | ValidationFailure {
  if (typeof candidate !== "string" || candidate.trim().length === 0) {
    return failure(`${path} precisa ser um texto nao vazio`);
  }

  return success(candidate.trim());
}

function readNullableString(
  candidate: unknown,
  path: string
): ValidationSuccess<string | null> | ValidationFailure {
  if (candidate === undefined || candidate === null) {
    return success(null);
  }

  if (typeof candidate !== "string" || candidate.trim().length === 0) {
    return failure(`${path} precisa ser um texto ou null`);
  }

  return success(candidate.trim());
}

function readBoolean(
  candidate: unknown,
  path: string,
  fallback: boolean
): ValidationSuccess<boolean> | ValidationFailure {
  if (candidate === undefined) {
    return success(fallback);
  }

  if (typeof candidate !== "boolean") {
    return failure(`${path} precisa ser true ou false`);
  }

  return success(candidate);
}

function readPositiveInteger(
  candidate: unknown,
  path: string,
  fallback: number
): ValidationSuccess<number> | ValidationFailure {
  if (candidate === undefined) {
    return success(fallback);
  }

  if (!Number.isInteger(candidate) || (candidate as number) <= 0) {
    return failure(`${path} precisa ser um numero inteiro maior que zero`);
  }

  return success(candidate as number);
}

function readNonNegativeInteger(
  candidate: unknown,
  path: string,
  fallback?: number
): ValidationSuccess<number> | ValidationFailure {
  if (candidate === undefined) {
    if (fallback === undefined) {
      return failure(`${path} precisa ser um numero inteiro maior ou igual a zero`);
    }

    return success(fallback);
  }

  if (!Number.isInteger(candidate) || (candidate as number) < 0) {
    return failure(`${path} precisa ser um numero inteiro maior ou igual a zero`);
  }

  return success(candidate as number);
}

function readIntegerInRange(
  candidate: unknown,
  path: string,
  min: number,
  max: number,
  fallback?: number
): ValidationSuccess<number> | ValidationFailure {
  if (candidate === undefined) {
    if (fallback === undefined) {
      return failure(`${path} precisa ficar entre ${min} e ${max}`);
    }

    return success(fallback);
  }

  if (!Number.isInteger(candidate)) {
    return failure(`${path} precisa ser um numero inteiro`);
  }

  const value = candidate as number;
  if (value < min || value > max) {
    return failure(`${path} precisa ficar entre ${min} e ${max}`);
  }

  return success(value);
}

function readEnum<T extends readonly string[]>(
  candidate: unknown,
  path: string,
  options: T,
  fallback: T[number]
): ValidationSuccess<T[number]> | ValidationFailure {
  if (candidate === undefined) {
    return success(fallback);
  }

  if (typeof candidate !== "string" || !options.includes(candidate)) {
    return failure(`${path} precisa ser um destes valores: ${options.join(", ")}`);
  }

  return success(candidate);
}

function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === "object" && candidate !== null && !Array.isArray(candidate);
}

function success<T>(value: T): ValidationSuccess<T> {
  return { ok: true, value };
}

function failure(error: string): ValidationFailure {
  return { ok: false, error };
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function buildUniqueProfileName(baseName: string, profiles: MixerProfile[]): string {
  const existingNames = new Set(profiles.map((profile) => profile.name.toLowerCase()));
  let candidate = baseName;
  let suffix = 2;

  while (existingNames.has(candidate.toLowerCase())) {
    candidate = `${baseName} ${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function buildUniqueProfileId(baseName: string, profiles: MixerProfile[]): string {
  const existingIds = new Set(profiles.map((profile) => profile.id));
  const slugBase = slugifyProfileId(baseName);
  let candidate = slugBase;
  let suffix = 2;

  while (existingIds.has(candidate)) {
    candidate = `${slugBase}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function slugifyProfileId(value: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "profile";
}
