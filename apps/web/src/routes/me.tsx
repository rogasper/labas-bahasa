import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { Button } from "@labas/ui/components/button";
import { Input } from "@labas/ui/components/input";
import { Card, CardContent } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Avatar } from "@/components/ui/Avatar";

export const Route = createFileRoute("/me")({
  component: MeComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({ to: "/login", throw: true });
    }
    return { session };
  },
});

function MeComponent() {
  const { session } = Route.useRouteContext();
  const userId = session.data?.user.id ?? "";

  const profile = useQuery(trpc.profile.getById.queryOptions({ userId }));
  const updateMutation = useMutation(trpc.profile.update.mutationOptions());

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(session.data?.user.name ?? "");
  const [image, setImage] = useState(session.data?.user.image ?? "");

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      name: name || undefined,
      image: image || null,
    });
    setIsEditing(false);
    profile.refetch();
  };

  if (!profile.data) {
    return (
      <div className="min-h-screen pt-8 pb-32 px-6 md:px-12 lg:px-16 max-w-3xl mx-auto bg-[var(--warm-cream)]">
        <div className="h-32 bg-[var(--oat-light)] animate-pulse rounded-[var(--radius-xl)]" />
      </div>
    );
  }

  const { stats } = profile.data;

  return (
    <div className="min-h-screen pt-8 pb-32 px-6 md:px-12 lg:px-16 max-w-3xl mx-auto bg-[var(--warm-cream)]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-[var(--warm-charcoal)] mb-4">
          <Link to="/" className="hover:text-[var(--clay-black)] transition-colors">
            Beranda
          </Link>
          <MaterialIcon name="chevron_right" className="text-xs" />
          <span className="text-[var(--clay-black)] font-medium">Profil Saya</span>
        </div>
        <h1 className="text-4xl font-headline font-extrabold text-[var(--clay-black)] tracking-tight">
          Profil Saya
        </h1>
      </div>

      {/* Profile Card */}
      <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)] mb-8">
        <CardContent className="p-6 md:p-8">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--clay-black)] mb-1">Nama</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-[var(--warm-cream)] border-2 border-[var(--oat-border)] rounded-[var(--radius-lg)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--clay-black)] mb-1">URL Avatar</label>
                <Input
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://..."
                  className="bg-[var(--warm-cream)] border-2 border-[var(--oat-border)] rounded-[var(--radius-lg)]"
                />
                <p className="text-xs text-[var(--warm-silver)] mt-1">
                  Masukkan URL gambar. Kosongkan untuk menggunakan inisial.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] rounded-[var(--radius-lg)]"
                >
                  {updateMutation.isPending ? "Menyimpan..." : "Simpan"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setName(session.data?.user.name ?? "");
                    setImage(session.data?.user.image ?? "");
                    setIsEditing(false);
                  }}
                  className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)]"
                >
                  Batal
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 md:gap-6">
                <Avatar
                  src={session.data?.user.image}
                  name={session.data?.user.name ?? ""}
                  size="xl"
                  variant="profile"
                />
                <div>
                  <h2 className="text-2xl font-headline font-extrabold text-[var(--clay-black)]">
                    {session.data?.user.name ?? "Pengguna"}
                  </h2>
                  <p className="text-sm text-[var(--warm-charcoal)]">{session.data?.user.email}</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] clay-hover"
              >
                <MaterialIcon name="edit" className="mr-2" />
                Edit
              </Button>
            </div>
          )}
          <div className="mt-4 pt-4 border-t-2 border-[var(--oat-border)]">
            <Link
              to="/setup-avatar"
              search={{ redirectTo: "/me" }}
              className="inline-flex"
            >
              <Button
                variant="outline"
                className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] clay-hover"
              >
                <MaterialIcon name="face" className="mr-2" />
                Ganti Avatar
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <h2 className="text-xl font-headline font-bold text-[var(--clay-black)] mb-4">Statistik Kreator</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-headline font-extrabold text-[var(--clay-black)]">
              {stats.totalPackages}
            </div>
            <div className="text-xs text-[var(--warm-charcoal)] mt-1">Paket Dibuat</div>
          </CardContent>
        </Card>
        <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-headline font-extrabold text-[var(--clay-black)]">
              {stats.totalPackageUsage}
            </div>
            <div className="text-xs text-[var(--warm-charcoal)] mt-1">Paket Digunakan</div>
          </CardContent>
        </Card>
        <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-headline font-extrabold text-[var(--clay-black)]">
              {stats.totalQuestions}
            </div>
            <div className="text-xs text-[var(--warm-charcoal)] mt-1">Soal Dibuat</div>
          </CardContent>
        </Card>
        <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-headline font-extrabold text-[var(--clay-black)]">
              {stats.avgPackageRating > 0 ? stats.avgPackageRating : "-"}
            </div>
            <div className="text-xs text-[var(--warm-charcoal)] mt-1">Rating Rata-rata</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <h2 className="text-xl font-headline font-bold text-[var(--clay-black)] mb-4">Tautan Cepat</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/history" className="block">
          <Card className="clay-shadow clay-hover bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--slushie-500)] flex items-center justify-center">
                <MaterialIcon name="history" className="text-[var(--clay-black)]" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--clay-black)]">Riwayat Latihan</h3>
                <p className="text-xs text-[var(--warm-charcoal)]">Lihat semua attempt latihan Anda</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/bank" className="block">
          <Card className="clay-shadow clay-hover bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--matcha-300)] flex items-center justify-center">
                <MaterialIcon name="database" className="text-[var(--matcha-800)]" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--clay-black)]">Bank Soal Saya</h3>
                <p className="text-xs text-[var(--warm-charcoal)]">Kelola soal yang Anda buat</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/settings" search={{ tab: "account" }} className="block">
          <Card className="clay-shadow clay-hover bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--clay-black)] flex items-center justify-center">
                <MaterialIcon name="settings" className="text-[var(--pure-white)]" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--clay-black)]">Pengaturan Akun</h3>
                <p className="text-xs text-[var(--warm-charcoal)]">Ubah password, email, dan lainnya</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
