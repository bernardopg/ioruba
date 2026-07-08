import { Activity, Download, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { translateText } from "@/lib/i18n";
import {
  knobAveragePercent,
  type SessionTelemetryStats,
  type UiLanguage
} from "@ioruba/shared";

interface KnobLabel {
  id: number;
  name: string;
}

/**
 * Whole-session telemetry aggregates. Unlike the chart (a sliding window), these
 * counts/min/avg/max persist for the entire session, so a long mixing session is
 * summarised without retaining every sample.
 */
export function SessionStatsPanel({
  stats,
  knobs,
  language,
  onReset,
  onExportJson,
  onExportCsv
}: {
  stats: SessionTelemetryStats;
  knobs: KnobLabel[];
  language: UiLanguage;
  onReset: () => void;
  onExportJson?: () => void;
  onExportCsv?: () => void;
}) {
  const lt = (text: string) => translateText(language, text);
  const tickSpan =
    stats.firstTick !== null && stats.lastTick !== null
      ? stats.lastTick - stats.firstTick + 1
      : 0;

  return (
    <section
      aria-label={lt("Estatísticas da sessão")}
      className="rounded-(--radius-card) border border-(--color-border) bg-(--color-panel) p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-(--color-border) bg-(--color-bg)">
            <Activity className="h-5 w-5 text-(--accent-teal)" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-(--color-ink)">
              {lt("Estatísticas da sessão")}
            </h2>
            <p className="text-sm text-(--color-muted)">
              {stats.sampleCount} {lt("amostras")} · {tickSpan} {lt("ticks")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onExportJson ? (
            <Button
              aria-label={lt("Exportar estatísticas em JSON")}
              className="gap-2"
              disabled={stats.sampleCount === 0}
              onClick={onExportJson}
              size="small"
              variant="ghost"
            >
              <Download className="h-4 w-4" />
              JSON
            </Button>
          ) : null}
          {onExportCsv ? (
            <Button
              aria-label={lt("Exportar estatísticas em CSV")}
              className="gap-2"
              disabled={stats.sampleCount === 0}
              onClick={onExportCsv}
              size="small"
              variant="ghost"
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
          ) : null}
          <Button
            aria-label={lt("Resetar estatísticas da sessão")}
            className="gap-2"
            disabled={stats.sampleCount === 0}
            onClick={onReset}
            size="small"
            variant="ghost"
          >
            <RotateCcw className="h-4 w-4" />
            {lt("Resetar")}
          </Button>
        </div>
      </div>

      {stats.sampleCount === 0 ? (
        <p className="mt-4 text-sm text-(--color-muted)">
          {lt(
            "Nenhuma amostra ainda. Conecte o controlador ou inicie o modo demo."
          )}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-(--color-muted)">
                <th className="py-2 pr-4 font-medium" scope="col">{lt("Knob")}</th>
                <th className="py-2 pr-4 text-right font-medium" scope="col">{lt("Amostras")}</th>
                <th className="py-2 pr-4 text-right font-medium" scope="col">{lt("Mín")}</th>
                <th className="py-2 pr-4 text-right font-medium" scope="col">{lt("Méd")}</th>
                <th className="py-2 pr-4 text-right font-medium" scope="col">{lt("Máx")}</th>
                <th className="py-2 text-right font-medium" scope="col">{lt("Atual")}</th>
              </tr>
            </thead>
            <tbody>
              {knobs.map((knob) => {
                const knobStats = stats.perKnob[knob.id];
                if (!knobStats) {
                  return null;
                }
                return (
                  <tr
                    key={knob.id}
                    className="border-t border-(--color-border) text-(--color-ink)"
                  >
                    <td className="py-2 pr-4 font-medium">{knob.name}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {knobStats.sampleCount}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {Math.round(knobStats.minPercent)}%
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {Math.round(knobAveragePercent(knobStats))}%
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {Math.round(knobStats.maxPercent)}%
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {Math.round(knobStats.lastPercent)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
