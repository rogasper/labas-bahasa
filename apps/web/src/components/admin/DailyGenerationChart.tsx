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
import { MaterialIcon } from "@/components/ui/MaterialIcon";

interface DailyGenDataPoint {
  day: string;
  label: string;
  count: number;
  totalTokens: number;
}

interface DailySignupDataPoint {
  day: string;
  label: string;
  count: number;
}

interface DailyGenerationChartProps {
  genData: DailyGenDataPoint[] | undefined;
  signupData: DailySignupDataPoint[] | undefined;
  isLoading: boolean;
}

export function DailyGenerationChart({ genData, signupData, isLoading }: DailyGenerationChartProps) {
  if (isLoading) {
    return (
      <Card className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
        <CardHeader>
          <CardTitle className="text-lg font-headline font-bold text-[var(--clay-black)]">
            Generate & Signup Harian
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-[var(--oat-light)] animate-pulse rounded-[var(--radius-lg)]" />
        </CardContent>
      </Card>
    );
  }

  const hasGenData = (genData ?? []).some((d) => d.count > 0);
  const hasSignupData = (signupData ?? []).some((d) => d.count > 0);

  if (!hasGenData && !hasSignupData) {
    return (
      <Card className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
        <CardHeader>
          <CardTitle className="text-lg font-headline font-bold text-[var(--clay-black)]">
            Generate & Signup Harian
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex flex-col items-center justify-center text-[var(--warm-charcoal)]">
          <MaterialIcon name="auto_awesome" className="text-4xl text-[var(--warm-silver)] mb-3" />
          <p className="font-semibold">Belum ada data harian</p>
          <p className="text-xs text-[var(--warm-silver)] mt-1">
            Data akan muncul setelah user generate soal atau mendaftar.
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = (genData ?? []).map((g) => {
    const signup = signupData?.find((s) => s.day === g.day);
    return {
      label: g.label,
      count: g.count,
      totalTokens: g.totalTokens,
      signups: signup?.count ?? 0,
    };
  });

  return (
    <Card className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
      <CardHeader>
        <CardTitle className="text-lg font-headline font-bold text-[var(--clay-black)]">
          Generate & Signup Harian (30 Hari)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={256}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="genGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--oat-border)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "var(--warm-charcoal)" }}
              axisLine={{ stroke: "var(--oat-border)" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 12, fill: "var(--warm-charcoal)" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
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
                if (n === "count") return [num.toLocaleString("id-ID"), "Generate"];
                if (n === "signups") return [num.toLocaleString("id-ID"), "Signup"];
                if (n === "totalTokens") return [num.toLocaleString("id-ID"), "Token Digunakan"];
                return [num, n];
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#genGradient)"
              name="count"
            />
            <Area
              type="monotone"
              dataKey="signups"
              stroke="var(--chart-3)"
              strokeWidth={2}
              fill="url(#signupGradient)"
              name="signups"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
