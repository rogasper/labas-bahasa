import { ScoreTrendChart } from "./ScoreTrendChart";
import { BreakdownCharts, type ExamTypeItem, type SectionTypeItem, type FormatItem } from "./BreakdownCharts";
import { TimeAnalyticsPanel, type SectionTimeItem, type FormatTimeItem, type TimeTrendItem } from "./TimeAnalyticsPanel";

interface ChartsBundleProps {
  trend: { date: string; attempts: number; avgScorePct: number }[] | undefined;
  byExamType: ExamTypeItem[] | undefined;
  bySectionType: SectionTypeItem[] | undefined;
  byFormat: FormatItem[] | undefined;
  sectionTime: SectionTimeItem[] | undefined;
  formatTimeData: FormatTimeItem[] | undefined;
  timeTrend: TimeTrendItem[] | undefined;
}

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-6 mt-10 first:mt-0">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--warm-charcoal)]">
        {label}
      </h2>
      <div className="flex-1 h-px bg-[var(--oat-border)]" />
    </div>
  );
}

export default function ChartsBundle({
  trend,
  byExamType,
  bySectionType,
  byFormat,
  sectionTime,
  formatTimeData,
  timeTrend,
}: ChartsBundleProps) {
  return (
    <>
      <SectionHeading label="Tren Skor" />
      <div className="mb-8">
        <ScoreTrendChart data={trend} />
      </div>

      <SectionHeading label="Performa" />
      <div className="mb-8">
        <BreakdownCharts
          byExamType={byExamType}
          bySectionType={bySectionType}
          byFormat={byFormat}
        />
      </div>

      <SectionHeading label="Waktu" />
      <div className="mb-8">
        <TimeAnalyticsPanel
          sectionTime={sectionTime}
          formatTimeData={formatTimeData}
          timeTrend={timeTrend}
        />
      </div>
    </>
  );
}
