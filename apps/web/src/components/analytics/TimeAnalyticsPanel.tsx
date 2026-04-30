import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@labas/ui/components/card";
import { formatTime } from "@/lib/time";
import { formatLabel } from "@/lib/format";

interface SectionTimeItem {
  sectionTypeName: string;
  avgTimeSpentSec: number;
  totalTimeSpentSec: number;
}

interface FormatTimeItem {
  format: string;
  avgTimeSpentSec: number;
  totalTimeSpentSec: number;
}

interface TimeTrendItem {
  date: string;
  avgTimeSpentSec: number;
}

interface TimeAnalyticsPanelProps {
  sectionTime: SectionTimeItem[] | undefined;
  formatTimeData: FormatTimeItem[] | undefined;
  timeTrend: TimeTrendItem[] | undefined;
}

export function TimeAnalyticsPanel({ sectionTime, formatTimeData, timeTrend }: TimeAnalyticsPanelProps) {
  return (
    <div className="space-y-6">
      <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
        <CardHeader>
          <CardTitle className="text-lg font-headline font-bold text-[var(--clay-black)]">
            Waktu per Section
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sectionTime && sectionTime.length > 0 ? (
            <div className="space-y-3">
              {sectionTime.map((item) => (
                <div key={item.sectionTypeName} className="flex items-center gap-4">
                  <div className="w-28 shrink-0 text-sm font-medium text-[var(--clay-black)]">
                    {item.sectionTypeName}
                  </div>
                  <div className="flex-1">
                    <div className="w-full h-2.5 bg-[var(--oat-light)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--slushie-600)]"
                        style={{
                          width: `${Math.min(100, (item.avgTimeSpentSec / 300) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-20 shrink-0 text-right text-sm text-[var(--warm-charcoal)]">
                    {formatTime(item.avgTimeSpentSec)}
                  </div>
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

      <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
        <CardHeader>
          <CardTitle className="text-lg font-headline font-bold text-[var(--clay-black)]">
            Waktu per Format Soal
          </CardTitle>
        </CardHeader>
        <CardContent>
          {formatTimeData && formatTimeData.length > 0 ? (
            <div className="space-y-3">
              {formatTimeData.map((item) => (
                <div key={item.format} className="flex items-center gap-4">
                  <div className="w-32 shrink-0 text-sm font-medium text-[var(--clay-black)] truncate">
                    {formatLabel(item.format)}
                  </div>
                  <div className="flex-1">
                    <div className="w-full h-2.5 bg-[var(--oat-light)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--ube-600)]"
                        style={{
                          width: `${Math.min(100, (item.avgTimeSpentSec / 120) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-20 shrink-0 text-right text-sm text-[var(--warm-charcoal)]">
                    {formatTime(item.avgTimeSpentSec)}
                  </div>
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

      <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
        <CardHeader>
          <CardTitle className="text-lg font-headline font-bold text-[var(--clay-black)]">
            Tren Waktu per Hari
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timeTrend && timeTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={timeTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--oat-border)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => {
                    const d = new Date(v);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                  tick={{ fontSize: 12, fill: "var(--warm-charcoal)" }}
                  axisLine={{ stroke: "var(--oat-border)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "var(--warm-charcoal)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${Math.round(v / 60)}m`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--pure-white)",
                    border: "2px solid var(--oat-border)",
                    borderRadius: "var(--radius-lg)",
                    fontSize: 13,
                  }}
                  formatter={(value: unknown, _name: unknown, _item: unknown, _index: unknown, _payload: unknown) => [formatTime(typeof value === "number" ? value : 0), "Rata-rata Waktu"]}
                />
                <Bar dataKey="avgTimeSpentSec" fill="var(--slushie-600)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-[var(--warm-charcoal)]">
              Belum ada data.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
