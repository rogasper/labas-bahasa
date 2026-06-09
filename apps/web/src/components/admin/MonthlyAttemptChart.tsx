import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

interface MonthlyDataPoint {
  month: string;
  label: string;
  count: number;
  avgScore: number;
}

interface MonthlyAttemptChartProps {
  data: MonthlyDataPoint[] | undefined;
  isLoading: boolean;
}

export function MonthlyAttemptChart({ data, isLoading }: MonthlyAttemptChartProps) {
  if (isLoading) {
    return (
      <Card className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
        <CardHeader>
          <CardTitle className="text-lg font-headline font-bold text-[var(--clay-black)]">
            Aktivitas Latihan Bulanan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-[var(--oat-light)] animate-pulse rounded-[var(--radius-lg)]" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
        <CardHeader>
          <CardTitle className="text-lg font-headline font-bold text-[var(--clay-black)]">
            Aktivitas Latihan Bulanan
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex flex-col items-center justify-center text-[var(--warm-charcoal)]">
          <MaterialIcon name="calendar_month" className="text-4xl text-[var(--warm-silver)] mb-3" />
          <p className="font-semibold">Belum ada data bulanan</p>
          <p className="text-xs text-[var(--warm-silver)] mt-1">
            Data akan muncul setelah user menyelesaikan latihan.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
      <CardHeader>
        <CardTitle className="text-lg font-headline font-bold text-[var(--clay-black)]">
          Aktivitas Latihan Bulanan
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={256}>
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--oat-border)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "var(--warm-charcoal)" }}
              axisLine={{ stroke: "var(--oat-border)" }}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12, fill: "var(--warm-charcoal)" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              unit="%"
              tick={{ fontSize: 12, fill: "var(--warm-charcoal)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--pure-white)",
                border: "2px solid var(--oat-border)",
                borderRadius: "var(--radius-lg)",
                fontSize: 13,
              }}
              formatter={(value: unknown, name: unknown) => {
                const num = typeof value === "number" ? value : 0;
                const n = typeof name === "string" ? name : "";
                if (n === "count") return [num.toLocaleString("id-ID"), "Latihan Selesai"];
                if (n === "avgScore") return [`${num}%`, "Rata-rata Skor"];
                return [num, n];
              }}
            />
            <Bar
              yAxisId="left"
              dataKey="count"
              fill="var(--chart-1)"
              radius={[6, 6, 0, 0]}
              name="count"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="avgScore"
              stroke="var(--chart-2)"
              strokeWidth={2}
              dot={{ fill: "var(--chart-2)", r: 4 }}
              name="avgScore"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
