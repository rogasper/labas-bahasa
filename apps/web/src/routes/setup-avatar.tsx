import { useState, useMemo, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  createFileRoute,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { cn } from "@labas/ui/lib/utils";
import {
  buildDiceBearLoreleiUrl,
  randomSeed,
  BACKGROUND_COLORS,
  SKIN_COLORS,
  HAIR_COLORS,
  type DiceBearLoreleiOptions,
} from "@/lib/avatar-url";
import { routeShell } from "@/lib/route-shell";

function generateRandomSeeds(count: number): string[] {
  return Array.from({ length: count }, () => randomSeed());
}

export const Route = createFileRoute("/setup-avatar")({
  staticData: routeShell.public,
  component: SetupAvatarComponent,
  validateSearch: (
    search: Record<string, unknown>,
  ): { redirectTo?: string } => ({
    redirectTo:
      typeof search.redirectTo === "string" ? search.redirectTo : undefined,
  }),
  beforeLoad: async ({ search }) => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }
    if (!search.redirectTo && session.data.user.image) {
      throw redirect({ to: "/dashboard" });
    }
    return { session };
  },
});

function SetupAvatarComponent() {
  const navigate = useNavigate();
  const { redirectTo } = Route.useSearch();
  const updateMutation = useMutation(trpc.profile.update.mutationOptions());

  const [seed, setSeed] = useState(() => randomSeed());
  const [backgroundColor, setBackgroundColor] = useState<string>(BACKGROUND_COLORS[0].value);
  const [skinColor, setSkinColor] = useState<string>(SKIN_COLORS[0].value);
  const [hairColor, setHairColor] = useState<string>(HAIR_COLORS[0].value);
  const [glasses, setGlasses] = useState(false);
  const [freckles, setFreckles] = useState(false);
  const [beard, setBeard] = useState(false);
  const [earrings, setEarrings] = useState(false);
  const [randomSeeds, setRandomSeeds] = useState(() => generateRandomSeeds(8));

  const options: DiceBearLoreleiOptions = useMemo(
    () => ({
      seed,
      backgroundColor,
      skinColor,
      hairColor,
      glasses,
      freckles,
      beard,
      earrings,
    }),
    [seed, backgroundColor, skinColor, hairColor, glasses, freckles, beard, earrings],
  );

  const avatarUrl = useMemo(() => buildDiceBearLoreleiUrl(options), [options]);

  const handleRegenerateSeed = useCallback(() => {
    setSeed(randomSeed());
  }, []);

  const handleRegenerateAll = useCallback(() => {
    setSeed(randomSeed());
    setRandomSeeds(generateRandomSeeds(8));
  }, []);

  const handleSave = useCallback(async () => {
    await updateMutation.mutateAsync({ image: avatarUrl });
    navigate({ to: redirectTo || "/dashboard" });
  }, [avatarUrl, updateMutation, navigate, redirectTo]);

  const quickPickUrls = useMemo(
    () => randomSeeds.map((s) => buildDiceBearLoreleiUrl({ ...options, seed: s })),
    [randomSeeds, options],
  );

  return (
    <div className="min-h-screen bg-[var(--warm-cream)] px-6 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-headline font-extrabold text-[var(--clay-black)] tracking-tight">
            Pilih Avatar
          </h1>
          <p className="text-[var(--warm-charcoal)] mt-1">
            Atur tampilan avatar DiceBear Lorelei kamu
          </p>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Preview + Customization */}
          <div className="lg:col-span-2 space-y-4">
            {/* Avatar Preview - Inline with colors */}
            <Card className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
              <CardContent className="p-6">
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center shrink-0">
                    <img
                      src={avatarUrl}
                      alt="Avatar preview"
                      className="h-32 w-32 rounded-full border-4 border-[var(--pure-white)] clay-shadow bg-white"
                    />
                    <button
                      onClick={handleRegenerateSeed}
                      className="mt-3 bg-[var(--clay-black)] text-[var(--pure-white)] text-xs px-4 py-1.5 rounded-full hover:bg-[var(--warm-charcoal)] transition-colors flex items-center gap-1.5"
                    >
                      <MaterialIcon name="shuffle" className="text-xs" />
                      Random
                    </button>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-[var(--clay-black)] mb-2">Background</p>
                      <div className="flex gap-2 flex-wrap">
                        {BACKGROUND_COLORS.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => setBackgroundColor(c.value)}
                            className={cn(
                              "h-8 w-8 rounded-full border-2 transition-all",
                              backgroundColor === c.value
                                ? "border-[var(--clay-black)] scale-110 ring-2 ring-[var(--clay-black)] ring-offset-1"
                                : "border-[var(--oat-border)] hover:border-[var(--warm-charcoal)]",
                            )}
                            style={{ backgroundColor: `#${c.value}` }}
                            title={c.label}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--clay-black)] mb-2">Kulit</p>
                      <div className="flex gap-2 flex-wrap">
                        {SKIN_COLORS.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => setSkinColor(c.value)}
                            className={cn(
                              "h-8 w-8 rounded-full border-2 transition-all",
                              skinColor === c.value
                                ? "border-[var(--clay-black)] scale-110 ring-2 ring-[var(--clay-black)] ring-offset-1"
                                : "border-[var(--oat-border)] hover:border-[var(--warm-charcoal)]",
                            )}
                            style={{ backgroundColor: `#${c.value}` }}
                            title={c.label}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--clay-black)] mb-2">Rambut</p>
                      <div className="flex gap-2 flex-wrap">
                        {HAIR_COLORS.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => setHairColor(c.value)}
                            className={cn(
                              "h-8 w-8 rounded-full border-2 transition-all",
                              hairColor === c.value
                                ? "border-[var(--clay-black)] scale-110 ring-2 ring-[var(--clay-black)] ring-offset-1"
                                : "border-[var(--oat-border)] hover:border-[var(--warm-charcoal)]",
                            )}
                            style={{ backgroundColor: `#${c.value}` }}
                            title={c.label}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Accessories + Quick Picks in one row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Accessories */}
              <Card className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
                <CardContent className="p-5">
                  <p className="text-sm font-semibold text-[var(--clay-black)] mb-3">Aksesori</p>
                  <div className="flex gap-2 flex-wrap">
                    {(
                      [
                        ["glasses", "Kacamata", glasses],
                        ["freckles", "Freckles", freckles],
                        ["beard", "Jenggot", beard],
                        ["earrings", "Anting", earrings],
                      ] as const
                    ).map(([key, label, active]) => {
                      const setter = {
                        glasses: setGlasses,
                        freckles: setFreckles,
                        beard: setBeard,
                        earrings: setEarrings,
                      }[key];
                      return (
                        <button
                          key={key}
                          onClick={() => setter(!active)}
                          className={cn(
                            "px-3 py-1.5 text-sm rounded-full border-2 transition-all font-medium",
                            active
                              ? "bg-[var(--clay-black)] text-[var(--pure-white)] border-[var(--clay-black)]"
                              : "bg-[var(--pure-white)] text-[var(--warm-charcoal)] border-[var(--oat-border)] hover:border-[var(--warm-charcoal)]",
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Picks */}
              <Card className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-[var(--clay-black)]">Pilihan Cepat</p>
                    <button
                      onClick={handleRegenerateAll}
                      className="text-xs text-[var(--matcha-600)] hover:underline font-semibold"
                    >
                      Regenerate
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {quickPickUrls.map((url, i) => (
                      <button
                        key={randomSeeds[i]}
                        onClick={() => setSeed(randomSeeds[i]!)}
                        className={cn(
                          "rounded-full border-2 transition-all overflow-hidden aspect-square",
                          seed === randomSeeds[i]
                            ? "border-[var(--clay-black)] scale-105 ring-2 ring-[var(--clay-black)] ring-offset-1"
                            : "border-[var(--oat-border)] hover:border-[var(--warm-charcoal)]",
                        )}
                      >
                        <img src={url} alt={`Pilihan ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column - Button (sticky) */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-8 lg:h-fit">
              <Card className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)] p-6">
                <div className="text-center mb-4">
                  <p className="text-sm font-semibold text-[var(--clay-black)]">Avatar Kamu</p>
                  <p className="text-xs text-[var(--warm-charcoal)] mt-1">Sudah siap?</p>
                </div>
                <Button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="w-full bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] rounded-[var(--radius-lg)] h-14 text-lg font-semibold shadow-lg"
                >
                  {updateMutation.isPending ? "Menyimpan..." : "✓ Selesai"}
                </Button>
                <p className="text-xs text-center text-[var(--warm-silver)] mt-3">
                  Bisa diganti nanti di profil
                </p>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
