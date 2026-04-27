import { useState, useMemo } from "react";

interface Question {
  id: string;
  examTypeId: string;
  [key: string]: any;
}

export function useQuestionSelection(questions: Question[]) {
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const lockedExamType = useMemo(() => {
    if (selectedIds.size === 0) return null;
    const firstId = Array.from(selectedIds)[0];
    const firstQ = questions.find((q) => q.id === firstId);
    return firstQ?.examTypeId ?? null;
  }, [selectedIds, questions]);

  const toggleSelection = (id: string) => {
    const q = questions.find((item) => item.id === id);
    if (!q) return;
    if (lockedExamType && q.examTypeId !== lockedExamType) return;

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (lockedExamType) {
      setSelectedIds(
        new Set(questions.filter((q) => q.examTypeId === lockedExamType).map((q) => q.id)),
      );
    } else {
      setSelectedIds(new Set(questions.map((q) => q.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  };

  return {
    isSelectMode,
    setIsSelectMode,
    selectedIds,
    lockedExamType,
    toggleSelection,
    selectAll,
    clearSelection,
    exitSelectMode,
  };
}
