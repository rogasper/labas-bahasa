import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@labas/ui/components/card";
import { Input } from "@labas/ui/components/input";
import { Label } from "@labas/ui/components/label";
import { Button } from "@labas/ui/components/button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-utils";
import { authClient } from "@/lib/auth-client";

export function AccountSettings() {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword)) {
      toast.error("Password minimal 8 karakter, mengandung huruf besar, huruf kecil, dan angka");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Password baru tidak cocok");
      return;
    }
    setIsChangingPassword(true);
    try {
      await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      toast.success("Password berhasil diubah");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Gagal mengubah password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    setIsChangingEmail(true);
    try {
      await authClient.changeEmail({ newEmail });
      toast.success("Email berhasil diubah. Cek email baru Anda untuk verifikasi.");
      setNewEmail("");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Gagal mengubah email");
    } finally {
      setIsChangingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
        <CardHeader>
          <CardTitle className="font-headline text-[var(--clay-black)]">Informasi Akun</CardTitle>
          <CardDescription className="text-[var(--warm-charcoal)]">
            Detail akun Anda saat ini
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-sm text-[var(--warm-charcoal)]">Nama</Label>
            <p className="font-medium text-[var(--clay-black)]">{user?.name}</p>
          </div>
          <div>
            <Label className="text-sm text-[var(--warm-charcoal)]">Email</Label>
            <p className="font-medium text-[var(--clay-black)]">{user?.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
        <CardHeader>
          <CardTitle className="font-headline text-[var(--clay-black)]">Ubah Password</CardTitle>
          <CardDescription className="text-[var(--warm-charcoal)]">
            Gunakan password yang kuat dan unik
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Password Saat Ini</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Masukkan password saat ini"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Password Baru</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
              />
            </div>
            <Button
              type="submit"
              className="rounded-[var(--radius-lg)]"
              disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
            >
              {isChangingPassword ? "Menyimpan..." : "Ubah Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
        <CardHeader>
          <CardTitle className="font-headline text-[var(--clay-black)]">Ubah Email</CardTitle>
          <CardDescription className="text-[var(--warm-charcoal)]">
            Masukkan alamat email baru Anda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangeEmail} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newEmail">Email Baru</Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="nama@email.com"
              />
            </div>
            <Button type="submit" className="rounded-[var(--radius-lg)]" disabled={isChangingEmail || !newEmail}>
              {isChangingEmail ? "Menyimpan..." : "Ubah Email"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
