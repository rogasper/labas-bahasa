import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { useApiKeys } from "@/hooks/use-api-key";
import { useGenerationJob } from "@/hooks/use-generation-job";
import { Button } from "@labas/ui/components/button";
import { Input } from "@labas/ui/components/input";
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
import {
  EXAM_TYPES,
  SECTIONS,
  FORMATS,
  TOPICS,
  DIFFICULTIES,
  QUESTION_COUNT_PRESETS,
} from "@/lib/generate-constants";
import "flag-icons/css/flag-icons.min.css";

export const Route = createFileRoute("/generate")({
  component: RouteComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({ to: "/login", throw: true });
    }
    return { session };
  },
});

function RouteComponent() {
  const { configs, hasConfigs } = useApiKeys();

  const [selectedKeyId, setSelectedKeyId] = useState<string>(
    configs[0]?.id ?? "",
  );

  // keep selectedKeyId in sync when configs load
  useEffect(() => {
    if (configs.length > 0 && !configs.find((c) => c.id === selectedKeyId)) {
      setSelectedKeyId(configs[0].id);
    }
  }, [configs, selectedKeyId]);

  const selectedConfig = configs.find((c) => c.id === selectedKeyId);

  const {
    result,
    error,
    generatedPackageId,
    isGenerating,
    setError,
    setJobId,
    reset,
  } = useGenerationJob();

  const [examType, setExamType] = useState("IELTS");
  const [section, setSection] = useState("READING");
  const [selectedFormats, setSelectedFormats] = useState<string[]>(["multiple_choice"]);
  const [difficulty, setDifficulty] = useState(2);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(["Science & Tech"]);
  const [questionCount, setQuestionCount] = useState(5);
  const [weaknessAlign, setWeaknessAlign] = useState(75);
  const [mode, setMode] = useState<"quick" | "agentic">("quick");

  // Reset selected formats when exam type changes to only keep valid ones
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

  const generate = useMutation({
    ...trpc.ai.generate.mutationOptions(),
    onSuccess: (data) => {
      setJobId(data.jobId);
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
      setJobId(null);
    },
  });

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
    if (!hasConfigs || !selectedConfig) {
      setError("API key belum dikonfigurasi. Tambahkan di Settings.");
      return;
    }

    reset();

    generate.mutate({
      examType: examType as any,
      section: section as any,
      formats: selectedFormats as any,
      difficulty: difficulty + 1,
      topics: selectedTopics,
      questionCount,
      mode,
      apiKeyConfig: {
        baseUrl: selectedConfig.baseUrl,
        apiKey: selectedConfig.apiKey,
        model: selectedConfig.modelName,
        maxTokens: selectedConfig.maxTokens ?? 16384,
      },
    });
  };

  return (
    <div className="min-h-screen pt-8 pb-32 px-6 md:px-12 lg:px-16 max-w-7xl mx-auto bg-[var(--warm-cream)]">
      {/* Header Section */}
      <section className="flex flex-col gap-2 relative mb-10">
        <div className="absolute -left-8 -top-8 w-64 h-64 ai-glow pointer-events-none opacity-50" />
        <h1 className="text-4xl md:text-5xl font-headline font-extrabold text-[var(--clay-black)] tracking-tight">
          AI Exam Generator
        </h1>
        <p className="text-lg text-[var(--warm-charcoal)] max-w-2xl leading-relaxed">
          Generate soal latihan reading comprehension dengan AI. Gunakan API key sendiri untuk latihan tanpa batas.
        </p>
      </section>

      {!hasConfigs && (
        <div className="mb-8 p-4 rounded-[var(--radius-lg)] bg-[var(--badge-blue-bg)] text-[var(--badge-blue-text)] text-sm flex items-center gap-3 border-2 border-[var(--badge-blue-bg)]">
          <MaterialIcon name="warning" />
          <span>API key belum dikonfigurasi.</span>
          <Link to="/settings" className="font-semibold underline">
            Tambahkan di Settings →
          </Link>
        </div>
      )}

      {hasConfigs && (
        <div className="mb-8 p-4 rounded-[var(--radius-lg)] bg-[var(--warm-cream)] border-2 border-[var(--oat-border)]">
          <label className="text-sm font-medium text-[var(--clay-black)] mb-2 block">
            Provider / API Key
          </label>
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
              <Button
                variant="outline"
                className="rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] clay-hover"
              >
                <MaterialIcon name="settings" className="mr-1" />
                Kelola
              </Button>
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Configuration Panel (Left) */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          {/* Exam Type */}
          <div className="flex flex-col gap-4">
            <label className="font-headline text-xl font-bold text-[var(--clay-black)]">Jenis Ujian</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {EXAM_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setExamType(t.id)}
                  className={`flex items-center gap-3 py-4 px-4 rounded-[var(--radius-lg)] border-2 transition-all text-sm font-semibold clay-hover ${
                    examType === t.id
                      ? "bg-[var(--clay-black)] text-[var(--pure-white)] clay-shadow"
                      : "bg-[var(--pure-white)] text-[var(--warm-charcoal)] hover:bg-[var(--oat-light)] border-[var(--oat-border)]"
                  }`}
                >
                  <span className={`fi fi-${t.code} w-6 h-4 rounded-sm shadow-sm`} />
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Weakness Alignment */}
          <div className="flex flex-col gap-4">
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

          {/* Difficulty Tuning */}
          <div className="flex flex-col gap-4">
            <label className="font-headline text-xl font-bold text-[var(--clay-black)]">Tingkat Kesulitan</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {DIFFICULTIES.map((d, i) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(i)}
                  className={`py-4 px-2 rounded-[var(--radius-lg)] text-sm font-semibold transition-all clay-hover ${
                    difficulty === i
                      ? "bg-[var(--clay-black)] text-[var(--pure-white)] clay-shadow"
                      : "bg-[var(--pure-white)] text-[var(--warm-charcoal)] hover:bg-[var(--oat-light)] border-2 border-[var(--oat-border)]"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Module Selection */}
          <div className="flex flex-col gap-4">
            <label className="font-headline text-xl font-bold text-[var(--clay-black)]">Section</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SECTIONS.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={`flex items-center justify-between p-5 rounded-[var(--radius-lg)] border-2 group cursor-pointer transition-all clay-hover ${
                    section === s.id
                      ? "bg-[var(--pure-white)] border-[var(--clay-black)] clay-shadow"
                      : "bg-[var(--pure-white)] border-[var(--oat-border)] hover:bg-[var(--oat-light)]"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <MaterialIcon
                      name={s.icon}
                      className={`text-[var(--clay-black)] group-hover:scale-110 transition-transform ${section === s.id ? "text-[var(--clay-black)]" : ""}`}
                    />
                    <span className="font-semibold text-[var(--clay-black)]">{s.name}</span>
                  </div>
                  <Input
                    type="checkbox"
                    checked={section === s.id}
                    readOnly
                    className="w-5 h-5 rounded border-[var(--oat-border)] text-[var(--clay-black)] focus:ring-[var(--clay-black)]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Format Selection */}
          <div className="flex flex-col gap-4">
            <label className="font-headline text-xl font-bold text-[var(--clay-black)]">Format Soal</label>
            <div className="flex flex-wrap gap-2">
              {FORMATS.filter((f) => f.allowedExams.includes(examType)).map((f) => (
                <button
                  key={f.id}
                  onClick={() => toggleFormat(f.id)}
                  className={`px-4 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 cursor-pointer transition-all clay-hover ${
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
          <div className="flex flex-col gap-4">
            <label className="font-headline text-xl font-bold text-[var(--clay-black)]">Topik</label>
            <div className="flex flex-wrap gap-2">
              {selectedTopics.map((topic) => (
                <span
                  key={topic}
                  onClick={() => toggleTopic(topic)}
                  className="px-4 py-2 rounded-full bg-[var(--matcha-300)] text-[var(--matcha-800)] font-medium flex items-center gap-2 cursor-pointer transition-all hover:brightness-95 clay-hover"
                >
                  {topic} <MaterialIcon name="close" className="text-sm" />
                </span>
              ))}
              {TOPICS.filter((t) => !selectedTopics.includes(t)).map((topic) => (
                <button
                  key={topic}
                  onClick={() => toggleTopic(topic)}
                  className="px-4 py-2 rounded-full bg-[var(--oat-light)] text-[var(--warm-charcoal)] font-medium hover:bg-[var(--matcha-300)] hover:text-[var(--matcha-800)] transition-all clay-hover"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          {/* Question Count */}
          <div className="flex flex-col gap-4">
            <label className="font-headline text-xl font-bold text-[var(--clay-black)]">Jumlah Soal: {questionCount}</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {QUESTION_COUNT_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setQuestionCount(p.value)}
                  className={`py-4 px-2 rounded-[var(--radius-lg)] text-sm font-semibold transition-all clay-hover flex flex-col items-center gap-1 ${
                    questionCount === p.value
                      ? "bg-[var(--clay-black)] text-[var(--pure-white)] clay-shadow"
                      : "bg-[var(--pure-white)] text-[var(--warm-charcoal)] hover:bg-[var(--oat-light)] border-2 border-[var(--oat-border)]"
                  }`}
                >
                  <span>{p.label}</span>
                  <span className={`text-xs ${questionCount === p.value ? "text-[var(--pure-white)]/70" : "text-[var(--warm-charcoal)]/70"}`}>{p.desc}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs font-medium text-[var(--warm-charcoal)] whitespace-nowrap">Custom:</span>
              <input
                type="range"
                min={1}
                max={40}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full h-2 bg-[var(--warm-silver)] rounded-full appearance-none cursor-pointer accent-[var(--clay-black)]"
              />
              <span className="text-xs font-bold text-[var(--clay-black)] w-6 text-right">{questionCount}</span>
            </div>
          </div>
        </div>

        {/* Live Preview Card (Right) */}
        <TestBlueprintCard
          examType={examType}
          section={section}
          selectedFormats={selectedFormats}
          questionCount={questionCount}
          weaknessAlign={weaknessAlign}
          mode={mode}
          setMode={setMode}
          isGenerating={isGenerating}
          generatePending={generate.isPending}
          hasKey={hasConfigs}
          error={error}
          onGenerate={handleGenerate}
        />
      </div>

      {/* Results Section */}
      {result && (
        <ResultSection result={result} generatedPackageId={generatedPackageId} />
      )}

    </div>
  );
}
