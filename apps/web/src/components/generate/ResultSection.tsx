import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent, CardHeader } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { trpc } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { GenerationResult } from "@labas/ai";

interface ResultSectionProps {
  result: GenerationResult;
  generatedPackageId: string | null;
  onClear?: () => void;
}

export function ResultSection({ result, generatedPackageId, onClear }: ResultSectionProps) {
  const [state, setState] = useState<"idle" | "done">("idle");

  const generateAudioMutation = useMutation({
    ...trpc.audio.generateForPackage.mutationOptions(),
    onSuccess: (data) => {
      if (data.alreadyRunning) {
        toast.info("Audio sedang diproses, tunggu hingga selesai");
      } else if (data.generationJobId) {
        setState("done");
        toast.success(`${data.generated} audio sedang digenerate`);
      }
    },
    onError: (err) => {
      toast.error(err?.message ?? "Gagal membuat audio");
    },
  });

  const hasListeningQuestions = result.questions.some(
    (q) => q.format === "listening_multiple_choice",
  );

  const handleGenerateAudio = () => {
    if (!generatedPackageId) return;
    generateAudioMutation.mutate({ packageId: generatedPackageId });
  };

  return (
    <div className="mt-16 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-headline font-bold text-[var(--clay-black)]">Hasil Generate</h3>
          <p className="text-sm text-[var(--warm-charcoal)] mt-1">
            Paket latihan berhasil dibuat! Soal juga tersimpan di Bank Soal (privat). Jawaban & penjelasan disembunyikan agar latihan tetap fair.
          </p>
        </div>
        <div className="flex gap-3">
          {hasListeningQuestions && state === "idle" && (
            <Button
              onClick={handleGenerateAudio}
              disabled={generateAudioMutation.isPending || generateAudioMutation.isSuccess}
              className="bg-[var(--slushie-500)] text-[var(--pure-white)] hover:bg-[var(--slushie-600)] clay-hover rounded-[var(--radius-lg)]"
            >
              <MaterialIcon
                name={generateAudioMutation.isPending ? "sync" : "headphones"}
                className={`mr-2 ${generateAudioMutation.isPending ? "animate-spin" : ""}`}
              />
              {generateAudioMutation.isPending ? "Menyiapkan audio..." : "Generate Audio"}
            </Button>
          )}
          {state === "done" && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] bg-[var(--matcha-300)]/30">
                <MaterialIcon name="check_circle" className="text-[var(--matcha-600)]" />
                <span className="text-sm text-[var(--matcha-800)]">Audio siap!</span>
              </div>
              {generatedPackageId && (
                <Link to="/package/$id" params={{ id: generatedPackageId }} onClick={() => onClear?.()}>
                  <Button className="bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] clay-hover rounded-[var(--radius-lg)]">
                    <MaterialIcon name="play_arrow" className="mr-2" />
                    Lihat Paket
                  </Button>
                </Link>
              )}
            </div>
          )}
          {generatedPackageId && (
            <Link to="/package/$id" params={{ id: generatedPackageId }} onClick={() => onClear?.()}>
              <Button className="bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] clay-hover rounded-[var(--radius-lg)]">
                <MaterialIcon name="play_arrow" className="mr-2" />
                Lihat Paket
              </Button>
            </Link>
          )}
          <Link to="/bank" onClick={() => onClear?.()}>
            <Button className="bg-[var(--matcha-600)] text-[var(--pure-white)] hover:bg-[var(--matcha-800)] clay-hover rounded-[var(--radius-lg)]">
              <MaterialIcon name="database" className="mr-2" />
              Bank Soal
            </Button>
          </Link>
        </div>
      </div>

      <div className="text-sm text-[var(--warm-charcoal)] mb-4 font-mono">
        Model: {result.meta.model} · Tokens: {result.meta.tokensUsed ?? "?"} · Waktu: {result.meta.durationMs}ms · {result.questions.length} soal
      </div>

      {result.questions.map((q, idx) => (
        <Card key={idx} className="clay-shadow clay-hover bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="bg-[var(--matcha-600)] text-[var(--pure-white)] w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] font-bold text-sm">
                {idx + 1}
              </span>
              <span className="text-sm font-bold text-[var(--matcha-600)] uppercase tracking-tighter">
                {q.format.replace(/_/g, " ")}
              </span>
              {q.format === "listening_multiple_choice" && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                  generateAudioMutation.isPending
                    ? "bg-[var(--matcha-300)] text-[var(--matcha-800)] animate-pulse"
                    : "bg-[var(--oat-light)] text-[var(--warm-silver)]"
                }`}>
                  <MaterialIcon name={generateAudioMutation.isPending ? "sync" : "headphones"} className="text-[10px]" />
                  {generateAudioMutation.isPending ? "Audio..." : "Listening"}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-5 rounded-[var(--radius-lg)] bg-[var(--oat-light)] text-[var(--clay-black)] leading-relaxed whitespace-pre-wrap text-base">
              {q.passageText}
            </div>
            <p className="font-medium text-[var(--clay-black)] text-lg">{q.questionText}</p>
            {"options" in q && q.options && (
              <div className="space-y-2">
                {q.format === "matching_pairs"
                  ? q.options.map((opt: { left: string; right?: string }, i: number) => (
                      <div key={i} className="flex items-center p-4 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--oat-light)]">
                        <span className="w-6 h-6 rounded-full border-2 border-[var(--oat-border)] flex items-center justify-center mr-3 text-xs font-bold text-[var(--warm-charcoal)]">
                          {opt.left?.charAt(0)?.toUpperCase() ?? i + 1}
                        </span>
                        <span className="text-[var(--clay-black)]">{opt.left}</span>
                        {opt.right && (
                          <>
                            <span className="mx-3 text-[var(--warm-silver)]">→</span>
                            <span className="text-[var(--matcha-700)] font-medium">{opt.right}</span>
                          </>
                        )}
                      </div>
                    ))
                  : q.options.map((opt: { key: string; text: string }, i: number) => (
                      <div key={i} className="flex items-center p-4 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--oat-light)]">
                        <span className="w-6 h-6 rounded-full border-2 border-[var(--oat-border)] flex items-center justify-center mr-3 text-xs font-bold text-[var(--warm-charcoal)]">
                          {opt.key}
                        </span>
                        <span className="text-[var(--clay-black)]">{opt.text}</span>
                      </div>
                    ))}
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              {q.skillTags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full bg-[var(--oat-light)] text-xs font-medium text-[var(--warm-charcoal)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
