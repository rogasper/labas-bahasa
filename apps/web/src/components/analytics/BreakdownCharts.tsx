import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@labas/ui/components/card";
import { formatLabel } from "@/lib/format";
import { formatTime } from "@/lib/time";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

interface ExamTypeItem {
  examTypeId: string;
  examTypeName: string;
  accuracyPct: number;
  avgScorePct: number;
  avgTimeSpentSec: number;
  attempts: number;
}

interface SectionTypeItem {
  sectionTypeId: string;
  sectionTypeName: string;
  accuracyPct: number;
  avgScorePct: number;
  avgTimeSpentSec: number;
  attempts: number;
}

interface FormatItem {
  format: string;
  accuracyPct: number;
  avgTimeSpentSec: number;
  totalQuestions: number;
}

interface BreakdownChartsProps {
  byExamType: ExamTypeItem[] | undefined;
  bySectionType: SectionTypeItem[] | undefined;
  byFormat: FormatItem[] | undefined;
}

const COLORS = [
  "var(--matcha-600)",
  "var(--slushie-600)",
  "var(--lemon-700)",
  "var(--ube-600)",
  "var(--pomegranate-600)",
];

function AccuracyBar({ pct }: { pct: number }) {
  return (
    <div className="w-full h-2 bg-[var(--oat-light)] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${pct}%`,
          backgroundColor:
            pct >= 80
              ? "var(--matcha-600)"
              : pct >= 60
                ? "var(--lemon-700)"
                : "var(--pomegranate-600)",
        }}
      />
    </div>
  );
}

export function BreakdownCharts({ byExamType, bySectionType, byFormat }: BreakdownChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
        <CardHeader>
          <CardTitle className="text-lg font-headline font-bold text-[var(--clay-black)]">
            Performa per Jenis Ujian
          </CardTitle>
        </CardHeader>
        <CardContent>
          {byExamType && byExamType.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byExamType} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--oat-border)" />
                <XAxis
                  dataKey="examTypeName"
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
                    if (n === "accuracyPct") return [`${num}%`, "Akurasi"];
                    if (n === "avgScorePct") return [`${num}%`, "Rata-rata Skor"];
                    return [num, n];
                  }}
                />
                <Bar dataKey="accuracyPct" radius={[6, 6, 0, 0]}>
                  {byExamType.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-56 flex items-center justify-center text-[var(--warm-charcoal)]">
              Belum ada data.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
        <CardHeader>
          <CardTitle className="text-lg font-headline font-bold text-[var(--clay-black)]">
            Performa per Section
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bySectionType && bySectionType.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bySectionType} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--oat-border)" />
                <XAxis
                  dataKey="sectionTypeName"
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
                    if (n === "accuracyPct") return [`${num}%`, "Akurasi"];
                    if (n === "avgScorePct") return [`${num}%`, "Rata-rata Skor"];
                    return [num, n];
                  }}
                />
                <Bar dataKey="accuracyPct" radius={[6, 6, 0, 0]}>
                  {bySectionType.map((_, i) => (
                    <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-56 flex items-center justify-center text-[var(--warm-charcoal)]">
              Belum ada data.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)] lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg font-headline font-bold text-[var(--clay-black)]">
            Performa per Format Soal
          </CardTitle>
        </CardHeader>
        <CardContent>
          {byFormat && byFormat.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {byFormat.map((item) => (
                <div
                  key={item.format}
                  className="p-4 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--warm-cream)]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-[var(--clay-black)]">
                      {formatLabel(item.format)}
                    </span>
                    <span className="text-xs text-[var(--warm-charcoal)]">
                      {item.totalQuestions} soal
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-bold text-[var(--clay-black)]">
                      {item.accuracyPct}%
                    </span>
                    <span className="text-xs text-[var(--warm-charcoal)]">
                      {formatTime(item.avgTimeSpentSec)}/soal
                    </span>
                  </div>
                  <AccuracyBar pct={item.accuracyPct} />
                </div>
              ))}
            </div>
          ) : (
            <div className="h-20 flex items-center justify-center text-[var(--warm-charcoal)]">
              Belum ada data.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
