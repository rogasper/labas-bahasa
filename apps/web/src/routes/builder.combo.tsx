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

export const Route = createFileRoute("/builder/combo")({
  component: ComboBuilderComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({ to: "/login", throw: true });
    }
    return { session };
  },
});

function MaterialIcon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

interface SelectedSection {
  sourcePackageId: string;
  sourceSectionId: string;
  packageTitle: string;
  sectionTitle: string;
  sectionTypeName: string;
  examTypeName: string;
}

function ComboBuilderComponent() {
  const [step, setStep] = useState<"select" | "review">("select");
  const [search, setSearch] = useState("");
  const [examTypeFilter, setExamTypeFilter] = useState("");
  const [selectedSections, setSelectedSections] = useState<SelectedSection[]>([]);

  // Package form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const availableQuery = useQuery(
    trpc.combo.availableSections.queryOptions({
      examTypeId: examTypeFilter || undefined,
      search: search || undefined,
      limit: 50,
      offset: 0,
    }),
  );

  const createCombo = useMutation({
    ...trpc.combo.create.mutationOptions(),
  });

  const toggleSection = (section: SelectedSection) => {
    setSelectedSections((prev) => {
      const exists = prev.find(
        (s) => s.sourceSectionId === section.sourceSectionId,
      );
      if (exists) {
        return prev.filter((s) => s.sourceSectionId !== section.sourceSectionId);
      }
      return [...prev, section];
    });
  };

  const handleCreateCombo = async () => {
    if (!title || selectedSections.length === 0) return;

    try {
      await createCombo.mutateAsync({
        title,
        description,
        isPublic,
        sections: selectedSections.map((s, i) => ({
          sourcePackageId: s.sourcePackageId,
          sourceSectionId: s.sourceSectionId,
          orderIndex: i,
        })),
      });

      alert(`Combo paket "${title}" berhasil dibuat!`);
      setSelectedSections([]);
      setTitle("");
      setDescription("");
      setStep("select");
    } catch (err: any) {
      alert("Gagal membuat combo: " + err.message);
    }
  };

  const sections = availableQuery.data?.sections ?? [];
  const groupedSections = sections.reduce((groups, section) => {
    const key = `${section.examTypeName} — ${section.packageTitle}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(section);
    return groups;
  }, {} as Record<string, typeof sections>);

  return (
    <div className="min-h-screen pt-8 pb-32 px-6 md:px-12 lg:px-16 max-w-7xl mx-auto bg-[var(--warm-cream)]">
      <section className="mb-8">
        <h1 className="text-4xl font-headline font-extrabold text-[var(--clay-black)] tracking-tight">
          Package Combiner
        </h1>
        <p className="text-lg text-[var(--warm-charcoal)] mt-2">
          Gabungkan section dari berbagai paket jadi satu paket ujian baru.
        </p>
        <div className="mt-3 p-3 rounded-[var(--radius-md)] bg-[var(--lemon-400)]/20 border-2 border-[var(--lemon-500)]/30 text-sm text-[var(--lemon-800)] flex items-start gap-2">
          <MaterialIcon name="info" className="text-sm mt-0.5 shrink-0" />
          <span>Pilih section (kelompok soal) dari paket yang sudah ada. Bedanya dengan Builder: disini kamu gabungkan section utuh, bukan pilih soal satu per satu.</span>
        </div>
      </section>

      {step === "select" ? (
        <>
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 sticky top-0 z-30 bg-[var(--warm-cream)] py-4">
            <div className="flex gap-3 flex-1 w-full md:w-auto">
              <div className="relative flex-1 max-w-md">
                <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--warm-charcoal)]" />
                <Input
                  placeholder="Cari paket..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] h-11"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-[var(--warm-charcoal)]">
                <span className="font-bold text-[var(--clay-black)]">{selectedSections.length}</span> section dipilih
              </span>
              <Button
                onClick={() => selectedSections.length > 0 && setStep("review")}
                disabled={selectedSections.length === 0}
                className="bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] clay-hover rounded-[var(--radius-lg)]"
              >
                <MaterialIcon name="arrow_forward" />
                <span className="ml-2">Lanjut</span>
              </Button>
            </div>
          </div>

          {/* Sections by Package */}
          {availableQuery.isLoading ? (
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
                      {groupSections.map((section) => {
                        const isSelected = selectedSections.some(
                          (s) => s.sourceSectionId === section.id,
                        );
                        return (
                          <div
                            key={section.id}
                            onClick={() =>
                              toggleSection({
                                sourcePackageId: section.packageId,
                                sourceSectionId: section.id,
                                packageTitle: section.packageTitle ?? "Untitled",
                                sectionTitle: section.title,
                                sectionTypeName: section.sectionTypeName ?? "Unknown",
                                examTypeName: section.examTypeName ?? "Unknown",
                              })
                            }
                            className={`cursor-pointer rounded-[var(--radius-lg)] border-2 p-4 transition-all clay-hover ${
                              isSelected
                                ? "border-[var(--clay-black)] bg-[var(--matcha-300)]/10 clay-shadow"
                                : "border-[var(--oat-border)] hover:bg-[var(--oat-light)]"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                isSelected ? "bg-[var(--clay-black)] border-[var(--clay-black)]" : "border-[var(--oat-border)]"
                              }`}>
                                {isSelected && <MaterialIcon name="check" className="text-xs text-[var(--pure-white)]" />}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-[var(--clay-black)]">{section.title}</p>
                                <div className="flex gap-2 mt-1">
                                  <span className="px-2 py-0.5 rounded-full bg-[var(--slushie-500)]/20 text-[var(--slushie-800)] text-xs font-semibold">
                                    {section.sectionTypeName}
                                  </span>
                                </div>
                              </div>
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
      ) : (
        /* Review Step */
        <div className="max-w-2xl mx-auto">
          <Button
            variant="outline"
            onClick={() => setStep("select")}
            className="mb-6 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] clay-hover"
          >
            <MaterialIcon name="arrow_back" />
            <span className="ml-2">Kembali</span>
          </Button>

          <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)] mb-6">
            <CardContent className="p-6 space-y-5">
              <h2 className="font-headline text-xl font-bold text-[var(--clay-black)]">Detail Combo Paket</h2>

              <div>
                <label className="text-sm font-medium text-[var(--clay-black)] block mb-1">Judul</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. IELTS Mixed Practice"
                  className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)]"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--clay-black)] block mb-1">Deskripsi</label>
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
                <span className="text-sm text-[var(--warm-charcoal)]">Publikasikan ke Bank Soal</span>
              </label>
            </CardContent>
          </Card>

          <Card className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)] mb-6">
            <CardContent className="p-6">
              <h3 className="font-headline text-lg font-bold text-[var(--clay-black)] mb-4">
                Section Terpilih ({selectedSections.length})
              </h3>
              <div className="space-y-3">
                {selectedSections.map((sec, idx) => (
                  <div key={sec.sourceSectionId} className="flex items-start gap-3 p-3 rounded-[var(--radius-lg)] bg-[var(--oat-light)]">
                    <span className="w-6 h-6 rounded-full bg-[var(--clay-black)] text-[var(--pure-white)] text-xs flex items-center justify-center font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--clay-black)]">{sec.sectionTitle}</p>
                      <p className="text-xs text-[var(--warm-charcoal)]">{sec.packageTitle} · {sec.examTypeName}</p>
                    </div>
                    <button
                      onClick={() => toggleSection(sec)}
                      className="text-[var(--pomegranate-400)] hover:text-[var(--pomegranate-400)]/80"
                    >
                      <MaterialIcon name="close" className="text-sm" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleCreateCombo}
            disabled={!title || createCombo.isPending}
            className="w-full py-4 rounded-[var(--radius-lg)] bg-[var(--clay-black)] text-[var(--pure-white)] font-bold text-lg clay-shadow clay-hover hover:bg-[var(--warm-charcoal)] h-auto"
          >
            <MaterialIcon name="construction" />
            <span className="ml-2">
              {createCombo.isPending ? "Membuat Combo..." : "Buat Combo Paket"}
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}
