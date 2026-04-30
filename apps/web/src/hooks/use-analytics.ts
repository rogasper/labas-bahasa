import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

export function useAnalytics() {
  const overview = useQuery(trpc.stats.overview.queryOptions());
  const byExamType = useQuery(trpc.stats.byExamType.queryOptions());
  const bySectionType = useQuery(trpc.stats.bySectionType.queryOptions());
  const byFormat = useQuery(trpc.stats.byFormat.queryOptions());
  const bySkillTag = useQuery(trpc.stats.bySkillTag.queryOptions());
  const trend = useQuery(trpc.stats.trend.queryOptions());
  const weaknesses = useQuery(trpc.stats.weaknesses.queryOptions());
  const timeAnalytics = useQuery(trpc.stats.timeAnalytics.queryOptions());

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
