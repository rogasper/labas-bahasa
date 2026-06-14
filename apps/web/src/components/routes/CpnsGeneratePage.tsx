import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { useApiKeys } from "@/hooks/use-api-key";
import { useGenerationJobs, type CompletedResult } from "@/hooks/use-generation-jobs";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent } from "@labas/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@labas/ui/components/select";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { ResultSection } from "@/components/generate/ResultSection";
import {
  CPNS_SECTIONS,
  CPNS_SECTION_NAMES,
  CPNS_SECTION_DESCRIPTIONS,
  CPNS_SECTION_ICONS,
  CPNS_SECTION_CONFIG,
  CPNS_FULL_TEST,
  CPNS_FULL_PRESETS,
  CPNS_DRILL_PRESETS,
  CPNS_DIFFICULTY_LABELS,
  CPNS_SECTION_FORMATS,
  CPNS_SECTION_TOPICS,
  type CpnsSection,
} from "@/lib/cpns-constants";
import { toast } from "sonner";

type ModeTab = "latihan" | "full-test";

const SWATCH_COLORS: Record<string, string> = {
  TIU: "bg-[var(--matcha-300)] text-[var(--matcha-800)]",
  TWK: "bg-[var(--slushie-500)]/30 text-[var(--slushie-800)]",
  TKP: "bg-[var(--lemon-400)]/50 text-[var(--lemon-800)]",
};

export function CpnsGenerateComponent() {
  const { configs, hasConfigs } = useApiKeys();
  const [selectedKeyId, setSelectedKeyId] = useState(configs[0]?.id ?? "");
  const [modeTab, setModeTab] = useState<ModeTab>("latihan");
  const [selectedSection, setSelectedSection] = useState<CpnsSection>("TIU");
  const [selectedCount, setSelectedCount] = useState(5);
  const [difficulty, setDifficulty] = useState(2);
  const [useFreeCredits, setUseFreeCredits] = useState(false);
  const navigate = useNavigate();

  const myCredit = useQuery(
    trpc.admin.getMyCredit.queryOptions(),
  );
  const hasFreeCredits = myCredit.data?.freeCreditsEnabled === true;
  const tokenBalance = myCredit.data?.tokenBalance ?? 0;

  useEffect(() => {
    if (configs.length > 0 && !configs.find((c) => c.id === selectedKeyId)) {
      setSelectedKeyId(configs[0].id);
    }
  }, [configs, selectedKeyId]);

  const selectedConfig = configs.find((c) => c.id === selectedKeyId);

  // Determine what to generate based on mode
  const isFullTest = modeTab === "full-test";
  const sectionsToGenerate = isFullTest ? (["TIU", "TWK", "TKP"] as unknown as CpnsSection[]) : [selectedSection];
  const questionCount = isFullTest ? CPNS_FULL_TEST.totalQuestions : selectedCount;
  const durationMin = isFullTest ? CPNS_FULL_TEST.totalDurationMin : CPNS_SECTION_CONFIG[selectedSection]?.durationMin ?? 25;
  const maxScore = isFullTest ? CPNS_FULL_TEST.totalMaxScore : CPNS_SECTION_CONFIG[selectedSection]?.maxScore ?? 175;

  // In full test mode, force question count per section
  const sectionConfigs = isFullTest
    ? CPNS_SECTIONS.map((s) => ({
      section: s,
      count: CPNS_SECTION_CONFIG[s].questionCount,
      format: CPNS_SECTION_FORMATS[s][0] ?? "multiple_choice",
    }))
    : [
      {
        section: selectedSection,
        count: selectedCount,
        format: (CPNS_SECTION_FORMATS[selectedSection] ?? ["multiple_choice"])[0],
      },
    ];

  // Presets for single section mode
  const currentPresets = isFullTest ? [] : (CPNS_FULL_PRESETS[selectedSection] ?? CPNS_DRILL_PRESETS);

  // Reset count when section changes
  useEffect(() => {
    if (!isFullTest) {
      const presets = CPNS_FULL_PRESETS[selectedSection] ?? CPNS_DRILL_PRESETS;
      setSelectedCount(presets[0]?.value ?? 5);
    }
  }, [selectedSection, isFullTest]);

  const {
    activeCount,
    completedResults,
    isGenerating,
    error,
    addJob,
    resetAll,
    dismissResult,
    setError,
  } = useGenerationJobs();

  const generateMutation = useMutation(
    trpc.ai.generate.mutationOptions({
      onSuccess: (data: any) => {
        addJob(data.jobId);
        setError(null);
        toast.success("Generasi soal dimulai!");
      },
      onError: (err: any) => {
        setError(err.message ?? "Terjadi kesalahan");
        toast.error(err.message ?? "Terjadi kesalahan");
      },
    }) as any,
  );

  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const prevResultsLengthRef = useRef(0);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (completedResults.length > 0 && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [completedResults.length]);

  useEffect(() => {
    const prev = prevResultsLengthRef.current;
    prevResultsLengthRef.current = completedResults.length;
    if (completedResults.length === 0) { setActiveTabIdx(0); return; }
    if (completedResults.length > prev) { setActiveTabIdx(completedResults.length - 1); return; }
    if (activeTabIdx >= completedResults.length) { setActiveTabIdx(completedResults.length - 1); }
  }, [completedResults.length]);

  const activeResult = completedResults[activeTabIdx] ?? null;

  const handleGenerate = () => {
    if (!hasConfigs && !useFreeCredits) {
      toast.error("Pilih API key atau gunakan free credits");
      return;
    }
    const apiKeyConfig = useFreeCredits ? undefined : {
      baseUrl: selectedConfig?.baseUrl ?? "",
      apiKey: selectedConfig?.apiKey ?? "",
      model: selectedConfig?.modelName ?? "",
      maxTokens: selectedConfig?.maxTokens ?? 16384,
    };

    const firstJob = sectionConfigs[0];
    generateMutation.mutate({
      examType: "CPNS" as const,
      section: firstJob.section as any,
      selectedSections: [firstJob.section as any],
      formats: [firstJob.format as any],
      difficulty,
      topics: CPNS_SECTION_TOPICS[firstJob.section] ?? [],
      questionCount: firstJob.count,
      mode: isFullTest ? "agentic" : (firstJob.count > 15 ? "agentic" : "quick") as any,
      apiKeyConfig: apiKeyConfig as any,
    } as any);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-[var(--radius-lg)] bg-[var(--blueberry-800)] flex items-center justify-center">
          <MaterialIcon name="auto_awesome" className="text-lg text-[var(--pure-white)]" />
        </div>
        <div>
          <h1 className="text-xl font-headline font-bold text-[var(--clay-black)]">Generate Soal CPNS</h1>
          <p className="text-xs text-[var(--warm-charcoal)]">
            Buat soal latihan CPNS berbasis AI — TIU, TWK, dan TKP
          </p>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-1 mb-6 bg-[var(--oat-light)] rounded-[var(--radius-lg)] p-0.5 border border-[var(--oat-border)] w-fit">
        {(["latihan", "full-test"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setModeTab(tab); }}
            className={`px-4 py-2 rounded-[var(--radius-md)] text-sm font-semibold transition-all ${modeTab === tab
                ? "bg-[var(--matcha-300)] text-[var(--matcha-800)] shadow-sm"
                : "text-[var(--warm-charcoal)] hover:text-[var(--clay-black)]"
              }`}
          >
            {tab === "latihan" ? "Latihan" : "Full Test SKD"}
          </button>
        ))}
      </div>

      {/* Generation Mode — full width, above grid */}
      <div className="mb-8 p-5 rounded-[var(--radius-xl)] bg-[var(--pure-white)] border-2 border-[var(--oat-border)]">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-[var(--clay-black)]">Generation Mode</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setUseFreeCredits(false); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-lg)] text-sm font-medium transition-all ${!useFreeCredits
                ? "bg-[var(--clay-black)] text-[var(--pure-white)]"
                : "bg-[var(--oat-light)] text-[var(--warm-charcoal)] hover:bg-[var(--oat-border)]"
              }`}
          >
            <MaterialIcon name="vpn_key" className="text-sm" />
            BYOK
          </button>
          {hasFreeCredits && (
            <button
              onClick={() => { setUseFreeCredits(true); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-lg)] text-sm font-medium transition-all ${useFreeCredits
                  ? "bg-[var(--clay-black)] text-[var(--pure-white)]"
                  : "bg-[var(--oat-light)] text-[var(--warm-charcoal)] hover:bg-[var(--oat-border)]"
                }`}
            >
              <MaterialIcon name="stars" className="text-sm" />
              Free Credits
            </button>
          )}
          {useFreeCredits && (
            <Link to="/settings" className="text-xs text-[var(--matcha-600)] underline ml-2">
              Atur BYOK di Settings
            </Link>
          )}
        </div>

        {useFreeCredits && myCredit.data && (
          <div className="mt-4 pt-4 border-t border-[var(--oat-border)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--warm-charcoal)]">Token kamu</span>
              <span className={`text-lg font-headline font-bold ${tokenBalance > 0 ? "text-[var(--clay-black)]" : "text-[var(--clay-red)]"}`}>
                {tokenBalance.toLocaleString()}
              </span>
            </div>
            {tokenBalance > 0 && (
              <div className="w-full h-2 bg-[var(--oat-border)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--matcha-500)] rounded-full transition-all"
                  style={{ width: String(Math.min(100, Math.round(tokenBalance * 100 / 50000))) + "%" }}
                />
              </div>
            )}
            {myCredit.data.cooldownRemaining > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-[var(--sunbeam-800)] bg-[var(--sunbeam-300)]/30 px-3 py-1.5 rounded-[var(--radius-md)]">
                <MaterialIcon name="schedule" className="text-base leading-none shrink-0" />
                <span>Cooldown: {myCredit.data.cooldownRemaining} hari lagi untuk auto-refill.</span>
              </p>
            )}
            {tokenBalance <= 0 && myCredit.data.cooldownRemaining === 0 && (
              <p className="text-xs text-[var(--matcha-700)] bg-[var(--matcha-300)]/30 px-3 py-1.5 rounded-[var(--radius-md)]">
                Token habis. Auto-refill tersedia saat kamu generate.
              </p>
            )}
            {tokenBalance <= 0 && myCredit.data.cooldownRemaining > 0 && (
              <p className="text-xs text-[var(--clay-red)]/80 bg-[var(--clay-red)]/5 px-3 py-1.5 rounded-[var(--radius-md)]">
                Token habis & dalam cooldown. Gunakan BYOK atau tunggu {myCredit.data.cooldownRemaining} hari.
              </p>
            )}
          </div>
        )}

        {!useFreeCredits && hasConfigs && (
          <div className="mt-4 pt-4 border-t border-[var(--oat-border)]">
            <label className="text-sm font-medium text-[var(--clay-black)] mb-2 block">Provider / API Key</label>
            <div className="flex gap-3">
              <Select value={selectedKeyId} onValueChange={(v) => v && setSelectedKeyId(v)}>
                <SelectTrigger className="flex-1 h-11">
                  <SelectValue>
                    {selectedConfig ? selectedConfig.name + " . " + selectedConfig.modelName : "Pilih provider..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {configs.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} . {c.modelName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Link to="/settings">
                <Button variant="outline" size="xl" className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] clay-hover">
                  <MaterialIcon name="settings" className="mr-1" />
                  Kelola
                </Button>
              </Link>
            </div>
          </div>
        )}

        {!useFreeCredits && !hasConfigs && !hasFreeCredits && (
          <p className="mt-3 text-xs text-[var(--warm-charcoal)]">
            Tambahkan API key di Settings dahulu.
          </p>
        )}

        {!useFreeCredits && !hasConfigs && hasFreeCredits && (
          <p className="mt-3 text-xs text-[var(--warm-charcoal)]">
            Belum ada API key?{" "}
            <button onClick={() => setUseFreeCredits(true)} className="text-[var(--matcha-600)] underline">
              Gunakan kredit gratis
            </button>
            {" "}atau tambah di Settings.
          </p>
        )}

        {useFreeCredits && !hasFreeCredits && (
          <p className="mt-3 text-xs text-[var(--warm-charcoal)]">
            Free credits sedang dinonaktifkan oleh admin.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
{/* Section Picker (for latihan mode) */}
          {!isFullTest && (
            <Card className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
              <CardContent className="p-5">
                <p className="text-sm font-semibold text-[var(--clay-black)] mb-3">Pilih Section</p>
                <div className="grid grid-cols-3 gap-3">
                  {([...CPNS_SECTIONS] as CpnsSection[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSection(s)}
                      className={`p-3 rounded-[var(--radius-lg)] border-2 text-left transition-all ${selectedSection === s
                          ? "border-[var(--matcha-500)] bg-[var(--matcha-300)]/10"
                          : "border-[var(--oat-border)] bg-[var(--pure-white)] hover:border-[var(--oat-light)]"
                        }`}
                    >
                      <div className={`h-8 w-8 rounded-[var(--radius-md)] flex items-center justify-center mb-2 ${SWATCH_COLORS[s].split(" ")[0]}`}>
                        <MaterialIcon name={CPNS_SECTION_ICONS[s] as any} className={`text-sm ${SWATCH_COLORS[s].split(" ")[1]}`} />
                      </div>
                      <p className="text-sm font-bold text-[var(--clay-black)]">{s}</p>
                      <p className="text-xs text-[var(--warm-silver)]">{CPNS_SECTION_NAMES[s]}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Full test info banner */}
          {isFullTest && (
            <Card className="bg-gradient-to-br from-[var(--blueberry-800)]/5 to-[var(--blueberry-800)]/5 border-2 border-[var(--blueberry-800)]/20 rounded-[var(--radius-xl)]">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <MaterialIcon name="assignment" className="text-[var(--blueberry-800)] text-lg" />
                  <p className="text-sm font-bold text-[var(--clay-black)]">Full Test SKD</p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  {(CPNS_SECTIONS as unknown as CpnsSection[]).map((s) => {
                    const cfg = CPNS_SECTION_CONFIG[s];
                    return (
                      <div key={s}>
                        <p className="text-xs text-[var(--warm-charcoal)]">{s}</p>
                        <p className="text-lg font-bold text-[var(--clay-black)]">{cfg.questionCount}</p>
                        <p className="text-xs text-[var(--warm-silver)]">{cfg.durationMin}m</p>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-[var(--oat-border)] flex justify-between text-xs text-[var(--warm-charcoal)]">
                  <span>Total: <strong className="text-[var(--clay-black)]">{CPNS_FULL_TEST.totalQuestions} soal</strong></span>
                  <span>{CPNS_FULL_TEST.totalDurationMin} menit</span>
                  <span>Skor max: <strong className="text-[var(--clay-black)]">{CPNS_FULL_TEST.totalMaxScore}</strong></span>
                  <span>Target: <strong className="text-[var(--matcha-600)]">{CPNS_FULL_TEST.totalTargetScore}</strong></span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Question Count (latihan mode only) */}
          {!isFullTest && (
            <Card className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
              <CardContent className="p-5">
                <p className="text-sm font-semibold text-[var(--clay-black)] mb-3">Jumlah Soal</p>
                <div className="flex gap-2">
                  {currentPresets.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setSelectedCount(p.value)}
                      className={`flex-1 p-3 rounded-[var(--radius-lg)] border-2 text-center transition-all ${selectedCount === p.value
                          ? "border-[var(--matcha-500)] bg-[var(--matcha-300)]/10"
                          : "border-[var(--oat-border)] hover:border-[var(--oat-light)]"
                        }`}
                    >
                      <p className="text-lg font-bold text-[var(--clay-black)]">{p.value}</p>
                      <p className="text-xs text-[var(--warm-silver)]">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Difficulty */}
          <Card className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
            <CardContent className="p-5">
              <p className="text-sm font-semibold text-[var(--clay-black)] mb-3">Tingkat Kesulitan</p>
              <div className="flex gap-2">
                {CPNS_DIFFICULTY_LABELS.map((label, i) => (
                  <button
                    key={i}
                    onClick={() => setDifficulty(i + 1)}
                    className={`flex-1 p-2 rounded-[var(--radius-lg)] border-2 text-center text-xs transition-all ${difficulty === i + 1
                        ? "border-[var(--matcha-500)] bg-[var(--matcha-300)]/10 text-[var(--clay-black)] font-semibold"
                        : "border-[var(--oat-border)] text-[var(--warm-charcoal)] hover:border-[var(--oat-light)]"
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Summary */}
        <div className="space-y-4">
          <Card className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)] sticky top-24">
            <CardContent className="p-5">
              <p className="text-sm font-bold text-[var(--clay-black)] mb-4">Ringkasan</p>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--warm-charcoal)]">Mode</span>
                  <span className="font-semibold">{isFullTest ? "Full Test SKD" : "Latihan " + selectedSection}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--warm-charcoal)]">Jumlah Soal</span>
                  <span className="font-semibold">{questionCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--warm-charcoal)]">Estimasi Waktu</span>
                  <span className="font-semibold">{durationMin} menit</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--warm-charcoal)]">Skor Maksimal</span>
                  <span className="font-semibold">{maxScore}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--warm-charcoal)]">Metode</span>
                  <span className="font-semibold">{isFullTest || selectedCount > 15 ? "Agentic" : "Quick"}</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--oat-border)]">
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] rounded-[var(--radius-lg)] h-12 text-base"
                >
                  {isGenerating ? (
                    <>
                      <span className="animate-spin inline-block mr-2">⟳</span>
                      Menggenerate...
                    </>
                  ) : (
                    <>
                      <MaterialIcon name="auto_awesome" className="text-xl mr-2" />
                      Generate & Mulai
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Results with Tabs */}
      <div ref={resultsRef}>
        {completedResults.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-headline font-bold text-[var(--clay-black)]">Hasil Generate</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetAll}
                className="text-[var(--warm-charcoal)] hover:text-[var(--pomegranate-400)]"
              >
                <MaterialIcon name="delete_sweep" className="text-sm mr-1" />
                Bersihkan
              </Button>
            </div>
            <div
              className="flex gap-1 mb-6 border-b border-[var(--oat-border)] overflow-x-auto"
              role="tablist"
              onClick={(e) => {
                const target = e.target as HTMLElement;
                const btn = target.closest('[role="tab"]');
                if (btn) {
                  const idx = parseInt(btn.getAttribute("data-idx") || "0", 10);
                  setActiveTabIdx(idx);
                }
              }}
            >
              {completedResults.map((res: CompletedResult, idx: number) => {
                const questions = res.result?.questions ?? [];
                const isActive = idx === activeTabIdx;
                return (
                  <button
                    key={res.jobId}
                    role="tab"
                    data-idx={idx}
                    aria-selected={isActive}
                    tabIndex={isActive ? 0 : -1}
                    className={"flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-t-lg transition-all whitespace-nowrap border-b-2 min-h-[44px] " + (isActive
                      ? "bg-[var(--pure-white)] text-[var(--clay-black)] border-[var(--clay-black)]"
                      : "text-[var(--warm-charcoal)] border-transparent hover:text-[var(--clay-black)] hover:bg-[var(--oat-light)]"
                    )}
                  >
                    <MaterialIcon
                      name={questions.length > 0 ? "check_circle" : "sync" as any}
                      className={"text-sm " + (isActive ? "text-[var(--matcha-400)]" : "") + (questions.length === 0 && !isActive ? " animate-spin" : "")}
                    />
                    <span>{res.mode === "agentic" ? "Agentic" : "Quick"}</span>
                    <span className="text-xs text-[var(--warm-charcoal)]">{questions.length} soal</span>
                    <span
                      onClick={(e) => { e.stopPropagation(); dismissResult(res.jobId); }}
                      role="button"
                      aria-label={"Tutup tab " + res.mode}
                      tabIndex={-1}
                      className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-[var(--pomegranate-400)]/10 text-[var(--warm-charcoal)] hover:text-[var(--pomegranate-400)] transition-colors cursor-pointer"
                    >
                      <MaterialIcon name="close" className="text-xs" />
                    </span>
                  </button>
                );
              })}
            </div>

            {activeResult && (
              <ResultSection
                result={activeResult.result}
                generatedPackageId={activeResult.generatedPackageId}
                onClear={resetAll}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
