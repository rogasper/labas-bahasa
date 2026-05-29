import { Button } from "@labas/ui/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@labas/ui/components/card";
import { Input } from "@labas/ui/components/input";
import { Label } from "@labas/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { useRef, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { trackUmamiEvent, AnalyticsEvent } from "@/lib/umami";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { TurnstileField, TURNSTILE_SITE_KEY } from "@/components/TurnstileField";
import { VERIFY_EMAIL_CONTINUE_TOAST, VERIFY_EMAIL_SUCCESS_TOAST } from "@/lib/auth-messages";
import { isSignUpDuplicateError } from "@/lib/signup-errors";

import Loader from "./loader";

const passwordSchema = z
  .string()
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
    "Password must be at least 8 characters with uppercase, lowercase, and number",
  );

const signUpSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.email("Invalid email address"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password tidak cocok",
    path: ["confirmPassword"],
  });

export default function SignUpForm({ onSwitchToSignIn }: { onSwitchToSignIn: () => void }) {
  const navigate = useNavigate({
    from: "/",
  });
  const { isPending } = authClient.useSession();
  const sendOtpMutation = useMutation(trpc.verification.sendVerificationOtp.mutationOptions());
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>(undefined);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const continueToVerification = async (email: string) => {
    try {
      await sendOtpMutation.mutateAsync({ email, turnstileToken });
    } catch {
      // sendVerificationOtp uses generic responses; still allow user to resend on verify page
    }
    turnstileRef.current?.reset();
    setTurnstileToken(undefined);
    navigate({
      to: "/verify-email",
      search: { email },
    });
  };

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signUp.email(
        {
          email: value.email,
          password: value.password,
          name: value.name,
        },
        {
          onSuccess: async () => {
            trackUmamiEvent(AnalyticsEvent.SIGN_UP);
            await continueToVerification(value.email);
            toast.success(VERIFY_EMAIL_SUCCESS_TOAST);
          },
          onError: async (error) => {
            if (isSignUpDuplicateError(error)) {
              await continueToVerification(value.email);
              toast.message(VERIFY_EMAIL_CONTINUE_TOAST);
              return;
            }
            turnstileRef.current?.reset();
            setTurnstileToken(undefined);
            toast.error(error.error.message || error.error.statusText);
          },
        },
      );
    },
    validators: {
      onSubmit: signUpSchema,
    },
  });

  if (isPending) {
    return <Loader />;
  }

  return (
    <Card className="mx-auto w-full max-w-md shadow-lg border-muted rounded-xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-3xl font-bold tracking-tight">Create Account</CardTitle>
        <CardDescription>Enter your details below to create your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <div>
            <form.Field name="name">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Name</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors.map((error) => (
                    <p key={error?.message} className="text-red-500 text-sm">
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>
          </div>

          <div>
            <form.Field name="email">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Email</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="email"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors.map((error) => (
                    <p key={error?.message} className="text-red-500 text-sm">
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>
          </div>

          <div>
            <form.Field name="password">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Password</Label>
                  <PasswordInput
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={field.handleChange}
                    autoComplete="new-password"
                    placeholder="Minimal 8 karakter"
                  />
                  {field.state.meta.errors.map((error) => (
                    <p key={error?.message} className="text-red-500 text-sm">
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>
          </div>

          <div>
            <form.Field name="confirmPassword">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Konfirmasi Password</Label>
                  <PasswordInput
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={field.handleChange}
                    autoComplete="new-password"
                    placeholder="Ulangi password"
                  />
                  {field.state.meta.errors.map((error) => (
                    <p key={error?.message} className="text-red-500 text-sm">
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>
          </div>

          <TurnstileField
            ref={turnstileRef}
            onSuccess={setTurnstileToken}
            onExpire={() => setTurnstileToken(undefined)}
            onError={() => setTurnstileToken(undefined)}
          />

          <form.Subscribe
            selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}
          >
            {({ canSubmit, isSubmitting }) => (
              <Button
                type="submit"
                className="w-full rounded-[var(--radius-lg)]"
                disabled={!canSubmit || isSubmitting || (!!TURNSTILE_SITE_KEY && !turnstileToken)}
              >
                {isSubmitting ? "Submitting..." : "Sign Up"}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4 border-t pt-4">
        <div className="text-sm text-center text-muted-foreground w-full">
          Already have an account?{" "}
          <Button
            variant="link"
            onClick={onSwitchToSignIn}
            className="p-0 h-auto font-semibold text-primary hover:text-primary/80"
          >
            Sign In
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
