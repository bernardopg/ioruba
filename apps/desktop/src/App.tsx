import { useEffect, useMemo, useState, type KeyboardEvent } from "react";

import {
  Activity,
  AudioLines,
  Braces,
  Cog,
  Cpu,
  FolderCog,
  HeartPulse,
  Home,
  LaptopMinimal,
  Mic2,
  PanelsTopLeft,
  PlugZap,
  RefreshCcw,
  SlidersHorizontal,
  Waves
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProfileWorkbench } from "@/components/config/profile-workbench";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { AudioBackendBanner } from "@/components/dashboard/audio-backend-banner";
import { CalibrationWizard } from "@/components/dashboard/calibration-wizard";
import { ConnectionHealthIndicator } from "@/components/dashboard/connection-health";
import { HardwarePanel } from "@/components/dashboard/hardware-panel";
import { KnobPanel } from "@/components/dashboard/knob-panel";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { OverviewSignalPanel } from "@/components/dashboard/overview-signal-panel";
import { SessionStatsPanel } from "@/components/dashboard/session-stats-panel";
import { StatusPill } from "@/components/dashboard/status-pill";
import { UpdateToast } from "@/components/dashboard/update-toast";
import { WatchLogPanel } from "@/components/dashboard/watch-log-panel";
import { HeaderActions } from "@/components/shell/header-actions";
import { TelemetryChart } from "@/components/dashboard/telemetry-chart";
import { useBackgroundTray } from "@/hooks/use-background-tray";
import { usePersistence } from "@/hooks/use-persistence";
import { useReleaseCheck } from "@/hooks/use-release-check";
import { useRuntimeBoot } from "@/hooks/use-runtime-boot";
import { useSerialRuntime } from "@/hooks/use-serial-runtime";
import { useThemeSync } from "@/hooks/use-theme-sync";
import { useUpdateWatch } from "@/hooks/use-update-watch";
import { useWatchBridge } from "@/hooks/use-watch-bridge";
import {
  exportSessionStats,
  exportWatchLog,
  listAudioInventory,
  setLaunchOnLoginEnabled
} from "@/lib/backend";
import { formatRuntimeStatus, translateText } from "@/lib/i18n";
import {
  parseProfileDraft,
  serializeProfileDraft
} from "@/lib/profile-config";
import { useIorubaStore } from "@/store/ioruba-store";
import {
  adcMaxForBits,
  DEFAULT_ADC_BITS,
  resolveActiveProfile,
  sessionStatsToCsv,
  sessionStatsToJson,
  type ThemeMode
} from "@ioruba/shared";

type AppSection =
  | "home"
  | "control"
  | "channels"
  | "telemetry"
  | "hardware"
  | "diagnostics"
  | "settings"
  | "settings-editor"
  | "settings-advanced";

interface NavItem {
  id: AppSection;
  label: string;
  description: string;
  icon: typeof Home;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export default function App() {
  useBackgroundTray();
  useWatchBridge();
  useUpdateWatch();
  useRuntimeBoot();
  usePersistence();
  useSerialRuntime();
  const signedUpdate = useReleaseCheck();

  const persisted = useIorubaStore((state) => state.persisted);
  const snapshot = useIorubaStore((state) => state.snapshot);
  const lastFrameAt = useIorubaStore((state) => state.lastFrameAt);
  const sessionStats = useIorubaStore((state) => state.sessionStats);
  const resetSessionStats = useIorubaStore((state) => state.resetSessionStats);
  const watchLog = useIorubaStore((state) => state.watchLog);
  const configDraft = useIorubaStore((state) => state.configDraft);
  const setConfigDraft = useIorubaStore((state) => state.setConfigDraft);
  const applyConfigDraft = useIorubaStore((state) => state.applyConfigDraft);
  const resetProfile = useIorubaStore((state) => state.resetProfile);
  const requestConnect = useIorubaStore((state) => state.requestConnect);
  const disconnect = useIorubaStore((state) => state.disconnect);
  const setDemoMode = useIorubaStore((state) => state.setDemoMode);
  const setLaunchOnLogin = useIorubaStore((state) => state.setLaunchOnLogin);
  const selectProfile = useIorubaStore((state) => state.selectProfile);
  const createProfile = useIorubaStore((state) => state.createProfile);
  const applyPreset = useIorubaStore((state) => state.applyPreset);
  const exportActiveProfile = useIorubaStore((state) => state.exportActiveProfile);
  const importProfileFromFile = useIorubaStore((state) => state.importProfileFromFile);
  const dismissOnboarding = useIorubaStore((state) => state.dismissOnboarding);
  const duplicateActiveProfile = useIorubaStore(
    (state) => state.duplicateActiveProfile
  );
  const removeActiveProfile = useIorubaStore((state) => state.removeActiveProfile);
  const setPreferredPort = useIorubaStore((state) => state.setPreferredPort);
  const updateActiveProfileConfig = useIorubaStore(
    (state) => state.updateActiveProfileConfig
  );
  const setThemeMode = useIorubaStore((state) => state.setThemeMode);
  const refreshInventory = useIorubaStore((state) => state.refreshInventory);
  const clearWatchLog = useIorubaStore((state) => state.clearWatchLog);
  const appendWatchLog = useIorubaStore((state) => state.appendWatchLog);
  const audioInventory = useIorubaStore((state) => state.audioInventory);
  const activeProfile = resolveActiveProfile(persisted);
  const language = activeProfile.ui.language;
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const lt = (text: string) => translateText(language, text);
  const [launchOnLoginPending, setLaunchOnLoginPending] = useState(false);
  const [activeSection, setActiveSection] = useState<AppSection>("channels");

  useThemeSync(activeProfile.ui.theme);

  const draftValidation = parseProfileDraft(configDraft);
  const savedConfigDraft = serializeProfileDraft(activeProfile);
  const draftIsDirty = configDraft !== savedConfigDraft;
  const draftStatusTone = draftValidation.ok
    ? draftIsDirty
      ? "warning"
      : "positive"
    : "critical";
  const draftStatusLabel = draftValidation.ok
    ? draftIsDirty
      ? lt("Alteracoes pendentes")
      : lt("Perfil salvo")
    : lt("JSON invalido");
  const draftStatusHint = draftValidation.ok
    ? draftIsDirty
      ? lt("Salve para persistir o perfil ativo.")
      : lt("O editor esta sincronizado com o perfil salvo.")
    : lt(draftValidation.error);
  const demoModeTitleId = "demo-mode-title";
  const demoModeDescriptionId = "demo-mode-description";
  const launchOnLoginTitleId = "launch-on-login-title";
  const launchOnLoginDescriptionId = "launch-on-login-description";
  const statusCardDescriptionId = "session-status-description";
  const liveStatusMessage = `${lt("Sessão")}: ${formatRuntimeStatus(language, snapshot.status)}. ${lt("Perfil")}: ${draftStatusLabel}. ${draftStatusHint}`;
  const navigationGroups = useMemo<NavGroup[]>(
    () => [
      {
        id: "operation",
        label: lt("Operação"),
        items: [
          { id: "channels" as const, label: lt("Mixer"), description: lt("Controle o volume de cada destino com seus knobs."), icon: SlidersHorizontal },
          { id: "home" as const, label: lt("Home"), description: lt("Seu controlador, áudio e perfil em um só lugar."), icon: Home },
          { id: "control" as const, label: lt("Painel de controle"), description: lt("Conecte seu controlador e escolha como usar o Ioruba."), icon: PanelsTopLeft }
        ]
      },
      {
        id: "monitoring" as const,
        label: lt("Monitoramento"),
        items: [
          {
            id: "telemetry" as const,
            label: lt("Telemetria"),
            description: lt("Leituras ao vivo, resposta dos knobs e timeline."),
            icon: Activity
          },
          {
            id: "hardware" as const,
            label: lt("Hardware"),
            description: lt("Controlador, MCU, ADC e backend de áudio."),
            icon: Cpu
          },
          {
            id: "diagnostics" as const,
            label: lt("Diagnósticos"),
            description: lt("Encontre o que precisa de atenção na conexão e no áudio."),
            icon: HeartPulse
          }
        ]
      },
      {
        id: "settings-group" as const,
        label: lt("Ajustes"),
        items: [
          {
            id: "settings" as const,
            label: lt("Perfis"),
            description: lt("Crie, importe, exporte e selecione perfis salvos."),
            icon: FolderCog
          },
          {
            id: "settings-editor" as const,
            label: lt("Editor"),
            description: lt("Conexão, áudio, firmware, knobs e destinos."),
            icon: Cog
          },
          {
            id: "settings-advanced" as const,
            label: lt("Avançado"),
            description: lt("JSON do perfil e inventário para targets."),
            icon: Braces
          }
        ]
      }
    ],
    [lt]
  );
  const navigationItems = useMemo(
    () => navigationGroups.flatMap((group) => group.items),
    [navigationGroups]
  );
  const currentSection =
    navigationItems.find((item) => item.id === activeSection) ?? navigationItems[0];

  // Padrão WAI-ARIA de tabs com tabindex itinerante: as setas movem a seleção
  // (ativação automática), Home/End pulam para as extremidades. Sem isso os
  // tabs inativos (tabIndex -1) ficariam inalcançáveis pelo teclado.
  function handleTablistKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = navigationItems.findIndex(
      (item) => item.id === activeSection
    );

    let nextIndex: number | null = null;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        nextIndex = (currentIndex + 1) % navigationItems.length;
        break;
      case "ArrowUp":
      case "ArrowLeft":
        nextIndex =
          (currentIndex - 1 + navigationItems.length) % navigationItems.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = navigationItems.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextItem = navigationItems[nextIndex];
    setActiveSection(nextItem.id);
    document.getElementById(`tab-${nextItem.id}`)?.focus();
  }

  async function handleWatchLogExport() {
    appendWatchLog({
      scope: "app",
      level: "info",
      message: "Exportacao do watch log solicitada",
      detail: `${watchLog.length} evento(s)`
    });

    try {
      const result = await exportWatchLog(watchLog);

      appendWatchLog({
        scope: result ? "backend" : "app",
        level: result ? "info" : "warning",
        message: result ? "Watch log exportado" : "Exportacao do watch log cancelada",
        detail: result
          ? `${result.entries} evento(s) em ${result.path}`
          : undefined
      });

      return result;
    } catch (error) {
      appendWatchLog({
        scope: "backend",
        level: "error",
        message: "Falha ao exportar watch log",
        detail: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async function handleSessionStatsExport(format: "json" | "csv") {
    const knobNames = Object.fromEntries(
      snapshot.knobs.map((knob) => [knob.id, knob.name])
    );
    const payload =
      format === "json"
        ? sessionStatsToJson(sessionStats, knobNames)
        : sessionStatsToCsv(sessionStats, knobNames);
    const fileName = `ioruba-session-stats.${format}`;

    appendWatchLog({
      scope: "app",
      level: "info",
      message: "Exportacao de estatisticas solicitada",
      detail: format.toUpperCase()
    });

    try {
      const path = await exportSessionStats(fileName, payload);

      appendWatchLog({
        scope: path ? "backend" : "app",
        level: path ? "info" : "warning",
        message: path
          ? "Estatisticas da sessao exportadas"
          : "Exportacao de estatisticas cancelada",
        detail: path ?? undefined
      });
    } catch (error) {
      appendWatchLog({
        scope: "backend",
        level: "error",
        message: "Falha ao exportar estatisticas",
        detail: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return (
    <main className="min-h-screen bg-(--color-shell) text-(--color-copy)">
      <div aria-atomic="true" aria-live="polite" className="sr-only" role="status">
        {liveStatusMessage}
      </div>
      <a className="skip-link" href="#app-content">
        {lt("Pular para o conteúdo principal")}
      </a>
      <UpdateToast language={language} signedUpdate={signedUpdate} />
      <div className="ambient-grid fixed inset-0 opacity-70" />
      <div className="app-workspace">
        <aside className="sidebar-shell">
          <div className="sidebar-panel">
            <div className="brand-lockup"><AudioLines aria-hidden="true" /><span>Ioruba<small>{lt("Controle de áudio")}</small></span></div>

            <div className="sidebar-health">
              <ConnectionHealthIndicator
                language={language}
                lastFrameAt={lastFrameAt}
                status={snapshot.status}
                statusText={snapshot.statusText}
              />
            </div>

            <nav className="workspace-nav">
              <div
                aria-label={lt("Navegação principal do Ioruba")}
                className="sidebar-nav"
                id="app-content"
                onKeyDown={handleTablistKeyDown}
                role="tablist"
                tabIndex={-1}
              >
                {navigationGroups.map((group) => (
                  <div className="sidebar-nav-group" key={group.id} role="presentation">
                    <p className="sidebar-nav-group-label" role="presentation">
                      {group.label}
                    </p>
                    <div className="sidebar-nav-list" role="presentation">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.id === activeSection;

                        return (
                          <button
                            aria-controls="main-tabpanel"
                            aria-selected={isActive}
                            className="sidebar-nav-item"
                            data-active={isActive}
                            id={`tab-${item.id}`}
                            key={item.id}
                            onClick={() => setActiveSection(item.id)}
                            role="tab"
                            tabIndex={isActive ? 0 : -1}
                            title={item.description}
                            type="button"
                          >
                            <span className="sidebar-nav-icon">
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="sidebar-nav-title min-w-0 text-left">
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </nav>

          </div>
        </aside>

        <div
          aria-labelledby={`tab-${activeSection}`}
          className="flex min-w-0 flex-col gap-6"
          id="main-tabpanel"
          role="tabpanel"
          tabIndex={0}
        >
          <header className="workspace-header">
            <div className="workspace-heading">
              <h1>{currentSection.label}</h1>
              <p>{currentSection.description}</p>
            </div>
            <div className="workspace-tools"><StatusPill /><HeaderActions language={language} /></div>
          </header>

          {activeSection === "home" ? (
            <>
              {!persisted.onboardingDismissed ? (
                <OnboardingChecklist audioInventory={audioInventory} language={language} onDismiss={dismissOnboarding} snapshot={snapshot} />
              ) : null}
              <AudioBackendBanner backend={audioInventory.backend} diagnostics={audioInventory.diagnostics} language={language} />
              <section className="session-overview" aria-label={lt("Resumo da sessão")}>
                <div className="session-overview-main">
                  <span className="session-eyebrow">{lt("Seu espaço de áudio")}</span>
                  <h2>{activeProfile.name}</h2>
                  <p>{snapshot.diagnostics.firmware?.boardName ?? lt("Conecte o controlador para começar.")}</p>
                  <Button onClick={() => setActiveSection("channels")}><SlidersHorizontal aria-hidden="true" className="h-4 w-4" />{lt("Abrir mixer")}</Button>
                </div>
                <dl className="session-facts">
                  <div><dt>{lt("Sessão")}</dt><dd>{formatRuntimeStatus(language, snapshot.status)}</dd></div>
                  <div><dt>{lt("Porta ativa")}</dt><dd>{snapshot.connectionPort ?? lt("nenhuma")}</dd></div>
                  <div><dt>{lt("Canais")}</dt><dd>{snapshot.knobs.length}</dd></div>
                  <div><dt>{lt("Áudio do sistema")}</dt><dd>{audioInventory.backend === "unsupported" ? lt("Indisponível") : lt("Disponível")}</dd></div>
                </dl>
              </section>
              <section className="home-actions">
                <QuickJumpCard description={lt("Escolha a porta ou experimente o modo demo.")} icon={PlugZap} onOpen={() => setActiveSection("control")} title={lt("Conexão e sessão")} />
                <QuickJumpCard description={lt("Personalize os canais e seus destinos de áudio.")} icon={FolderCog} onOpen={() => setActiveSection("settings-editor")} title={lt("Editar perfil")} />
                <QuickJumpCard description={lt("Verifique o sinal, os dispositivos e os avisos.")} icon={HeartPulse} onOpen={() => setActiveSection("diagnostics")} title={lt("Diagnósticos")} />
              </section>
            </>
          ) : null}

          {activeSection === "control" ? (
            <section className="grid gap-5">
              <Card className="overflow-hidden">
                <CardHeader className="border-b border-(--color-border) pb-5">
                  <div>
                    <CardTitle>{lt("Conexão e sessão")}</CardTitle>
                    <CardDescription>
                      {lt("Controle de portas, demo mode e persistência do perfil ativo.")}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-6 pt-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <Button onClick={requestConnect}>{lt("Conectar")}</Button>
                    <Button
                      onClick={() => disconnect(lt("Conexão serial encerrada"))}
                      variant="secondary"
                    >
                      {lt("Desconectar")}
                    </Button>
                    <Button
                      onClick={async () => {
                        appendWatchLog({
                          scope: "app",
                          level: "info",
                          message: lt("Inventario de audio solicitado")
                        });
                        const inventory = await listAudioInventory();
                        refreshInventory(inventory);
                      }}
                      variant="ghost"
                    >
                      <RefreshCcw className="h-4 w-4" />
                      {lt("Atualizar áudio")}
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-xs uppercase tracking-[0.24em] text-(--color-muted)">
                        {lt("Porta preferida")}
                      </span>
                      <select
                        className="field"
                        onChange={(event) =>
                          setPreferredPort(event.currentTarget.value || null)
                        }
                        value={activeProfile.serial.preferredPort ?? ""}
                      >
                        <option value="">{lt("Detectar automaticamente")}</option>
                        {snapshot.availablePorts.map((port) => (
                          <option key={port} value={port}>
                            {port}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs uppercase tracking-[0.24em] text-(--color-muted)">
                        {lt("Tema da interface")}
                      </span>
                      <select
                        className="field"
                        onChange={(event) =>
                          setThemeMode(event.currentTarget.value as ThemeMode)
                        }
                        value={activeProfile.ui.theme}
                      >
                        <option value="system">{lt("Seguir sistema")}</option>
                        <option value="light">{lt("Claro de bancada")}</option>
                        <option value="dark">{lt("Escuro de estúdio")}</option>
                      </select>
                    </label>
                  </div>
                  <div className="flex items-center justify-between rounded-[22px] border border-(--color-border) bg-(--color-panel) px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-(--color-ink)" id={demoModeTitleId}>
                        {lt("Modo demo")}
                      </p>
                      <p className="text-sm text-(--color-muted)" id={demoModeDescriptionId}>
                        {lt("Simula leituras sem tocar no áudio do sistema.")}
                      </p>
                    </div>
                    <Switch
                      aria-describedby={demoModeDescriptionId}
                      aria-labelledby={demoModeTitleId}
                      checked={persisted.demoMode}
                      onCheckedChange={(checked) => setDemoMode(checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-[22px] border border-(--color-border) bg-(--color-panel) px-4 py-3">
                    <div>
                      <p
                        className="text-sm font-semibold text-(--color-ink)"
                        id={launchOnLoginTitleId}
                      >
                        {lt("Iniciar com a sessão")}
                      </p>
                      <p
                        className="text-sm text-(--color-muted)"
                        id={launchOnLoginDescriptionId}
                      >
                        {lt("Abre o Ioruba no login e mantém o app disponível no tray.")}
                      </p>
                    </div>
                    <Switch
                      aria-describedby={launchOnLoginDescriptionId}
                      aria-labelledby={launchOnLoginTitleId}
                      checked={persisted.launchOnLogin}
                      disabled={launchOnLoginPending}
                      onCheckedChange={(checked) => {
                        setLaunchOnLoginPending(true);
                        void setLaunchOnLoginEnabled(checked)
                          .then((actual) => {
                            setLaunchOnLogin(actual);
                          })
                          .catch((error) => {
                            appendWatchLog({
                              scope: "app",
                              level: "error",
                              message: lt("Falha ao atualizar inicializacao com a sessao"),
                              detail: error instanceof Error ? error.message : String(error)
                            });
                          })
                          .finally(() => {
                            setLaunchOnLoginPending(false);
                          });
                      }}
                    />
                  </div>
                  <div
                    aria-atomic="true"
                    aria-describedby={statusCardDescriptionId}
                    aria-live="polite"
                    className="rounded-[22px] border border-(--color-border) bg-(--color-panel) px-4 py-4"
                    role="status"
                  >
                    <p className="text-xs uppercase tracking-[0.24em] text-(--color-muted)">
                      {lt("Status atual")}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-(--color-ink)">
                      {lt(snapshot.statusText)}
                    </p>
                    <p className="mt-2 text-sm text-(--color-muted)" id={statusCardDescriptionId}>
                      {lt(snapshot.diagnostics.hint)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>
          ) : null}

          {activeSection === "channels" ? (
            <>
              <AudioBackendBanner backend={audioInventory.backend} diagnostics={audioInventory.diagnostics} language={language} />
              <section className="mixer-session" aria-label={lt("Conexão e sessão")}>
                <div className="mixer-profile"><span>{lt("Perfil ativo")}</span><strong>{activeProfile.name}</strong><small>{snapshot.connectionPort ?? lt("Nenhuma porta conectada")}</small></div>
                <div className="mixer-actions">
                  <Button onClick={() => snapshot.status === "connected" ? disconnect(lt("Conexão serial encerrada")) : requestConnect()} variant={snapshot.status === "connected" ? "secondary" : "primary"}>{lt(snapshot.status === "connected" ? "Desconectar" : "Conectar")}</Button>
                  <Button onClick={() => setDemoMode(!persisted.demoMode)} variant="secondary">{lt(persisted.demoMode ? "Sair do demo" : "Experimentar demo")}</Button>
                  <Button onClick={() => setActiveSection("settings-editor")} variant="ghost"><FolderCog aria-hidden="true" className="h-4 w-4" />{lt("Editar perfil")}</Button>
                </div>
              </section>
              <section className="mixer-console" aria-label={lt("Canais do mixer")}>
                <div className="mixer-console-heading"><span>{lt(persisted.demoMode ? "Nível simulado" : "Nível enviado ao áudio")}</span><span>{snapshot.knobs.length} {lt("canais")}</span></div>
                <div className="mixer-grid">
                  {snapshot.knobs.map((knob) => (
                    <KnobPanel key={knob.id} knob={knob} hasReading={lastFrameAt !== null || persisted.demoMode} demoMode={persisted.demoMode} audioInventory={audioInventory} language={language} transitionDurationMs={snapshot.transitionDurationMs}
                      inverted={activeProfile.sliders.find(slider => slider.id === knob.id)?.inverted ?? false}
                      adcMax={adcMaxForBits(snapshot.diagnostics.firmware?.adcBits ?? DEFAULT_ADC_BITS)}
                      onEditTargets={() => {
                        setActiveSection("settings-editor");
                        requestAnimationFrame(() => document.getElementById(`profile-channel-${knob.id}`)?.focus());
                      }} />
                  ))}
                </div>
                <p className="mixer-footnote">{lt(persisted.demoMode ? "Simulação ativa. O áudio do sistema não é alterado." : "Gire os knobs do controlador para ajustar o áudio. Os níveis acompanham o perfil ativo.")}</p>
              </section>
              {!persisted.onboardingDismissed ? <OnboardingChecklist audioInventory={audioInventory} language={language} onDismiss={dismissOnboarding} snapshot={snapshot} /> : null}
            </>
          ) : null}

          {activeSection === "telemetry" ? (
            <>
              <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
                <TelemetryChart language={language} snapshot={snapshot} />
                <OverviewSignalPanel
                  activeProfileName={activeProfile.name}
                  language={language}
                  snapshot={snapshot}
                />
              </section>

              <SessionStatsPanel
                knobs={snapshot.knobs}
                language={language}
                onExportCsv={() => handleSessionStatsExport("csv")}
                onExportJson={() => handleSessionStatsExport("json")}
                onReset={resetSessionStats}
                stats={sessionStats}
              />

              <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {snapshot.knobs.map((knob) => (
                  <KnobPanel
                    key={knob.id}
                    knob={knob}
                  audioInventory={audioInventory}
                    language={language}
                    transitionDurationMs={snapshot.transitionDurationMs}
                  />
                ))}
              </section>
            </>
          ) : null}

          {activeSection === "hardware" ? (
            <>
              <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
                <HardwarePanel
                  firmware={snapshot.diagnostics.firmware}
                  language={language}
                />
                <OverviewSignalPanel
                  activeProfileName={activeProfile.name}
                  language={language}
                  snapshot={snapshot}
                />
              </section>

              <CalibrationWizard
                adcMax={adcMaxForBits(
                  snapshot.diagnostics.firmware?.adcBits ?? DEFAULT_ADC_BITS
                )}
                knobs={snapshot.knobs}
                language={language}
                live={snapshot.status === "connected"}
                onApply={updateActiveProfileConfig}
                profile={activeProfile}
              />

              <AudioBackendBanner
                backend={audioInventory.backend}
                diagnostics={audioInventory.diagnostics}
                language={language}
              />

              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>{lt("Inventário de áudio")}</CardTitle>
                    <CardDescription>
                      {lt("Descoberta dinâmica do backend atual com aplicações, sinks e sources.")}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  <InventoryBlock
                    icon={LaptopMinimal}
                    title={lt("Aplicações")}
                    noItemsLabel={lt("nenhum item detectado")}
                    values={snapshot.diagnostics.activeApplications}
                  />
                  <InventoryBlock
                    icon={Waves}
                    title={lt("Saídas")}
                    noItemsLabel={lt("nenhum item detectado")}
                    values={audioInventory.sinks.map((sink) => sink.description)}
                  />
                  <InventoryBlock
                    icon={Mic2}
                    title={lt("Entradas")}
                    noItemsLabel={lt("nenhum item detectado")}
                    values={audioInventory.sources.map((source) => source.description)}
                  />
                </CardContent>
              </Card>
            </>
          ) : null}

          {activeSection === "diagnostics" ? (
            <>
              <section>
                <WatchLogPanel
                  activeProfileName={activeProfile.name}
                  language={language}
                  onClear={clearWatchLog}
                  onExport={handleWatchLogExport}
                  snapshot={snapshot}
                  watchLog={watchLog}
                />
              </section>

            </>
          ) : null}

          {activeSection === "settings" ||
          activeSection === "settings-editor" ||
          activeSection === "settings-advanced" ? (
            <ProfileWorkbench
              view={
                activeSection === "settings-editor"
                  ? "editor"
                  : activeSection === "settings-advanced"
                    ? "advanced"
                    : "profiles"
              }
              activeProfile={activeProfile}
              appendWatchLog={appendWatchLog}
              applyConfigDraft={applyConfigDraft}
              audioInventory={audioInventory}
              availablePorts={snapshot.availablePorts}
              configDraft={configDraft}
              createProfile={createProfile}
              applyPreset={applyPreset}
              exportActiveProfile={exportActiveProfile}
              importProfileFromFile={importProfileFromFile}
              draftIsDirty={draftIsDirty}
              draftStatusHint={draftStatusHint}
              draftStatusLabel={draftStatusLabel}
              draftStatusTone={draftStatusTone}
              draftValidation={draftValidation}
              duplicateActiveProfile={duplicateActiveProfile}
              language={language}
              persisted={persisted}
              removeActiveProfile={removeActiveProfile}
              resetProfile={resetProfile}
              selectProfile={selectProfile}
              setConfigDraft={setConfigDraft}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}

function QuickJumpCard({
  title,
  description,
  icon: Icon,
  onOpen
}: {
  title: string;
  description: string;
  icon: typeof PlugZap;
  onOpen: () => void;
}) {
  return (
    <button className="quick-jump-card" onClick={onOpen} type="button">
      <span className="quick-jump-icon">
        <Icon className="h-5 w-5" />
      </span>
      <span className="quick-jump-copy">
        <span className="quick-jump-title">{title}</span>
        <span className="quick-jump-description">{description}</span>
      </span>
    </button>
  );
}

function InventoryBlock({
  icon: Icon,
  title,
  values,
  noItemsLabel
}: {
  icon: typeof PlugZap;
  title: string;
  values: string[];
  noItemsLabel: string;
}) {
  return (
    <div className="rounded-[22px] border border-(--color-border) bg-(--color-panel) px-4 py-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-(--accent-copper)" />
        <p className="text-sm font-semibold text-(--color-ink)">{title}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {values.length === 0 ? (
          <Badge tone="neutral">{noItemsLabel}</Badge>
        ) : (
          values.map((value) => (
            <Badge key={value} tone="neutral">
              {value}
            </Badge>
          ))
        )}
      </div>
    </div>
  );
}
