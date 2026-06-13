import { Activity } from "lucide-react";
import { memo, useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { translateText } from "@/lib/i18n";
import type { RuntimeSnapshot, UiLanguage } from "@ioruba/shared";

function accentColor(accent: string): string {
  switch (accent) {
    case "amber":
      return "var(--accent-copper)";
    case "teal":
      return "var(--accent-teal)";
    case "rose":
      return "var(--accent-rose)";
    case "lime":
      return "var(--accent-lime)";
    default:
      return "var(--accent-sky)";
  }
}

function buildSeries(snapshot: RuntimeSnapshot) {
  const groupedByTick = new Map<number, Record<string, number>>();

  for (const point of snapshot.telemetry) {
    const current = groupedByTick.get(point.tick) ?? { tick: point.tick };
    current[`knob-${point.knobId}`] = point.percent;
    groupedByTick.set(point.tick, current);
  }

  const lastSeen: Record<string, number> = {};

  return Array.from(groupedByTick.entries())
    .sort(([leftTick], [rightTick]) => leftTick - rightTick)
    .map(([, values]) => {
      for (const [key, value] of Object.entries(values)) {
        if (key !== "tick") {
          lastSeen[key] = value;
        }
      }

      return {
        tick: values.tick,
        ...lastSeen
      };
    });
}

type TelemetryChartProps = {
  snapshot: RuntimeSnapshot;
  language?: UiLanguage;
};

function TelemetryChartImpl({ snapshot, language = "pt-BR" }: TelemetryChartProps) {
  const lt = (text: string) => translateText(language, text);
  // buildSeries é O(n log n) sobre toda a janela de telemetria. Só recalcula
  // quando o array de pontos muda de referência (pushTelemetry já preserva a
  // referência quando nada é anexado), não a cada render do dashboard.
  const data = useMemo(() => buildSeries(snapshot), [snapshot.telemetry]);
  const latestTick = data.at(-1)?.tick ?? 0;
  const windowSize = snapshot.telemetry.length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-(--color-border) pb-5">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>{lt("Telemetria dos knobs")}</CardTitle>
              <CardDescription>
                {lt("Linha do tempo com persistencia visual do ultimo valor conhecido em cada canal.")}
              </CardDescription>
            </div>
            <div className="grid grid-cols-2 gap-3 text-right sm:grid-cols-3">
              <ChartStat label={lt("Janela")} value={`${windowSize}`} />
              <ChartStat label={lt("Tick")} value={latestTick ? String(latestTick) : "0"} />
              <ChartStat label={lt("Canais")} value={String(snapshot.knobs.length)} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {snapshot.knobs.map((knob) => (
              <div
                key={knob.id}
                className="inline-flex min-h-10 items-center gap-3 rounded-full border border-(--color-border) bg-(--color-panel) px-3 py-2"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: accentColor(knob.accent) }}
                />
                <span className="text-sm font-medium text-(--color-copy)">
                  {knob.name}
                </span>
                <span className="text-sm font-semibold text-(--color-ink)">
                  {knob.percent}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-[320px] w-full sm:h-[380px]">
          {data.length === 0 ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed border-(--color-border) bg-[color-mix(in_oklab,var(--color-panel)_92%,var(--color-shell)_8%)] px-6 text-center">
              <Activity className="h-6 w-6 text-(--color-muted)" />
              <p className="text-sm font-semibold text-(--color-ink)">
                {lt("Sem dados de telemetria ainda")}
              </p>
              <p className="max-w-sm text-xs leading-5 text-(--color-muted)">
                {lt("Mova um knob com o controlador conectado para começar a registrar a linha do tempo.")}
              </p>
            </div>
          ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid
                stroke="color-mix(in oklab, var(--color-border) 75%, transparent)"
                strokeDasharray="4 6"
                vertical={false}
              />
              <XAxis
                axisLine={false}
                dataKey="tick"
                minTickGap={28}
                stroke="var(--color-muted)"
                tickLine={false}
                tickMargin={10}
              />
              <YAxis
                axisLine={false}
                width={34}
                stroke="var(--color-muted)"
                tickLine={false}
                tickMargin={10}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  border: "1px solid var(--color-border)",
                  borderRadius: "18px",
                  background: "color-mix(in oklab, var(--color-panel) 94%, var(--color-shell) 6%)",
                  boxShadow: "var(--shadow-float)"
                }}
                cursor={{
                  stroke: "color-mix(in oklab, var(--accent-teal) 45%, var(--color-border))",
                  strokeDasharray: "3 5"
                }}
                labelStyle={{
                  color: "var(--color-ink)",
                  fontWeight: 700
                }}
                wrapperStyle={{
                  outline: "none"
                }}
              />
              {snapshot.knobs.map((knob, index) => (
                <Line
                  activeDot={{ r: 4 }}
                  connectNulls
                  dot={false}
                  isAnimationActive={false}
                  key={knob.id}
                  name={knob.name}
                  stroke={accentColor(knob.accent)}
                  strokeLinecap="round"
                  strokeWidth={index === 0 ? 3.2 : 2.6}
                  type="monotoneX"
                  dataKey={`knob-${knob.id}`}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// O dashboard re-renderiza a cada frame serial (status, valores, watch log).
// `buildRuntimeSnapshot` recria `knobs` por `.map` toda vez, então comparar por
// referência nunca casaria. Comparamos o que o gráfico de fato consome: a
// referência da janela de telemetria (estável quando nada novo chega, graças a
// pushTelemetry), o idioma, e a identidade + percentual de cada knob exibido nos
// badges. Re-renders disparados só por status/watch log/outcomes são suprimidos.
function knobsRenderEqual(
  prev: RuntimeSnapshot["knobs"],
  next: RuntimeSnapshot["knobs"]
): boolean {
  if (prev === next) {
    return true;
  }
  if (prev.length !== next.length) {
    return false;
  }
  for (let index = 0; index < prev.length; index++) {
    const a = prev[index];
    const b = next[index];
    if (
      a.id !== b.id ||
      a.name !== b.name ||
      a.accent !== b.accent ||
      a.percent !== b.percent
    ) {
      return false;
    }
  }
  return true;
}

export const TelemetryChart = memo(
  TelemetryChartImpl,
  (prev, next) =>
    prev.language === next.language &&
    prev.snapshot.telemetry === next.snapshot.telemetry &&
    knobsRenderEqual(prev.snapshot.knobs, next.snapshot.knobs)
);

function ChartStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-(--color-border) bg-(--color-panel) px-3 py-2 text-left">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-(--color-muted)">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-(--color-ink)">{value}</p>
    </div>
  );
}
