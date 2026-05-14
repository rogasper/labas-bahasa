import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { trpc, queryClient } from "@/utils/trpc";
import { EXAM_TYPES, SECTIONS } from "@/lib/exam-constants";
import { formatLabel } from "@/lib/format";
import { usePackageBuilder } from "@/hooks/use-package-builder";
import { useLocalStorageBoolean } from "@/hooks/use-local-storage-boolean";
import { AutoBundleModal } from "@/components/bank/AutoBundleModal";
import { QuestionDetailModal } from "@/components/bank/QuestionDetailModal";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { PageTour, TourHelpButton } from "@/components/TourGuide";
import { FilterBar } from "@/components/bank/FilterBar";
import { MobileFilterSheet } from "@/components/bank/MobileFilterSheet";
import { AdvancedFilters } from "@/components/bank/AdvancedFilters";
import { SoalBrowser } from "@/components/bank/SoalBrowser";
import { SectionBrowser } from "@/components/bank/SectionBrowser";
import { BundleSidebar } from "@/components/bank/BundleSidebar";
import { toast } from "sonner";
import type { Step } from "react-joyride";

const FILTER_ADVANCED_KEY = "labas-bank-filter-advanced";

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
    visibility: z.enum(["all", "private", "public"]).optional(),
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
  const tab: QuestionTab = search.tab ?? "public";
  const searchText = search.search ?? "";
  const examType = search.examType ?? "";
  const section = search.section ?? "";
  const format = search.format ?? "";
  const difficulty = search.difficulty;
  const visibilityFilter = search.visibility ?? "all";

  // ── Infinite scroll state ──
  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);
  const limit = 12;
  const filterKey = JSON.stringify({ searchText, examType, section, format, difficulty, tab, mode, visibility: visibilityFilter });

  // ── Sidebar / Bundle State ──
  const [bundleQuestions, setBundleQuestions] = useState<any[]>([]);
  const [bundleSections, setBundleSections] = useState<any[]>([]);
  const [bundleTitle, setBundleTitle] = useState("");
  const [bundleDescription, setBundleDescription] = useState("");
  const [bundleIsPublic, setBundleIsPublic] = useState(false);

  // ── Modals ──
  const [selectedQuestion, setSelectedQuestion] = useState<any | null>(null);
  const [isAutoBundleOpen, setIsAutoBundleOpen] = useState(false);

  // ── Filter UI State ──
  const [isAdvancedOpen, setIsAdvancedOpen] = useLocalStorageBoolean(FILTER_ADVANCED_KEY, false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  // ── Data Queries ──
  const visibilityFilterParam = tab === "mine" && visibilityFilter !== "all"
    ? { isPublic: visibilityFilter === "public" }
    : {};

  const questionQuery = useQuery(
    trpc.question.list.queryOptions(
      {
        search: searchText || undefined,
        examTypeId: examType || undefined,
        sectionTypeId: section || undefined,
        format: format || undefined,
        difficulty,
        ...(tab === "mine" && userId
          ? { creatorUserId: userId, ...visibilityFilterParam }
          : { isPublic: true }),
        limit,
        offset,
      },
      { enabled: mode === "soal" },
    ),
  );

  // Reset offset when filters change
  useEffect(() => {
    setOffset(0);
  }, [filterKey]);

  // Append / replace questions when query data arrives
  useEffect(() => {
    const data = questionQuery.data;
    if (!data) return;
    if (offset === 0) {
      setAllQuestions(data.questions ?? []);
    } else {
      setAllQuestions((prev) => {
        const existingIds = new Set(prev.map((q: any) => q.id));
        const newQs = (data.questions ?? []).filter((q: any) => !existingIds.has(q.id));
        return [...prev, ...newQs];
      });
    }
  }, [questionQuery.data]);

  const totalQuestions = questionQuery.data?.total ?? 0;
  const hasMore = offset + limit < totalQuestions;

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

  const bulkPublish = useMutation({
    ...trpc.question.bulkPublish.mutationOptions(),
    onSuccess: (data) => {
      questionQuery.refetch();
      if (data.skipped > 0) {
        toast.success(
          `${data.updated} soal dipublikasikan, ${data.skipped} dilewati`,
          { description: "Beberapa soal bukan milikmu atau sudah tidak tersedia." },
        );
      } else {
        toast.success(`${data.updated} soal berhasil dipublikasikan`);
      }
    },
    onError: (err: any) => {
      toast.error("Gagal mempublikasikan. Coba refresh dan pilih ulang soal.", { description: err.message });
    },
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
      },
    });
    if (newMode === "soal") setBundleSections([]);
    else setBundleQuestions([]);
  };

  const setSearch = (value: string) =>
    navigate({ search: (prev) => ({ ...prev, search: value }) });

  const setExamType = (value: string) =>
    navigate({ search: (prev) => ({ ...prev, examType: value }) });

  const setSection = (value: string) =>
    navigate({ search: (prev) => ({ ...prev, section: value }) });

  const setFormat = (value: string) =>
    navigate({ search: (prev) => ({ ...prev, format: value }) });

  const setDifficulty = (value: number | undefined) =>
    navigate({ search: (prev) => ({ ...prev, difficulty: value }) });

  const setVisibility = (value: "all" | "private" | "public") =>
    navigate({ search: (prev) => ({ ...prev, visibility: value === "all" ? undefined : value }) });

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
        visibility: undefined,
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
        visibility: undefined,
      }),
    });

  const hasFilters =
    !!searchText || !!examType || !!section || !!format || difficulty !== undefined;

  // ── Active filter chips data ──
  const activeChips = [
    ...(examType ? [{ key: "examType", label: EXAM_TYPES.find((t) => t.id === examType)?.name ?? examType, onRemove: () => setExamType("") }] : []),
    ...(section ? [{ key: "section", label: SECTIONS.find((s) => s.id === section)?.name ?? section, onRemove: () => setSection("") }] : []),
    ...(format ? [{ key: "format", label: formatLabel(format), onRemove: () => setFormat("") }] : []),
    ...(difficulty !== undefined ? [{ key: "difficulty", label: `Lv.${difficulty}`, onRemove: () => setDifficulty(undefined) }] : []),
  ];

  // ── Bundle helpers ──
  const lockedExamType = bundleQuestions.length > 0 ? bundleQuestions[0]?.examTypeId : null;

  const isQuestionInBundle = (qid: string) =>
    bundleQuestions.some((q) => q.id === qid);

  const isSectionInBundle = (sid: string) =>
    bundleSections.some((s) => s.id === sid);

  const toggleQuestion = (q: any) => {
    if (lockedExamType && q.examTypeId !== lockedExamType) {
      toast.error(`Hanya bisa memilih soal dari ${EXAM_TYPES.find((t) => t.id === lockedExamType)?.name ?? lockedExamType}`);
      return;
    }
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
  const autoBundleExamType = examType || lockedExamType || null;
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
  const questions = allQuestions;

  const sections = sectionQuery.data?.sections ?? [];
  const groupedSections = sections.reduce((groups: Record<string, any[]>, s: any) => {
    const key = `${s.examTypeName ?? "Unknown"} — ${s.packageTitle ?? "Untitled"}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
    return groups;
  }, {} as Record<string, any[]>);

  const isCreating =
    createPackage.isPending ||
    addSection.isPending ||
    addQuestion.isPending ||
    createCombo.isPending;

  return (
    <div className="min-h-screen pb-32 bg-[var(--warm-cream)]">
      <FilterBar
        mode={mode}
        tab={tab}
        searchText={searchText}
        examType={examType}
        visibility={visibilityFilter}
        activeChips={activeChips}
        hasFilters={hasFilters}
        isAdvancedOpen={isAdvancedOpen}
        lockedExamType={lockedExamType}
        dataTour="bank-filters"
        onToggleAdvanced={() => setIsAdvancedOpen((v) => !v)}
        onSetMode={setMode}
        onSetTab={setTab}
        onSetSearch={setSearch}
        onSetExamType={setExamType}
        onSetVisibility={setVisibility}
        onClearFilters={clearFilters}
        onOpenMobileSheet={() => setIsMobileSheetOpen(true)}
        advancedFilters={
          <AdvancedFilters
            section={section}
            format={format}
            difficulty={difficulty}
            onSetSection={setSection}
            onSetFormat={setFormat}
            onSetDifficulty={setDifficulty}
          />
        }
      />

      <div className="px-6 md:px-12 lg:px-16 max-w-7xl mx-auto pt-6">
        <section className="mb-8">
          <h1 className="text-4xl font-headline font-extrabold text-[var(--clay-black)] tracking-tight">
            Buat Paket
          </h1>
          <p className="text-lg text-[var(--warm-charcoal)] mt-2">
            Pilih soal atau section untuk dibuatkan paket latihan.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-[var(--warm-charcoal)]">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--matcha-300)]/30 text-[var(--matcha-800)] font-medium">
              <MaterialIcon name="auto_awesome" className="text-sm" />
              Auto Bundle — biarkan AI pilihkan soal otomatis
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--slushie-500)]/20 text-[var(--slushie-800)] font-medium">
              <MaterialIcon name="touch_app" className="text-sm" />
              Manual — pilih sendiri soal satu per satu
            </span>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div data-tour="bank-questions" className="lg:col-span-8">
            {mode === "soal" ? (
              <SoalBrowser
                isLoading={questionQuery.isLoading}
                questions={questions}
                hasMore={hasMore}
                isFetchingNextPage={questionQuery.isFetching}
                onLoadMore={() => setOffset((prev) => prev + limit)}
                hasFilters={hasFilters}
                userId={userId}
                lockedExamType={lockedExamType}
                tab={tab}
                filterKey={filterKey}
                isQuestionInBundle={isQuestionInBundle}
                onToggleQuestion={toggleQuestion}
                onOpenDetail={setSelectedQuestion}
                onTogglePublic={(id) => togglePublic.mutate({ id })}
                onDelete={(id) => {
                  if (confirm("Yakin mau hapus soal ini?")) deleteQuestion.mutate({ id });
                }}
                onClearFilters={clearFilters}
                onBulkPublish={(ids) => bulkPublish.mutate({ ids })}
                onPublishAllPrivate={(ids) => bulkPublish.mutate({ ids })}
              />
            ) : (
              <SectionBrowser
                isLoading={sectionQuery.isLoading}
                groupedSections={groupedSections}
                isSectionInBundle={isSectionInBundle}
                onToggleSection={toggleSection}
              />
            )}
          </div>

          <BundleSidebar
            mode={mode}
            bundleQuestions={bundleQuestions}
            bundleSections={bundleSections}
            bundleTitle={bundleTitle}
            bundleDescription={bundleDescription}
            bundleIsPublic={bundleIsPublic}
            isCreating={isCreating}
            autoBundleExamType={autoBundleExamType}
            lockedExamType={lockedExamType}
            onSetTitle={setBundleTitle}
            onSetDescription={setBundleDescription}
            onSetIsPublic={setBundleIsPublic}
            onRemoveFromBundle={removeFromBundle}
            onCreateFromQuestions={handleCreateFromQuestions}
            onCreateFromSections={handleCreateFromSections}
            onOpenAutoBundle={() => setIsAutoBundleOpen(true)}
          />
        </div>
      </div>

      <MobileFilterSheet
        open={isMobileSheetOpen}
        onOpenChange={setIsMobileSheetOpen}
        section={section}
        format={format}
        difficulty={difficulty}
        activeChips={activeChips}
        onSetSection={setSection}
        onSetFormat={setFormat}
        onSetDifficulty={setDifficulty}
        onClearFilters={clearFilters}
      />

      {selectedQuestion && (
        <QuestionDetailModal
          question={selectedQuestion}
          onClose={() => setSelectedQuestion(null)}
          isSelected={isQuestionInBundle(selectedQuestion.id)}
          onToggleSelect={() => toggleQuestion(selectedQuestion)}
          isSelectable={true}
        />
      )}

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

      <PageTour
        storageKey={BANK_TOUR_KEY}
        autoDelay={600}
        steps={bankPageSteps}
      />
      <TourHelpButton storageKey={BANK_TOUR_KEY} />
    </div>
  );
}

// ── Bank page tour ──
const BANK_TOUR_KEY = "labas-page-tour-bank";
const bankPageSteps: Step[] = [
  {
    target: "[data-tour='bank-filters']",
    title: "Filter & Mode",
    content: "Pilih mode 'Dari Soal' untuk pilih soal satu per satu, atau 'Dari Section' untuk gabung section dari paket yang sudah ada. Filter juga berdasarkan exam type dan kata kunci.",
    spotlightPadding: 8,
  },
  {
    target: "[data-tour='bank-questions']",
    title: "Daftar Soal",
    content: "Semua soal yang sesuai filter ditampilkan di sini. Klik soal untuk melihat detail, atau centang untuk menambahkannya ke paket.",
    spotlightPadding: 8,
  },
  {
    target: "[data-tour='bank-sidebar']",
    title: "Sidebar Paket",
    content: "Soal yang dipilih muncul di sini. Atur judul, deskripsi, dan visibilitas paket. Klik 'Auto Bundle' untuk isi otomatis, atau 'Buat Paket' untuk simpan.",
    spotlightPadding: 8,
  },
];
