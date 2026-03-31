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
import type { RuntimeSnapshot } from "@ioruba/shared";

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

export function TelemetryChart({ snapshot }: { snapshot: RuntimeSnapshot }) {
  const data = buildSeries(snapshot);
  const latestTick = data.at(-1)?.tick ?? 0;
  const windowSize = snapshot.telemetry.length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-(--color-border) pb-5">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Telemetria dos knobs</CardTitle>
              <CardDescription>
                Linha do tempo com persistencia visual do ultimo valor conhecido em cada canal.
              </CardDescription>
            </div>
            <div className="grid grid-cols-2 gap-3 text-right sm:grid-cols-3">
              <ChartStat label="Janela" value={`${windowSize}`} />
              <ChartStat label="Tick" value={latestTick ? String(latestTick) : "0"} />
              <ChartStat label="Canais" value={String(snapshot.knobs.length)} />
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
        <div className="h-70 w-full sm:h-sm:h-85-[380px]">
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
                  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)"
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
        </div>
      </CardContent>
    </Card>
  );
}

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
