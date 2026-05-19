import { Link } from "@tanstack/react-router";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent, CardHeader } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import type { GenerationResult } from "@labas/ai";

interface ResultSectionProps {
  result: GenerationResult;
  generatedPackageId: string | null;
  onClear?: () => void;
}

export function ResultSection({ result, generatedPackageId, onClear }: ResultSectionProps) {
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
                      <div
                        key={i}
                        className="flex items-center p-4 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--oat-light)]"
                      >
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
                  : q.options.map((opt: { key: string; text: string }) => (
                      <div
                        key={opt.key}
                        className="flex items-center p-4 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--oat-light)]"
                      >
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
