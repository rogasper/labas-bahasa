import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent } from "@labas/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@labas/ui/components/dialog";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { formatLabel } from "@/lib/format";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import type { Question } from "@/lib/types";

interface Props {
  question: Question & { createdAt?: string | Date };
  onClose: () => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  isSelectable?: boolean;
  isAdmin?: boolean;
  isPublic?: boolean;
  onToggleVisibility?: () => void;
}

export function QuestionDetailModal({
  question,
  onClose,
  isSelected,
  onToggleSelect,
  isSelectable,
  isAdmin,
  isPublic,
  onToggleVisibility,
}: Props) {
  const { data: session } = authClient.useSession();
  const isOwner = question.creatorUserId === session?.user.id;

  const ratingQuery = useQuery(
    trpc.rating.getQuestionRating.queryOptions({ questionId: question.id }),
  );

  const rateMutation = useMutation({
    ...trpc.rating.rateQuestion.mutationOptions(),
    onSuccess: () => ratingQuery.refetch(),
  });

  const metaChips = (
    <div className="flex gap-2 flex-wrap">
      {question.examTypeName && (
        <span className="px-3 py-1.5 rounded-full bg-[var(--matcha-300)] text-[var(--matcha-800)] text-sm font-semibold">
          {question.examTypeName}
        </span>
      )}
      {question.sectionTypeName && (
        <span className="px-3 py-1.5 rounded-full bg-[var(--slushie-500)]/20 text-[var(--slushie-800)] text-sm font-semibold">
          {question.sectionTypeName}
        </span>
      )}
      <span className="px-3 py-1.5 rounded-full bg-[var(--lemon-400)]/30 text-[var(--lemon-800)] text-sm font-semibold">
        {formatLabel(question.format ?? "")}
      </span>
      {question.difficulty && (
        <span className="px-3 py-1.5 rounded-full bg-[var(--oat-light)] text-[var(--warm-charcoal)] text-sm font-semibold">
          Level {question.difficulty}
        </span>
      )}
      {isAdmin && (
        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
          isPublic ? "bg-[var(--matcha-300)] text-[var(--matcha-800)]" : "bg-[var(--oat-border)] text-[var(--warm-charcoal)]"
        }`}>
          {isPublic ? "Public" : "Private"}
        </span>
      )}
    </div>
  );

  function renderOptions(correctAnswer?: string | null) {
    const options = question.options;
    if (!options) return null;
    const arr = Array.isArray(options as unknown[]) ? (options as unknown[]) : null;
    if (!arr || arr.length === 0) return null;
    return (
      <div className="space-y-2 mt-4">
        {(arr as Array<{ key: string; text: string }>).map((opt) => {
          const isCorrect = correctAnswer && String(opt.key) === String(correctAnswer);
          return (
            <div
              key={opt.key}
              className={`flex items-center p-4 rounded-[var(--radius-lg)] border-2 ${
                isCorrect
                  ? "border-[var(--matcha-500)] bg-[var(--matcha-300)]/10"
                  : "border-[var(--oat-border)] bg-[var(--oat-light)]"
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 text-xs font-bold shrink-0 ${
                  isCorrect
                    ? "border-[var(--matcha-500)] bg-[var(--matcha-500)] text-white"
                    : "border-[var(--oat-border)] text-[var(--warm-charcoal)]"
                }`}
              >
                {isCorrect ? (
                  <MaterialIcon name="check" className="text-xs" />
                ) : (
                  opt.key
                )}
              </span>
              <span className="text-[var(--clay-black)]">{opt.text}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            {metaChips}
          </div>
        </DialogHeader>

        {/* Two-column layout: passage+question | answer+metadata */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left column — Passage + Question */}
          <div className="flex-1 min-w-0">
            {question.passageText && (
              <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)] mb-6">
                <CardContent className="p-6">
                  <h2 className="font-headline text-lg font-bold text-[var(--clay-black)] mb-4 flex items-center gap-2">
                    <MaterialIcon name="menu_book" />
                    {isAdmin ? "Passage" : "Teks Bacaan"}
                  </h2>
                  <div className="text-[var(--clay-black)] leading-relaxed whitespace-pre-wrap text-sm">
                    {question.passageText}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
              <CardContent className="p-6">
                <h2 className="font-headline text-lg font-bold text-[var(--clay-black)] mb-4 flex items-center gap-2">
                  <MaterialIcon name="help_outline" />
                  {isAdmin ? "Question" : "Pertanyaan"}
                </h2>
                <p className="text-lg text-[var(--clay-black)] font-medium mb-4">
                  {question.questionText}
                </p>
                {renderOptions(isAdmin ? question.correctAnswer : undefined)}
                {!question.options && (
                  <div className="p-4 rounded-[var(--radius-md)] border-2 border-[var(--oat-border)] bg-[var(--oat-light)] mt-4 text-sm text-[var(--warm-charcoal)]">
                    <span className="font-semibold text-[var(--clay-black)]">
                      Jenis soal:{" "}
                    </span>
                    {formatLabel(question.format ?? "")}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column — Answer + Metadata */}
          <div className="w-full md:w-80 lg:w-96 shrink-0 flex flex-col gap-6">
            {/* Answer & Explanation */}
            {isAdmin ? (
              <Card className="bg-[var(--pure-white)] rounded-[var(--radius-xl)] border-2 border-[var(--matcha-500)]/40">
                <CardContent className="p-5">
                  <h3 className="font-headline font-bold text-[var(--clay-black)] mb-3 flex items-center gap-2 text-sm">
                    <MaterialIcon name="check_circle" className="text-base text-[var(--matcha-600)]" />
                    Correct Answer
                  </h3>
                  <p className="text-lg font-bold text-[var(--matcha-700)] mb-3">
                    {question.correctAnswer ?? "-"}
                  </p>
                  {question.explanation && (
                    <div className="pt-3 border-t border-[var(--oat-border)]">
                      <p className="text-xs font-medium text-[var(--warm-charcoal)] mb-1">Explanation</p>
                      <p className="text-sm text-[var(--clay-black)] leading-relaxed">
                        {question.explanation}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
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
            )}

            {/* Metadata */}
            <Card className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
              <CardContent className="p-5">
                <h3 className="font-headline font-bold text-[var(--clay-black)] mb-3 text-sm">
                  {isAdmin ? "Details" : "Info"}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--warm-charcoal)]">Source</span>
                    <span className="text-[var(--clay-black)] font-medium capitalize">{question.source ?? "-"}</span>
                  </div>
                  {isAdmin && question.aiModel && (
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--warm-charcoal)]">AI Model</span>
                      <span className="text-[var(--clay-black)] font-medium text-xs">{question.aiModel}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--warm-charcoal)]">Creator</span>
                    <span className="text-[var(--clay-black)] font-medium">{question.creatorName ?? question.creatorUserId?.slice(0, 12) ?? "-"}</span>
                  </div>
                  {question.skillTags && question.skillTags.length > 0 && (
                    <div className="pt-2 border-t border-[var(--oat-border)]">
                      <div className="flex flex-wrap gap-1 mt-1">
                        {question.skillTags.map((tag) => (
                          <span key={tag} className="px-2 py-0.5 rounded-full bg-[var(--oat-light)] text-xs text-[var(--warm-charcoal)]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Admin visibility toggle */}
            {isAdmin && onToggleVisibility && (
              <Button
                size="sm"
                className="w-full rounded-[var(--radius-lg)]"
                variant={isPublic ? "outline" : "default"}
                onClick={onToggleVisibility}
              >
                {isPublic ? "Make Private" : "Make Public"}
              </Button>
            )}
          </div>
        </div>

        {/* Rating — full width, user mode only */}
        {!isAdmin && (
          <div className="flex items-center gap-4 mt-6">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => rateMutation.mutate({ questionId: question.id, score: star })}
                  aria-label={`Nilai ${star} bintang`}
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
        )}

        {/* Footer Actions */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[var(--oat-border)]">
          {isAdmin ? (
            <div />
          ) : (
            <Button
              variant="outline"
              onClick={onToggleSelect}
              disabled={!isSelectable}
              className={`rounded-[var(--radius-lg)] border-2 clay-hover ${!isSelectable
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
          )}
          <Button
            onClick={onClose}
            className={`rounded-[var(--radius-lg)] ${isAdmin ? "bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)]" : "bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)]"} clay-hover`}
          >
            {isAdmin ? "Close" : "Tutup"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
