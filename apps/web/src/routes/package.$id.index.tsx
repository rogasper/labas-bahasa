import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { formatLabel } from "@/lib/format";
import { EditPackageModal } from "@/components/package/EditPackageModal";
import { toast } from "sonner";

export const Route = createFileRoute("/package/$id/")({
  component: PackageDetailComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({ to: "/login", throw: true });
    }
    return { session };
  },
});

function PackageDetailComponent() {
  const { id } = Route.useParams();
  const { data: session } = authClient.useSession();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const packageQuery = useQuery(trpc.package.getById.queryOptions({ id }));

  const updateMutation = useMutation({
    ...trpc.package.update.mutationOptions(),
    onSuccess: () => {
      packageQuery.refetch();
      setIsEditOpen(false);
    },
  });

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
    <div className="min-h-screen pb-32 bg-[var(--warm-cream)]">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-[var(--warm-cream)]/95 backdrop-blur-sm border-b border-[var(--oat-border)] shadow-sm">
        <div className="px-6 md:px-12 lg:px-16 max-w-4xl mx-auto pt-4 pb-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-[var(--warm-charcoal)] mb-3">
            <Link to="/bank" className="hover:text-[var(--clay-black)] transition-colors">Bank Soal</Link>
            <MaterialIcon name="chevron_right" className="text-[10px]" />
            <span className="text-[var(--clay-black)] font-medium truncate max-w-[240px]">{pkg.title}</span>
          </div>

          {/* Title row + actions */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2.5 py-1 rounded-full bg-[var(--matcha-300)] text-[var(--matcha-800)] text-xs font-semibold">
                  {pkg.examTypeName}
                </span>
                {pkg.isPublic ? (
                  <span className="px-2.5 py-1 rounded-full bg-[var(--slushie-500)]/20 text-[var(--slushie-800)] text-xs font-semibold">
                    Publik
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-[var(--oat-light)] text-[var(--warm-charcoal)] text-xs font-semibold">
                    Privat
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-headline font-extrabold text-[var(--clay-black)] tracking-tight leading-tight">
                {pkg.title}
              </h1>
              {pkg.description && (
                <p className="text-sm text-[var(--warm-charcoal)] mt-1 line-clamp-1">{pkg.description}</p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <Link to="/package/$id/take" params={{ id }}>
                <Button className="bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] clay-hover rounded-[var(--radius-lg)]">
                  <MaterialIcon name="play_arrow" />
                  <span className="ml-1.5">Mulai Latihan</span>
                </Button>
              </Link>
              {pkg.isPublic && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const url = `${window.location.origin}/package/${id}`;
                    navigator.clipboard.writeText(url);
                    toast.success("Link paket disalin ke clipboard!");
                  }}
                  className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] clay-hover"
                >
                  <MaterialIcon name="share" />
                  <span className="ml-1.5 hidden sm:inline">Bagikan</span>
                </Button>
              )}
              {isOwner && (
                <Button
                  variant="outline"
                  onClick={() => setIsEditOpen(true)}
                  className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] clay-hover"
                >
                  <MaterialIcon name="edit" />
                  <span className="ml-1.5 hidden sm:inline">Edit Paket</span>
                </Button>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-4 text-xs text-[var(--warm-charcoal)] mt-3">
            <Link
              to="/profile/$userId"
              params={{ userId: pkg.creatorUserId }}
              className="flex items-center gap-1 hover:text-[var(--clay-black)] transition-colors"
            >
              <MaterialIcon name="person" className="text-xs" />
              {pkg.creatorName ?? "Anonim"}
            </Link>
            <span className="flex items-center gap-1">
              <MaterialIcon name="quiz" className="text-xs" />
              {totalQuestions} soal
            </span>
            <span className="flex items-center gap-1">
              <MaterialIcon name="folder" className="text-xs" />
              {pkg.totalSections} section
            </span>
            {pkg.estimatedDurationMin && (
              <span className="flex items-center gap-1">
                <MaterialIcon name="timer" className="text-xs" />
                {pkg.estimatedDurationMin} menit
              </span>
            )}
            <span className="flex items-center gap-1">
              <MaterialIcon name="trending_up" className="text-xs" />
              {pkg.usageCount}x digunakan
            </span>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="px-6 md:px-12 lg:px-16 max-w-4xl mx-auto pt-8 space-y-6">
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
                  {section.questions.map((q, idx: number) => (
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

      {isEditOpen && pkg && (
        <EditPackageModal
          initialTitle={pkg.title}
          initialDescription={pkg.description}
          initialIsPublic={pkg.isPublic}
          onClose={() => setIsEditOpen(false)}
          onSave={(data) =>
            updateMutation.mutate({
              id,
              ...data,
            })
          }
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  );
}
