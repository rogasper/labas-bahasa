import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent } from "@labas/ui/components/card";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { formatLabel } from "@/lib/format";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

export function QuestionDetailModal({
  question,
  onClose,
  isSelected,
  onToggleSelect,
  isSelectable,
}: {
  question: any;
  onClose: () => void;
  isSelected: boolean;
  onToggleSelect: () => void;
  isSelectable: boolean;
}) {
  const { data: session } = authClient.useSession();
  const isOwner = question.creatorUserId === session?.user.id;

  const ratingQuery = useQuery(
    trpc.rating.getQuestionRating.queryOptions({ questionId: question.id }),
  );

  const rateMutation = useMutation({
    ...trpc.rating.rateQuestion.mutationOptions(),
    onSuccess: () => ratingQuery.refetch(),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[var(--warm-cream)] w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[var(--radius-xl)] border-2 border-[var(--oat-border)] clay-shadow p-6 md:p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex gap-2 flex-wrap">
            <span className="px-3 py-1.5 rounded-full bg-[var(--matcha-300)] text-[var(--matcha-800)] text-sm font-semibold">
              {question.examTypeName}
            </span>
            <span className="px-3 py-1.5 rounded-full bg-[var(--slushie-500)]/20 text-[var(--slushie-800)] text-sm font-semibold">
              {question.sectionTypeName}
            </span>
            <span className="px-3 py-1.5 rounded-full bg-[var(--lemon-400)]/30 text-[var(--lemon-800)] text-sm font-semibold">
              {formatLabel(question.format)}
            </span>
            <span className="px-3 py-1.5 rounded-full bg-[var(--oat-light)] text-[var(--warm-charcoal)] text-sm font-semibold">
              Level {question.difficulty}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[var(--oat-light)] hover:bg-[var(--oat-border)] flex items-center justify-center transition-colors"
          >
            <MaterialIcon name="close" className="text-[var(--clay-black)]" />
          </button>
        </div>

        {/* Passage */}
        <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)] mb-6">
          <CardContent className="p-6">
            <h2 className="font-headline text-lg font-bold text-[var(--clay-black)] mb-4 flex items-center gap-2">
              <MaterialIcon name="menu_book" />
              Teks Bacaan
            </h2>
            <div className="text-[var(--clay-black)] leading-relaxed whitespace-pre-wrap text-sm">
              {question.passageText}
            </div>
          </CardContent>
        </Card>

        {/* Question */}
        <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)] mb-6">
          <CardContent className="p-6">
            <h2 className="font-headline text-lg font-bold text-[var(--clay-black)] mb-4 flex items-center gap-2">
              <MaterialIcon name="help_outline" />
              Pertanyaan
            </h2>
            <p className="text-lg text-[var(--clay-black)] font-medium mb-4">
              {question.questionText}
            </p>

            {!!question.options &&
              Array.isArray(question.options as unknown[]) &&
              (question.options as unknown[]).length > 0 && (
                <div className="space-y-2 mt-4">
                  {(question.options as Array<{ key: string; text: string }>).map(
                    (opt) => (
                      <div
                        key={opt.key}
                        className="flex items-center p-4 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--oat-light)]"
                      >
                        <span className="w-6 h-6 rounded-full border-2 border-[var(--oat-border)] flex items-center justify-center mr-3 text-xs font-bold text-[var(--warm-charcoal)]">
                          {opt.key}
                        </span>
                        <span className="text-[var(--clay-black)]">{opt.text}</span>
                      </div>
                    ),
                  )}
                </div>
              )}

            {!question.options && (
              <div className="p-4 rounded-[var(--radius-md)] border-2 border-[var(--oat-border)] bg-[var(--oat-light)] mt-4 text-sm text-[var(--warm-charcoal)]">
                <span className="font-semibold text-[var(--clay-black)]">
                  Jenis soal:{" "}
                </span>
                {formatLabel(question.format)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lock card */}
        <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)] mb-6">
          <CardContent className="p-6">
            <h2 className="font-headline text-lg font-bold text-[var(--clay-black)] mb-2 flex items-center gap-2">
              <MaterialIcon name="lock" />
              Jawaban & Penjelasan
            </h2>
            <p className="text-sm text-[var(--warm-charcoal)]">
              Jawaban dan penjelasan akan tersedia setelah kamu mencoba mengerjakan
              soal ini dalam paket latihan.
            </p>
          </CardContent>
        </Card>

        {/* Rating */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => rateMutation.mutate({ questionId: question.id, score: star })}
                className="transition-transform hover:scale-110"
              >
                <MaterialIcon
                  name={(ratingQuery.data?.myRating ?? 0) >= star ? "star" : "star_outline"}
                  className={`text-xl ${(ratingQuery.data?.myRating ?? 0) >= star ? "text-[var(--lemon-500)]" : "text-[var(--oat-border)]"}`}
                />
              </button>
            ))}
          </div>
          {ratingQuery.data?.avgRating && (
            <span className="text-sm text-[var(--warm-charcoal)]">
              {ratingQuery.data.avgRating}/5 ({question.usageCount}x digunakan)
            </span>
          )}
          {!ratingQuery.data?.avgRating && (
            <span className="text-sm text-[var(--warm-charcoal)]">
              {question.usageCount}x digunakan
            </span>
          )}
        </div>

        {/* Meta & Owner Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-[var(--warm-charcoal)] border-t border-[var(--oat-border)] pt-4">
          <div className="flex gap-4">
            <span>Dibuat oleh {question.creatorName ?? "Anonim"}</span>
            <span>•</span>
            <span className="capitalize">{question.source}</span>
          </div>
          {isOwner && (
            <div className="flex gap-2 items-center">
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                  question.isPublic
                    ? "bg-[var(--matcha-300)] text-[var(--matcha-800)]"
                    : "bg-[var(--oat-light)] text-[var(--warm-charcoal)]"
                }`}
              >
                {question.isPublic ? "Publik" : "Privat"}
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={onToggleSelect}
            disabled={!isSelectable}
            className={`rounded-[var(--radius-lg)] border-2 clay-hover ${
              !isSelectable
                ? "opacity-40 cursor-not-allowed border-[var(--oat-border)] text-[var(--warm-silver)]"
                : isSelected
                  ? "border-[var(--pomegranate-400)] text-[var(--pomegranate-600)] bg-[var(--pomegranate-50)]"
                  : "border-[var(--oat-border)] text-[var(--warm-charcoal)]"
            }`}
          >
            <MaterialIcon name={isSelected ? "remove" : "add"} className="mr-2" />
            {!isSelectable
              ? "Jenis ujian berbeda"
              : isSelected
                ? "Hapus dari Pilihan"
                : "Tambah ke Paket"}
          </Button>
          <Button
            onClick={onClose}
            className="bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] clay-hover rounded-[var(--radius-lg)]"
          >
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}
