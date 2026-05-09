import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Button } from "@labas/ui/components/button";
import { Input } from "@labas/ui/components/input";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { formatTime } from "@/lib/time";
import { OptionDisplay } from "./OptionDisplay";

interface QuestionReviewCardProps {
  q: any;
  secIdx: number;
  qIdx: number;
  ans: any;
  userId?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function QuestionReviewCard({
  q,
  secIdx,
  qIdx,
  ans,
  userId,
  isExpanded,
  onToggleExpand,
}: QuestionReviewCardProps) {
  const isCorrect = ans?.isCorrect;
  const userAnswer = ans?.userAnswer ?? "Tidak dijawab";
  const isOwner = q.creatorUserId === userId;
  const hasOptions = Array.isArray(q.options) && q.options.length > 0;

  const [isEditing, setIsEditing] = useState(false);
  const [editPassage, setEditPassage] = useState(q.passageText ?? "");
  const [editCorrectAnswer, setEditCorrectAnswer] = useState(q.correctAnswer ?? "");
  const [editExplanation, setEditExplanation] = useState(q.explanation ?? "");

  const feedbackQuery = useQuery(
    trpc.feedback.getQuestionFeedback.queryOptions(
      { questionId: q.id },
      { enabled: !!q.id },
    ),
  );

  const voteMutation = useMutation({
    ...trpc.feedback.voteQuestion.mutationOptions(),
    onSuccess: () => feedbackQuery.refetch(),
  });

  const updateQuestionMutation = useMutation({
    ...trpc.question.update.mutationOptions(),
    onSuccess: () => {
      setIsEditing(false);
      window.location.reload();
    },
  });

  const handleSaveEdit = () => {
    updateQuestionMutation.mutate({
      id: q.id,
      passageText: editPassage,
      correctAnswer: editCorrectAnswer,
      explanation: editExplanation,
    });
  };

  return (
    <div
      className={`bg-[var(--pure-white)] border-2 rounded-[var(--radius-xl)] clay-shadow transition-all ${
        isCorrect === true
          ? "border-[var(--matcha-400)]"
          : isCorrect === false
            ? "border-[var(--pomegranate-400)]"
            : "border-[var(--oat-border)]"
      }`}
    >
      {/* Header — always visible, clickable to expand */}
      <button
        onClick={onToggleExpand}
        className="w-full text-left p-4 flex items-start gap-3 cursor-pointer"
      >
        <span
          className={`w-8 h-8 rounded-full text-xs flex items-center justify-center font-bold shrink-0 ${
            isCorrect === true
              ? "bg-[var(--matcha-600)] text-[var(--pure-white)]"
              : isCorrect === false
                ? "bg-[var(--pomegranate-400)] text-[var(--pure-white)]"
                : "bg-[var(--oat-light)] text-[var(--warm-charcoal)]"
          }`}
        >
          {secIdx + 1}.{qIdx + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--clay-black)] truncate">
            {q.questionText}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--oat-light)] text-[var(--warm-charcoal)]">
              {q.format.replace(/_/g, " ")}
            </span>
            {ans?.timeSpentSec != null && (
              <span className="text-[10px] text-[var(--warm-silver)] flex items-center gap-0.5">
                <MaterialIcon name="timer" className="text-[10px]" />
                {formatTime(ans.timeSpentSec)}
              </span>
            )}
          </div>
        </div>
        <span className="shrink-0 flex items-center gap-1.5 text-xs text-[var(--warm-silver)]">
          {isCorrect === true && (
            <MaterialIcon name="check_circle" className="text-sm text-[var(--matcha-600)]" />
          )}
          {isCorrect === false && (
            <MaterialIcon name="cancel" className="text-sm text-[var(--pomegranate-400)]" />
          )}
          <MaterialIcon
            name={isExpanded ? "expand_less" : "expand_more"}
            className="text-sm"
          />
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 pl-11 space-y-3">
          {/* Passage Text */}
          {q.passageText && (
            <div className="bg-[var(--oat-light)] rounded-[var(--radius-lg)] p-3 text-sm text-[var(--warm-charcoal)] whitespace-pre-wrap leading-relaxed">
              <span className="font-semibold text-[var(--clay-black)] block mb-1">Teks Bacaan:</span>
              {q.passageText}
            </div>
          )}

          {/* Interactive Option Display */}
          {hasOptions && (
            <OptionDisplay
              format={q.format}
              options={q.options}
              correctAnswer={q.correctAnswer}
              userAnswer={userAnswer}
            />
          )}

          {/* Owner Inline Edit Form */}
          {isEditing && isOwner && (
            <div className="space-y-3 bg-[var(--badge-blue-bg)] rounded-[var(--radius-lg)] p-4 border-2 border-[var(--badge-blue-bg)]">
              <p className="text-sm font-semibold text-[var(--badge-blue-text)] flex items-center gap-2">
                <MaterialIcon name="edit_note" className="text-sm" />
                Koreksi Soal
              </p>
              <div>
                <label className="text-xs font-medium text-[var(--warm-charcoal)] mb-1 block">Teks Bacaan</label>
                <textarea
                  value={editPassage}
                  onChange={(e) => setEditPassage(e.target.value)}
                  className="w-full min-h-[80px] p-2 rounded-[var(--radius-md)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] text-sm text-[var(--clay-black)] resize-y"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--warm-charcoal)] mb-1 block">Jawaban Benar</label>
                <Input
                  value={editCorrectAnswer}
                  onChange={(e) => setEditCorrectAnswer(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--warm-charcoal)] mb-1 block">Penjelasan</label>
                <textarea
                  value={editExplanation}
                  onChange={(e) => setEditExplanation(e.target.value)}
                  className="w-full min-h-[60px] p-2 rounded-[var(--radius-md)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] text-sm text-[var(--clay-black)] resize-y"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveEdit}
                  disabled={updateQuestionMutation.isPending}
                  className="h-9 text-sm bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] rounded-[var(--radius-lg)]"
                >
                  <MaterialIcon name="save" className="text-sm mr-1" />
                  Simpan
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="h-9 text-sm rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)]"
                >
                  Batal
                </Button>
              </div>
            </div>
          )}

          {/* Answer Comparison */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-[var(--warm-silver)]">Jawaban Anda:</span>{" "}
              <span
                className={`font-semibold ${
                  isCorrect === true
                    ? "text-[var(--matcha-700)]"
                    : isCorrect === false
                      ? "text-[var(--pomegranate-600)]"
                      : "text-[var(--warm-charcoal)]"
                }`}
              >
                {userAnswer}
              </span>
            </div>
            {ans?.partialScore != null && ans?.partialScore < 100 && (
              <div>
                <span className="text-[var(--warm-silver)]">Skor Parsial:</span>{" "}
                <span className="font-semibold text-[var(--lemon-700)]">
                  {ans.partialScore}%
                </span>
              </div>
            )}
            {(isCorrect === false || isCorrect === null) && (
              <div>
                <span className="text-[var(--warm-silver)]">Jawaban Benar:</span>{" "}
                <span className="font-semibold text-[var(--matcha-700)]">
                  {q.correctAnswer}
                </span>
              </div>
            )}
            {ans?.timeSpentSec != null && (
              <div className="flex items-center gap-1 text-[var(--warm-silver)]">
                <MaterialIcon name="timer" className="text-xs" />
                <span>{formatTime(ans.timeSpentSec)}</span>
              </div>
            )}
          </div>

          {/* Explanation */}
          {q.explanation && !isEditing && (
            <div className="bg-[var(--oat-light)] rounded-[var(--radius-lg)] p-3 text-sm text-[var(--warm-charcoal)]">
              <span className="font-semibold text-[var(--clay-black)]">Penjelasan:</span>{" "}
              {q.explanation}
            </div>
          )}

          {/* Thumbs Feedback */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => voteMutation.mutate({ questionId: q.id, type: "up" })}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                feedbackQuery.data?.myFeedback === "up"
                  ? "bg-[var(--matcha-300)] text-[var(--matcha-800)]"
                  : "bg-[var(--oat-light)] text-[var(--warm-charcoal)] hover:bg-[var(--matcha-300)] hover:text-[var(--matcha-800)]"
              }`}
            >
              <MaterialIcon name="thumb_up" className="text-sm" />
              <span>{feedbackQuery.data?.up ?? 0}</span>
            </button>
            <button
              onClick={() => voteMutation.mutate({ questionId: q.id, type: "down" })}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                feedbackQuery.data?.myFeedback === "down"
                  ? "bg-[var(--pomegranate-100)] text-[var(--pomegranate-600)]"
                  : "bg-[var(--oat-light)] text-[var(--warm-charcoal)] hover:bg-[var(--pomegranate-100)] hover:text-[var(--pomegranate-600)]"
              }`}
            >
              <MaterialIcon name="thumb_down" className="text-sm" />
              <span>{feedbackQuery.data?.down ?? 0}</span>
            </button>
            {isOwner && (
              <button
                onClick={() => setIsEditing(true)}
                className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--oat-light)] text-[var(--warm-charcoal)] hover:bg-[var(--badge-blue-bg)] hover:text-[var(--badge-blue-text)] transition-all"
              >
                <MaterialIcon name="edit" className="text-sm" />
                Koreksi
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
