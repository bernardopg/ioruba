import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  cloneProfile,
  serializeProfileDraft,
  type DraftValidationResult
} from "@/lib/profile-config";
import { cn } from "@/lib/utils";
import { type WatchLogInput } from "@/lib/watch";
import type {
  AudioInventory,
  AudioTarget,
  MixerProfile,
  PersistedState
} from "@ioruba/shared";

type DraftStatusTone = "neutral" | "positive" | "warning" | "critical";

interface ProfileWorkbenchProps {
  persisted: PersistedState;
  activeProfile: MixerProfile;
  availablePorts: string[];
  audioInventory: AudioInventory;
  configDraft: string;
  draftValidation: DraftValidationResult;
  draftIsDirty: boolean;
  draftStatusTone: DraftStatusTone;
  draftStatusLabel: string;
  draftStatusHint: string;
  setConfigDraft: (draft: string) => void;
  applyConfigDraft: () => void;
  resetProfile: () => void;
  selectProfile: (profileId: string) => void;
  createProfile: () => void;
  duplicateActiveProfile: () => void;
  removeActiveProfile: () => void;
  appendWatchLog: (entry: WatchLogInput) => void;
}

export function ProfileWorkbench({
  persisted,
  activeProfile,
  availablePorts,
  audioInventory,
  configDraft,
  draftValidation,
  draftIsDirty,
  draftStatusTone,
  draftStatusLabel,
  draftStatusHint,
  setConfigDraft,
  applyConfigDraft,
  resetProfile,
  selectProfile,
  createProfile,
  duplicateActiveProfile,
  removeActiveProfile,
  appendWatchLog
}: ProfileWorkbenchProps) {
  const workingProfile = draftValidation.ok ? draftValidation.value : activeProfile;
  const structuredEditorLocked = !draftValidation.ok;
  const removable = persisted.profiles.length > 1;
  const profileActionLockedReason = structuredEditorLocked
    ? "Corrija o JSON avançado antes de trocar, criar, duplicar ou remover perfis."
    : null;
  const draftErrorId = "profile-draft-error";

  const knownPorts = useMemo(() => {
    const ports = [...availablePorts];

    if (
      workingProfile.serial.preferredPort &&
      !ports.includes(workingProfile.serial.preferredPort)
    ) {
      ports.unshift(workingProfile.serial.preferredPort);
    }

    return ports;
  }, [availablePorts, workingProfile.serial.preferredPort]);

  function appendEditorWarning(message: string, detail?: string) {
    appendWatchLog({
      scope: "app",
      level: "warning",
      message,
      detail
    });
  }

  function syncDraftBeforeProfileAction() {
    if (!draftValidation.ok) {
      appendEditorWarning(
        "Editor estruturado bloqueado",
        "Corrija o JSON avançado antes de alterar a coleção de perfis"
      );
      return false;
    }

    if (draftIsDirty) {
      try {
        applyConfigDraft();
      } catch (error) {
        appendEditorWarning(
          "Nao foi possivel salvar o rascunho antes da troca de perfil",
          error instanceof Error ? error.message : String(error)
        );
        return false;
      }
    }

    return true;
  }

  function updateStructuredProfile(mutator: (profile: MixerProfile) => void) {
    if (!draftValidation.ok) {
      appendEditorWarning(
        "Editor estruturado bloqueado",
        "Corrija o JSON avançado antes de continuar"
      );
      return;
    }

    const nextProfile = cloneProfile(workingProfile);
    mutator(nextProfile);
    setConfigDraft(serializeProfileDraft(nextProfile));
  }

  function updateNumberField(
    value: number,
    mutator: (profile: MixerProfile, nextValue: number) => void
  ) {
    if (!Number.isFinite(value)) {
      return;
    }

    updateStructuredProfile((profile) => {
      mutator(profile, Math.round(value));
    });
  }

  function createTarget(kind: AudioTarget["kind"], current?: AudioTarget): AudioTarget {
    if (kind === "master") {
      return { kind: "master" };
    }

    const currentName =
      current && current.kind === kind && "name" in current
        ? current.name
        : null;

    return {
      kind,
      name: currentName ?? defaultTargetName(kind, audioInventory)
    };
  }

  function handleSelectProfile(profileId: string) {
    if (profileId === persisted.selectedProfileId) {
      return;
    }

    if (!syncDraftBeforeProfileAction()) {
      return;
    }

    selectProfile(profileId);
  }

  function handleCreateProfile() {
    if (!syncDraftBeforeProfileAction()) {
      return;
    }

    createProfile();
  }

  function handleDuplicateProfile() {
    if (!syncDraftBeforeProfileAction()) {
      return;
    }

    duplicateActiveProfile();
  }

  function handleRemoveProfile() {
    if (!syncDraftBeforeProfileAction()) {
      return;
    }

    removeActiveProfile();
  }

  function handleAddSlider() {
    updateStructuredProfile((profile) => {
      const nextId =
        profile.sliders.reduce((max, slider) => Math.max(max, slider.id), -1) + 1;

      profile.sliders.push({
        id: nextId,
        name: `Knob ${profile.sliders.length + 1}`,
        targets: [{ kind: "master" }],
        inverted: false
      });
    });
  }

  function handleMoveSlider(index: number, direction: -1 | 1) {
    updateStructuredProfile((profile) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= profile.sliders.length) {
        return;
      }

      const nextSliders = [...profile.sliders];
      const [moved] = nextSliders.splice(index, 1);
      nextSliders.splice(nextIndex, 0, moved);
      profile.sliders = nextSliders;
    });
  }

  function handleRemoveSlider(index: number) {
    updateStructuredProfile((profile) => {
      if (profile.sliders.length <= 1) {
        return;
      }

      profile.sliders.splice(index, 1);
    });
  }

  function handleAddTarget(sliderIndex: number) {
    updateStructuredProfile((profile) => {
      profile.sliders[sliderIndex]?.targets.push(
        createTarget("application")
      );
    });
  }

  function handleRemoveTarget(sliderIndex: number, targetIndex: number) {
    updateStructuredProfile((profile) => {
      const slider = profile.sliders[sliderIndex];
      if (!slider || slider.targets.length <= 1) {
        return;
      }

      slider.targets.splice(targetIndex, 1);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Perfis salvos</CardTitle>
            <CardDescription>
              Selecione rapidamente um preset, duplique uma base existente e mantenha
              múltiplos layouts sem tocar no JSON bruto.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={structuredEditorLocked} onClick={handleCreateProfile}>
              <Plus className="h-4 w-4" />
              Novo perfil
            </Button>
            <Button
              disabled={structuredEditorLocked}
              onClick={handleDuplicateProfile}
              variant="secondary"
            >
              <Copy className="h-4 w-4" />
              Duplicar ativo
            </Button>
            <Button
              disabled={structuredEditorLocked || !removable}
              onClick={handleRemoveProfile}
              variant="ghost"
            >
              <Trash2 className="h-4 w-4" />
              Remover ativo
            </Button>
            {draftIsDirty ? <Badge tone="warning">Rascunho pendente</Badge> : null}
          </div>

          {profileActionLockedReason ? (
            <div className="rounded-[20px] border border-[color-mix(in_oklab,var(--accent-rose)_32%,var(--color-border))] bg-[color-mix(in_oklab,var(--accent-rose)_8%,var(--color-panel))] px-4 py-3 text-sm text-(--accent-rose)">
              {profileActionLockedReason}
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {persisted.profiles.map((profile) => {
              const selected = profile.id === persisted.selectedProfileId;

              return (
                <button
                  className={cn(
                    "rounded-3xl border px-4 py-4 text-left transition",
                    selected
                      ? "border-[color-mix(in_oklab,var(--accent-teal)_38%,var(--color-border))] bg-[color-mix(in_oklab,var(--accent-teal)_10%,var(--color-panel))]"
                      : "border-(--color-border) bg-(--color-panel) hover:border-(--accent-teal)"
                  )}
                  disabled={structuredEditorLocked}
                  key={profile.id}
                  onClick={() => handleSelectProfile(profile.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-(--color-ink)">
                        {profile.name}
                      </p>
                      <p className="mt-1 break-all text-xs text-(--color-muted)">
                        {profile.id}
                      </p>
                    </div>
                    {selected ? <Badge tone="positive">Ativo</Badge> : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge tone="neutral">{profile.sliders.length} knob(s)</Badge>
                    <Badge tone={profile.serial.autoConnect ? "positive" : "warning"}>
                      {profile.serial.autoConnect ? "auto-connect" : "manual"}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Editor estruturado</CardTitle>
                <CardDescription>
                  Ajuste nome, serial, áudio e preferências visuais do perfil com
                  formulários seguros. As mudanças alimentam o mesmo rascunho do JSON
                  avançado.
                </CardDescription>
              </div>
              <Badge tone={draftStatusTone}>{draftStatusLabel}</Badge>
            </CardHeader>
            <CardContent className="space-y-5">
              {structuredEditorLocked ? (
                <div className="rounded-[20px] border border-[color-mix(in_oklab,var(--accent-rose)_32%,var(--color-border))] bg-[color-mix(in_oklab,var(--accent-rose)_8%,var(--color-panel))] px-4 py-4 text-sm text-(--accent-rose)">
                  {draftStatusHint}
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <BufferedTextField
                      label="Nome do perfil"
                      onCommit={(value) =>
                        updateStructuredProfile((profile) => {
                          profile.name = value;
                        })
                      }
                      value={workingProfile.name}
                    />

                    <label className="grid gap-2">
                      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-(--color-muted)">
                        ID técnico
                      </span>
                      <input
                        className="field opacity-80"
                        readOnly
                        value={workingProfile.id}
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-(--color-muted)">
                        Porta preferida
                      </span>
                      <select
                        className="field"
                        onChange={(event) =>
                          updateStructuredProfile((profile) => {
                            profile.serial.preferredPort =
                              event.currentTarget.value || null;
                          })
                        }
                        value={workingProfile.serial.preferredPort ?? ""}
                      >
                        <option value="">Detectar automaticamente</option>
                        {knownPorts.map((port) => (
                          <option key={port} value={port}>
                            {port}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-(--color-muted)">
                        Baud rate
                      </span>
                      <input
                        className="field"
                        min={1200}
                        onChange={(event) =>
                          updateNumberField(event.currentTarget.valueAsNumber, (profile, nextValue) => {
                            profile.serial.baudRate = nextValue;
                          })
                        }
                        step={1200}
                        type="number"
                        value={workingProfile.serial.baudRate}
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-(--color-muted)">
                        Heartbeat (ms)
                      </span>
                      <input
                        className="field"
                        min={250}
                        onChange={(event) =>
                          updateNumberField(event.currentTarget.valueAsNumber, (profile, nextValue) => {
                            profile.serial.heartbeatTimeoutMs = nextValue;
                          })
                        }
                        step={250}
                        type="number"
                        value={workingProfile.serial.heartbeatTimeoutMs}
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-(--color-muted)">
                        Janela da telemetria
                      </span>
                      <input
                        className="field"
                        min={10}
                        onChange={(event) =>
                          updateNumberField(event.currentTarget.valueAsNumber, (profile, nextValue) => {
                            profile.ui.telemetryWindow = nextValue;
                          })
                        }
                        step={10}
                        type="number"
                        value={workingProfile.ui.telemetryWindow}
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-(--color-muted)">
                        Tema
                      </span>
                      <select
                        className="field"
                        onChange={(event) =>
                          updateStructuredProfile((profile) => {
                            profile.ui.theme = event.currentTarget.value as MixerProfile["ui"]["theme"];
                          })
                        }
                        value={workingProfile.ui.theme}
                      >
                        <option value="system">Seguir sistema</option>
                        <option value="light">Claro de bancada</option>
                        <option value="dark">Escuro de estúdio</option>
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-(--color-muted)">
                        Idioma
                      </span>
                      <select
                        className="field"
                        onChange={(event) =>
                          updateStructuredProfile((profile) => {
                            profile.ui.language = event.currentTarget.value as MixerProfile["ui"]["language"];
                          })
                        }
                        value={workingProfile.ui.language}
                      >
                        <option value="pt-BR">Português (Brasil)</option>
                        <option value="en">English</option>
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-(--color-muted)">
                        Redução de ruído
                      </span>
                      <select
                        className="field"
                        onChange={(event) =>
                          updateStructuredProfile((profile) => {
                            profile.audio.noiseReduction =
                              event.currentTarget.value as MixerProfile["audio"]["noiseReduction"];
                          })
                        }
                        value={workingProfile.audio.noiseReduction}
                      >
                        <option value="low">Baixa</option>
                        <option value="default">Padrão</option>
                        <option value="high">Alta</option>
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-(--color-muted)">
                        Transição (ms)
                      </span>
                      <input
                        className="field"
                        min={0}
                        onChange={(event) =>
                          updateNumberField(event.currentTarget.valueAsNumber, (profile, nextValue) => {
                            profile.audio.transitionDurationMs = nextValue;
                          })
                        }
                        step={10}
                        type="number"
                        value={workingProfile.audio.transitionDurationMs}
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <ToggleTile
                      checked={workingProfile.serial.autoConnect}
                      description="Conecta a serial automaticamente no boot quando possível."
                      onCheckedChange={(checked) =>
                        updateStructuredProfile((profile) => {
                          profile.serial.autoConnect = checked;
                        })
                      }
                      title="Auto-connect"
                    />
                    <ToggleTile
                      checked={workingProfile.audio.smoothTransitions}
                      description="Mantém o backend com aplicação mais suave entre amostras."
                      onCheckedChange={(checked) =>
                        updateStructuredProfile((profile) => {
                          profile.audio.smoothTransitions = checked;
                        })
                      }
                      title="Transições suaves"
                    />
                    <ToggleTile
                      checked={workingProfile.ui.showVisualizers}
                      description="Mostra gráficos e telemetria ao vivo na visão principal."
                      onCheckedChange={(checked) =>
                        updateStructuredProfile((profile) => {
                          profile.ui.showVisualizers = checked;
                        })
                      }
                      title="Visualizadores"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Knobs e destinos</CardTitle>
                <CardDescription>
                  Reordene canais, renomeie knobs e monte múltiplos targets sem abrir o
                  editor JSON.
                </CardDescription>
              </div>
              <Button disabled={structuredEditorLocked} onClick={handleAddSlider} size="small">
                <Plus className="h-4 w-4" />
                Adicionar knob
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {structuredEditorLocked ? (
                <div className="rounded-[20px] border border-[color-mix(in_oklab,var(--accent-rose)_32%,var(--color-border))] bg-[color-mix(in_oklab,var(--accent-rose)_8%,var(--color-panel))] px-4 py-4 text-sm text-(--accent-rose)">
                  Corrija o JSON avançado para liberar o editor visual dos knobs.
                </div>
              ) : (
                workingProfile.sliders.map((slider, sliderIndex) => {
                  const sliderSuggestions = slider.targets.flatMap((target) =>
                    target.kind === "master"
                      ? []
                      : targetSuggestions(target.kind, audioInventory)
                  );

                  return (
                    <div
                      className="rounded-3xl border border-(--color-border) bg-[color-mix(in_oklab,var(--color-panel)_94%,var(--color-shell)_6%)] px-4 py-4"
                      key={slider.id}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="neutral">Knob {sliderIndex + 1}</Badge>
                          <Badge tone="neutral">id {slider.id}</Badge>
                          {slider.inverted ? <Badge tone="warning">invertido</Badge> : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            disabled={sliderIndex === 0}
                            onClick={() => handleMoveSlider(sliderIndex, -1)}
                            size="small"
                            variant="ghost"
                          >
                            <ArrowUp className="h-4 w-4" />
                            Subir
                          </Button>
                          <Button
                            disabled={sliderIndex === workingProfile.sliders.length - 1}
                            onClick={() => handleMoveSlider(sliderIndex, 1)}
                            size="small"
                            variant="ghost"
                          >
                            <ArrowDown className="h-4 w-4" />
                            Descer
                          </Button>
                          <Button
                            disabled={workingProfile.sliders.length <= 1}
                            onClick={() => handleRemoveSlider(sliderIndex)}
                            size="small"
                            variant="ghost"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remover
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                        <BufferedTextField
                          label="Nome do knob"
                          onCommit={(value) =>
                            updateStructuredProfile((profile) => {
                              if (!profile.sliders[sliderIndex]) {
                                return;
                              }

                              profile.sliders[sliderIndex].name = value;
                            })
                          }
                          value={slider.name}
                        />

                        <ToggleTile
                          checked={slider.inverted ?? false}
                          description="Inverte o sentido lógico do knob sem mudar a fiação física."
                          onCheckedChange={(checked) =>
                            updateStructuredProfile((profile) => {
                              if (!profile.sliders[sliderIndex]) {
                                return;
                              }

                              profile.sliders[sliderIndex].inverted = checked;
                            })
                          }
                          title="Direção invertida"
                        />
                      </div>

                      <div className="mt-5 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-(--color-muted)">
                              Destinos do knob
                            </p>
                            <p className="mt-1 text-sm text-(--color-muted)">
                              Misture master, app, source e sink no mesmo canal.
                            </p>
                          </div>
                          <Button
                            onClick={() => handleAddTarget(sliderIndex)}
                            size="small"
                            variant="secondary"
                          >
                            <Plus className="h-4 w-4" />
                            Adicionar target
                          </Button>
                        </div>

                        {slider.targets.map((target, targetIndex) => {
                          const suggestions =
                            target.kind === "master"
                              ? []
                              : targetSuggestions(target.kind, audioInventory);

                          return (
                            <div
                              className="rounded-[20px] border border-(--color-border) bg-(--color-panel) px-3 py-3"
                              key={`${slider.id}-${target.kind}-${targetIndex}`}
                            >
                              <div className="grid gap-3 md:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)_auto] md:items-end">
                                <label className="grid gap-2">
                                  <span className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-(--color-muted)">
                                    Tipo
                                  </span>
                                  <select
                                    className="field"
                                    onChange={(event) =>
                                      updateStructuredProfile((profile) => {
                                        const nextSlider = profile.sliders[sliderIndex];
                                        if (!nextSlider) {
                                          return;
                                        }

                                        nextSlider.targets[targetIndex] = createTarget(
                                          event.currentTarget.value as AudioTarget["kind"],
                                          nextSlider.targets[targetIndex]
                                        );
                                      })
                                    }
                                    value={target.kind}
                                  >
                                    <option value="master">master</option>
                                    <option value="application">application</option>
                                    <option value="source">source</option>
                                    <option value="sink">sink</option>
                                  </select>
                                </label>

                                {target.kind === "master" ? (
                                  <div className="rounded-[18px] border border-dashed border-(--color-border) bg-[color-mix(in_oklab,var(--color-panel)_90%,transparent)] px-4 py-3 text-sm text-(--color-muted)">
                                    Controla a saída principal atual do sistema.
                                  </div>
                                ) : (
                                  <BufferedTextField
                                    label="Nome do target"
                                    onCommit={(value) =>
                                      updateStructuredProfile((profile) => {
                                        const nextSlider = profile.sliders[sliderIndex];
                                        const nextTarget = nextSlider?.targets[targetIndex];

                                        if (
                                          !nextSlider ||
                                          !nextTarget ||
                                          nextTarget.kind === "master"
                                        ) {
                                          return;
                                        }

                                        nextTarget.name = value;
                                      })
                                    }
                                    placeholder={defaultTargetName(target.kind, audioInventory)}
                                    value={target.name}
                                  />
                                )}

                                <Button
                                  disabled={slider.targets.length <= 1}
                                  onClick={() => handleRemoveTarget(sliderIndex, targetIndex)}
                                  size="small"
                                  variant="ghost"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Remover
                                </Button>
                              </div>

                              {suggestions.length > 0 ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {suggestions.slice(0, 6).map((suggestion) => (
                                    <button
                                      className="inline-flex min-h-8 items-center rounded-full border border-(--color-border) bg-[color-mix(in_oklab,var(--color-panel)_88%,transparent)] px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-(--color-copy) transition hover:border-(--accent-teal) hover:text-(--color-ink)"
                                      key={suggestion}
                                      onClick={() =>
                                        updateStructuredProfile((profile) => {
                                          const nextSlider = profile.sliders[sliderIndex];
                                          const nextTarget = nextSlider?.targets[targetIndex];

                                          if (
                                            !nextSlider ||
                                            !nextTarget ||
                                            nextTarget.kind === "master"
                                          ) {
                                            return;
                                          }

                                          nextTarget.name = suggestion;
                                        })
                                      }
                                      type="button"
                                    >
                                      {suggestion}
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}

                        {sliderSuggestions.length === 0 ? null : (
                          <p className="text-xs text-(--color-muted)">
                            Dica: as sugestões acima vêm do inventário de áudio carregado na sessão.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>JSON avançado</CardTitle>
                <CardDescription>
                  Escape hatch para ajustes finos, revisão de schema e colagem direta de
                  perfis completos.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone={draftStatusTone}>{draftStatusLabel}</Badge>
                <p className="text-sm text-(--color-muted)">{draftStatusHint}</p>
              </div>
              <textarea
                aria-describedby={!draftValidation.ok ? draftErrorId : undefined}
                aria-invalid={!draftValidation.ok}
                className={cn(
                  "min-h-125 w-full rounded-[28px] border bg-(--color-panel) px-5 py-4 font-mono text-sm text-(--color-copy) outline-none transition",
                  draftValidation.ok
                    ? "border-(--color-border) focus:border-(--accent-teal)"
                    : "border-[color-mix(in_oklab,var(--accent-rose)_42%,var(--color-border))] bg-[color-mix(in_oklab,var(--accent-rose)_7%,var(--color-panel))] focus:border-(--accent-rose)"
                )}
                onChange={(event) => setConfigDraft(event.currentTarget.value)}
                value={configDraft}
              />
              {!draftValidation.ok ? (
                <p
                  className="rounded-[20px] border border-[color-mix(in_oklab,var(--accent-rose)_42%,var(--color-border))] bg-[color-mix(in_oklab,var(--accent-rose)_10%,var(--color-panel))] px-4 py-3 text-sm text-(--accent-rose)"
                  id={draftErrorId}
                >
                  {draftValidation.error}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <Button disabled={!draftValidation.ok || !draftIsDirty} onClick={applyConfigDraft}>
                  Salvar perfil
                </Button>
                <Button onClick={resetProfile} variant="secondary">
                  Restaurar padrão
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Inventário para targets</CardTitle>
                <CardDescription>
                  Use estes nomes reais do runtime atual para preencher applications, sinks e
                  sources com menos tentativa e erro.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <InventoryHintBlock
                title="Applications"
                values={audioInventory.applications}
              />
              <InventoryHintBlock
                title="Sources"
                values={[
                  audioInventory.defaultSource ? `default_microphone -> ${audioInventory.defaultSource}` : null,
                  ...audioInventory.sources.map((source) => `${source.name} — ${source.description}`)
                ].filter((value): value is string => Boolean(value))}
              />
              <InventoryHintBlock
                title="Sinks"
                values={[
                  audioInventory.defaultSink ? `default_output -> ${audioInventory.defaultSink}` : null,
                  ...audioInventory.sinks.map((sink) => `${sink.name} — ${sink.description}`)
                ].filter((value): value is string => Boolean(value))}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ToggleTile({
  title,
  description,
  checked,
  onCheckedChange
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div
      className={cn(
        "flex min-h-30 items-start justify-between gap-4 rounded-[22px] border px-4 py-4 transition-[border-color,background-color,box-shadow] duration-200 ease-out",
        checked
          ? "border-[color-mix(in_oklab,var(--accent-teal)_34%,var(--color-border))] bg-[color-mix(in_oklab,var(--accent-teal)_10%,var(--color-panel))] [box-shadow:inset_0_1px_0_color-mix(in_oklab,var(--edge-highlight)_48%,transparent)]"
          : "border-(--color-border) bg-[color-mix(in_oklab,var(--color-panel)_94%,var(--color-shell)_6%)]"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-(--color-ink)">{title}</p>
          <Badge tone={checked ? "positive" : "neutral"}>{checked ? "Ligado" : "Desligado"}</Badge>
        </div>
        <p className="mt-2 text-sm leading-5 text-(--color-muted)">{description}</p>
      </div>
      <Switch
        aria-label={title}
        checked={checked}
        className="mt-0.5 self-center"
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

function BufferedTextField({
  label,
  value,
  onCommit,
  placeholder
}: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function commit() {
    const trimmed = draft.trim();
    if (!trimmed) {
      setDraft(value);
      return;
    }

    if (trimmed !== value) {
      onCommit(trimmed);
      return;
    }

    setDraft(value);
  }

  return (
    <label className="grid gap-2">
      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-(--color-muted)">
        {label}
      </span>
      <input
        className="field"
        onBlur={commit}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
            event.currentTarget.blur();
          }

          if (event.key === "Escape") {
            event.preventDefault();
            setDraft(value);
            event.currentTarget.blur();
          }
        }}
        placeholder={placeholder}
        value={draft}
      />
    </label>
  );
}

function InventoryHintBlock({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="rounded-[22px] border border-(--color-border) bg-(--color-panel) px-4 py-4">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-(--color-muted)">
        {title}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.length === 0 ? (
          <Badge tone="neutral">nenhum item detectado</Badge>
        ) : (
          values.map((value) => (
            <Badge className="max-w-full break-all" key={value} tone="neutral">
              {value}
            </Badge>
          ))
        )}
      </div>
    </div>
  );
}

function defaultTargetName(
  kind: Exclude<AudioTarget["kind"], "master">,
  audioInventory: AudioInventory
) {
  switch (kind) {
    case "application":
      return audioInventory.applications[0] ?? "Spotify";
    case "source":
      return audioInventory.defaultSource ?? audioInventory.sources[0]?.name ?? "default_microphone";
    case "sink":
      return audioInventory.defaultSink ?? audioInventory.sinks[0]?.name ?? "default_output";
  }
}

function targetSuggestions(
  kind: Exclude<AudioTarget["kind"], "master">,
  audioInventory: AudioInventory
) {
  switch (kind) {
    case "application":
      return audioInventory.applications;
    case "source":
      return [
        "default_microphone",
        ...(audioInventory.defaultSource ? [audioInventory.defaultSource] : []),
        ...audioInventory.sources.map((source) => source.name)
      ];
    case "sink":
      return [
        "default_output",
        ...(audioInventory.defaultSink ? [audioInventory.defaultSink] : []),
        ...audioInventory.sinks.map((sink) => sink.name)
      ];
  }
}