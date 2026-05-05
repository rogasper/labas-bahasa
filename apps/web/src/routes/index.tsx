import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { formatTime } from "@/lib/time";

export const Route = createFileRoute("/")({
  component: HomeComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({ to: "/landing", throw: true });
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
  const overview = useQuery(trpc.stats.overview.queryOptions());
  const recentAttempts = useQuery(
    trpc.attempt.myAttempts.queryOptions({ limit: 5, offset: 0 }),
  );

  const stats = overview.data;
  const attempts = recentAttempts.data?.attempts ?? [];

  return (
    <div className="min-h-screen pt-8 pb-32 px-6 md:px-12 lg:px-16 max-w-6xl mx-auto bg-[var(--warm-cream)]">
      <section className="mb-10">
        <h1 className="text-4xl font-headline font-extrabold text-[var(--clay-black)] tracking-tight">
          Labas
        </h1>
        <p className="text-lg text-[var(--warm-charcoal)] mt-2">
          Halo, {session.data?.user.name ?? "Pengguna"}! Platform latihan ujian bahasa dengan AI.
        </p>
      </section>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card className="clay-shadow clay-hover bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-[var(--matcha-300)] rounded-[var(--radius-lg)] flex items-center justify-center">
                <MaterialIcon name="assignment" className="text-xl text-[var(--matcha-800)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--warm-charcoal)]">Latihan Selesai</p>
                <p className="text-2xl font-bold text-[var(--clay-black)] font-headline">
                  {stats?.completedAttempts ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="clay-shadow clay-hover bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-[var(--slushie-500)] rounded-[var(--radius-lg)] flex items-center justify-center">
                <MaterialIcon name="timer" className="text-xl text-[var(--clay-black)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--warm-charcoal)]">Waktu Latihan</p>
                <p className="text-2xl font-bold text-[var(--clay-black)] font-headline">
                  {stats ? `${Math.round(stats.totalTimeSpentSec / 60)} menit` : "0 menit"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="clay-shadow clay-hover bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-[var(--lemon-400)] rounded-[var(--radius-lg)] flex items-center justify-center">
                <MaterialIcon name="percent" className="text-xl text-[var(--lemon-800)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--warm-charcoal)]">Akurasi Rata-rata</p>
                <p className="text-2xl font-bold text-[var(--clay-black)] font-headline">
                  {stats ? `${stats.overallAccuracyPct}%` : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col md:flex-row gap-4 mb-10">
        <Link to="/generate">
          <Button className="bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] rounded-[var(--radius-lg)] h-11 px-6 clay-shadow clay-hover">
            <MaterialIcon name="auto_awesome" className="text-xl" />
            <span className="ml-2">Generate Soal Baru</span>
          </Button>
        </Link>
        <Link to="/packages">
          <Button variant="outline" className="rounded-[var(--radius-lg)] h-11 px-6 border-2 border-[var(--oat-border)] bg-[var(--pure-white)] text-[var(--clay-black)] hover:bg-[var(--oat-light)] clay-hover">
            <MaterialIcon name="folder" className="text-xl" />
            <span className="ml-2">Mulai Latihan</span>
          </Button>
        </Link>
        <Link to="/analytics">
          <Button variant="outline" className="rounded-[var(--radius-lg)] h-11 px-6 border-2 border-[var(--oat-border)] bg-[var(--pure-white)] text-[var(--clay-black)] hover:bg-[var(--oat-light)] clay-hover">
            <MaterialIcon name="analytics" className="text-xl" />
            <span className="ml-2">Lihat Analitik</span>
          </Button>
        </Link>
      </div>

      {/* Recent Attempts */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-headline font-bold text-[var(--clay-black)]">
            Latihan Terakhir
          </h2>
          <Link to="/history" className="text-sm text-[var(--matcha-600)] font-semibold hover:underline">
            Lihat Semua
          </Link>
        </div>

        {attempts.length === 0 ? (
          <Card className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
            <CardContent className="p-6 text-center">
              <MaterialIcon name="history" className="text-4xl text-[var(--warm-silver)] mx-auto mb-3" />
              <p className="text-[var(--warm-charcoal)] font-semibold">Belum ada latihan</p>
              <p className="text-sm text-[var(--warm-silver)] mt-1">
                Pilih paket soal dan mulai latihan pertama Anda.
              </p>
              <Link to="/packages" className="inline-block mt-4">
                <Button className="bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] rounded-[var(--radius-lg)]">
                  <MaterialIcon name="folder" className="mr-2" />
                  Lihat Paket
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
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
        )}
      </section>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/generate" className="block">
          <Card className="clay-shadow clay-hover bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)] h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 bg-[var(--matcha-300)] rounded-[var(--radius-md)] flex items-center justify-center">
                  <MaterialIcon name="auto_awesome" className="text-xl text-[var(--matcha-800)]" />
                </div>
                <h3 className="font-headline text-lg font-bold text-[var(--clay-black)]">AI Generator</h3>
              </div>
              <p className="text-sm text-[var(--warm-charcoal)]">
                Generate soal dengan AI menggunakan API key sendiri. Dua mode: Quick dan Agentic.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/bank" className="block">
          <Card className="clay-shadow clay-hover bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)] h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 bg-[var(--slushie-500)] rounded-[var(--radius-md)] flex items-center justify-center">
                  <MaterialIcon name="database" className="text-xl text-[var(--clay-black)]" />
                </div>
                <h3 className="font-headline text-lg font-bold text-[var(--clay-black)]">Bank Soal</h3>
              </div>
              <p className="text-sm text-[var(--warm-charcoal)]">
                Simpan, publikasikan, dan gunakan ulang soal latihan Anda. Buat paket dari soal pilihan.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/analytics" className="block">
          <Card className="clay-shadow clay-hover bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)] h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 bg-[var(--lemon-400)] rounded-[var(--radius-md)] flex items-center justify-center">
                  <MaterialIcon name="analytics" className="text-xl text-[var(--lemon-800)]" />
                </div>
                <h3 className="font-headline text-lg font-bold text-[var(--clay-black)]">Analytics</h3>
              </div>
              <p className="text-sm text-[var(--warm-charcoal)]">
                Evaluasi per-section, identifikasi kelemahan, dan pantau tren perkembangan Anda.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
