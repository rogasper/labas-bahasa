import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { Input } from "@labas/ui/components/input";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent } from "@labas/ui/components/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@labas/ui/components/select";

export const Route = createFileRoute("/bank")({
  component: BankComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({ to: "/login", throw: true });
    }
    return { session };
  },
});

const EXAM_TYPES = [
  { id: "IELTS", name: "IELTS" },
  { id: "TOEFL", name: "TOEFL" },
  { id: "JLPT", name: "JLPT" },
  { id: "HSK", name: "HSK" },
  { id: "GOETHE", name: "German" },
];

const SECTIONS = [
  { id: "READING", name: "Reading" },
  { id: "WRITING", name: "Writing" },
];

const FORMATS = [
  "multiple_choice",
  "true_false_not_given",
  "fill_blank",
  "synonym",
  "grammar_in_context",
  "sentence_completion",
  "cloze",
  "reference",
  "author_view",
  "matching_headings",
  "kanji_reading",
  "particle_choice",
  "article_case",
];

const DIFFICULTIES = [
  { value: 1, label: "Beginner" },
  { value: 2, label: "Elementary" },
  { value: 3, label: "Intermediate" },
  { value: 4, label: "Advanced" },
  { value: 5, label: "Expert" },
];

function MaterialIcon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

function formatLabel(fmt: string) {
  return fmt.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function StarRating({ value }: { value: number | null }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <MaterialIcon
          key={star}
          name={(value ?? 0) >= star ? "star" : "star_outline"}
          className={`text-xl ${(value ?? 0) >= star ? "text-[var(--lemon-500)]" : "text-[var(--oat-border)]"}`}
        />
      ))}
    </div>
  );
}

// ── Create Package Modal ────────────────────────────────────

function CreatePackageModal({
  selectedCount,
  onClose,
  onCreate,
  isPending,
  examTypeName,
  lowCount,
}: {
  selectedCount: number;
  onClose: () => void;
  onCreate: (data: { title: string; description: string; isPublic: boolean; examTypeId: string }) => void;
  isPending: boolean;
  examTypeName: string;
  lowCount: boolean;
}) {
  const dateStr = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  const [title, setTitle] = useState(`${examTypeName} Bundle — ${selectedCount} Soal`);
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[var(--warm-cream)] w-full max-w-lg rounded-[var(--radius-xl)] border-2 border-[var(--oat-border)] clay-shadow p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-headline font-bold text-[var(--clay-black)]">
            Buat Paket Soal
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[var(--oat-light)] hover:bg-[var(--oat-border)] flex items-center justify-center transition-colors"
          >
            <MaterialIcon name="close" className="text-[var(--clay-black)]" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="px-3 py-1 rounded-full bg-[var(--matcha-300)] text-[var(--matcha-800)] text-sm font-semibold">
            {examTypeName}
          </span>
          <span className="text-sm text-[var(--warm-charcoal)]">
            {selectedCount} soal
          </span>
        </div>

        {lowCount && (
          <div className="mb-4 p-3 rounded-[var(--radius-md)] bg-[var(--lemon-400)]/20 border-2 border-[var(--lemon-500)]/30 text-sm text-[var(--lemon-800)] flex items-start gap-2">
            <MaterialIcon name="info" className="text-sm mt-0.5 shrink-0" />
            <span>
              Soal yang tersedia sedikit ({selectedCount} soal). Paket tetap bisa dibuat, tapi disarankan untuk menambah soal.
            </span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[var(--clay-black)] block mb-1">
              Judul Paket
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. IELTS Reading Bundle"
              className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--clay-black)] block mb-1">
              Deskripsi
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi singkat..."
              className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)]"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--oat-border)]"
            />
            <span className="text-sm text-[var(--warm-charcoal)]">
              Publikasikan ke Bank Soal
            </span>
          </label>
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] clay-hover"
          >
            Batal
          </Button>
          <Button
            onClick={() => onCreate({ title, description, isPublic, examTypeId: "" })}
            disabled={!title || isPending}
            className="flex-1 bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] clay-hover rounded-[var(--radius-lg)]"
          >
            {isPending ? "Membuat..." : "Buat Paket"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Auto Bundle Modal ───────────────────────────────────────

function AutoBundleModal({
  availableCount,
  examTypeId,
  examTypeName,
  sectionTypeId,
  sectionTypeName,
  onClose,
  onCreate,
  isPending,
}: {
  availableCount: number;
  examTypeId: string;
  examTypeName: string;
  sectionTypeId: string;
  sectionTypeName: string;
  onClose: () => void;
  onCreate: (data: {
    title: string;
    description: string;
    isPublic: boolean;
    examTypeId: string;
    sectionTypeId: string;
    count: number;
    sortOrder: "random" | "difficulty";
  }) => void;
  isPending: boolean;
}) {
  const dateStr = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  const [count, setCount] = useState(Math.min(availableCount, 10));
  const [title, setTitle] = useState(`${examTypeName} ${sectionTypeName} Bundle — ${dateStr}`);
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [sortOrder, setSortOrder] = useState<"random" | "difficulty">("random");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[var(--warm-cream)] w-full max-w-lg rounded-[var(--radius-xl)] border-2 border-[var(--oat-border)] clay-shadow p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-headline font-bold text-[var(--clay-black)]">
            Auto Bundle
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[var(--oat-light)] hover:bg-[var(--oat-border)] flex items-center justify-center transition-colors"
          >
            <MaterialIcon name="close" className="text-[var(--clay-black)]" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="px-3 py-1 rounded-full bg-[var(--matcha-300)] text-[var(--matcha-800)] text-sm font-semibold">
            {examTypeName}
          </span>
          {sectionTypeName && (
            <span className="px-3 py-1 rounded-full bg-[var(--slushie-500)]/20 text-[var(--slushie-800)] text-sm font-semibold">
              {sectionTypeName}
            </span>
          )}
          <span className="text-sm text-[var(--warm-charcoal)]">
            {availableCount} soal tersedia
          </span>
        </div>

        {availableCount < 5 && (
          <div className="mb-4 p-3 rounded-[var(--radius-md)] bg-[var(--lemon-400)]/20 border-2 border-[var(--lemon-500)]/30 text-sm text-[var(--lemon-800)] flex items-start gap-2">
            <MaterialIcon name="info" className="text-sm mt-0.5 shrink-0" />
            <span>
              Soal yang tersedia sedikit ({availableCount} soal). Paket tetap bisa dibuat, tapi disarankan untuk menambah soal.
            </span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[var(--clay-black)] block mb-1">
              Judul Paket
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. IELTS Reading Bundle"
              className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--clay-black)] block mb-1">
              Deskripsi
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi singkat..."
              className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--clay-black)] block mb-1">
              Jumlah Soal: {count}
            </label>
            <input
              type="range"
              min={1}
              max={availableCount}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full h-2 bg-[var(--warm-silver)] rounded-full appearance-none cursor-pointer accent-[var(--clay-black)]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--clay-black)] block mb-1">
              Urutan Soal
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setSortOrder("random")}
                className={`flex-1 py-2 px-3 rounded-[var(--radius-md)] text-sm font-semibold transition-all ${
                  sortOrder === "random"
                    ? "bg-[var(--clay-black)] text-[var(--pure-white)] clay-shadow"
                    : "bg-[var(--pure-white)] text-[var(--warm-charcoal)] border-2 border-[var(--oat-border)] hover:bg-[var(--oat-light)]"
                }`}
              >
                <MaterialIcon name="shuffle" className="text-sm mr-1" />
                Acak
              </button>
              <button
                onClick={() => setSortOrder("difficulty")}
                className={`flex-1 py-2 px-3 rounded-[var(--radius-md)] text-sm font-semibold transition-all ${
                  sortOrder === "difficulty"
                    ? "bg-[var(--clay-black)] text-[var(--pure-white)] clay-shadow"
                    : "bg-[var(--pure-white)] text-[var(--warm-charcoal)] border-2 border-[var(--oat-border)] hover:bg-[var(--oat-light)]"
                }`}
              >
                <MaterialIcon name="trending_up" className="text-sm mr-1" />
                Difficulty
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--oat-border)]"
            />
            <span className="text-sm text-[var(--warm-charcoal)]">
              Publikasikan ke Bank Soal
            </span>
          </label>
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] clay-hover"
          >
            Batal
          </Button>
          <Button
            onClick={() => onCreate({
              title,
              description,
              isPublic,
              examTypeId,
              sectionTypeId: sectionTypeId || "READING",
              count,
              sortOrder,
            })}
            disabled={!title || isPending || count < 1}
            className="flex-1 bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] clay-hover rounded-[var(--radius-lg)]"
          >
            {isPending ? "Membuat..." : "Buat Paket"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Question Detail Modal ───────────────────────────────────

function QuestionDetailModal({
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

// ── Bank Component ──────────────────────────────────────────

type Tab = "mine" | "public";

function BankComponent() {
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("mine");
  const [search, setSearch] = useState("");
  const [examType, setExamType] = useState<string>("");
  const [section, setSection] = useState<string>("");
  const [format, setFormat] = useState<string>("");
  const [difficulty, setDifficulty] = useState<number | undefined>();
  const [page, setPage] = useState(0);
  const [selectedQuestion, setSelectedQuestion] = useState<any | null>(null);

  // Multi-select state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAutoBundleOpen, setIsAutoBundleOpen] = useState(false);

  const limit = 12;

  const query = useQuery(
    trpc.question.list.queryOptions({
      search: search || undefined,
      examTypeId: examType || undefined,
      sectionTypeId: section || undefined,
      format: format || undefined,
      difficulty,
      ...(tab === "mine" && userId
        ? { creatorUserId: userId }
        : { isPublic: true }),
      limit,
      offset: page * limit,
    }),
  );

  const questions = query.data?.questions ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const togglePublic = useMutation({
    ...trpc.question.togglePublic.mutationOptions(),
    onSuccess: () => query.refetch(),
  });

  const deleteQuestion = useMutation({
    ...trpc.question.delete.mutationOptions(),
    onSuccess: () => query.refetch(),
  });

  const createPackage = useMutation(trpc.package.create.mutationOptions());
  const addSection = useMutation(trpc.package.addSection.mutationOptions());
  const addQuestion = useMutation(trpc.package.addQuestion.mutationOptions());

  const clearFilters = () => {
    setSearch("");
    setExamType("");
    setSection("");
    setFormat("");
    setDifficulty(undefined);
    setPage(0);
  };

  const hasFilters = search || examType || section || format || difficulty !== undefined;

  // Strict exam type guard: derive the locked exam type from first selection
  const lockedExamType = useMemo(() => {
    if (selectedIds.size === 0) return null;
    const firstId = Array.from(selectedIds)[0];
    const firstQ = questions.find((q) => q.id === firstId);
    return firstQ?.examTypeId ?? null;
  }, [selectedIds, questions]);

  const toggleSelection = (id: string) => {
    const q = questions.find((item) => item.id === id);
    if (!q) return;

    // Strict guard: cannot select different exam type
    if (lockedExamType && q.examTypeId !== lockedExamType) return;

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    // Only select questions that match the locked exam type
    if (lockedExamType) {
      setSelectedIds(new Set(questions.filter((q) => q.examTypeId === lockedExamType).map((q) => q.id)));
    } else {
      setSelectedIds(new Set(questions.map((q) => q.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleCreatePackage = async (data: {
    title: string;
    description: string;
    isPublic: boolean;
    examTypeId: string;
  }) => {
    if (selectedIds.size === 0) return;

    // Derive examTypeId from first selected question
    const firstId = Array.from(selectedIds)[0];
    const firstQ = questions.find((q) => q.id === firstId);
    const examTypeId = firstQ?.examTypeId ?? data.examTypeId;

    try {
      const pkg = await createPackage.mutateAsync({
        title: data.title,
        description: data.description,
        examTypeId,
        isPublic: data.isPublic,
        estimatedDurationMin: selectedIds.size * 2,
      });

      const sec = await addSection.mutateAsync({
        packageId: pkg.id,
        sectionTypeId: firstQ?.sectionTypeId ?? "READING",
        title: `${firstQ?.sectionTypeName ?? "Reading"} Section`,
        orderIndex: 0,
      });

      const ids = Array.from(selectedIds);
      for (let i = 0; i < ids.length; i++) {
        await addQuestion.mutateAsync({
          sectionId: sec.id,
          questionId: ids[i],
          orderIndex: i,
        });
      }

      setIsCreateModalOpen(false);
      setIsSelectMode(false);
      setSelectedIds(new Set());
      navigate({ to: "/package/$id", params: { id: pkg.id } });
    } catch (err: any) {
      alert("Gagal membuat paket: " + err.message);
    }
  };

  const handleAutoBundle = async (data: {
    title: string;
    description: string;
    isPublic: boolean;
    examTypeId: string;
    sectionTypeId: string;
    count: number;
    sortOrder: "random" | "difficulty";
  }) => {
    // Fetch all questions for this exam type (not just current page)
    const allQuestions = await query.refetch();
    const available = (allQuestions.data?.questions ?? []).filter(
      (q) => q.examTypeId === data.examTypeId,
    );

    let picked = available;
    if (data.sortOrder === "random") {
      picked = [...available].sort(() => Math.random() - 0.5);
    } else {
      picked = [...available].sort((a, b) => a.difficulty - b.difficulty);
    }
    picked = picked.slice(0, data.count);

    if (picked.length === 0) {
      alert("Tidak ada soal tersedia untuk ujian ini.");
      return;
    }

    try {
      const pkg = await createPackage.mutateAsync({
        title: data.title,
        description: data.description,
        examTypeId: data.examTypeId,
        isPublic: data.isPublic,
        estimatedDurationMin: picked.length * 2,
      });

      const sec = await addSection.mutateAsync({
        packageId: pkg.id,
        sectionTypeId: data.sectionTypeId,
        title: `${data.sectionTypeId} Section`,
        orderIndex: 0,
      });

      for (let i = 0; i < picked.length; i++) {
        await addQuestion.mutateAsync({
          sectionId: sec.id,
          questionId: picked[i].id,
          orderIndex: i,
        });
      }

      setIsAutoBundleOpen(false);
      navigate({ to: "/package/$id", params: { id: pkg.id } });
    } catch (err: any) {
      alert("Gagal membuat paket: " + err.message);
    }
  };

  // Auto-bundle: count available questions for current filters
  const autoBundleExamType = examType || null;
  const autoBundleSectionType = section || null;

  return (
    <div className="min-h-screen pt-8 pb-32 px-6 md:px-12 lg:px-16 max-w-7xl mx-auto bg-[var(--warm-cream)]">
      <section className="mb-8">
        <h1 className="text-4xl font-headline font-extrabold text-[var(--clay-black)] tracking-tight">
          Bank Soal
        </h1>
        <p className="text-lg text-[var(--warm-charcoal)] mt-2">
          Kelola dan jelajahi soal latihan. Pilih soal untuk dibuatkan paket.
        </p>
      </section>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setTab("mine"); setPage(0); }}
          className={`px-4 py-2 rounded-[var(--radius-lg)] text-sm font-semibold transition-all ${
            tab === "mine"
              ? "bg-[var(--clay-black)] text-[var(--pure-white)] clay-shadow"
              : "bg-[var(--pure-white)] text-[var(--warm-charcoal)] border-2 border-[var(--oat-border)] hover:bg-[var(--oat-light)]"
          }`}
        >
          Soal Saya
        </button>
        <button
          onClick={() => { setTab("public"); setPage(0); }}
          className={`px-4 py-2 rounded-[var(--radius-lg)] text-sm font-semibold transition-all ${
            tab === "public"
              ? "bg-[var(--clay-black)] text-[var(--pure-white)] clay-shadow"
              : "bg-[var(--pure-white)] text-[var(--warm-charcoal)] border-2 border-[var(--oat-border)] hover:bg-[var(--oat-light)]"
          }`}
        >
          Publik
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--warm-charcoal)]" />
            <Input
              placeholder="Cari soal..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-10 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] h-11"
            />
          </div>
          {hasFilters && (
            <Button
              variant="outline"
              onClick={clearFilters}
              className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] h-11 clay-hover"
            >
              <MaterialIcon name="filter_alt_off" />
              <span className="ml-2 hidden sm:inline">Reset</span>
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Select
            items={[
              { value: "", label: "Semua Ujian" },
              ...EXAM_TYPES.map((t) => ({ value: t.id, label: t.name })),
            ]}
            value={examType}
            onValueChange={(v: string | null) => { setExamType(v ?? ""); setPage(0); }}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Semua Ujian" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="">Semua Ujian</SelectItem>
                {EXAM_TYPES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select
            items={[
              { value: "", label: "Semua Section" },
              ...SECTIONS.map((s) => ({ value: s.id, label: s.name })),
            ]}
            value={section}
            onValueChange={(v: string | null) => { setSection(v ?? ""); setPage(0); }}
          >
            <SelectTrigger className="w-38">
              <SelectValue placeholder="Semua Section" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="">Semua Section</SelectItem>
                {SECTIONS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select
            items={[
              { value: "", label: "Semua Format" },
              ...FORMATS.map((f) => ({ value: f, label: formatLabel(f) })),
            ]}
            value={format}
            onValueChange={(v: string | null) => { setFormat(v ?? ""); setPage(0); }}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Semua Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="">Semua Format</SelectItem>
                {FORMATS.map((f) => (
                  <SelectItem key={f} value={f}>{formatLabel(f)}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select
            items={[
              { value: "", label: "Semua Level" },
              ...DIFFICULTIES.map((d) => ({ value: String(d.value), label: d.label })),
            ]}
            value={difficulty !== undefined ? String(difficulty) : ""}
            onValueChange={(v: string | null) => { setDifficulty(v ? Number(v) : undefined); setPage(0); }}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Semua Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="">Semua Level</SelectItem>
                {DIFFICULTIES.map((d) => (
                  <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Select Mode Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {!isSelectMode ? (
            <>
              <Button
                variant="outline"
                onClick={() => setIsSelectMode(true)}
                className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] clay-hover"
              >
                <MaterialIcon name="checklist" className="mr-2" />
                Mode Pilih
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsAutoBundleOpen(true)}
                disabled={!autoBundleExamType}
                className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] clay-hover"
              >
                <MaterialIcon name="auto_fix_high" className="mr-2" />
                Auto Bundle
              </Button>
              {!autoBundleExamType && (
                <span className="text-xs text-[var(--warm-silver)]">
                  Pilih jenis ujian dulu untuk Auto Bundle
                </span>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={exitSelectMode}
                className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] clay-hover"
              >
                <MaterialIcon name="close" className="mr-2" />
                Selesai
              </Button>
              <Button
                variant="outline"
                onClick={selectAll}
                className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] clay-hover text-sm"
              >
                Pilih Semua
              </Button>
              <Button
                variant="outline"
                onClick={clearSelection}
                className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] clay-hover text-sm"
              >
                Batal Pilih
              </Button>
            </div>
          )}
        </div>

        {isSelectMode && (
          <div className="flex items-center gap-3">
            {lockedExamType && (
              <span className="px-3 py-1 rounded-full bg-[var(--matcha-300)] text-[var(--matcha-800)] text-xs font-semibold">
                {EXAM_TYPES.find((t) => t.id === lockedExamType)?.name ?? lockedExamType}
              </span>
            )}
            <span className="text-sm font-semibold text-[var(--clay-black)]">
              {selectedIds.size} soal dipilih
            </span>
          </div>
        )}
      </div>

      {/* Results */}
      {query.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-48 bg-[var(--oat-light)] animate-pulse rounded-[var(--radius-xl)]" />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-20">
          <MaterialIcon name="search_off" className="text-6xl text-[var(--warm-silver)] mx-auto mb-4" />
          <p className="text-lg text-[var(--warm-charcoal)] font-semibold">Tidak ada soal ditemukan</p>
          <p className="text-sm text-[var(--warm-silver)] mt-1">Coba ubah filter atau kata kunci pencarian</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {questions.map((q) => {
              const isOwner = q.creatorUserId === userId;
              const isSelected = selectedIds.has(q.id);
              const isMismatched = isSelectMode && lockedExamType && q.examTypeId !== lockedExamType;
              return (
                <Card
                  key={q.id}
                  onClick={() => {
                    if (isSelectMode) {
                      toggleSelection(q.id);
                    } else {
                      setSelectedQuestion(q);
                    }
                  }}
                  className={`clay-shadow clay-hover bg-[var(--pure-white)] border-2 rounded-[var(--radius-xl)] h-full flex flex-col cursor-pointer transition-all ${
                    isSelected
                      ? "border-[var(--clay-black)] bg-[var(--matcha-100)]"
                      : isMismatched
                        ? "border-[var(--oat-border)] opacity-30 pointer-events-none"
                        : "border-[var(--oat-border)]"
                  }`}
                >
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isSelectMode && (
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                              isSelected
                                ? "bg-[var(--clay-black)] border-[var(--clay-black)]"
                                : isMismatched
                                  ? "border-[var(--warm-silver)]"
                                  : "border-[var(--oat-border)]"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelection(q.id);
                            }}
                          >
                            {isSelected && (
                              <MaterialIcon name="check" className="text-xs text-[var(--pure-white)]" />
                            )}
                          </div>
                        )}
                        <div className="flex gap-2 flex-wrap">
                          <span className="px-2.5 py-1 rounded-full bg-[var(--matcha-300)] text-[var(--matcha-800)] text-xs font-semibold">
                            {q.examTypeName}
                          </span>
                          <span className="px-2.5 py-1 rounded-full bg-[var(--slushie-500)]/20 text-[var(--slushie-800)] text-xs font-semibold">
                            {q.sectionTypeName}
                          </span>
                        </div>
                      </div>
                      {q.avgRating && (
                        <div className="flex items-center gap-1 text-[var(--lemon-700)]">
                          <MaterialIcon name="star" className="text-sm" />
                          <span className="text-xs font-bold">{q.avgRating}</span>
                        </div>
                      )}
                    </div>

                    <h3 className="font-headline text-base font-bold text-[var(--clay-black)] line-clamp-2 mb-2">
                      {q.questionText}
                    </h3>

                    <p className="text-sm text-[var(--warm-charcoal)] line-clamp-3 mb-4 flex-1">
                      {q.passageText}
                    </p>

                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--oat-border)]">
                      <div className="flex gap-2">
                        <span className="px-2 py-0.5 rounded bg-[var(--oat-light)] text-[var(--warm-charcoal)] text-xs font-medium">
                          {formatLabel(q.format)}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[var(--oat-light)] text-[var(--warm-charcoal)] text-xs font-medium">
                          Lv.{q.difficulty}
                        </span>
                      </div>
                      <span className="text-xs text-[var(--warm-silver)]">
                        {q.usageCount}x digunakan
                      </span>
                    </div>

                    {isOwner && (
                      <div
                        className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--oat-border)]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePublic.mutate({ id: q.id });
                          }}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                            q.isPublic
                              ? "bg-[var(--matcha-300)] text-[var(--matcha-800)]"
                              : "bg-[var(--oat-light)] text-[var(--warm-charcoal)]"
                          }`}
                        >
                          {q.isPublic ? "Publik" : "Privat"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Yakin mau hapus soal ini?")) {
                              deleteQuestion.mutate({ id: q.id });
                            }
                          }}
                          className="text-xs text-[var(--pomegranate-400)] hover:bg-[var(--pomegranate-400)]/10 px-2 py-1 rounded-full transition-colors"
                        >
                          <MaterialIcon name="delete" className="text-sm" />
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] clay-hover"
              >
                <MaterialIcon name="chevron_left" />
              </Button>
              <span className="text-sm text-[var(--warm-charcoal)] px-4">
                Halaman {page + 1} dari {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] clay-hover"
              >
                <MaterialIcon name="chevron_right" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Sticky Bottom Bar for Selection */}
      {isSelectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <div className="flex items-center gap-3 bg-[var(--clay-black)] text-[var(--pure-white)] px-6 py-3 rounded-[var(--radius-xl)] clay-shadow">
            <span className="text-sm font-semibold">
              {selectedIds.size} soal dipilih
            </span>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[var(--matcha-500)] text-[var(--pure-white)] hover:bg-[var(--matcha-700)] rounded-[var(--radius-lg)] text-sm px-4 py-2 h-auto"
            >
              <MaterialIcon name="folder" className="mr-1 text-sm" />
              Buat Paket
            </Button>
            <button
              onClick={clearSelection}
              className="text-xs text-[var(--warm-silver)] hover:text-[var(--pure-white)] transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedQuestion && (
        <QuestionDetailModal
          question={selectedQuestion}
          onClose={() => setSelectedQuestion(null)}
          isSelected={selectedIds.has(selectedQuestion.id)}
          onToggleSelect={() => {
            toggleSelection(selectedQuestion.id);
            if (!isSelectMode) setIsSelectMode(true);
          }}
          isSelectable={!lockedExamType || selectedQuestion.examTypeId === lockedExamType}
        />
      )}

      {/* Create Package Modal */}
      {isCreateModalOpen && (
        <CreatePackageModal
          selectedCount={selectedIds.size}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreatePackage}
          isPending={createPackage.isPending || addSection.isPending}
          examTypeName={EXAM_TYPES.find((t) => t.id === lockedExamType)?.name ?? "Unknown"}
          lowCount={selectedIds.size < 5}
        />
      )}

      {/* Auto Bundle Modal */}
      {isAutoBundleOpen && autoBundleExamType && (
        <AutoBundleModal
          availableCount={total}
          examTypeId={autoBundleExamType}
          examTypeName={EXAM_TYPES.find((t) => t.id === autoBundleExamType)?.name ?? autoBundleExamType}
          sectionTypeId={autoBundleSectionType ?? "READING"}
          sectionTypeName={SECTIONS.find((s) => s.id === autoBundleSectionType)?.name ?? "Reading"}
          onClose={() => setIsAutoBundleOpen(false)}
          onCreate={handleAutoBundle}
          isPending={createPackage.isPending || addSection.isPending}
        />
      )}
    </div>
  );
}
