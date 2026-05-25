import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@labas/ui/components/card";
import { Input } from "@labas/ui/components/input";
import { Label } from "@labas/ui/components/label";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-utils";
import { trpc } from "@/utils/trpc";
import { routeShell } from "@/lib/route-shell";

export const Route = createFileRoute("/forgot-password")({
  staticData: routeShell.public,
  component: RouteComponent,
});

function StepEmail({ onNext }: { onNext: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const sendMutation = useMutation(trpc.verification.sendPasswordResetOtp.mutationOptions());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    try {
      await sendMutation.mutateAsync({ email });
      toast.success("Kode OTP telah dikirim ke email Anda");
      onNext(email);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Gagal mengirim OTP");
    }
  };

  return (
    <Card className="mx-auto w-full max-w-md shadow-lg border-muted rounded-xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-3xl font-bold tracking-tight">Lupa Password</CardTitle>
        <CardDescription>
          Masukkan email Anda untuk menerima kode reset password
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={sendMutation.isPending || !email}>
            {sendMutation.isPending ? "Mengirim..." : "Kirim Kode"}
          </Button>
        </form>

        <div className="text-center">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-primary">
            Kembali ke halaman masuk
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function StepReset({ email }: { email: string }) {
  const navigate = useNavigate();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const resetMutation = useMutation(trpc.verification.resetPassword.mutationOptions());
  const resendMutation = useMutation(trpc.verification.sendPasswordResetOtp.mutationOptions());

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);
    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleResend = async () => {
    try {
      await resendMutation.mutateAsync({ email });
      toast.success("Kode OTP telah dikirim ulang");
      setCountdown(60);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Gagal mengirim ulang OTP");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");

    if (code.length !== 6) {
      toast.error("Masukkan 6 digit kode OTP");
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword)) {
      toast.error("Password minimal 8 karakter, mengandung huruf besar, huruf kecil, dan angka");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Password tidak cocok");
      return;
    }

    try {
      await resetMutation.mutateAsync({ email, otp: code, newPassword });
      toast.success("Password berhasil direset! Silakan masuk.");
      navigate({ to: "/login" });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Gagal mereset password");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  };

  const isMutating = resetMutation.isPending || resendMutation.isPending;

  return (
    <Card className="mx-auto w-full max-w-md shadow-lg border-muted rounded-xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-3xl font-bold tracking-tight">Reset Password</CardTitle>
        <CardDescription>
          Masukkan kode dari email dan password baru Anda
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Kode OTP</Label>
            <div className="flex justify-center gap-2" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <Input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  aria-label={`Digit ${i + 1} kode OTP`}
                  className="w-12 h-14 text-center text-xl font-bold"
                />
              ))}
            </div>
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
            className="w-full"
            disabled={isMutating || otp.join("").length !== 6 || !newPassword || !confirmPassword}
          >
            {resetMutation.isPending ? "Menyimpan..." : "Reset Password"}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            Tidak menerima kode?{" "}
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto font-semibold"
              disabled={resendMutation.isPending || countdown > 0}
              onClick={handleResend}
            >
              {countdown > 0 ? `Kirim ulang (${countdown}s)` : "Kirim Ulang"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function RouteComponent() {
  const [email, setEmail] = useState<string | null>(null);

  if (!email) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-muted/30">
        <img src="/logo.png" alt="Labas Logo" className="h-20 w-auto mb-8 absolute top-8" />
        <StepEmail onNext={setEmail} />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-muted/30">
      <img src="/logo.png" alt="Labas Logo" className="h-20 w-auto mb-8 absolute top-8" />
      <StepReset email={email} />
    </div>
  );
}
