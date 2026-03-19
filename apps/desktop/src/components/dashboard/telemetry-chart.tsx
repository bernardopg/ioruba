import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RuntimeSnapshot } from "@ioruba/shared";

const knobColors = ["#118ab2", "#d17d2e", "#d94f70", "#1f9d88"];

function buildSeries(snapshot: RuntimeSnapshot) {
  const byTick = new Map<number, Record<string, number>>();

  for (const point of snapshot.telemetry) {
    const current = byTick.get(point.tick) ?? { tick: point.tick };
    current[`knob-${point.knobId}`] = point.percent;
    byTick.set(point.tick, current);
  }

  return Array.from(byTick.values());
}

export function TelemetryChart({ snapshot }: { snapshot: RuntimeSnapshot }) {
  const data = buildSeries(snapshot);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-[var(--color-border)] pb-5">
        <div>
          <CardTitle>Telemetria dos knobs</CardTitle>
          <CardDescription>
            Janela viva com as últimas variações recebidas pela serial ou modo demo.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="tick" stroke="var(--color-muted)" tickLine={false} />
              <YAxis
                stroke="var(--color-muted)"
                tickLine={false}
                domain={[0, 100]}
              />
              <Tooltip />
              {snapshot.knobs.map((knob, index) => (
                <Line
                  dot={false}
                  isAnimationActive={false}
                  key={knob.id}
                  name={knob.name}
                  stroke={knobColors[index % knobColors.length]}
                  strokeWidth={2.4}
                  type="monotone"
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
