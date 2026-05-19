import { Card, CardContent } from "@labas/ui/components/card";
import { Button } from "@labas/ui/components/button";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import type { PackageSection } from "@/lib/types";

interface SectionBrowserProps {
  isLoading: boolean;
  groupedSections: Record<string, PackageSection[]>;
  isSectionInBundle: (id: string) => boolean;
  onToggleSection: (s: PackageSection) => void;
}

export function SectionBrowser({
  isLoading,
  groupedSections,
  isSectionInBundle,
  onToggleSection,
}: SectionBrowserProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="h-24 bg-[var(--oat-light)] animate-pulse rounded-[var(--radius-xl)]" />
        ))}
      </div>
    );
  }

  if (Object.keys(groupedSections).length === 0) {
    return (
      <div className="text-center py-20">
        <MaterialIcon name="folder_open" className="text-6xl text-[var(--warm-silver)] mx-auto mb-4" />
        <p className="text-lg text-[var(--warm-charcoal)] font-semibold">Tidak ada section ditemukan</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedSections).map(([groupKey, groupSections]) => (
        <Card key={groupKey} className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
          <CardContent className="p-5">
            <h2 className="font-headline font-bold text-[var(--clay-black)] mb-4 text-sm uppercase tracking-wider">
              {groupKey}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {groupSections.map((s) => {
                const inBundle = isSectionInBundle(s.id);
                return (
                  <div
                    key={s.id}
                    className={`rounded-[var(--radius-lg)] border-2 p-4 transition-all clay-hover cursor-pointer ${
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
                          onToggleSection(s);
                        }}
                        className={`shrink-0 rounded-[var(--radius-lg)] text-xs cursor-pointer ${
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
  );
}
