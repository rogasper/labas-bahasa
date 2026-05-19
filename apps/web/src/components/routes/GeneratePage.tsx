import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { useApiKeys } from "@/hooks/use-api-key";
import { useGenerationJobs, type CompletedResult } from "@/hooks/use-generation-jobs";
import { Button } from "@labas/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@labas/ui/components/select";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { TestBlueprintCard } from "@/components/generate/TestBlueprintCard";
import { ResultSection } from "@/components/generate/ResultSection";
import { PageTour, TourHelpButton } from "@/components/TourGuide";
import {
  EXAM_TYPES,
  SECTIONS,
  FORMATS,
  TOPICS,
  DIFFICULTIES,
  QUESTION_COUNT_PRESETS,
} from "@/lib/generate-constants";
import { getDifficultyLabel } from "@/lib/difficulty-mapping";
import "flag-icons/css/flag-icons.min.css";
import type { Step } from "react-joyride";

const MAX_PARALLEL = 3;


export function RouteComponent() {
  const { configs, hasConfigs } = useApiKeys();

  const [selectedKeyId, setSelectedKeyId] = useState<string>(
    configs[0]?.id ?? "",
  );

  useEffect(() => {
    if (configs.length > 0 && !configs.find((c) => c.id === selectedKeyId)) {
      setSelectedKeyId(configs[0].id);
    }
  }, [configs, selectedKeyId]);

  const selectedConfig = configs.find((c) => c.id === selectedKeyId);
  const [useFreeCredits, setUseFreeCredits] = useState(false);

  const myCredit = useQuery(
    trpc.admin.getMyCredit.queryOptions(),
  );
  const hasFreeCredits = myCredit.data?.freeCreditsEnabled === true;
  const tokenBalance = myCredit.data?.tokenBalance ?? 0;

  const {
    activeCount,
    completedResults,
    isGenerating,
    error,
    addJob,
    removeJob,
    resetAll,
    setError,
  } = useGenerationJobs();

  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const prevResultsLengthRef = useRef(0);

  // Auto-scroll to results when they appear
  const resultsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (completedResults.length > 0 && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [completedResults.length]);

  useEffect(() => {
    const prev = prevResultsLengthRef.current;
    prevResultsLengthRef.current = completedResults.length;

    if (completedResults.length === 0) {
      setActiveTabIdx(0);
      return;
    }

    if (completedResults.length > prev) {
      setActiveTabIdx(completedResults.length - 1);
      return;
    }

    if (activeTabIdx >= completedResults.length) {
      setActiveTabIdx(completedResults.length - 1);
    }
  }, [completedResults.length]);

  const [examType, setExamType] = useState("IELTS");
  const [selectedSections, setSelectedSections] = useState<string[]>(["READING"]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>(["multiple_choice"]);
  const [difficulty, setDifficulty] = useState(2);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(["Science & Tech"]);
  const [questionCount, setQuestionCount] = useState(5);
  const [weaknessAlign, setWeaknessAlign] = useState(75);
  const [mode, setMode] = useState<"quick" | "agentic">("quick");

  const isReadingAndWriting = selectedSections.includes("READING") && selectedSections.includes("WRITING");

  useEffect(() => {
    setSelectedFormats((prev) => {
      const valid = prev.filter((f) =>
        FORMATS.find((fmt) => fmt.id === f)?.allowedExams.includes(examType),
      );
      if (valid.length === 0) {
        return ["multiple_choice"];
      }
      return valid;
    });
  }, [examType]);

  useEffect(() => {
    if (isReadingAndWriting) {
      if (questionCount < 20) setQuestionCount(20);
      if (mode === "quick") setMode("agentic");
    }
  }, [isReadingAndWriting]);

  const generate = useMutation({
    ...trpc.ai.generate.mutationOptions(),
    onSuccess: (data) => {
      addJob(data.jobId);
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const toggleSection = (id: string) => {
    setSelectedSections((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter((s) => s !== id);
      }
      return [...prev, id];
    });
  };

  const toggleFormat = (id: string) => {
    setSelectedFormats((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  };

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic],
    );
  };

  const handleGenerate = () => {
    if (!useFreeCredits && (!hasConfigs || !selectedConfig)) {
      setError("API key belum dikonfigurasi. Tambahkan di Settings atau gunakan kredit gratis.");
      return;
    }
    if (selectedSections.length === 0) {
      setError("Pilih minimal 1 section.");
      return;
    }
    if (selectedFormats.length === 0) {
      setError("Pilih minimal 1 format soal.");
      return;
    }

    const apiKeyConfig = useFreeCredits
      ? undefined
      : {
          baseUrl: selectedConfig!.baseUrl,
          apiKey: selectedConfig!.apiKey,
          model: selectedConfig!.modelName,
          maxTokens: selectedConfig!.maxTokens ?? 16384,
        };

    type GenerateMutateInput = Parameters<typeof generate.mutate>[0];
    generate.mutate({
      examType,
      section: selectedSections[0],
      selectedSections,
      formats: selectedFormats,
      difficulty: difficulty + 1,
      topics: selectedTopics,
      questionCount,
      mode,
      apiKeyConfig,
    } as GenerateMutateInput);
  };

  const sectionSplits = (() => {
    if (mode !== "agentic" || questionCount < 20 || selectedSections.length <= 1) return null;
    const base = Math.floor(questionCount / selectedSections.length);
    const rem = questionCount % selectedSections.length;
    return selectedSections.map((s, i) => ({ section: s, count: base + (i < rem ? 1 : 0) }));
  })();

  const activeResult = completedResults[activeTabIdx] ?? null;

  return (
    <div className="min-h-screen pt-8 pb-32 px-6 md:px-12 lg:px-16 max-w-7xl mx-auto bg-[var(--warm-cream)]">
      {/* Header */}
      <section className="flex flex-col gap-2 relative mb-10">
        <div className="absolute -left-8 -top-8 w-64 h-64 ai-glow pointer-events-none opacity-50" />
        <h1 className="text-4xl md:text-5xl font-headline font-extrabold text-[var(--clay-black)] tracking-tight">
          AI Exam Generator
        </h1>
        <p className="text-lg text-[var(--warm-charcoal)] max-w-2xl leading-relaxed">
          Generate soal latihan dengan AI. Pilih exam, section, format, dan topik — sisanya AI yang kerjakan.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--warm-charcoal)]">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--matcha-300)]/30 text-[var(--matcha-800)] font-medium">
            <MaterialIcon name="looks_one" className="text-sm" />
            Pilih exam &amp; section
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--slushie-500)]/20 text-[var(--slushie-800)] font-medium">
            <MaterialIcon name="looks_two" className="text-sm" />
            Atur jumlah &amp; format
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--lemon-400)]/30 text-[var(--lemon-800)] font-medium">
            <MaterialIcon name="looks_3" className="text-sm" />
            Generate &amp; simpan
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--clay-black)]/10 text-[var(--clay-black)] font-medium">
            <MaterialIcon name="looks_4" className="text-sm" />
            Buat paket dari Bank Soal
          </span>
        </div>
      </section>

      {!hasConfigs && !useFreeCredits && !hasFreeCredits && (
        <div className="mb-8 p-4 rounded-[var(--radius-lg)] bg-[var(--badge-blue-bg)] text-[var(--badge-blue-text)] text-sm flex items-center gap-3 border-2 border-[var(--badge-blue-bg)]">
          <MaterialIcon name="warning" />
          <span>API key belum dikonfigurasi.</span>
          <Link to="/settings" className="font-semibold underline">
            Tambahkan di Settings →
          </Link>
        </div>
      )}

      {!hasConfigs && !useFreeCredits && hasFreeCredits && (
        <div className="mb-8 p-4 rounded-[var(--radius-lg)] bg-[var(--matcha-300)]/30 text-[var(--matcha-800)] text-sm flex items-center gap-3 border-2 border-[var(--matcha-400)]">
          <MaterialIcon name="tips_and_updates" />
          <span>Belum ada API key. Kamu bisa pakai Free Credits!</span>
          <button onClick={() => setUseFreeCredits(true)} className="font-semibold underline">
            Gunakan Free Credits →
          </button>
        </div>
      )}

      <div className="mb-8 p-5 rounded-[var(--radius-xl)] bg-[var(--pure-white)] border-2 border-[var(--oat-border)]">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-[var(--clay-black)]">Generation Mode</label>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setUseFreeCredits(false); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-lg)] text-sm font-medium transition-all ${
              !useFreeCredits
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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-lg)] text-sm font-medium transition-all ${
                useFreeCredits
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
                  style={{ width: `${Math.min(100, (tokenBalance / 50000) * 100)}%` }}
                />
              </div>
            )}
            {myCredit.data.cooldownRemaining > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-[var(--sunbeam-800)] bg-[var(--sunbeam-300)]/30 px-3 py-1.5 rounded-[var(--radius-md)]">
                <MaterialIcon name="schedule" className="text-base leading-none shrink-0" />
                <span>
                  Cooldown: {myCredit.data.cooldownRemaining} hari lagi untuk auto-refill.
                </span>
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
                    {selectedConfig ? `${selectedConfig.name} · ${selectedConfig.modelName}` : "Pilih provider..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {configs.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} · {c.modelName}
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Configuration Panel */}
        <div className="lg:col-span-8 flex flex-col gap-10">

          {/* Exam Type */}
          <div data-tour="generate-exam-type" className="flex flex-col gap-4">
            <label className="font-headline text-xl font-bold text-[var(--clay-black)]">Jenis Ujian</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {EXAM_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setExamType(t.id)}
                  className={`flex items-center gap-3 py-4 px-4 rounded-[var(--radius-lg)] border-2 transition-all text-sm font-semibold clay-hover min-h-[56px] ${
                    examType === t.id
                      ? "bg-[var(--clay-black)] text-[var(--pure-white)] clay-shadow border-[var(--clay-black)]"
                      : "bg-[var(--pure-white)] text-[var(--warm-charcoal)] hover:bg-[var(--oat-light)] border-[var(--oat-border)]"
                  }`}
                >
                  <span className={`fi fi-${t.code} w-6 h-4 rounded-sm shadow-sm shrink-0`} />
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Section Selection — Multi-select */}
          <div data-tour="generate-section" className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label className="font-headline text-xl font-bold text-[var(--clay-black)]">Section</label>
              <span className="text-xs text-[var(--warm-charcoal)]">
                {selectedSections.length} dipilih
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {SECTIONS.map((s) => {
                const isSelected = selectedSections.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleSection(s.id)}
                    className={`flex items-center gap-2.5 px-5 py-3 rounded-[var(--radius-lg)] border-2 transition-all text-sm font-semibold clay-hover min-h-[52px] ${
                      isSelected
                        ? "bg-[var(--clay-black)] text-[var(--pure-white)] clay-shadow border-[var(--clay-black)]"
                        : "bg-[var(--pure-white)] text-[var(--warm-charcoal)] hover:bg-[var(--oat-light)] border-[var(--oat-border)]"
                    }`}
                  >
                    <MaterialIcon
                      name={isSelected ? "check_circle" : s.icon}
                      className={`text-base shrink-0 ${isSelected ? "text-[var(--matcha-400)]" : ""}`}
                    />
                    {s.name}
                  </button>
                );
              })}
            </div>
            {selectedSections.length > 1 && (
              <p className="text-xs text-[var(--matcha-800)] bg-[var(--matcha-300)]/30 px-3 py-2 rounded-[var(--radius-md)]">
                <MaterialIcon name="tips_and_updates" className="text-xs mr-1 inline" />
                Kamu memilih {selectedSections.length} section. Mode Agentic dengan ≥20 soal akan otomatis membagi soal ke section yang dipilih.
              </p>
            )}
          </div>

          {/* Question Count */}
          <div data-tour="generate-count" className="flex flex-col gap-4">
            <label className="font-headline text-xl font-bold text-[var(--clay-black)]">
              Jumlah Soal
              <span className="ml-2 text-sm font-normal text-[var(--warm-charcoal)]">{questionCount} soal</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {QUESTION_COUNT_PRESETS.map((p) => {
                const isDisabled = isReadingAndWriting && (p.value === 5 || p.value === 10);
                return (
                <button
                  key={p.value}
                  onClick={() => setQuestionCount(p.value)}
                  disabled={isDisabled}
                  className={`py-4 px-2 rounded-[var(--radius-lg)] text-sm font-semibold transition-all clay-hover flex flex-col items-center gap-1 min-h-[72px] ${
                    isDisabled
                      ? "bg-[var(--oat-light)] text-[var(--warm-silver)] cursor-not-allowed opacity-50 border-2 border-[var(--oat-border)]"
                      : questionCount === p.value
                        ? "bg-[var(--clay-black)] text-[var(--pure-white)] clay-shadow"
                        : "bg-[var(--pure-white)] text-[var(--warm-charcoal)] hover:bg-[var(--oat-light)] border-2 border-[var(--oat-border)]"
                  }`}
                >
                  <span>{p.label}</span>
                  <span className={`text-xs ${questionCount === p.value ? "text-[var(--pure-white)]/70" : "text-[var(--warm-charcoal)]/70"}`}>{p.desc}</span>
                </button>
              );
              })}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs font-medium text-[var(--warm-charcoal)] whitespace-nowrap">Custom:</span>
              <input
                type="range"
                min={isReadingAndWriting ? 20 : 1}
                max={40}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full h-2 bg-[var(--warm-silver)] rounded-full appearance-none cursor-pointer accent-[var(--clay-black)]"
              />
              <span className="text-xs font-bold text-[var(--clay-black)] w-6 text-right">{questionCount}</span>
            </div>

            {/* Auto Multi-Section Preview */}
            {sectionSplits && (
              <div className="mt-2 p-4 rounded-[var(--radius-lg)] bg-[var(--matcha-300)]/30 border border-[var(--matcha-400)]">
                <div className="flex items-center gap-2 mb-2 text-[var(--matcha-800)] font-semibold text-sm">
                  <MaterialIcon name="auto_awesome" className="text-xs" />
                  Auto Multi-Section
                </div>
                <p className="text-[var(--matcha-800)]/80 text-xs mb-3">
                  Mode Agentic dengan {questionCount} soal akan dibagi ke {sectionSplits.length} section:
                </p>
                <div className="flex flex-wrap gap-2">
                  {sectionSplits.map((s) => {
                    const sec = SECTIONS.find((sec) => sec.id === s.section);
                    return (
                      <span
                        key={s.section}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--pure-white)] text-[var(--matcha-800)] text-xs font-medium border border-[var(--matcha-400)]"
                      >
                        <MaterialIcon name={sec?.icon ?? "menu_book"} className="text-[10px]" />
                        {sec?.name ?? s.section}: {s.count} soal
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Difficulty */}
          <div data-tour="generate-difficulty" className="flex flex-col gap-4">
            <label className="font-headline text-xl font-bold text-[var(--clay-black)]">Tingkat Kesulitan</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {DIFFICULTIES.map((d, i) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(i)}
                  className={`py-4 px-2 rounded-[var(--radius-lg)] text-sm font-semibold transition-all clay-hover min-h-[56px] flex flex-col items-center ${
                    difficulty === i
                      ? "bg-[var(--clay-black)] text-[var(--pure-white)] clay-shadow"
                      : "bg-[var(--pure-white)] text-[var(--warm-charcoal)] hover:bg-[var(--oat-light)] border-2 border-[var(--oat-border)]"
                  }`}
                >
                  <span>{getDifficultyLabel(examType, i + 1)}</span>
                  <span className={`text-[10px] mt-0.5 ${difficulty === i ? "text-white/60" : "text-[var(--warm-silver)]"}`}>{d}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Format Selection */}
          <div data-tour="generate-format" className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label className="font-headline text-xl font-bold text-[var(--clay-black)]">Format Soal</label>
              <span className="text-xs text-[var(--warm-charcoal)]">
                {selectedFormats.length} dipilih
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {FORMATS.filter((f) => f.allowedExams.includes(examType)).map((f) => (
                <button
                  key={f.id}
                  onClick={() => toggleFormat(f.id)}
                  className={`px-4 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 cursor-pointer transition-all clay-hover min-h-[40px] ${
                    selectedFormats.includes(f.id)
                      ? "bg-[var(--matcha-300)] text-[var(--matcha-800)]"
                      : "bg-[var(--oat-light)] text-[var(--warm-charcoal)] hover:bg-[var(--matcha-300)] hover:text-[var(--matcha-800)]"
                  }`}
                >
                  {f.name}
                  {selectedFormats.includes(f.id) && (
                    <MaterialIcon name="close" className="text-sm" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Topic Focus */}
          <div data-tour="generate-topic" className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label className="font-headline text-xl font-bold text-[var(--clay-black)]">Topik</label>
              <span className="text-xs text-[var(--warm-charcoal)]">
                {selectedTopics.length} dipilih
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedTopics.map((topic) => (
                <span
                  key={topic}
                  onClick={() => toggleTopic(topic)}
                  className="px-4 py-2 rounded-full bg-[var(--matcha-300)] text-[var(--matcha-800)] font-medium flex items-center gap-2 cursor-pointer transition-all hover:brightness-95 clay-hover min-h-[40px]"
                >
                  {topic} <MaterialIcon name="close" className="text-sm" />
                </span>
              ))}
              {TOPICS.filter((t) => !selectedTopics.includes(t)).map((topic) => (
                <button
                  key={topic}
                  onClick={() => toggleTopic(topic)}
                  className="px-4 py-2 rounded-full bg-[var(--oat-light)] text-[var(--warm-charcoal)] font-medium hover:bg-[var(--matcha-300)] hover:text-[var(--matcha-800)] transition-all clay-hover min-h-[40px]"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          {/* Weakness Alignment */}
          <div data-tour="generate-weakness" className="flex flex-col gap-4">
            <div className="flex justify-between items-end">
              <label className="font-headline text-xl font-bold text-[var(--clay-black)]">Fokus Latihan</label>
              <span className="text-sm font-medium text-[var(--matcha-800)] bg-[var(--matcha-300)] px-3 py-1 rounded-full">
                Intelligent Focus
              </span>
            </div>
            <div className="relative py-4">
              <input
                type="range"
                min="0"
                max="100"
                value={weaknessAlign}
                onChange={(e) => setWeaknessAlign(Number(e.target.value))}
                className="w-full h-2 bg-[var(--warm-silver)] rounded-full appearance-none cursor-pointer accent-[var(--clay-black)]"
              />
              <div className="flex justify-between mt-4 text-xs font-label uppercase tracking-widest text-[var(--warm-charcoal)]">
                <span>Soal Seimbang</span>
                <span>Fokus Kelemahan</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Card */}
        <div data-tour="generate-blueprint" className="lg:col-span-4">
          <TestBlueprintCard
            examType={examType}
            selectedSections={selectedSections}
            selectedFormats={selectedFormats}
            questionCount={questionCount}
            weaknessAlign={weaknessAlign}
            mode={mode}
            setMode={setMode}
            activeCount={activeCount}
            maxParallel={MAX_PARALLEL}
            generatePending={generate.isPending}
            hasKey={hasConfigs || useFreeCredits}
            error={error}
            onGenerate={handleGenerate}
            onDismissError={() => setError(null)}
            disableQuick={isReadingAndWriting}
          />
        </div>
      </div>

      {/* Results with Tabs */}
      <div ref={resultsRef}>
        {completedResults.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-headline font-bold text-[var(--clay-black)]">
                Hasil Generate
              </h2>
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

            {/* Tab Bar */}
            <div
              className="flex gap-1 mb-6 border-b border-[var(--oat-border)] overflow-x-auto"
              role="tablist"
              aria-label="Hasil generate"
              onKeyDown={(e) => {
                if (completedResults.length === 0) return;
                if (e.key === "ArrowRight") {
                  e.preventDefault();
                  setActiveTabIdx((i) => Math.min(completedResults.length - 1, i + 1));
                } else if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  setActiveTabIdx((i) => Math.max(0, i - 1));
                } else if (e.key === "Home") {
                  e.preventDefault();
                  setActiveTabIdx(0);
                } else if (e.key === "End") {
                  e.preventDefault();
                  setActiveTabIdx(completedResults.length - 1);
                }
              }}
            >
              {completedResults.map((res, idx) => {
                const questions = res.result?.questions ?? [];
                const isActive = idx === activeTabIdx;
                return (
                  <button
                    key={res.jobId}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`generate-panel-${idx}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => setActiveTabIdx(idx)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-t-lg transition-all whitespace-nowrap border-b-2 min-h-[44px] ${
                      isActive
                        ? "bg-[var(--pure-white)] text-[var(--clay-black)] border-[var(--clay-black)]"
                        : "text-[var(--warm-charcoal)] border-transparent hover:text-[var(--clay-black)] hover:bg-[var(--oat-light)]"
                    }`}
                  >
                    <MaterialIcon
                      name={questions.length > 0 ? "check_circle" : "sync"}
                      className={`text-sm ${isActive ? "text-[var(--matcha-400)]" : ""} ${questions.length === 0 && !isActive ? "animate-spin" : ""}`}
                    />
                    <span>
                      {res.mode === "agentic" ? "Agentic" : "Quick"}
                    </span>
                    <span className="text-xs text-[var(--warm-charcoal)]">
                      {questions.length} soal
                    </span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        removeJob(res.jobId);
                      }}
                      role="button"
                      aria-label={`Tutup tab ${res.mode}`}
                      tabIndex={-1}
                      className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-[var(--pomegranate-400)]/10 text-[var(--warm-charcoal)] hover:text-[var(--pomegranate-400)] transition-colors cursor-pointer"
                    >
                      <MaterialIcon name="close" className="text-xs" />
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Tab Content */}
            {activeResult && (
              <div
                role="tabpanel"
                id={`generate-panel-${activeTabIdx}`}
                aria-labelledby={`generate-tab-${activeTabIdx}`}
              >
                <ResultSection
                  result={activeResult.result}
                  generatedPackageId={activeResult.generatedPackageId}
                  onClear={resetAll}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <PageTour
        storageKey={GENERATE_TOUR_KEY}
        autoDelay={600}
        steps={generatePageSteps}
      />
      <TourHelpButton storageKey={GENERATE_TOUR_KEY} />
    </div>
  );
}

// ── Generate page tour ──
const GENERATE_TOUR_KEY = "labas-page-tour-generate";
const generatePageSteps: Step[] = [
  {
    target: "[data-tour='generate-exam-type']",
    title: "Jenis Ujian",
    content: "Pilih jenis ujian yang ingin kamu latih. Tersedia IELTS, TOEFL, JLPT, HSK, Goethe, TOPIK (Korea), TOAFL (Arab), dan DELE (Spanyol).",
    spotlightPadding: 8,
  },
  {
    target: "[data-tour='generate-section']",
    title: "Section",
    content: "Pilih section yang ingin digenerate. Bisa pilih lebih dari satu. Mode Agentic dengan ≥20 soal otomatis membagi soal ke setiap section.",
    spotlightPadding: 8,
  },
  {
    target: "[data-tour='generate-count']",
    title: "Jumlah Soal",
    content: "Atur jumlah soal yang ingin digenerate via preset atau slider. Maksimal 40 soal per generate.",
    spotlightPadding: 8,
  },
  {
    target: "[data-tour='generate-difficulty']",
    title: "Tingkat Kesulitan",
    content: "Pilih tingkat kesulitan. Label menyesuaikan dengan jenis ujian yang dipilih (misal: N5-N1 untuk JLPT, Band 4.0-8.0 untuk IELTS).",
    spotlightPadding: 8,
  },
  {
    target: "[data-tour='generate-format']",
    title: "Format Soal",
    content: "Pilih format soal (multiple choice, true/false, dll). Format tersedia tergantung exam type yang dipilih.",
    spotlightPadding: 8,
  },
  {
    target: "[data-tour='generate-topic']",
    title: "Topik",
    content: "Pilih topik yang ingin difokuskan. Bisa pilih lebih dari satu topik.",
    spotlightPadding: 8,
  },
  {
    target: "[data-tour='generate-weakness']",
    title: "Intelligent Focus",
    content: "Atur fokus pada kelemahan kamu. AI akan menarget area yang perlu ditingkatkan berdasarkan riwayat jawaban.",
    spotlightPadding: 8,
  },
  {
    target: "[data-tour='generate-blueprint']",
    title: "Test Blueprint & Generate",
    content: "Ringkasan konfigurasi kamu. Pilih mode Quick (cepat) atau Agentic (multi-tahap). Klik 'Generate & Launch' untuk memulai!",
    spotlightPadding: 8,
  },
];
