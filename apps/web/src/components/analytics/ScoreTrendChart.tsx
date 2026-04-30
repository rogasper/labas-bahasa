import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@labas/ui/components/card";

interface TrendPoint {
  date: string;
  attempts: number;
  avgScorePct: number;
}

interface ScoreTrendChartProps {
  data: TrendPoint[] | undefined;
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function ScoreTrendChart({ data }: ScoreTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
        <CardHeader>
          <CardTitle className="text-lg font-headline font-bold text-[var(--clay-black)]">
            Tren Skor
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-[var(--warm-charcoal)]">
          Belum ada data tren.
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: formatDateLabel(d.date),
  }));

  return (
    <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
      <CardHeader>
        <CardTitle className="text-lg font-headline font-bold text-[var(--clay-black)]">
          Tren Skor (30 Hari)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={256}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--matcha-600)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--matcha-600)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--oat-border)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "var(--warm-charcoal)" }}
              axisLine={{ stroke: "var(--oat-border)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "var(--warm-charcoal)" }}
              axisLine={false}
              tickLine={false}
              domain={[0, 100]}
              unit="%"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--pure-white)",
                border: "2px solid var(--oat-border)",
                borderRadius: "var(--radius-lg)",
                fontSize: 13,
              }}
              formatter={(value: unknown, name: unknown, _item: unknown, _index: unknown, _payload: unknown) => {
                const num = typeof value === "number" ? value : 0;
                const n = typeof name === "string" ? name : "";
                if (n === "avgScorePct") return [`${num}%`, "Rata-rata Skor"];
                if (n === "attempts") return [num, "Latihan"];
                return [num, n];
              }}
            />
            <Area
              type="monotone"
              dataKey="avgScorePct"
              stroke="var(--matcha-600)"
              strokeWidth={2}
              fill="url(#scoreGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
