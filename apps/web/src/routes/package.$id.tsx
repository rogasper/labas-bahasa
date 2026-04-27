import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent } from "@labas/ui/components/card";

export const Route = createFileRoute("/package/$id")({
  component: PackageDetailComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({ to: "/login", throw: true });
    }
    return { session };
  },
});

function MaterialIcon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

function formatLabel(fmt: string) {
  return fmt.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function PackageDetailComponent() {
  const { id } = Route.useParams();
  const { data: session } = authClient.useSession();

  const packageQuery = useQuery(trpc.package.getById.queryOptions({ id }));

  const pkg = packageQuery.data;

  if (packageQuery.isLoading) {
    return (
      <div className="min-h-screen pt-8 pb-32 px-6 md:px-12 lg:px-16 max-w-4xl mx-auto bg-[var(--warm-cream)]">
        <div className="h-8 w-48 bg-[var(--oat-light)] animate-pulse rounded mb-4" />
        <div className="h-64 bg-[var(--oat-light)] animate-pulse rounded-[var(--radius-xl)]" />
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-screen pt-8 pb-32 px-6 md:px-12 lg:px-16 max-w-4xl mx-auto bg-[var(--warm-cream)]">
        <div className="text-center py-20">
          <MaterialIcon name="error_outline" className="text-6xl text-[var(--warm-silver)] mx-auto mb-4" />
          <p className="text-lg text-[var(--warm-charcoal)] font-semibold">Paket tidak ditemukan</p>
          <Link to="/bank" className="text-[var(--matcha-600)] font-semibold mt-4 inline-block">
            Kembali ke Bank Soal
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = pkg.creatorUserId === session?.user.id;
  const totalQuestions = pkg.sections.reduce((sum, sec) => sum + sec.questions.length, 0);

  return (
    <div className="min-h-screen pt-8 pb-32 px-6 md:px-12 lg:px-16 max-w-4xl mx-auto bg-[var(--warm-cream)]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--warm-charcoal)] mb-6">
        <Link to="/bank" className="hover:text-[var(--clay-black)] transition-colors">Bank Soal</Link>
        <MaterialIcon name="chevron_right" className="text-xs" />
        <span className="text-[var(--clay-black)] font-medium">Detail Paket</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-headline font-extrabold text-[var(--clay-black)] tracking-tight">
              {pkg.title}
            </h1>
            {pkg.description && (
              <p className="text-[var(--warm-charcoal)] mt-2">{pkg.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <span className="px-3 py-1.5 rounded-full bg-[var(--matcha-300)] text-[var(--matcha-800)] text-sm font-semibold">
              {pkg.examTypeName}
            </span>
            {pkg.isPublic ? (
              <span className="px-3 py-1.5 rounded-full bg-[var(--slushie-500)]/20 text-[var(--slushie-800)] text-sm font-semibold">
                Publik
              </span>
            ) : (
              <span className="px-3 py-1.5 rounded-full bg-[var(--oat-light)] text-[var(--warm-charcoal)] text-sm font-semibold">
                Privat
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-[var(--warm-charcoal)]">
          <span className="flex items-center gap-1">
            <MaterialIcon name="person" className="text-sm" />
            {pkg.creatorName ?? "Anonim"}
          </span>
          <span className="flex items-center gap-1">
            <MaterialIcon name="quiz" className="text-sm" />
            {totalQuestions} soal
          </span>
          <span className="flex items-center gap-1">
            <MaterialIcon name="folder" className="text-sm" />
            {pkg.totalSections} section
          </span>
          {pkg.estimatedDurationMin && (
            <span className="flex items-center gap-1">
              <MaterialIcon name="timer" className="text-sm" />
              {pkg.estimatedDurationMin} menit
            </span>
          )}
          <span className="flex items-center gap-1">
            <MaterialIcon name="trending_up" className="text-sm" />
            {pkg.usageCount}x digunakan
          </span>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {pkg.sections.map((section) => (
          <Card key={section.id} className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[var(--oat-border)]">
                <MaterialIcon name="folder_open" className="text-[var(--matcha-600)]" />
                <h2 className="font-headline text-lg font-bold text-[var(--clay-black)]">
                  {section.title}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[var(--oat-light)] text-[var(--warm-charcoal)] text-xs font-semibold ml-auto">
                  {section.sectionTypeName}
                </span>
              </div>

              {section.questions.length === 0 ? (
                <p className="text-sm text-[var(--warm-silver)] text-center py-4">Belum ada soal di section ini</p>
              ) : (
                <div className="space-y-3">
                  {section.questions.map((q: any, idx: number) => (
                    <div
                      key={q.id}
                      className="block p-4 rounded-[var(--radius-lg)] bg-[var(--oat-light)] hover:bg-[var(--matcha-300)]/10 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-[var(--clay-black)] text-[var(--pure-white)] text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--clay-black)] line-clamp-2">
                            {q.questionText}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <span className="px-2 py-0.5 rounded bg-[var(--pure-white)] text-[var(--warm-charcoal)] text-xs">
                              {formatLabel(q.format)}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[var(--pure-white)] text-[var(--warm-charcoal)] text-xs">
                              Lv.{q.difficulty}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-8">
        <Link to="/package/$id/take" params={{ id }}>
          <Button className="bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] clay-hover rounded-[var(--radius-lg)]">
            <MaterialIcon name="play_arrow" />
            <span className="ml-2">Mulai Latihan</span>
          </Button>
        </Link>
        {isOwner && (
          <Button
            variant="outline"
            className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] clay-hover"
          >
            <MaterialIcon name="edit" />
            <span className="ml-2">Edit Paket</span>
          </Button>
        )}
      </div>
    </div>
  );
}
