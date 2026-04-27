import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

export const Route = createFileRoute("/")({
  component: HomeComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({ to: "/login", throw: true });
    }
    return { session };
  },
});

function HomeComponent() {
  const { session } = Route.useRouteContext();
  const privateData = useQuery(trpc.privateData.queryOptions());

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
                <p className="text-sm text-[var(--warm-charcoal)]">Soal Dikerjakan</p>
                <p className="text-2xl font-bold text-[var(--clay-black)] font-headline">0</p>
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
                <p className="text-2xl font-bold text-[var(--clay-black)] font-headline">0 jam</p>
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
                <p className="text-2xl font-bold text-[var(--clay-black)] font-headline">-</p>
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
        <Link to="/settings">
          <Button variant="outline" className="rounded-[var(--radius-lg)] h-11 px-6 border-2 border-[var(--oat-border)] bg-[var(--pure-white)] text-[var(--clay-black)] hover:bg-[var(--oat-light)] clay-hover">
            <MaterialIcon name="key" className="text-xl" />
            <span className="ml-2">Atur API Key</span>
          </Button>
        </Link>
      </div>

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

        <Card className="clay-shadow clay-hover bg-[var(--pure-white)] border-2 border-dashed border-[var(--oat-border)] rounded-[var(--radius-xl)] h-full opacity-70">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-[var(--oat-light)] rounded-[var(--radius-md)] flex items-center justify-center">
                <MaterialIcon name="database" className="text-xl text-[var(--warm-silver)]" />
              </div>
              <h3 className="font-headline text-lg font-bold text-[var(--warm-silver)]">Bank Soal</h3>
            </div>
            <p className="text-sm text-[var(--warm-silver)]">
              Simpan, publikasikan, dan gunakan ulang soal. Segera hadir.
            </p>
          </CardContent>
        </Card>

        <Card className="clay-shadow clay-hover bg-[var(--pure-white)] border-2 border-dashed border-[var(--oat-border)] rounded-[var(--radius-xl)] h-full opacity-70">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-[var(--oat-light)] rounded-[var(--radius-md)] flex items-center justify-center">
                <MaterialIcon name="analytics" className="text-xl text-[var(--warm-silver)]" />
              </div>
              <h3 className="font-headline text-lg font-bold text-[var(--warm-silver)]">Analytics</h3>
            </div>
            <p className="text-sm text-[var(--warm-silver)]">
              Evaluasi per-section, identifikasi kelemahan. Segera hadir.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* API Status */}
      <div className="mt-10 flex items-center gap-2 text-sm text-[var(--warm-charcoal)]">
        <div className={`h-2 w-2 rounded-full ${privateData.data ? "bg-[var(--matcha-600)]" : "bg-[var(--pomegranate-400)]"}`} />
        <span>
          {privateData.isLoading
            ? "Checking..."
            : privateData.data
              ? "Server Connected"
              : "Server Disconnected"}
        </span>
      </div>
    </div>
  );
}
