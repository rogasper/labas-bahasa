import { useState, useRef, useEffect } from "react";
import { Card } from "@labas/ui/components/card";
import { Button } from "@labas/ui/components/button";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { QuestionCard } from "./QuestionCard";

interface SoalBrowserProps {
  isLoading: boolean;
  questions: any[];
  hasMore: boolean;
  isFetchingNextPage: boolean;
  hasFilters: boolean;
  userId?: string;
  lockedExamType?: string | null;
  tab: "mine" | "public";
  filterKey: string;
  isQuestionInBundle: (id: string) => boolean;
  onToggleQuestion: (q: any) => void;
  onOpenDetail: (q: any) => void;
  onTogglePublic: (id: string) => void;
  onDelete: (id: string) => void;
  onLoadMore: () => void;
  onClearFilters: () => void;
  onBulkPublish?: (ids: string[]) => void;
}

export function SoalBrowser({
  isLoading,
  questions,
  hasMore,
  isFetchingNextPage,
  hasFilters,
  userId,
  lockedExamType,
  tab,
  filterKey,
  isQuestionInBundle,
  onToggleQuestion,
  onOpenDetail,
  onTogglePublic,
  onDelete,
  onLoadMore,
  onClearFilters,
  onBulkPublish,
}: SoalBrowserProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLocked = (q: any) => !!lockedExamType && q.examTypeId !== lockedExamType;

  // ── Bulk mode ──
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setBulkMode(false);
    setSelectedIds(new Set());
  }, [filterKey]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isFetchingNextPage, onLoadMore]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectAll = () => {
    setSelectedIds(new Set(questions.map((q: any) => q.id)));
  };

  const handleBulkPublish = () => {
    if (onBulkPublish && selectedIds.size > 0) {
      onBulkPublish(Array.from(selectedIds));
      setBulkMode(false);
      setSelectedIds(new Set());
    }
  };

  // ── Loading state ──
  if (isLoading && questions.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="h-48 bg-[var(--oat-light)] animate-pulse rounded-[var(--radius-xl)]" />
        ))}
      </div>
    );
  }

  // ── Empty state ──
  if (questions.length === 0) {
    return (
      <div className="text-center py-20">
        <MaterialIcon name="search_off" className="text-6xl text-[var(--warm-silver)] mx-auto mb-4" />
        <p className="text-lg text-[var(--warm-charcoal)] font-semibold">Tidak ada soal ditemukan</p>
        {hasFilters && (
          <button
            onClick={onClearFilters}
            className="mt-3 text-sm text-[var(--pomegranate-400)] font-medium hover:underline cursor-pointer"
          >
            Hapus filter
          </button>
        )}
      </div>
    );
  }

  // ── Bulk mode toolbar ──
  const renderBulkToolbar = () => {
    if (!onBulkPublish || tab !== "mine") return null;
    return (
      <div className="flex items-center justify-between mb-4 p-3 rounded-[var(--radius-lg)] bg-[var(--oat-light)] border-2 border-[var(--oat-border)]">
        {bulkMode ? (
          <>
            <div className="flex items-center gap-3">
              <button
                onClick={clearSelection}
                className="text-xs font-semibold text-[var(--warm-charcoal)] hover:text-[var(--clay-black)] transition-colors cursor-pointer"
              >
                Batalkan ({selectedIds.size})
              </button>
              <button
                onClick={selectAll}
                className="text-xs font-semibold text-[var(--matcha-600)] hover:text-[var(--matcha-800)] transition-colors cursor-pointer"
              >
                Pilih Semua
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                disabled={selectedIds.size === 0}
                onClick={handleBulkPublish}
                className="rounded-[var(--radius-lg)] bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] text-xs cursor-pointer"
              >
                <MaterialIcon name="public" className="text-xs mr-1" />
                Jadikan Publik ({selectedIds.size})
              </Button>
              <button
                onClick={() => { setBulkMode(false); setSelectedIds(new Set()); }}
                className="text-xs text-[var(--warm-charcoal)] hover:text-[var(--clay-black)] transition-colors cursor-pointer font-semibold ml-2"
              >
                Selesai
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="text-xs font-semibold text-[var(--warm-charcoal)]">
              {questions.length} soal
            </span>
            <button
              onClick={() => setBulkMode(true)}
              className="text-xs font-semibold text-[var(--matcha-600)] hover:text-[var(--matcha-800)] transition-colors cursor-pointer flex items-center gap-1"
            >
              <MaterialIcon name="select_all" className="text-sm" />
              Pilih Banyak
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderBulkToolbar()}
        <div className="md:col-span-2" />

        {questions[0] && (
          <div className="md:col-span-2">
            <QuestionCard
              q={questions[0]}
              isFeatured
              isInBundle={isQuestionInBundle(questions[0].id)}
              disabled={bulkMode ? false : isLocked(questions[0])}
              selected={bulkMode ? selectedIds.has(questions[0].id) : false}
              bulkSelect={bulkMode}
              onToggle={() => bulkMode ? toggleSelect(questions[0].id) : onToggleQuestion(questions[0])}
              onOpenDetail={() => bulkMode ? toggleSelect(questions[0].id) : onOpenDetail(questions[0])}
              isOwner={questions[0].creatorUserId === userId}
              onTogglePublic={() => onTogglePublic(questions[0].id)}
              onDelete={() => onDelete(questions[0].id)}
            />
          </div>
        )}
        {questions.slice(1).map((q) => (
          <QuestionCard
            key={q.id}
            q={q}
            isInBundle={isQuestionInBundle(q.id)}
            disabled={bulkMode ? false : isLocked(q)}
            selected={bulkMode ? selectedIds.has(q.id) : false}
            bulkSelect={bulkMode}
            onToggle={() => bulkMode ? toggleSelect(q.id) : onToggleQuestion(q)}
            onOpenDetail={() => bulkMode ? toggleSelect(q.id) : onOpenDetail(q)}
            isOwner={q.creatorUserId === userId}
            onTogglePublic={() => onTogglePublic(q.id)}
            onDelete={() => onDelete(q.id)}
          />
        ))}
      </div>

      {isFetchingNextPage && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-40 bg-[var(--oat-light)] animate-pulse rounded-[var(--radius-xl)]" />
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="h-4" />

      {!hasMore && questions.length > 0 && (
        <p className="text-center text-sm text-[var(--warm-silver)] mt-8">
          Semua soal telah dimuat ({questions.length} soal)
        </p>
      )}
    </>
  );
}
