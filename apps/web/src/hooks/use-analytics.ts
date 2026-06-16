import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

export function useAnalytics(examTypeId?: string) {
  const input = { examTypeId: examTypeId || undefined };

  const overview = useQuery(trpc.stats.overview.queryOptions(input));
  const byExamType = useQuery(trpc.stats.byExamType.queryOptions(input));
  const bySectionType = useQuery(trpc.stats.bySectionType.queryOptions(input));
  const byFormat = useQuery(trpc.stats.byFormat.queryOptions(input));
  const bySkillTag = useQuery(trpc.stats.bySkillTag.queryOptions(input));
  const trend = useQuery(trpc.stats.trend.queryOptions(input));
  const weaknesses = useQuery(trpc.stats.weaknesses.queryOptions(input));
  const timeAnalytics = useQuery(trpc.stats.timeAnalytics.queryOptions(input));

  const isLoading =
    overview.isLoading ||
    byExamType.isLoading ||
    bySectionType.isLoading ||
    byFormat.isLoading ||
    bySkillTag.isLoading ||
    trend.isLoading ||
    weaknesses.isLoading ||
    timeAnalytics.isLoading;

  return {
    overview,
    byExamType,
    bySectionType,
    byFormat,
    bySkillTag,
    trend,
    weaknesses,
    timeAnalytics,
    isLoading,
  };
}
