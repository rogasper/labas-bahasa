import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
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
import { EXAM_TYPES, SECTIONS, FORMATS, DIFFICULTIES } from "@/lib/exam-constants";
import { formatLabel } from "@/lib/format";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { useQuestionSelection } from "@/hooks/use-question-selection";
import { usePackageBuilder } from "@/hooks/use-package-builder";
import { CreatePackageModal } from "@/components/bank/CreatePackageModal";
import { AutoBundleModal } from "@/components/bank/AutoBundleModal";
import { QuestionDetailModal } from "@/components/bank/QuestionDetailModal";

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

type Tab = "mine" | "public";

function BankComponent() {
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;

  const [tab, setTab] = useState<Tab>("mine");
  const [search, setSearch] = useState("");
  const [examType, setExamType] = useState<string>("");
  const [section, setSection] = useState<string>("");
  const [format, setFormat] = useState<string>("");
  const [difficulty, setDifficulty] = useState<number | undefined>();
  const [page, setPage] = useState(0);
  const [selectedQuestion, setSelectedQuestion] = useState<any | null>(null);

  // Modals
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

  const {
    isSelectMode,
    setIsSelectMode,
    selectedIds,
    lockedExamType,
    toggleSelection,
    selectAll,
    clearSelection,
    exitSelectMode,
  } = useQuestionSelection(questions);

  const { isPending: isPackagePending, handleCreatePackage, handleAutoBundle } = usePackageBuilder();

  const togglePublic = useMutation({
    ...trpc.question.togglePublic.mutationOptions(),
    onSuccess: () => query.refetch(),
  });

  const deleteQuestion = useMutation({
    ...trpc.question.delete.mutationOptions(),
    onSuccess: () => query.refetch(),
  });

  const clearFilters = () => {
    setSearch("");
    setExamType("");
    setSection("");
    setFormat("");
    setDifficulty(undefined);
    setPage(0);
  };

  const hasFilters = search || examType || section || format || difficulty !== undefined;

  const autoBundleExamType = examType || null;
  const autoBundleSectionType = section || null;

  const onCreatePackage = async (data: {
    title: string;
    description: string;
    isPublic: boolean;
  }) => {
    await handleCreatePackage({
      selectedIds,
      questions,
      title: data.title,
      description: data.description,
      isPublic: data.isPublic,
    });
    setIsCreateModalOpen(false);
    setIsSelectMode(false);
    clearSelection();
  };

  const onAutoBundle = async (data: {
    title: string;
    description: string;
    isPublic: boolean;
    count: number;
    sortOrder: "random" | "difficulty";
  }) => {
    const allQuestions = await query.refetch();
    await handleAutoBundle({
      ...data,
      examTypeId: autoBundleExamType ?? "",
      sectionTypeId: autoBundleSectionType ?? "READING",
      allQuestions: allQuestions.data?.questions ?? [],
    });
    setIsAutoBundleOpen(false);
  };

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
          onCreate={onCreatePackage}
          isPending={isPackagePending}
          examTypeName={EXAM_TYPES.find((t) => t.id === lockedExamType)?.name ?? "Unknown"}
          lowCount={selectedIds.size < 5}
        />
      )}

      {/* Auto Bundle Modal */}
      {isAutoBundleOpen && autoBundleExamType && (
        <AutoBundleModal
          availableCount={total}
          examTypeName={EXAM_TYPES.find((t) => t.id === autoBundleExamType)?.name ?? autoBundleExamType}
          sectionTypeName={SECTIONS.find((s) => s.id === autoBundleSectionType)?.name ?? "Reading"}
          onClose={() => setIsAutoBundleOpen(false)}
          onCreate={onAutoBundle}
          isPending={isPackagePending}
        />
      )}
    </div>
  );
}
