import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch, useNavigate } from "@tanstack/react-router";
import { trpc } from "@/utils/trpc";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Pagination } from "@/components/admin/Pagination";
import { QuestionDetailModal } from "@/components/bank/QuestionDetailModal";
import { CPNS_SECTIONS, CPNS_SECTION_NAMES, CPNS_SECTION_ICONS, type CpnsSection } from "@/lib/cpns-constants";

const LIMIT = 12;

export function CpnsBankComponent() {
  const search = useSearch({ strict: false }) as Record<string, string>;
  const navigate = useNavigate();

  const searchText = search.search ?? "";
  const section = search.sectionTypeId ?? "";
  const page = parseInt(search.page ?? "1", 10) || 1;
  const offset = (page - 1) * LIMIT;

  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);

  function setParam(key: string, value: string) {
    navigate({ search: { [key]: value || undefined, page: 1 } as any, replace: true });
  }

  function setPage(newPage: number) {
    navigate({ search: { ...search, page: newPage } as any, replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const questions = useQuery(
    trpc.question.list.queryOptions({
      examTypeId: "CPNS",
      sectionTypeId: section || undefined,
      search: searchText || undefined,
      limit: LIMIT,
      offset,
    }),
  );

  const rows = questions.data?.questions ?? [];
  const total = questions.data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);
  const isLoading = questions.isLoading;

  return (
    <div>
      {selectedQuestion && (
        <QuestionDetailModal
          question={selectedQuestion}
          onClose={() => setSelectedQuestion(null)}
        />
      )}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-[var(--radius-lg)] bg-[var(--blueberry-800)] flex items-center justify-center">
          <MaterialIcon name="database" className="text-lg text-[var(--pure-white)]" />
        </div>
        <div>
          <h1 className="text-xl font-headline font-bold text-[var(--clay-black)]">Bank Soal CPNS</h1>
          <p className="text-xs text-[var(--warm-charcoal)]">Jelajahi soal-soal CPNS yang sudah digenerate</p>
        </div>
      </div>

      {/* Search + Section filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--warm-silver)] text-sm" />
          <input
            type="text"
            placeholder="Cari soal..."
            value={searchText}
            onChange={(e) => setParam("search", e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] text-sm text-[var(--clay-black)] placeholder:text-[var(--warm-silver)] focus:outline-none focus:border-[var(--matcha-500)]"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setParam("sectionTypeId", ""); }}
            className={`px-3 py-1.5 rounded-[var(--radius-lg)] text-xs font-semibold border-2 transition-all ${
              !section
                ? "border-[var(--matcha-500)] bg-[var(--matcha-300)]/10 text-[var(--matcha-800)]"
                : "border-[var(--oat-border)] text-[var(--warm-charcoal)] hover:border-[var(--oat-light)]"
            }`}
          >
            Semua
          </button>
          {(CPNS_SECTIONS as unknown as CpnsSection[]).map((s) => (
            <button
              key={s}
              onClick={() => setParam("sectionTypeId", s)}
              className={`px-3 py-1.5 rounded-[var(--radius-lg)] text-xs font-semibold border-2 transition-all ${
                section === s
                  ? "border-[var(--matcha-500)] bg-[var(--matcha-300)]/10 text-[var(--matcha-800)]"
                  : "border-[var(--oat-border)] text-[var(--warm-charcoal)] hover:border-[var(--oat-light)]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-[var(--warm-silver)] mb-3">{total} soal ditemukan</p>

      {/* Question list */}
      <div className="space-y-3">
        {isLoading && (
          <Card className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
            <CardContent className="p-8 text-center">
              <div className="animate-spin inline-block mb-2 text-lg">⟳</div>
              <p className="text-sm text-[var(--warm-charcoal)]">Memuat soal...</p>
            </CardContent>
          </Card>
        )}
        {!isLoading && rows.length === 0 && (
          <Card className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
            <CardContent className="p-8 text-center">
              <MaterialIcon name="database" className="text-3xl text-[var(--warm-silver)] mb-3" />
              <p className="text-sm font-semibold text-[var(--clay-black)] mb-1">Belum ada soal</p>
              <p className="text-xs text-[var(--warm-charcoal)] mb-4">Generate soal CPNS terlebih dahulu</p>
              <Button
                onClick={() => navigate({ to: "/cpns/generate" })}
                className="bg-[var(--clay-black)] text-[var(--pure-white)] rounded-[var(--radius-lg)]"
              >
                Generate Soal
              </Button>
            </CardContent>
          </Card>
        )}
        {rows.map((q: any) => (
          <button key={q.id} onClick={() => setSelectedQuestion(q)} className="w-full text-left">
            <Card className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-lg)] hover:border-[var(--matcha-400)] transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`h-8 w-8 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 ${
                    q.sectionTypeId === "TIU" ? "bg-[var(--matcha-300)]" :
                    q.sectionTypeId === "TWK" ? "bg-[var(--slushie-500)]/30" :
                    "bg-[var(--lemon-400)]/50"
                  }`}>
                    <MaterialIcon name={(CPNS_SECTION_ICONS[q.sectionTypeId] ?? "quiz") as any} className="text-xs" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full bg-[var(--blueberry-800)]/10 text-[var(--blueberry-800)] text-[10px] font-semibold">{q.sectionTypeId}</span>
                      <span className="text-[10px] text-[var(--warm-silver)]">{q.format}</span>
                      <span className="text-[10px] text-[var(--warm-silver)]">
                        <MaterialIcon name="star" className="text-[10px] align-text-top" />
                        {q.difficulty}/5
                      </span>
                    </div>
                    <p className="text-sm text-[var(--clay-black)] line-clamp-2">{q.questionText}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      )}
    </div>
  );
}
