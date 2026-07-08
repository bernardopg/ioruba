import { Crosshair, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { translateTemplate, translateText } from "@/lib/i18n";
import type {
  MixerProfile,
  RuntimeKnobSnapshot,
  UiLanguage
} from "@ioruba/shared";

/**
 * Faixa mínima aceitável entre minRaw e maxRaw capturados. Abaixo disso o
 * knob quase não foi movido e a calibração produziria uma rampa inutilizável.
 */
const MIN_CALIBRATION_SPAN = 16;

type WizardStep = "min" | "max" | "review";

interface WizardSession {
  sliderId: number;
  step: WizardStep;
  /** Extremo observado ao vivo desde o início do passo atual. */
  extreme: number;
  capturedMin: number | null;
  capturedMax: number | null;
}

/**
 * Wizard de calibração de knobs: captura minRaw/maxRaw ao vivo a partir dos
 * frames seriais e grava no slider do perfil ativo. O runtime serial já envia
 * `CONFIG` ao firmware sempre que o perfil diverge do reportado no handshake,
 * então aplicar aqui sincroniza o hardware sem passo extra.
 */
export function CalibrationWizard({
  knobs,
  profile,
  adcMax,
  live,
  language,
  onApply
}: {
  knobs: RuntimeKnobSnapshot[];
  profile: MixerProfile;
  adcMax: number;
  live: boolean;
  language: UiLanguage;
  onApply: (profile: MixerProfile) => void;
}) {
  const lt = (text: string) => translateText(language, text);
  const [session, setSession] = useState<WizardSession | null>(null);

  const activeKnob = session
    ? knobs.find((knob) => knob.id === session.sliderId) ?? null
    : null;
  const liveRaw = activeKnob?.rawValue ?? 0;

  // Rastreia o extremo (mínimo ou máximo) visto desde o início do passo — mais
  // robusto do que capturar o valor do instante do clique.
  useEffect(() => {
    if (!session || session.step === "review") {
      return;
    }

    setSession((current) => {
      if (!current || current.step === "review") {
        return current;
      }
      const next =
        current.step === "min"
          ? Math.min(current.extreme, liveRaw)
          : Math.max(current.extreme, liveRaw);
      return next === current.extreme ? current : { ...current, extreme: next };
    });
  }, [session?.step, session?.sliderId, liveRaw, session]);

  const startCalibration = (sliderId: number) => {
    const knob = knobs.find((candidate) => candidate.id === sliderId);
    setSession({
      sliderId,
      step: "min",
      extreme: knob?.rawValue ?? adcMax,
      capturedMin: null,
      capturedMax: null
    });
  };

  const captureStep = () => {
    setSession((current) => {
      if (!current) {
        return current;
      }
      if (current.step === "min") {
        return {
          ...current,
          step: "max",
          capturedMin: current.extreme,
          extreme: liveRaw
        };
      }
      if (current.step === "max") {
        return { ...current, step: "review", capturedMax: current.extreme };
      }
      return current;
    });
  };

  const applyCalibration = () => {
    if (
      !session ||
      session.capturedMin === null ||
      session.capturedMax === null
    ) {
      return;
    }

    const calibration = {
      minRaw: session.capturedMin,
      maxRaw: session.capturedMax
    };

    onApply({
      ...profile,
      sliders: profile.sliders.map((slider) =>
        slider.id === session.sliderId ? { ...slider, calibration } : slider
      )
    });
    setSession(null);
  };

  const span =
    session?.capturedMin !== null &&
    session?.capturedMax !== null &&
    session !== null
      ? session.capturedMax - session.capturedMin
      : null;
  const spanTooSmall = span !== null && span < MIN_CALIBRATION_SPAN;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-(--color-border) pb-5">
        <div>
          <CardTitle>{lt("Calibração de knobs")}</CardTitle>
          <CardDescription>
            {lt(
              "Capture os limites físicos de cada knob ao vivo e grave no perfil ativo. O firmware é sincronizado automaticamente."
            )}
          </CardDescription>
        </div>
        <Badge className="self-start" tone={live ? "positive" : "warning"}>
          {live ? lt("sinal ao vivo") : lt("sem sinal")}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4 pt-6">
        {!session ? (
          <div className="grid gap-2">
            {profile.sliders.map((slider) => {
              const knob = knobs.find((candidate) => candidate.id === slider.id);
              return (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-(--color-border) bg-(--color-panel) px-4 py-3"
                  key={slider.id}
                >
                  <div className="flex items-center gap-3">
                    <SlidersHorizontal className="h-4 w-4 shrink-0 text-(--accent-teal)" />
                    <div>
                      <p className="text-sm font-semibold text-(--color-ink)">
                        {slider.name}
                      </p>
                      <p className="text-xs text-(--color-muted)">
                        {slider.calibration
                          ? translateTemplate(
                              language,
                              "calibrado: {min} – {max}",
                              {
                                min: String(slider.calibration.minRaw),
                                max: String(slider.calibration.maxRaw)
                              }
                            )
                          : translateTemplate(language, "padrão: 0 – {max}", {
                              max: String(adcMax)
                            })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-(--color-copy)">
                      {knob ? knob.rawValue : "—"}
                    </span>
                    <Button
                      disabled={!live}
                      onClick={() => startCalibration(slider.id)}
                      size="small"
                      variant="secondary"
                    >
                      {lt("Calibrar")}
                    </Button>
                  </div>
                </div>
              );
            })}
            {!live ? (
              <p className="text-sm text-(--color-muted)">
                {lt(
                  "Conecte o controlador para calibrar com leituras reais do hardware."
                )}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="rounded-[22px] border border-(--color-border) bg-[color-mix(in_oklab,var(--color-panel)_92%,var(--color-shell)_8%)] px-5 py-5">
              <p className="text-xs uppercase tracking-[0.24em] text-(--color-muted)">
                {activeKnob?.name ?? `#${session.sliderId}`}
                {" · "}
                {session.step === "min"
                  ? lt("passo 1 de 2 — mínimo")
                  : session.step === "max"
                    ? lt("passo 2 de 2 — máximo")
                    : lt("revisão")}
              </p>

              {session.step !== "review" ? (
                <>
                  <p className="mt-2 text-sm text-(--color-copy)">
                    {session.step === "min"
                      ? lt(
                          "Gire o knob até o limite mínimo físico e clique em Capturar."
                        )
                      : lt(
                          "Agora gire o knob até o limite máximo físico e clique em Capturar."
                        )}
                  </p>
                  <div className="mt-4 flex items-end gap-6">
                    <div>
                      <p className="text-[0.68rem] uppercase tracking-[0.2em] text-(--color-muted)">
                        {lt("leitura ao vivo")}
                      </p>
                      <p className="mt-1 font-mono text-3xl font-semibold text-(--color-ink)">
                        {liveRaw}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.68rem] uppercase tracking-[0.2em] text-(--color-muted)">
                        {session.step === "min"
                          ? lt("mínimo observado")
                          : lt("máximo observado")}
                      </p>
                      <p className="mt-1 font-mono text-3xl font-semibold text-(--accent-teal)">
                        {session.extreme}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-2xl border border-(--color-border) bg-(--color-panel) px-3 py-2">
                      <p className="text-[0.68rem] uppercase tracking-[0.2em] text-(--color-muted)">
                        {lt("Mín. bruto")}
                      </p>
                      <p className="mt-1 font-mono text-lg font-semibold text-(--color-ink)">
                        {session.capturedMin}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-(--color-border) bg-(--color-panel) px-3 py-2">
                      <p className="text-[0.68rem] uppercase tracking-[0.2em] text-(--color-muted)">
                        {lt("Máx. bruto")}
                      </p>
                      <p className="mt-1 font-mono text-lg font-semibold text-(--color-ink)">
                        {session.capturedMax}
                      </p>
                    </div>
                  </div>
                  {spanTooSmall ? (
                    <p className="mt-3 text-sm text-(--accent-rose)">
                      {translateTemplate(
                        language,
                        "Faixa capturada muito curta (mínimo {span} contagens). Refaça movendo o knob de ponta a ponta.",
                        { span: String(MIN_CALIBRATION_SPAN) }
                      )}
                    </p>
                  ) : null}
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {session.step !== "review" ? (
                <Button onClick={captureStep} size="small">
                  <Crosshair className="h-4 w-4" />
                  {lt("Capturar")}
                </Button>
              ) : (
                <Button
                  disabled={spanTooSmall}
                  onClick={applyCalibration}
                  size="small"
                >
                  {lt("Aplicar ao perfil")}
                </Button>
              )}
              <Button
                onClick={() => setSession(null)}
                size="small"
                variant="ghost"
              >
                <RotateCcw className="h-4 w-4" />
                {lt("Cancelar")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
