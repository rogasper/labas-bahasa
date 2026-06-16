import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { CpnsPageHeader } from "@/components/ui/CpnsPageHeader";
import { CPNS_SECTION_NAMES, CPNS_SECTION_DESCRIPTIONS } from "@/lib/cpns-constants";

export const Route = createFileRoute("/cpns/dashboard")({
  component: CpnsDashboard,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }
    return { session };
  },
});

function formatDateShort(dateStr: string | Date | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function CpnsDashboard() {
  const { data: session } = authClient.useSession();

  const recentAttempts = useQuery(
    trpc.attempt.myAttempts.queryOptions({ limit: 5, offset: 0, examTypeId: "CPNS" }),
  );

  const overview = useQuery(
    trpc.stats.overview.queryOptions(),
  );

  const attempts = recentAttempts.data?.attempts ?? [];
  const stats = overview.data;

  const cpnsAttempts = attempts.filter((a) => a.packageExamTypeId === "CPNS");

  return (
    <div>
      <CpnsPageHeader icon="account_balance" title={"Halo, " + (session?.user.name ?? "Pengguna") + "!"} subtitle="Persiapan CPNS SKD — Fokus pada TIU, TWK, dan TKP." />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
          <CardContent className="p-4">
            <p className="text-xs text-[var(--warm-charcoal)] mb-1">Latihan CPNS</p>
            <p className="text-2xl font-bold text-[var(--clay-black)] font-headline">{cpnsAttempts.length}</p>
          </CardContent>
        </Card>
        <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
          <CardContent className="p-4">
            <p className="text-xs text-[var(--warm-charcoal)] mb-1">Total Soal</p>
            <p className="text-2xl font-bold text-[var(--clay-black)] font-headline">{stats?.totalQuestionsAnswered ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
          <CardContent className="p-4">
            <p className="text-xs text-[var(--warm-charcoal)] mb-1">Akurasi</p>
            <p className="text-2xl font-bold text-[var(--clay-black)] font-headline">{stats ? `${stats.overallAccuracyPct}%` : "-"}</p>
          </CardContent>
        </Card>
        <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
          <CardContent className="p-4">
            <p className="text-xs text-[var(--warm-charcoal)] mb-1">Waktu</p>
            <p className="text-2xl font-bold text-[var(--clay-black)] font-headline">{stats ? `${Math.round(stats.totalTimeSpentSec / 60)}m` : "-"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Section Cards */}
      <h2 className="text-lg font-headline font-bold text-[var(--clay-black)] mb-4">Pilih Section Latihan</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {(["TIU", "TWK", "TKP"] as const).map((section) => (
          <Link key={section} to="/cpns/generate" className="block">
            <Card className="clay-shadow clay-hover bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)] h-full transition-all hover:border-[var(--matcha-500)]">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-[var(--radius-lg)] flex items-center justify-center bg-[var(--matcha-300)]">
                    <MaterialIcon
                      name={section === "TIU" ? "psychology" : section === "TWK" ? "gavel" : "diversity_3"}
                      className="text-lg text-[var(--matcha-800)]"
                    />
                  </div>
                  <div>
                    <h3 className="font-headline font-bold text-[var(--clay-black)]">{section}</h3>
                    <p className="text-xs text-[var(--warm-silver)]">{CPNS_SECTION_NAMES[section]}</p>
                  </div>
                </div>
                <p className="text-xs text-[var(--warm-charcoal)]">{CPNS_SECTION_DESCRIPTIONS[section]}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <Link to="/cpns/generate" className="flex-1">
          <Button className="w-full bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] rounded-[var(--radius-lg)] h-12 clay-shadow text-base">
            <MaterialIcon name="auto_awesome" className="text-xl" />
            <span className="ml-2">Generate Soal CPNS</span>
          </Button>
        </Link>
        <Link to="/cpns/packages" className="flex-1">
          <Button variant="outline" className="w-full rounded-[var(--radius-lg)] h-12 border-2 border-[var(--oat-border)] bg-[var(--pure-white)] text-[var(--clay-black)] hover:bg-[var(--oat-light)] text-base">
            <MaterialIcon name="folder" className="text-xl" />
            <span className="ml-2">Mulai Latihan</span>
          </Button>
        </Link>
      </div>

      {/* Recent CPNS Attempts */}
      {cpnsAttempts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-headline font-bold text-[var(--clay-black)]">Latihan CPNS Terakhir</h2>
            <Link to="/cpns/history" className="text-sm text-[var(--matcha-600)] font-semibold hover:underline">
              Lihat Semua
            </Link>
          </div>
          <div className="space-y-3">
            {cpnsAttempts.map((a) => {
              const pct = a.maxScore && a.maxScore > 0 && a.totalScore != null
                ? Math.round((a.totalScore / a.maxScore) * 100)
                : null;
              return (
                <Card key={a.id} className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
                  <CardContent className="p-4">
                    <span className="text-sm font-semibold text-[var(--clay-black)]">{a.packageTitle ?? "Paket tidak diketahui"}</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-[var(--warm-charcoal)]">{formatDateShort(a.startedAt)}</span>
                      {pct != null && (
                        <span className="text-sm font-bold text-[var(--clay-black)]">{pct}%</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}