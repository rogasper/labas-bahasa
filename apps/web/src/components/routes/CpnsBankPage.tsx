import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch, useNavigate } from "@tanstack/react-router";
import { trpc, queryClient } from "@/utils/trpc";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Pagination } from "@/components/admin/Pagination";
import { QuestionDetailModal } from "@/components/bank/QuestionDetailModal";
import { CpnsQuestionCard } from "@/components/bank/CpnsQuestionCard";
import { CpnsPageHeader } from "@/components/ui/CpnsPageHeader";
import { BundleSidebar } from "@/components/bank/BundleSidebar";
import { AutoBundleModal } from "@/components/bank/AutoBundleModal";
import { usePackageBuilder } from "@/hooks/use-package-builder";
import { useDebouncedSearch, useDebouncedNavigate } from "@/hooks/use-debounced-search";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-utils";
import { CPNS_SECTIONS, type CpnsSection } from "@/lib/cpns-constants";
import type { Question } from "@/lib/types";

const LIMIT = 12;

export function CpnsBankComponent() {
  const search = useSearch({ strict: false }) as Record<string, string>;
  const navigate = useNavigate();

  const searchText = search.search ?? "";
  const section = search.sectionTypeId ?? "";
  const page = parseInt(search.page ?? "1", 10) || 1;
  const offset = (page - 1) * LIMIT;

  const [localSearch, setLocalSearch] = useDebouncedSearch(searchText);
  useDebouncedNavigate(localSearch, searchText, navigate, { sectionTypeId: section || undefined });

  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [bundleQuestions, setBundleQuestions] = useState<Question[]>([]);
  const [bundleTitle, setBundleTitle] = useState("");
  const [bundleDescription, setBundleDescription] = useState("");
  const [bundleIsPublic, setBundleIsPublic] = useState(false);
  const [isAutoBundleOpen, setIsAutoBundleOpen] = useState(false);

  function setPage(newPage: number) {
    navigate({ search: { ...search, page: newPage } as any, replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const QUESTIONS = useQuery(
    trpc.question.list.queryOptions({
      examTypeId: "CPNS",
      sectionTypeId: section || undefined,
      search: searchText || undefined,
      limit: LIMIT,
      offset,
    }),
  );

  const rows = QUESTIONS.data?.questions ?? [];
  const total = QUESTIONS.data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);
  const isLoading = QUESTIONS.isLoading;

  // Bundle helpers
  const isQuestionInBundle = (qid: string) => bundleQuestions.some((q) => q.id === qid);

  const toggleQuestion = (q: Question) => {
    setBundleQuestions((prev) => {
      const exists = prev.find((x) => x.id === q.id);
      if (exists) return prev.filter((x) => x.id !== q.id);
      return [...prev, q];
    });
  };

  const removeFromBundle = (id: string) => {
    setBundleQuestions((prev) => prev.filter((x) => x.id !== id));
  };

  const createPackage = useMutation(trpc.package.create.mutationOptions());
  const addSection = useMutation(trpc.package.addSection.mutationOptions());
  const addQuestion = useMutation(trpc.package.addQuestion.mutationOptions());
  const { isPending: isPackagePending, handleAutoBundle } = usePackageBuilder();

  const isCreating = createPackage.isPending || addSection.isPending || addQuestion.isPending;

  const handleCreateFromQuestions = async () => {
    if (!bundleTitle || bundleQuestions.length === 0) return;
    const first = bundleQuestions[0];
    try {
      const pkg = await createPackage.mutateAsync({
        title: bundleTitle,
        description: bundleDescription,
        examTypeId: "CPNS",
        isPublic: bundleIsPublic,
        estimatedDurationMin: bundleQuestions.length * 2,
      });
      const sec = await addSection.mutateAsync({
        packageId: pkg.id,
        sectionTypeId: first?.sectionTypeId ?? "TIU",
        title: `${first?.sectionTypeName ?? "TIU"} Section`,
        orderIndex: 0,
      });
      await Promise.all(
        bundleQuestions.map((q, i) =>
          addQuestion.mutateAsync({ sectionId: sec.id, questionId: q.id, orderIndex: i })
        ),
      );
      setBundleQuestions([]);
      setBundleTitle("");
      setBundleDescription("");
      toast.success("Paket berhasil dibuat!");
      navigate({ to: "/cpns/packages" });
    } catch (err: unknown) {
      toast.error("Gagal membuat paket", { description: getErrorMessage(err) });
    }
  };

  const onAutoBundle = async (data: {
    title: string; description: string; isPublic: boolean; count: number; sortOrder: "random" | "difficulty";
  }) => {
    const batchSize = 50;
    const baseInput = { examTypeId: "CPNS", sectionTypeId: section || undefined, search: searchText || undefined, limit: batchSize };
    const firstPage = await queryClient.fetchQuery(trpc.question.list.queryOptions({ ...baseInput, offset: 0 }));
    const allFetched = [...(firstPage.questions ?? [])];
    const totalAvailable = firstPage.total ?? allFetched.length;
    for (let offset = batchSize; offset < totalAvailable; offset += batchSize) {
      const pageData = await queryClient.fetchQuery(trpc.question.list.queryOptions({ ...baseInput, offset }));
      allFetched.push(...(pageData.questions ?? []));
    }
    await handleAutoBundle({ ...data, examTypeId: "CPNS", sectionTypeId: section || "TIU", allQuestions: allFetched });
    setIsAutoBundleOpen(false);
  };

  return (
    <div>
      {selectedQuestion && (
        <QuestionDetailModal
          question={selectedQuestion}
          onClose={() => setSelectedQuestion(null)}
          isSelected={isQuestionInBundle(selectedQuestion.id)}
          onToggleSelect={() => toggleQuestion(selectedQuestion)}
          isSelectable={true}
        />
      )}

      <CpnsPageHeader icon="database" title="Bank Soal CPNS" subtitle="Pilih soal untuk dibuat paket latihan" />

      {/* Search + Section filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--warm-silver)] text-sm" />
          <input
            type="text" placeholder="Cari soal..." value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] text-sm text-[var(--clay-black)] placeholder:text-[var(--warm-silver)] focus:outline-none focus:border-[var(--matcha-500)]"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["", ...CPNS_SECTIONS].map((s) => (
            <button
              key={s || "all"}
              onClick={() => navigate({ search: { sectionTypeId: s || undefined, page: 1 } as any, replace: true })}
              className={`px-3 py-1.5 rounded-[var(--radius-lg)] text-xs font-semibold border-2 transition-all ${!section === !s
                  ? "border-[var(--matcha-500)] bg-[var(--matcha-300)]/10 text-[var(--matcha-800)]"
                  : "border-[var(--oat-border)] text-[var(--warm-charcoal)] hover:border-[var(--oat-light)]"
                }`}
            >
              {s || "Semua"}
            </button>
          ))}
        </div>
      </div>

      {/* Results count + bundle badge */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[var(--warm-silver)]">{total} soal ditemukan</p>
        {bundleQuestions.length > 0 && (
          <span className="px-3 py-1 rounded-full bg-[var(--blueberry-800)]/10 text-[var(--blueberry-800)] text-xs font-semibold">
            {bundleQuestions.length} soal dipilih
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Questions */}
        <div className="lg:col-span-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {isLoading && (
              <Card className="md:col-span-2 bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
                <CardContent className="p-8 text-center">
                  <div className="animate-spin inline-block mb-2 text-lg">⟳</div>
                  <p className="text-sm text-[var(--warm-charcoal)]">Memuat soal...</p>
                </CardContent>
              </Card>
            )}
            {!isLoading && rows.length === 0 && (
              <Card className="md:col-span-2 bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
                <CardContent className="p-8 text-center">
                  <p className="text-sm font-semibold text-[var(--clay-black)] mb-1">Belum ada soal</p>
                  <p className="text-xs text-[var(--warm-charcoal)] mb-4">Generate soal CPNS terlebih dahulu</p>
                  <Button onClick={() => navigate({ to: "/cpns/generate" })} className="bg-[var(--clay-black)] text-[var(--pure-white)] rounded-[var(--radius-lg)]">
                    Generate Soal
                  </Button>
                </CardContent>
              </Card>
            )}
            {rows.map((q: any) => (
              <CpnsQuestionCard
                key={q.id}
                question={q}
                isSelected={isQuestionInBundle(q.id)}
                onToggle={() => toggleQuestion(q)}
                onClick={() => setSelectedQuestion(q)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          )}
        </div>

        {/* Right: BundleSidebar */}
        <div className="lg:col-span-4 sticky top-24 self-start">
          <BundleSidebar
            mode="soal"
            bundleQuestions={bundleQuestions}
            bundleSections={[]}
            bundleTitle={bundleTitle}
            bundleDescription={bundleDescription}
            bundleIsPublic={bundleIsPublic}
            isCreating={isCreating}
            autoBundleExamType="CPNS"
            lockedExamType="CPNS"
            onSetTitle={setBundleTitle}
            onSetDescription={setBundleDescription}
            onSetIsPublic={setBundleIsPublic}
            onRemoveFromBundle={(id) => removeFromBundle(id)}
            onCreateFromQuestions={handleCreateFromQuestions}
            onCreateFromSections={() => {}}
            onOpenAutoBundle={() => setIsAutoBundleOpen(true)}
          />
        </div>
      </div>

      {isAutoBundleOpen && (
        <AutoBundleModal
          availableCount={total}
          examTypeName="CPNS SKD"
          sectionTypeName={CPNS_SECTIONS.find((s) => s === section) ?? "TIU"}
          onClose={() => setIsAutoBundleOpen(false)}
          onCreate={onAutoBundle}
          isPending={isPackagePending}
        />
      )}
    </div>
  );
}
