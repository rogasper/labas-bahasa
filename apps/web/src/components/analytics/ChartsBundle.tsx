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
      <div className="mb-8">
        <ScoreTrendChart data={trend} />
      </div>
      <div className="mb-8">
        <BreakdownCharts
          byExamType={byExamType}
          bySectionType={bySectionType}
          byFormat={byFormat}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TimeAnalyticsPanel
          sectionTime={sectionTime}
          formatTimeData={formatTimeData}
          timeTrend={timeTrend}
        />
      </div>
    </>
  );
}