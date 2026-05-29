import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@labas/ui/components/card";
import { Input } from "@labas/ui/components/input";
import { toast } from "sonner";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { getErrorMessage } from "@/lib/error-utils";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { routeShell } from "@/lib/route-shell";
import { TurnstileField, TURNSTILE_SITE_KEY } from "@/components/TurnstileField";
import { z } from "zod";

const searchSchema = z.object({
  email: z.string().optional(),
});

export const Route = createFileRoute("/verify-email")({
  staticData: routeShell.public,
  component: RouteComponent,
  validateSearch: searchSchema,
  beforeLoad: async ({ search }) => {
    if (!search.email) {
      const session = await authClient.getSession();
      if (!session.data) {
        redirect({ to: "/login", throw: true });
      }
    }
  },
});

function RouteComponent() {
  const navigate = useNavigate();
  const { email: searchEmail } = Route.useSearch();
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const email = searchEmail || sessionEmail || "";
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const sendMutation = useMutation(trpc.verification.sendVerificationOtp.mutationOptions());
  const verifyMutation = useMutation(trpc.verification.verifyEmailOtp.mutationOptions());
  const [resendTurnstileToken, setResendTurnstileToken] = useState<string | undefined>(undefined);
  const resendTurnstileRef = useRef<TurnstileInstance>(null);

  useEffect(() => {
    if (!searchEmail) {
      authClient.getSession().then((s) => {
        if (s.data?.user.email) setSessionEmail(s.data.user.email);
      });
    }
  }, [searchEmail]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    if (email) {
      setCountdown(60);
    }
  }, [email]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleSendOtp = async (token?: string) => {
    if (!email) return;
    try {
      await sendMutation.mutateAsync({ email, turnstileToken: token });
      toast.success("Kode OTP telah dikirim ke email Anda");
      setCountdown(60);
      resendTurnstileRef.current?.reset();
      setResendTurnstileToken(undefined);
    } catch (err: unknown) {
      resendTurnstileRef.current?.reset();
      setResendTurnstileToken(undefined);
      toast.error(getErrorMessage(err) || "Gagal mengirim OTP");
    }
  };

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

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      toast.error("Masukkan 6 digit kode OTP");
      return;
    }
    try {
      await verifyMutation.mutateAsync({ email, otp: code });
      toast.success("Email berhasil diverifikasi!");
      const session = await authClient.getSession();
      if (session.data) {
        navigate({ to: "/dashboard" });
      } else {
        navigate({ to: "/login" });
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Kode OTP tidak valid");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
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

  if (!email) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-muted/30">
        <p className="text-muted-foreground">Memuat...</p>
      </div>
    );
  }

  const isMutating = sendMutation.isPending || verifyMutation.isPending;

  return (
    <div className="flex h-screen w-full items-center justify-center bg-muted/30">
      <Card className="mx-auto w-full max-w-md shadow-lg border-muted rounded-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">Verifikasi Email</CardTitle>
          <CardDescription className="space-y-2">
            <span className="block">
              Masukkan kode 6 digit yang dikirim ke <strong>{email}</strong>
            </span>
            <span className="block text-xs text-muted-foreground font-normal">
              Sudah pernah mendaftar? Coba{" "}
              <Link to="/login" search={{}} className="font-semibold text-primary hover:underline">
                masuk
              </Link>{" "}
              dengan email dan password yang sama. Tidak ada kode? Gunakan kirim ulang di bawah.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
                aria-label={`Digit ${i + 1} kode verifikasi`}
                className="w-12 h-14 text-center text-xl font-bold"
              />
            ))}
          </div>

          <Button
            type="button"
            className="w-full"
            onClick={handleVerify}
            disabled={isMutating || otp.join("").length !== 6}
          >
            {verifyMutation.isPending ? "Memverifikasi..." : "Verifikasi Email"}
          </Button>

          <div className="space-y-3">
            {countdown === 0 && TURNSTILE_SITE_KEY ? (
              <div className="space-y-2">
                <p className="text-center text-xs text-muted-foreground">
                  Verifikasi keamanan untuk kirim ulang kode
                </p>
                <TurnstileField
                  ref={resendTurnstileRef}
                  onSuccess={(token) => {
                    setResendTurnstileToken(token);
                    handleSendOtp(token);
                  }}
                  onExpire={() => setResendTurnstileToken(undefined)}
                  onError={() => setResendTurnstileToken(undefined)}
                />
              </div>
            ) : null}
            <p className="text-center text-sm text-muted-foreground">
              Tidak menerima kode?{" "}
              {countdown > 0 ? (
                <span className="font-semibold text-foreground">Kirim ulang ({countdown}s)</span>
              ) : TURNSTILE_SITE_KEY ? (
                <span className="font-semibold text-foreground">
                  {sendMutation.isPending ? "Mengirim..." : "Selesaikan verifikasi di atas"}
                </span>
              ) : (
                <Button
                  variant="link"
                  className="p-0 h-auto font-semibold"
                  disabled={sendMutation.isPending}
                  onClick={() => handleSendOtp()}
                >
                  {sendMutation.isPending ? "Mengirim..." : "Kirim Ulang"}
                </Button>
              )}
            </p>
          </div>

          <div className="text-center">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-primary">
              Kembali ke halaman masuk
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
