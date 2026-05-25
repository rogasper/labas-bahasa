import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { routeShell } from "@/lib/route-shell";
import { trpc } from "@/utils/trpc";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { TourGuide } from "@/components/TourGuide";
import { DonationModal } from "@/components/DonationModal";

export const Route = createFileRoute("/dashboard")({
  staticData: routeShell.app,
  component: HomeComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }
    if (!session.data.user.emailVerified) {
      throw redirect({ to: "/verify-email", search: { email: session.data.user.email } });
    }
    if (!session.data.user.image) {
      throw redirect({ to: "/setup-avatar" });
    }
    return { session };
  },
});

function formatDateShort(dateStr: string | Date | null) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function HomeComponent() {
  const { session } = Route.useRouteContext();
  const [donationModalOpen, setDonationModalOpen] = useState(false);
  const [donationTrigger, setDonationTrigger] = useState<"exam" | "generate" | null>(null);

  useEffect(() => {
    const prompt = localStorage.getItem("pendingDonationPrompt") as "exam" | "generate" | null;
    const lastPromptStr = localStorage.getItem("lastDonationPromptTime");
    const lastPromptTime = lastPromptStr ? parseInt(lastPromptStr, 10) : 0;
    
    // 24 hours cooldown
    const COOLDOWN = 24 * 60 * 60 * 1000;
    const now = Date.now();

    if (prompt) {
      localStorage.removeItem("pendingDonationPrompt");
      
      if (now - lastPromptTime > COOLDOWN) {
        setDonationTrigger(prompt);
        setDonationModalOpen(true);
        localStorage.setItem("lastDonationPromptTime", now.toString());
      }
    }
  }, []);

  const overview = useQuery(trpc.stats.overview.queryOptions());
  const recentAttempts = useQuery(
    trpc.attempt.myAttempts.queryOptions({ limit: 5, offset: 0 }),
  );
  const featured = useQuery(
    trpc.admin.listFeatured.queryOptions(),
  );

  const stats = overview.data;
  const attempts = recentAttempts.data?.attempts ?? [];
  const featuredPkg = featured.data?.packages ?? [];
  const featuredQ = featured.data?.questions ?? [];
  const hasFeatured = featuredPkg.length > 0 || featuredQ.length > 0;

  const isNewUser = !stats || (stats.completedAttempts === 0 && stats.totalQuestionsAnswered === 0);

  return (
    <div className="min-h-screen pt-8 pb-32 px-6 md:px-12 lg:px-16 max-w-6xl mx-auto bg-[var(--warm-cream)]">
      <DonationModal
        isOpen={donationModalOpen}
        onOpenChange={setDonationModalOpen}
        triggerAction={donationTrigger}
      />
      {/* Header */}
      <section className="mb-8">
        <h1 className="text-4xl font-headline font-extrabold text-[var(--clay-black)] tracking-tight">
          Halo, {session.data?.user.name ?? "Pengguna"}!
        </h1>
        <p className="text-lg text-[var(--warm-charcoal)] mt-1">
          {isNewUser ? "Siap mulai belajar? Pilih langkah di bawah ini." : "Lanjutkan latihanmu!"}
        </p>
      </section>

      {/* Quick Start Banner for New Users */}
      {isNewUser && (
        <Card className="mb-8 bg-gradient-to-br from-[var(--matcha-300)]/40 to-[var(--slushie-500)]/30 border-2 border-[var(--matcha-400)] rounded-[var(--radius-xl)]">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
              <div className="shrink-0">
                <div className="h-16 w-16 bg-[var(--clay-black)] rounded-[var(--radius-2xl)] flex items-center justify-center">
                  <MaterialIcon name="rocket_launch" className="text-3xl text-[var(--pure-white)]" />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-headline font-bold text-[var(--clay-black)] mb-1">
                  Selamat Datang di Labas
                </h2>
                <p className="text-sm text-[var(--warm-charcoal)] mb-4">
                  Platform latihan ujian bahasa berbasis AI. Ikuti 3 langkah mudah untuk memulai:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Link to="/generate" className="flex items-center gap-3 p-3 rounded-[var(--radius-lg)] bg-[var(--pure-white)] border-2 border-[var(--oat-border)] hover:border-[var(--matcha-400)] transition-all group clay-hover">
                    <div className="h-9 w-9 bg-[var(--matcha-300)] rounded-[var(--radius-md)] flex items-center justify-center shrink-0">
                      <span className="text-xs font-black text-[var(--matcha-800)]">1</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--clay-black)] group-hover:text-[var(--matcha-800)]">Generate Soal</p>
                      <p className="text-xs text-[var(--warm-charcoal)]">Buat soal dengan AI</p>
                    </div>
                    <MaterialIcon name="chevron_right" className="text-sm text-[var(--warm-silver)] group-hover:text-[var(--matcha-800)]" />
                  </Link>
                  <Link to="/bank" className="flex items-center gap-3 p-3 rounded-[var(--radius-lg)] bg-[var(--pure-white)] border-2 border-[var(--oat-border)] hover:border-[var(--slushie-500)] transition-all group clay-hover">
                    <div className="h-9 w-9 bg-[var(--slushie-500)]/30 rounded-[var(--radius-md)] flex items-center justify-center shrink-0">
                      <span className="text-xs font-black text-[var(--slushie-800)]">2</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--clay-black)] group-hover:text-[var(--slushie-800)]">Buat Paket</p>
                      <p className="text-xs text-[var(--warm-charcoal)]">Kumpulkan soal latihan</p>
                    </div>
                    <MaterialIcon name="chevron_right" className="text-sm text-[var(--warm-silver)] group-hover:text-[var(--slushie-800)]" />
                  </Link>
                  <Link to="/packages" className="flex items-center gap-3 p-3 rounded-[var(--radius-lg)] bg-[var(--pure-white)] border-2 border-[var(--oat-border)] hover:border-[var(--lemon-600)] transition-all group clay-hover">
                    <div className="h-9 w-9 bg-[var(--lemon-400)]/50 rounded-[var(--radius-md)] flex items-center justify-center shrink-0">
                      <span className="text-xs font-black text-[var(--lemon-800)]">3</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--clay-black)] group-hover:text-[var(--lemon-800)]">Mulai Latihan</p>
                      <p className="text-xs text-[var(--warm-charcoal)]">Kerjakan paket soal</p>
                    </div>
                    <MaterialIcon name="chevron_right" className="text-sm text-[var(--warm-silver)] group-hover:text-[var(--lemon-800)]" />
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div data-tour="dashboard-stats" className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
        <Card className="clay-shadow clay-hover bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 bg-[var(--matcha-300)] rounded-[var(--radius-lg)] flex items-center justify-center">
                <MaterialIcon name="assignment" className="text-lg text-[var(--matcha-800)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--warm-charcoal)]">Latihan Selesai</p>
                <p className="text-xl font-bold text-[var(--clay-black)] font-headline">
                  {stats?.completedAttempts ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="clay-shadow clay-hover bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 bg-[var(--slushie-500)] rounded-[var(--radius-lg)] flex items-center justify-center">
                <MaterialIcon name="timer" className="text-lg text-[var(--clay-black)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--warm-charcoal)]">Waktu Latihan</p>
                <p className="text-xl font-bold text-[var(--clay-black)] font-headline">
                  {stats ? `${Math.round(stats.totalTimeSpentSec / 60)}m` : "0m"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="clay-shadow clay-hover bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 bg-[var(--lemon-400)] rounded-[var(--radius-lg)] flex items-center justify-center">
                <MaterialIcon name="quiz" className="text-lg text-[var(--lemon-800)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--warm-charcoal)]">Soal Terjawab</p>
                <p className="text-xl font-bold text-[var(--clay-black)] font-headline">
                  {stats?.totalQuestionsAnswered ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="clay-shadow clay-hover bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 bg-[var(--pomegranate-400)]/30 rounded-[var(--radius-lg)] flex items-center justify-center">
                <MaterialIcon name="trending_up" className="text-lg text-[var(--pomegranate-600)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--warm-charcoal)]">Akurasi</p>
                <p className="text-xl font-bold text-[var(--clay-black)] font-headline">
                  {stats ? `${stats.overallAccuracyPct}%` : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-10">
        <Link to="/generate" className="flex-1">
          <Button className="w-full bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] rounded-[var(--radius-lg)] h-12 clay-shadow clay-hover text-base">
            <MaterialIcon name="auto_awesome" className="text-xl" />
            <span className="ml-2">Generate Soal Baru</span>
          </Button>
        </Link>
        <Link to="/packages" className="flex-1">
          <Button variant="outline" className="w-full rounded-[var(--radius-lg)] h-12 border-2 border-[var(--oat-border)] bg-[var(--pure-white)] text-[var(--clay-black)] hover:bg-[var(--oat-light)] clay-hover text-base">
            <MaterialIcon name="folder" className="text-xl" />
            <span className="ml-2">Mulai Latihan</span>
          </Button>
        </Link>
        <Link to="/analytics" className="flex-1">
          <Button variant="outline" className="w-full rounded-[var(--radius-lg)] h-12 border-2 border-[var(--oat-border)] bg-[var(--pure-white)] text-[var(--clay-black)] hover:bg-[var(--oat-light)] clay-hover text-base">
            <MaterialIcon name="analytics" className="text-xl" />
            <span className="ml-2">Lihat Analitik</span>
          </Button>
        </Link>
      </div>

      {/* Editor's Pick */}
      {hasFeatured && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MaterialIcon name="star" className="text-[var(--sunbeam-600)]" />
              <h2 className="text-xl font-headline font-bold text-[var(--clay-black)]">
                Editor's Pick
              </h2>
            </div>
            <Link to="/packages" className="text-sm text-[var(--matcha-600)] font-semibold hover:underline">
              Lihat Semua
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featuredPkg.slice(0, 3).map((pkg) => (
              <Link key={pkg.id} to="/package/$id" params={{ id: pkg.id }} className="block">
                <Card className="clay-shadow clay-hover bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)] h-full transition-all hover:border-[var(--matcha-400)]">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="px-2 py-1 rounded-full bg-[var(--matcha-300)] text-[var(--matcha-800)] text-xs font-semibold shrink-0">
                        {pkg.examTypeName}
                      </span>
                      <span className="text-xs text-[var(--warm-silver)] whitespace-nowrap">
                        {pkg.usageCount}x digunakan
                      </span>
                    </div>
                    <h3 className="font-headline text-base font-bold text-[var(--clay-black)] mb-1 line-clamp-2">
                      {pkg.title}
                    </h3>
                    {pkg.description && (
                      <p className="text-xs text-[var(--warm-charcoal)] line-clamp-2 mb-3">
                        {pkg.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-3 border-t border-[var(--oat-border)]">
                      <div className="flex gap-3 text-xs text-[var(--warm-charcoal)]">
                        <span className="flex items-center gap-1">
                          <MaterialIcon name="quiz" className="text-xs" />
                          {pkg.totalQuestions}
                        </span>
                        <span className="flex items-center gap-1">
                          <MaterialIcon name="folder" className="text-xs" />
                          {pkg.totalSections}
                        </span>
                        {pkg.estimatedDurationMin && (
                          <span className="flex items-center gap-1">
                            <MaterialIcon name="timer" className="text-xs" />
                            {pkg.estimatedDurationMin}m
                          </span>
                        )}
                      </div>
                      <MaterialIcon name="play_circle" className="text-xl text-[var(--matcha-600)]" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent Attempts */}
      {attempts.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-headline font-bold text-[var(--clay-black)]">
              Latihan Terakhir
            </h2>
            <Link to="/history" className="text-sm text-[var(--matcha-600)] font-semibold hover:underline">
              Lihat Semua
            </Link>
          </div>
          <div className="space-y-3">
            {attempts.map((a) => {
              const pct =
                a.maxScore && a.maxScore > 0 && a.totalScore != null
                  ? Math.round((a.totalScore / a.maxScore) * 100)
                  : null;
              return (
                <Card
                  key={a.id}
                  className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)] hover:border-[var(--matcha-400)] transition-colors"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {a.status === "completed" ? (
                            <MaterialIcon name="check_circle" className="text-[var(--matcha-600)] text-sm" />
                          ) : a.status === "abandoned" ? (
                            <MaterialIcon name="cancel" className="text-[var(--warm-silver)] text-sm" />
                          ) : (
                            <MaterialIcon name="hourglass_top" className="text-[var(--slushie-600)] text-sm" />
                          )}
                          <span className="text-sm font-semibold text-[var(--clay-black)] truncate">
                            {a.packageTitle ?? "Paket tidak diketahui"}
                          </span>
                          {a.examTypeName && (
                            <span className="px-2 py-0.5 rounded-full bg-[var(--matcha-300)] text-[var(--matcha-800)] text-[10px] font-semibold shrink-0">
                              {a.examTypeName}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--warm-charcoal)]">
                          {formatDateShort(a.startedAt)}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        {pct != null && (
                          <div className="text-right">
                            <div className="text-lg font-headline font-bold text-[var(--clay-black)]">
                              {pct}%
                            </div>
                            <div className="text-xs text-[var(--warm-charcoal)]">
                              {a.totalScore}/{a.maxScore}
                            </div>
                          </div>
                        )}
                        {a.status === "completed" && (
                          <Link to="/attempt/$id" params={{ id: a.id }}>
                            <Button
                              variant="outline"
                              className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] clay-hover text-sm"
                            >
                              Hasil
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Feature Cards - simplified, only show if new user */}
      {isNewUser && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/bank" className="block">
            <Card className="clay-shadow clay-hover bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)] h-full">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-9 w-9 bg-[var(--slushie-500)] rounded-[var(--radius-md)] flex items-center justify-center">
                    <MaterialIcon name="database" className="text-lg text-[var(--clay-black)]" />
                  </div>
                  <h3 className="font-headline font-bold text-[var(--clay-black)]">Bank Soal</h3>
                </div>
                <p className="text-xs text-[var(--warm-charcoal)]">
                  Simpan, publikasikan, dan buat paket dari soal pilihan.
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/history" className="block">
            <Card className="clay-shadow clay-hover bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)] h-full">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-9 w-9 bg-[var(--lemon-400)] rounded-[var(--radius-md)] flex items-center justify-center">
                    <MaterialIcon name="history" className="text-lg text-[var(--lemon-800)]" />
                  </div>
                  <h3 className="font-headline font-bold text-[var(--clay-black)]">Riwayat</h3>
                </div>
                <p className="text-xs text-[var(--warm-charcoal)]">
                  Lihat kembali hasil dan progres latihan kamu.
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/settings" className="block">
            <Card className="clay-shadow clay-hover bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)] h-full">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-9 w-9 bg-[var(--oat-light)] rounded-[var(--radius-md)] flex items-center justify-center">
                    <MaterialIcon name="settings" className="text-lg text-[var(--warm-charcoal)]" />
                  </div>
                  <h3 className="font-headline font-bold text-[var(--clay-black)]">Pengaturan</h3>
                </div>
                <p className="text-xs text-[var(--warm-charcoal)]">
                  Kelola API key dan preferensi akun kamu.
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      <TourGuide />
    </div>
  );
}
