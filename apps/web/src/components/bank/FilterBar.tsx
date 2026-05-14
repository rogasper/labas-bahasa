import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@labas/ui/components/button";
import { Input } from "@labas/ui/components/input";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { EXAM_TYPES } from "@/lib/exam-constants";

interface FilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

interface FilterBarProps {
  mode: "soal" | "section";
  tab: "mine" | "public";
  searchText: string;
  examType: string;
  visibility?: "all" | "private" | "public";
  activeChips: FilterChip[];
  hasFilters: boolean;
  isAdvancedOpen: boolean;
  lockedExamType?: string | null;
  dataTour?: string;
  onToggleAdvanced: () => void;
  onSetMode: (mode: "soal" | "section") => void;
  onSetTab: (tab: "mine" | "public") => void;
  onSetSearch: (value: string) => void;
  onSetExamType: (value: string) => void;
  onSetVisibility?: (value: "all" | "private" | "public") => void;
  onClearFilters: () => void;
  onOpenMobileSheet: () => void;
  advancedFilters: React.ReactNode;
}

export function FilterBar({
  mode,
  tab,
  searchText,
  examType,
  visibility = "all",
  activeChips,
  hasFilters,
  isAdvancedOpen,
  lockedExamType,
  dataTour,
  onToggleAdvanced,
  onSetMode,
  onSetTab,
  onSetSearch,
  onSetExamType,
  onSetVisibility,
  onClearFilters,
  onOpenMobileSheet,
  advancedFilters,
}: FilterBarProps) {
  return (
    <div data-tour={dataTour} className="sticky top-0 z-30 bg-[var(--warm-cream)]/90 backdrop-blur-md border-b border-[var(--oat-border)] transition-all duration-200">
      <div className="px-6 md:px-12 lg:px-16 max-w-7xl mx-auto pt-4 pb-3 space-y-3">
        {/* ── Tier 1: Mode tabs ── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <ModeButton active={mode === "soal"} onClick={() => onSetMode("soal")}>
              Dari Soal
            </ModeButton>
            <ModeButton active={mode === "section"} onClick={() => onSetMode("section")}>
              Dari Section
            </ModeButton>
          </div>
          {mode === "soal" && (
            <div className="flex gap-2">
              <TabButton active={tab === "mine"} onClick={() => onSetTab("mine")}>
                Soal Saya
              </TabButton>
              <TabButton active={tab === "public"} onClick={() => onSetTab("public")}>
                Publik
              </TabButton>
            </div>
          )}
        </div>

        {/* ── Tier 2: Exam type chips ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <ChipButton
            active={examType === ""}
            onClick={() => onSetExamType("")}
            disabled={!!lockedExamType}
          >
            Semua
          </ChipButton>
          {EXAM_TYPES.map((t) => {
            const isLocked = !!lockedExamType && lockedExamType !== t.id;
            return (
              <ChipButton
                key={t.id}
                active={examType === t.id}
                onClick={() => {
                  if (!isLocked) onSetExamType(t.id);
                }}
                disabled={isLocked}
              >
                <span className="flex items-center gap-1.5">
                  {t.name}
                  {isLocked && <MaterialIcon name="lock" className="text-[10px]" />}
                </span>
              </ChipButton>
            );
          })}
        </div>

        {/* ── Visibility sub-filter (only in "mine" tab) ── */}
        {mode === "soal" && tab === "mine" && onSetVisibility && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <VisChipButton
              active={visibility === "all"}
              onClick={() => onSetVisibility("all")}
            >
              <MaterialIcon name="visibility" className="text-xs" />
              Semua
            </VisChipButton>
            <VisChipButton
              active={visibility === "private"}
              onClick={() => onSetVisibility("private")}
            >
              <MaterialIcon name="lock" className="text-xs" />
              Privat
            </VisChipButton>
            <VisChipButton
              active={visibility === "public"}
              onClick={() => onSetVisibility("public")}
            >
              <MaterialIcon name="public" className="text-xs" />
              Publik
            </VisChipButton>
          </div>
        )}

        {/* ── Tier 3: Search + Advanced filter toggle ── */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--warm-charcoal)]" />
            <Input
              placeholder={mode === "soal" ? "Cari soal..." : "Cari section..."}
              value={searchText}
              onChange={(e) => onSetSearch(e.target.value)}
              className="pl-10 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] h-11"
            />
          </div>

          {/* Desktop: inline expand toggle */}
          {mode === "soal" && (
            <div className="hidden md:flex gap-2">
              <Button
                variant="outline"
                onClick={onToggleAdvanced}
                className={`rounded-[var(--radius-lg)] border-2 h-11 clay-hover cursor-pointer ${
                  isAdvancedOpen ? "border-[var(--clay-black)] bg-[var(--oat-light)]" : "border-[var(--oat-border)]"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                <span className="text-sm">Filter</span>
                {activeChips.length > 0 && (
                  <span className="ml-2 bg-[var(--clay-black)] text-[var(--pure-white)] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {activeChips.length}
                  </span>
                )}
              </Button>
              {hasFilters && (
                <Button
                  variant="outline"
                  onClick={onClearFilters}
                  className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] h-11 clay-hover cursor-pointer"
                >
                  <MaterialIcon name="filter_alt_off" />
                  <span className="ml-2 hidden sm:inline">Reset</span>
                </Button>
              )}
            </div>
          )}

          {/* Mobile: bottom sheet trigger */}
          {mode === "soal" && (
            <div className="flex md:hidden gap-2">
              <Button
                variant="outline"
                onClick={onOpenMobileSheet}
                className={`flex-1 rounded-[var(--radius-lg)] border-2 h-11 clay-hover cursor-pointer ${
                  activeChips.length > 0 ? "border-[var(--clay-black)] bg-[var(--oat-light)]" : "border-[var(--oat-border)]"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                <span className="text-sm">Filter</span>
                {activeChips.length > 0 && (
                  <span className="ml-2 bg-[var(--clay-black)] text-[var(--pure-white)] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {activeChips.length}
                  </span>
                )}
              </Button>
              {hasFilters && (
                <Button
                  variant="outline"
                  onClick={onClearFilters}
                  className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] h-11 clay-hover cursor-pointer px-3"
                >
                  <MaterialIcon name="filter_alt_off" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* ── Active filter chips ── */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                onClick={chip.onRemove}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--clay-black)] text-[var(--pure-white)] text-xs font-medium cursor-pointer hover:bg-[var(--warm-charcoal)] transition-colors"
              >
                {chip.label}
                <MaterialIcon name="close" className="text-xs" />
              </button>
            ))}
            <button
              onClick={onClearFilters}
              className="text-xs text-[var(--pomegranate-400)] font-medium hover:underline cursor-pointer px-1"
            >
              Reset semua
            </button>
          </div>
        )}

        {/* ── Desktop: inline advanced filters ── */}
        {mode === "soal" && isAdvancedOpen && (
          <div className="hidden md:flex flex-wrap gap-3 pt-2 border-t border-[var(--oat-border)]">
            {advancedFilters}
          </div>
        )}
      </div>
    </div>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-[var(--radius-lg)] text-sm font-semibold transition-all cursor-pointer ${
        active
          ? "bg-[var(--clay-black)] text-[var(--pure-white)] clay-shadow"
          : "bg-[var(--pure-white)] text-[var(--warm-charcoal)] border-2 border-[var(--oat-border)] hover:bg-[var(--oat-light)]"
      }`}
    >
      {children}
    </button>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-[var(--radius-lg)] text-xs font-semibold transition-all cursor-pointer ${
        active
          ? "bg-[var(--matcha-300)] text-[var(--matcha-800)]"
          : "bg-[var(--pure-white)] text-[var(--warm-charcoal)] border-2 border-[var(--oat-border)] hover:bg-[var(--oat-light)]"
      }`}
    >
      {children}
    </button>
  );
}

function VisChipButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
        active
          ? "bg-[var(--clay-black)] text-[var(--pure-white)] clay-shadow"
          : "bg-[var(--pure-white)] text-[var(--warm-charcoal)] border-2 border-[var(--oat-border)] hover:bg-[var(--oat-light)]"
      }`}
    >
      {children}
    </button>
  );
}

function ChipButton({ active, onClick, children, disabled }: { active: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
        disabled
          ? "bg-[var(--oat-light)] text-[var(--warm-silver)] border-2 border-[var(--oat-border)] cursor-not-allowed opacity-50"
          : active
            ? "bg-[var(--clay-black)] text-[var(--pure-white)] clay-shadow cursor-pointer"
            : "bg-[var(--pure-white)] text-[var(--warm-charcoal)] border-2 border-[var(--oat-border)] hover:bg-[var(--oat-light)] cursor-pointer"
      }`}
    >
      {children}
    </button>
  );
}
