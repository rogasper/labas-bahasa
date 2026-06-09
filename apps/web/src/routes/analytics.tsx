import { Suspense, lazy, useEffect } from "react";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { useAnalytics } from "@/hooks/use-analytics";
import { trackUmamiEvent, AnalyticsEvent } from "@/lib/umami";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { OverviewCards } from "@/components/analytics/OverviewCards";
import { WeaknessPanel } from "@/components/analytics/WeaknessPanel";

const ChartsBundle = lazy(() => import("@/components/analytics/ChartsBundle"));

export const Route = createFileRoute("/analytics")({
  component: AnalyticsComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({ to: "/login", throw: true });
    }
    return { session };
  },
});

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

function ChartSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="h-80 bg-[var(--oat-light)] animate-pulse rounded-[var(--radius-xl)]" />
      <div className="h-80 bg-[var(--oat-light)] animate-pulse rounded-[var(--radius-xl)]" />
    </div>
  );
}

function AnalyticsComponent() {
  const {
    overview,
    byExamType,
    bySectionType,
    byFormat,
    trend,
    weaknesses,
    timeAnalytics,
    isLoading,
  } = useAnalytics();

  useEffect(() => {
    trackUmamiEvent(AnalyticsEvent.VIEW_ANALYTICS);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen pt-8 pb-32 px-6 md:px-12 lg:px-16 max-w-7xl mx-auto bg-[var(--warm-cream)]">
        <div className="h-8 w-64 bg-[var(--oat-light)] animate-pulse rounded mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 bg-[var(--oat-light)] animate-pulse rounded-[var(--radius-xl)]" />
          ))}
        </div>
        <ChartSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-8 pb-32 px-6 md:px-12 lg:px-16 max-w-7xl mx-auto bg-[var(--warm-cream)]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-[var(--warm-charcoal)] mb-4">
          <Link to="/dashboard" className="hover:text-[var(--clay-black)] transition-colors">
            Beranda
          </Link>
          <MaterialIcon name="chevron_right" className="text-xs" />
          <span className="text-[var(--clay-black)] font-medium">Analitik</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-headline font-extrabold text-[var(--clay-black)] tracking-tight">
              Analitik
            </h1>
            <p className="text-lg text-[var(--warm-charcoal)] mt-2">
              Pantau perkembangan dan identifikasi area untuk ditingkatkan.
            </p>
          </div>
        </div>
      </div>

      {/* Ringkasan */}
      <SectionHeading label="Ringkasan" />
      <div className="mb-8">
        <OverviewCards data={overview.data} />
      </div>

      {/* Charts — lazy loaded (includes: Tren Skor, Performa, Waktu) */}
      <Suspense fallback={<ChartSkeleton />}>
        <ChartsBundle
          trend={trend.data}
          byExamType={byExamType.data}
          bySectionType={bySectionType.data}
          byFormat={byFormat.data}
          sectionTime={timeAnalytics.data?.sectionTime}
          formatTimeData={timeAnalytics.data?.formatTime}
          timeTrend={timeAnalytics.data?.timeTrend}
        />
      </Suspense>

      {/* Area Lemah */}
      <SectionHeading label="Area Lemah" />
      <div className="mt-4">
        <WeaknessPanel
          weaknesses={weaknesses.data?.weaknesses}
          recommendations={weaknesses.data?.recommendations}
        />
      </div>
    </div>
  );
}
