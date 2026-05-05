import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { trpc, queryClient } from "@/utils/trpc";
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
import { usePackageBuilder } from "@/hooks/use-package-builder";
import { AutoBundleModal } from "@/components/bank/AutoBundleModal";
import { QuestionDetailModal } from "@/components/bank/QuestionDetailModal";
import { toast } from "sonner";

export const Route = createFileRoute("/bank")({
  component: BankComponent,
  validateSearch: z.object({
    mode: z.enum(["soal", "section"]).optional(),
    tab: z.enum(["mine", "public"]).optional(),
    search: z.string().optional(),
    examType: z.string().optional(),
    section: z.string().optional(),
    format: z.string().optional(),
    difficulty: z.coerce.number().optional(),
    page: z.coerce.number().optional(),
  }).parse,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({ to: "/login", throw: true });
    }
    return { session };
  },
});

type QuestionTab = "mine" | "public";
type Mode = "soal" | "section";

function BankComponent() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;

  const mode: Mode = search.mode ?? "soal";
  const tab: QuestionTab = search.tab ?? "mine";
  const searchText = search.search ?? "";
  const examType = search.examType ?? "";
  const section = search.section ?? "";
  const format = search.format ?? "";
  const difficulty = search.difficulty;
  const page = search.page ?? 1;
  const limit = 12;

  // ── Sidebar / Bundle State ──
  const [bundleQuestions, setBundleQuestions] = useState<any[]>([]);
  const [bundleSections, setBundleSections] = useState<any[]>([]);
  const [bundleTitle, setBundleTitle] = useState("");
  const [bundleDescription, setBundleDescription] = useState("");
  const [bundleIsPublic, setBundleIsPublic] = useState(false);

  // ── Modals ──
  const [selectedQuestion, setSelectedQuestion] = useState<any | null>(null);
  const [isAutoBundleOpen, setIsAutoBundleOpen] = useState(false);

  // ── Data Queries ──
  const questionQuery = useQuery(
    trpc.question.list.queryOptions(
      {
        search: searchText || undefined,
        examTypeId: examType || undefined,
        sectionTypeId: section || undefined,
        format: format || undefined,
        difficulty,
        ...(tab === "mine" && userId
          ? { creatorUserId: userId }
          : { isPublic: true }),
        limit,
        offset: (page - 1) * limit,
      },
      { enabled: mode === "soal" },
    ),
  );

  const sectionQuery = useQuery(
    trpc.combo.availableSections.queryOptions(
      {
        examTypeId: examType || undefined,
        search: searchText || undefined,
        limit: 50,
        offset: 0,
      },
      { enabled: mode === "section" },
    ),
  );

  // ── Mutations ──
  const { isPending: isPackagePending, handleAutoBundle } = usePackageBuilder();

  const createPackage = useMutation(trpc.package.create.mutationOptions());
  const addSection = useMutation(trpc.package.addSection.mutationOptions());
  const addQuestion = useMutation(trpc.package.addQuestion.mutationOptions());
  const createCombo = useMutation(trpc.combo.create.mutationOptions());

  const togglePublic = useMutation({
    ...trpc.question.togglePublic.mutationOptions(),
    onSuccess: () => questionQuery.refetch(),
  });

  const deleteQuestion = useMutation({
    ...trpc.question.delete.mutationOptions(),
    onSuccess: () => questionQuery.refetch(),
  });

  // ── Navigation helpers ──
  const setMode = (newMode: Mode) => {
    navigate({
      search: {
        mode: newMode,
        tab: newMode === "soal" ? "mine" : undefined,
        search: "",
        examType: "",
        section: "",
        format: "",
        difficulty: undefined,
        page: 1,
      },
    });
    // Clear bundle when switching mode
    if (newMode === "soal") setBundleSections([]);
    else setBundleQuestions([]);
  };

  const setSearch = (value: string) =>
    navigate({ search: (prev) => ({ ...prev, search: value, page: 1 }) });

  const setExamType = (value: string) =>
    navigate({ search: (prev) => ({ ...prev, examType: value, page: 1 }) });

  const setSection = (value: string) =>
    navigate({ search: (prev) => ({ ...prev, section: value, page: 1 }) });

  const setFormat = (value: string) =>
    navigate({ search: (prev) => ({ ...prev, format: value, page: 1 }) });

  const setDifficulty = (value: number | undefined) =>
    navigate({ search: (prev) => ({ ...prev, difficulty: value, page: 1 }) });

  const setPage = (newPage: number) =>
    navigate({ search: (prev) => ({ ...prev, page: newPage }) });

  const setTab = (newTab: QuestionTab) =>
    navigate({
      search: {
        mode: "soal",
        tab: newTab,
        search: "",
        examType: "",
        section: "",
        format: "",
        difficulty: undefined,
        page: 1,
      },
    });

  const clearFilters = () =>
    navigate({
      search: (prev) => ({
        ...prev,
        search: "",
        examType: "",
        section: "",
        format: "",
        difficulty: undefined,
        page: 1,
      }),
    });

  const hasFilters =
    searchText || examType || section || format || difficulty !== undefined;

  // ── Bundle helpers ──
  const isQuestionInBundle = (qid: string) =>
    bundleQuestions.some((q) => q.id === qid);

  const isSectionInBundle = (sid: string) =>
    bundleSections.some((s) => s.id === sid);

  const toggleQuestion = (q: any) => {
    setBundleQuestions((prev) => {
      const exists = prev.find((x) => x.id === q.id);
      if (exists) return prev.filter((x) => x.id !== q.id);
      return [...prev, q];
    });
  };

  const toggleSection = (s: any) => {
    setBundleSections((prev) => {
      const exists = prev.find((x) => x.id === s.id);
      if (exists) return prev.filter((x) => x.id !== s.id);
      return [...prev, s];
    });
  };

  const removeFromBundle = (id: string, type: "question" | "section") => {
    if (type === "question") {
      setBundleQuestions((prev) => prev.filter((x) => x.id !== id));
    } else {
      setBundleSections((prev) => prev.filter((x) => x.id !== id));
    }
  };

  // ── Create handlers ──
  const handleCreateFromQuestions = async () => {
    if (!bundleTitle || bundleQuestions.length === 0) return;
    const first = bundleQuestions[0];
    try {
      const pkg = await createPackage.mutateAsync({
        title: bundleTitle,
        description: bundleDescription,
        examTypeId: first?.examTypeId ?? "",
        isPublic: bundleIsPublic,
        estimatedDurationMin: bundleQuestions.length * 2,
      });
      const sec = await addSection.mutateAsync({
        packageId: pkg.id,
        sectionTypeId: first?.sectionTypeId ?? "READING",
        title: `${first?.sectionTypeName ?? "Reading"} Section`,
        orderIndex: 0,
      });
      for (let i = 0; i < bundleQuestions.length; i++) {
        await addQuestion.mutateAsync({
          sectionId: sec.id,
          questionId: bundleQuestions[i].id,
          orderIndex: i,
        });
      }
      setBundleQuestions([]);
      setBundleTitle("");
      setBundleDescription("");
    } catch (err: any) {
      toast.error("Gagal membuat paket", { description: err.message });
    }
  };

  const handleCreateFromSections = async () => {
    if (!bundleTitle || bundleSections.length === 0) return;
    try {
      await createCombo.mutateAsync({
        title: bundleTitle,
        description: bundleDescription,
        isPublic: bundleIsPublic,
        sections: bundleSections.map((s, i) => ({
          sourcePackageId: s.packageId,
          sourceSectionId: s.id,
          orderIndex: i,
        })),
      });
      setBundleSections([]);
      setBundleTitle("");
      setBundleDescription("");
      toast.success("Combo paket berhasil dibuat!");
    } catch (err: any) {
      toast.error("Gagal membuat combo", { description: err.message });
    }
  };

  // ── Auto Bundle ──
  const autoBundleExamType = examType || null;
  const autoBundleSectionType = section || null;

  const onAutoBundle = async (data: {
    title: string;
    description: string;
    isPublic: boolean;
    count: number;
    sortOrder: "random" | "difficulty";
  }) => {
    const batchSize = 50;
    const baseInput = {
      search: searchText || undefined,
      examTypeId: examType || undefined,
      sectionTypeId: section || undefined,
      format: format || undefined,
      difficulty,
      ...(tab === "mine" && userId
        ? { creatorUserId: userId }
        : { isPublic: true }),
      limit: batchSize,
    };
    const firstPage = await queryClient.fetchQuery(
      trpc.question.list.queryOptions({ ...baseInput, offset: 0 }),
    );
    const allQuestions = [...(firstPage.questions ?? [])];
    const totalAvailable = firstPage.total ?? allQuestions.length;
    for (let offset = batchSize; offset < totalAvailable; offset += batchSize) {
      const pageData = await queryClient.fetchQuery(
        trpc.question.list.queryOptions({ ...baseInput, offset }),
      );
      allQuestions.push(...(pageData.questions ?? []));
    }
    await handleAutoBundle({
      ...data,
      examTypeId: autoBundleExamType ?? "",
      sectionTypeId: autoBundleSectionType ?? "READING",
      allQuestions,
    });
    setIsAutoBundleOpen(false);
  };

  // ── Render helpers ──
  const questions = questionQuery.data?.questions ?? [];
  const totalQuestions = questionQuery.data?.total ?? 0;
  const totalPages = Math.ceil(totalQuestions / limit);

  const sections = sectionQuery.data?.sections ?? [];
  const groupedSections = sections.reduce((groups: Record<string, any[]>, s: any) => {
    const key = `${s.examTypeName ?? "Unknown"} — ${s.packageTitle ?? "Untitled"}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
    return groups;
  }, {} as Record<string, any[]>);

  const activeBundle = mode === "soal" ? bundleQuestions : bundleSections;
  const bundleCount = activeBundle.length;
  const isCreating =
    createPackage.isPending ||
    addSection.isPending ||
    addQuestion.isPending ||
    createCombo.isPending;

  return (
    <div className="min-h-screen pt-8 pb-32 px-6 md:px-12 lg:px-16 max-w-7xl mx-auto bg-[var(--warm-cream)]">
      {/* Header */}
      <section className="mb-8">
        <h1 className="text-4xl font-headline font-extrabold text-[var(--clay-black)] tracking-tight">
          Buat Paket
        </h1>
        <p className="text-lg text-[var(--warm-charcoal)] mt-2">
          Pilih soal atau section untuk dibuatkan paket latihan.
        </p>
      </section>

      {/* Mode Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode("soal")}
          className={`px-4 py-2 rounded-[var(--radius-lg)] text-sm font-semibold transition-all ${
            mode === "soal"
              ? "bg-[var(--clay-black)] text-[var(--pure-white)] clay-shadow"
              : "bg-[var(--pure-white)] text-[var(--warm-charcoal)] border-2 border-[var(--oat-border)] hover:bg-[var(--oat-light)]"
          }`}
        >
          Dari Soal
        </button>
        <button
          onClick={() => setMode("section")}
          className={`px-4 py-2 rounded-[var(--radius-lg)] text-sm font-semibold transition-all ${
            mode === "section"
              ? "bg-[var(--clay-black)] text-[var(--pure-white)] clay-shadow"
              : "bg-[var(--pure-white)] text-[var(--warm-charcoal)] border-2 border-[var(--oat-border)] hover:bg-[var(--oat-light)]"
          }`}
        >
          Dari Section
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ── LEFT: Browser ── */}
        <div className="lg:col-span-8">
          {/* Filters */}
          <div className="space-y-4 mb-8">
            {/* Exam Type Chips */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => setExamType("")}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                  examType === ""
                    ? "bg-[var(--clay-black)] text-[var(--pure-white)] clay-shadow"
                    : "bg-[var(--pure-white)] text-[var(--warm-charcoal)] border-2 border-[var(--oat-border)] hover:bg-[var(--oat-light)]"
                }`}
              >
                Semua
              </button>
              {EXAM_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setExamType(t.id)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                    examType === t.id
                      ? "bg-[var(--clay-black)] text-[var(--pure-white)] clay-shadow"
                      : "bg-[var(--pure-white)] text-[var(--warm-charcoal)] border-2 border-[var(--oat-border)] hover:bg-[var(--oat-light)]"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>

            {/* Search + Extra Filters */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--warm-charcoal)]" />
                <Input
                  placeholder={mode === "soal" ? "Cari soal..." : "Cari section..."}
                  value={searchText}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] h-11"
                />
              </div>
              {mode === "soal" && (
                <>
                  <Select value={section} onValueChange={(v: string | null) => setSection(v ?? "")}>
                    <SelectTrigger className="w-38">
                      <SelectValue placeholder="Section" />
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
                  <Select value={format} onValueChange={(v: string | null) => setFormat(v ?? "")}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Format" />
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
                    onValueChange={(v: string | null) => setDifficulty(v ? Number(v) : undefined)}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Level" />
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
                </>
              )}
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

            {/* Question ownership tabs */}
            {mode === "soal" && (
              <div className="flex gap-2">
                <button
                  onClick={() => setTab("mine")}
                  className={`px-3 py-1.5 rounded-[var(--radius-lg)] text-xs font-semibold transition-all ${
                    tab === "mine"
                      ? "bg-[var(--matcha-300)] text-[var(--matcha-800)]"
                      : "bg-[var(--pure-white)] text-[var(--warm-charcoal)] border-2 border-[var(--oat-border)] hover:bg-[var(--oat-light)]"
                  }`}
                >
                  Soal Saya
                </button>
                <button
                  onClick={() => setTab("public")}
                  className={`px-3 py-1.5 rounded-[var(--radius-lg)] text-xs font-semibold transition-all ${
                    tab === "public"
                      ? "bg-[var(--matcha-300)] text-[var(--matcha-800)]"
                      : "bg-[var(--pure-white)] text-[var(--warm-charcoal)] border-2 border-[var(--oat-border)] hover:bg-[var(--oat-light)]"
                  }`}
                >
                  Publik
                </button>
              </div>
            )}
          </div>

          {/* ── SOAL BROWSER ── */}
          {mode === "soal" && (
            <>
              {questionQuery.isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="h-48 bg-[var(--oat-light)] animate-pulse rounded-[var(--radius-xl)]" />
                  ))}
                </div>
              ) : questions.length === 0 ? (
                <div className="text-center py-20">
                  <MaterialIcon name="search_off" className="text-6xl text-[var(--warm-silver)] mx-auto mb-4" />
                  <p className="text-lg text-[var(--warm-charcoal)] font-semibold">Tidak ada soal ditemukan</p>
                </div>
              ) : (
                <>
                  {/* Bento Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Featured Card (first question) */}
                    {questions[0] && (
                      <div className="md:col-span-2">
                        <QuestionCard
                          q={questions[0]}
                          isFeatured
                          isInBundle={isQuestionInBundle(questions[0].id)}
                          onToggle={() => toggleQuestion(questions[0])}
                          onOpenDetail={() => setSelectedQuestion(questions[0])}
                          isOwner={questions[0].creatorUserId === userId}
                          onTogglePublic={() => togglePublic.mutate({ id: questions[0].id })}
                          onDelete={() => {
                            if (confirm("Yakin mau hapus soal ini?")) deleteQuestion.mutate({ id: questions[0].id });
                          }}
                        />
                      </div>
                    )}
                    {/* Regular cards */}
                    {questions.slice(1).map((q) => (
                      <QuestionCard
                        key={q.id}
                        q={q}
                        isInBundle={isQuestionInBundle(q.id)}
                        onToggle={() => toggleQuestion(q)}
                        onOpenDetail={() => setSelectedQuestion(q)}
                        isOwner={q.creatorUserId === userId}
                        onTogglePublic={() => togglePublic.mutate({ id: q.id })}
                        onDelete={() => {
                          if (confirm("Yakin mau hapus soal ini?")) deleteQuestion.mutate({ id: q.id });
                        }}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-10">
                      <Button
                        variant="outline"
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page <= 1}
                        className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] clay-hover"
                      >
                        <MaterialIcon name="chevron_left" />
                      </Button>
                      <span className="text-sm text-[var(--warm-charcoal)] px-4">
                        Halaman {page} dari {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page >= totalPages}
                        className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] clay-hover"
                      >
                        <MaterialIcon name="chevron_right" />
                      </Button>
                    </div>
                  )}


                </>
              )}
            </>
          )}

          {/* ── SECTION BROWSER ── */}
          {mode === "section" && (
            <>
              {sectionQuery.isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="h-24 bg-[var(--oat-light)] animate-pulse rounded-[var(--radius-xl)]" />
                  ))}
                </div>
              ) : Object.keys(groupedSections).length === 0 ? (
                <div className="text-center py-20">
                  <MaterialIcon name="folder_open" className="text-6xl text-[var(--warm-silver)] mx-auto mb-4" />
                  <p className="text-lg text-[var(--warm-charcoal)] font-semibold">Tidak ada section ditemukan</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedSections).map(([groupKey, groupSections]) => (
                    <Card key={groupKey} className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
                      <CardContent className="p-5">
                        <h3 className="font-headline font-bold text-[var(--clay-black)] mb-4 text-sm uppercase tracking-wider">
                          {groupKey}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {groupSections.map((s: any) => {
                            const inBundle = isSectionInBundle(s.id);
                            return (
                              <div
                                key={s.id}
                                className={`rounded-[var(--radius-lg)] border-2 p-4 transition-all clay-hover ${
                                  inBundle
                                    ? "border-[var(--clay-black)] bg-[var(--matcha-300)]/10 clay-shadow"
                                    : "border-[var(--oat-border)] hover:bg-[var(--oat-light)]"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-[var(--clay-black)]">{s.title}</p>
                                    <div className="flex gap-2 mt-2 flex-wrap">
                                      <span className="px-2 py-0.5 rounded-full bg-[var(--slushie-500)]/20 text-[var(--slushie-800)] text-xs font-semibold">
                                        {s.sectionTypeName}
                                      </span>
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleSection(s);
                                    }}
                                    className={`shrink-0 rounded-[var(--radius-lg)] text-xs ${
                                      inBundle
                                        ? "bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)]"
                                        : "bg-[var(--matcha-300)] text-[var(--matcha-800)] hover:bg-[var(--matcha-400)]"
                                    }`}
                                  >
                                    {inBundle ? "Hapus" : "Tambah"}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── RIGHT: Sidebar ── */}
        <div className="lg:col-span-4">
          <div className="sticky top-8 bg-[var(--pure-white)] rounded-[var(--radius-xl)] border-2 border-[var(--oat-border)] clay-shadow overflow-hidden flex flex-col max-h-[calc(100vh-4rem)]">
            {/* Header */}
            <div className="p-5 bg-[var(--clay-black)] text-[var(--pure-white)]">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold font-headline">Paket Saat Ini</h3>
                <span className="text-xs font-medium bg-[var(--matcha-600)]/30 px-2 py-1 rounded">DRAFT</span>
              </div>
              <p className="text-sm text-[var(--warm-silver)]">
                {bundleCount} {mode === "soal" ? "soal" : "section"} dipilih
              </p>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[120px]">
              {bundleCount === 0 ? (
                <div className="text-center py-8 text-sm text-[var(--warm-silver)]">
                  <MaterialIcon name="inventory_2" className="text-3xl mx-auto mb-2" />
                  Belum ada yang dipilih
                </div>
              ) : (
                activeBundle.map((item: any, idx: number) => {
                  const isQ = mode === "soal";
                  return (
                    <div
                      key={isQ ? item.id : item.id}
                      className="p-3 bg-[var(--oat-light)] rounded-[var(--radius-lg)] flex items-center gap-3 group"
                    >
                      <div className="h-8 w-8 bg-[var(--pure-white)] rounded-lg flex items-center justify-center text-[var(--matcha-600)] shrink-0">
                        <MaterialIcon name={isQ ? "quiz" : "folder_open"} className="text-sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-sm font-bold text-[var(--clay-black)] truncate">
                          {isQ ? item.questionText : item.title}
                        </h5>
                        <p className="text-xs text-[var(--warm-charcoal)]">
                          {isQ
                            ? `${item.examTypeName} · ${formatLabel(item.format)}`
                            : `${item.examTypeName} · ${item.sectionTypeName}`}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromBundle(item.id, isQ ? "question" : "section")}
                        className="text-[var(--warm-silver)] hover:text-[var(--pomegranate-400)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      >
                        <MaterialIcon name="delete" className="text-sm" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Auto Bundle (only in soal mode) */}
            {mode === "soal" && (
              <div className="p-4 border-t border-[var(--oat-border)] bg-[var(--oat-light)]">
                <div className="bg-[var(--pure-white)] rounded-[var(--radius-lg)] p-4 border-2 border-dashed border-[var(--oat-border)] flex items-center gap-3">
                  <div className="bg-[var(--matcha-300)]/20 p-2 rounded-full shrink-0">
                    <MaterialIcon name="auto_awesome" className="text-lg text-[var(--matcha-600)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--clay-black)]">Auto Bundle</p>
                    <p className="text-xs text-[var(--warm-charcoal)]">AI pilihkan soal otomatis</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setIsAutoBundleOpen(true)}
                    disabled={!autoBundleExamType}
                    className="bg-[var(--matcha-600)] text-[var(--pure-white)] hover:bg-[var(--matcha-800)] rounded-[var(--radius-lg)] text-xs px-3 py-1.5 h-auto shrink-0"
                  >
                    <MaterialIcon name="auto_fix_high" className="mr-1 text-xs" />
                    Buat
                  </Button>
                </div>
              </div>
            )}

            {/* Form & Actions */}
            <div className="p-5 border-t border-[var(--oat-border)] bg-[var(--oat-light)]">
              <div className="space-y-4 mb-5">
                <div>
                  <label className="block text-xs font-bold text-[var(--warm-charcoal)] mb-1.5 uppercase">
                    Judul Paket
                  </label>
                  <Input
                    value={bundleTitle}
                    onChange={(e) => setBundleTitle(e.target.value)}
                    placeholder="Judul paket..."
                    className="w-full bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-lg)] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--warm-charcoal)] mb-1.5 uppercase">
                    Deskripsi
                  </label>
                  <Input
                    value={bundleDescription}
                    onChange={(e) => setBundleDescription(e.target.value)}
                    placeholder="Deskripsi singkat..."
                    className="w-full bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-lg)] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--warm-charcoal)] mb-1.5 uppercase">
                    Visibilitas
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setBundleIsPublic(true)}
                      className={`flex-1 text-xs font-bold py-2 rounded-[var(--radius-lg)] transition-colors ${
                        bundleIsPublic
                          ? "bg-[var(--matcha-600)] text-[var(--pure-white)]"
                          : "bg-[var(--pure-white)] text-[var(--warm-charcoal)] border-2 border-[var(--oat-border)]"
                      }`}
                    >
                      Publik
                    </button>
                    <button
                      onClick={() => setBundleIsPublic(false)}
                      className={`flex-1 text-xs font-bold py-2 rounded-[var(--radius-lg)] transition-colors ${
                        !bundleIsPublic
                          ? "bg-[var(--clay-black)] text-[var(--pure-white)]"
                          : "bg-[var(--pure-white)] text-[var(--warm-charcoal)] border-2 border-[var(--oat-border)]"
                      }`}
                    >
                      Privat
                    </button>
                  </div>
                </div>
              </div>
              <Button
                onClick={mode === "soal" ? handleCreateFromQuestions : handleCreateFromSections}
                disabled={!bundleTitle || bundleCount === 0 || isCreating}
                className="w-full py-3 rounded-[var(--radius-lg)] bg-[var(--clay-black)] text-[var(--pure-white)] font-bold text-sm clay-shadow clay-hover hover:bg-[var(--warm-charcoal)] h-auto"
              >
                <MaterialIcon name={mode === "soal" ? "folder" : "construction"} />
                <span className="ml-2">
                  {isCreating
                    ? "Membuat..."
                    : mode === "soal"
                      ? "Buat Paket"
                      : "Buat Combo Paket"}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Question Detail Modal */}
      {selectedQuestion && (
        <QuestionDetailModal
          question={selectedQuestion}
          onClose={() => setSelectedQuestion(null)}
          isSelected={isQuestionInBundle(selectedQuestion.id)}
          onToggleSelect={() => toggleQuestion(selectedQuestion)}
          isSelectable={true}
        />
      )}

      {/* Auto Bundle Modal */}
      {isAutoBundleOpen && autoBundleExamType && (
        <AutoBundleModal
          availableCount={totalQuestions}
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

// ── Question Card Component ──
function QuestionCard({
  q,
  isFeatured = false,
  isInBundle,
  onToggle,
  onOpenDetail,
  isOwner,
  onTogglePublic,
  onDelete,
}: {
  q: any;
  isFeatured?: boolean;
  isInBundle: boolean;
  onToggle: () => void;
  onOpenDetail: () => void;
  isOwner: boolean;
  onTogglePublic: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onOpenDetail}
      className={`clay-shadow clay-hover bg-[var(--pure-white)] border-2 rounded-[var(--radius-xl)] h-full flex flex-col cursor-pointer transition-all ${
        isInBundle
          ? "border-[var(--clay-black)] bg-[var(--matcha-100)]"
          : "border-[var(--oat-border)]"
      }`}
    >
      <div className="p-5 flex flex-col h-full">
        <div className="flex items-start justify-between mb-3">
          <div className="flex gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full bg-[var(--matcha-300)] text-[var(--matcha-800)] text-xs font-semibold">
              {q.examTypeName}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-[var(--slushie-500)]/20 text-[var(--slushie-800)] text-xs font-semibold">
              {q.sectionTypeName}
            </span>
          </div>
          {q.avgRating && (
            <div className="flex items-center gap-1 text-[var(--lemon-700)]">
              <MaterialIcon name="star" className="text-sm" />
              <span className="text-xs font-bold">{q.avgRating}</span>
            </div>
          )}
        </div>

        <h3
          className={`font-headline font-bold text-[var(--clay-black)] mb-2 ${
            isFeatured ? "text-xl line-clamp-3" : "text-base line-clamp-2"
          }`}
        >
          {q.questionText}
        </h3>

        <p
          className={`text-sm text-[var(--warm-charcoal)] flex-1 ${
            isFeatured ? "line-clamp-4 mb-4" : "line-clamp-2 mb-4"
          }`}
        >
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
            <span className="px-2 py-0.5 rounded bg-[var(--oat-light)] text-[var(--warm-charcoal)] text-xs font-medium">
              {q.usageCount}x digunakan
            </span>
          </div>
        </div>

        {/* Actions row */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--oat-border)]">
          {isOwner && (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={onTogglePublic}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                  q.isPublic
                    ? "bg-[var(--matcha-300)] text-[var(--matcha-800)]"
                    : "bg-[var(--oat-light)] text-[var(--warm-charcoal)]"
                }`}
              >
                {q.isPublic ? "Publik" : "Privat"}
              </button>
              <button
                onClick={onDelete}
                className="text-[var(--pomegranate-400)] hover:bg-[var(--pomegranate-400)]/10 px-2 py-1 rounded-full transition-colors"
              >
                <MaterialIcon name="delete" className="text-sm" />
              </button>
            </div>
          )}
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className={`ml-auto rounded-[var(--radius-lg)] text-xs ${
              isInBundle
                ? "bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)]"
                : "bg-[var(--matcha-300)] text-[var(--matcha-800)] hover:bg-[var(--matcha-400)]"
            }`}
          >
            {isInBundle ? "Hapus dari Paket" : "Tambah ke Paket"}
          </Button>
        </div>
      </div>
    </div>
  );
}
