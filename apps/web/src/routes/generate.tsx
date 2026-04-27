import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { useApiKey } from "@/hooks/use-api-key";
import { Button } from "@labas/ui/components/button";
import { Input } from "@labas/ui/components/input";
import { Card, CardContent, CardHeader, CardTitle } from "@labas/ui/components/card";
import "flag-icons/css/flag-icons.min.css";
import type { GenerationResult } from "@labas/ai";

const EXAM_TYPES = [
  { id: "IELTS", name: "IELTS Academic", code: "gb" },
  { id: "TOEFL", name: "TOEFL iBT", code: "us" },
  { id: "JLPT", name: "JLPT", code: "jp" },
  { id: "HSK", name: "HSK", code: "cn" },
  { id: "GOETHE", name: "Goethe-Zertifikat", code: "de" },
];

const SECTIONS = [
  { id: "READING", name: "Reading", icon: "menu_book" },
  { id: "WRITING", name: "Writing", icon: "edit_note" },
];

const FORMATS = [
  { id: "multiple_choice", name: "Multiple Choice" },
  { id: "true_false_not_given", name: "True / False / Not Given" },
  { id: "fill_blank", name: "Fill in Blank" },
  { id: "synonym", name: "Synonym / Vocabulary" },
  { id: "grammar_in_context", name: "Grammar in Context" },
  { id: "sentence_completion", name: "Sentence Completion" },
  { id: "cloze", name: "Cloze Test" },
  { id: "reference", name: "Reference (Pronoun)" },
  { id: "author_view", name: "Author's View" },
  { id: "matching_headings", name: "Matching Headings" },
  { id: "kanji_reading", name: "Kanji Reading (JLPT)" },
  { id: "particle_choice", name: "Particle Choice (JLPT)" },
  { id: "article_case", name: "Article / Case (German)" },
];

const TOPICS = ["Science & Tech", "Business", "Sociology", "Arts", "History", "Environment", "Health", "Education"];
const DIFFICULTIES = ["Beginner", "Intermediate", "Academic", "Expert"];

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

function MaterialIcon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

function RouteComponent() {
  const { storedKey, hasKey } = useApiKey();

  const [examType, setExamType] = useState("IELTS");
  const [section, setSection] = useState("READING");
  const [selectedFormats, setSelectedFormats] = useState<string[]>(["multiple_choice"]);
  const [difficulty, setDifficulty] = useState(2);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(["Science & Tech"]);
  const [questionCount, setQuestionCount] = useState(5);
  const [weaknessAlign, setWeaknessAlign] = useState(75);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"quick" | "agentic">("quick");
  const [jobId, setJobIdState] = useState<string | null>(null);
  const [generatedPackageId, setGeneratedPackageId] = useState<string | null>(null);

  // Persist jobId to sessionStorage so it survives navigation
  const setJobId = (id: string | null) => {
    setJobIdState(id);
    if (id) {
      sessionStorage.setItem("labas_active_job", id);
    } else {
      sessionStorage.removeItem("labas_active_job");
    }
  };

  // On mount: recover from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem("labas_active_job");
    if (saved) {
      setJobIdState(saved);
    }
  }, []);

  // Also check myJobs for any pending/running jobs (fallback / cross-tab sync)
  const myJobsQuery = useQuery(
    trpc.ai.myJobs.queryOptions({ limit: 10, offset: 0 }),
  );

  useEffect(() => {
    if (!jobId && myJobsQuery.data) {
      const active = myJobsQuery.data.find(
        (j: any) => j.status === "pending" || j.status === "running",
      );
      if (active) {
        setJobId(active.id);
      }
    }
  }, [myJobsQuery.data, jobId]);

  const generate = useMutation({
    ...trpc.ai.generate.mutationOptions(),
    onSuccess: (data) => {
      setJobId(data.jobId);
      setError(null);
      setResult(null);
    },
    onError: (err) => {
      setError(err.message);
      setJobId(null);
    },
  });

  // Poll job status
  const jobQuery = useQuery({
    ...trpc.ai.getJobStatus.queryOptions(
      { jobId: jobId! },
      { enabled: !!jobId },
    ),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 1000;
      if (data.status === "completed" || data.status === "failed") return false;
      return 1000;
    },
  });

  const isGenerating =
    jobId !== null &&
    (!jobQuery.data || (jobQuery.data.status !== "completed" && jobQuery.data.status !== "failed"));

  useEffect(() => {
    if (jobQuery.data?.status === "completed" && jobQuery.data.resultJson) {
      const res = jobQuery.data.resultJson as GenerationResult & { generatedPackageId?: string | null };
      setResult(res);
      setGeneratedPackageId(res.generatedPackageId ?? null);
      setJobId(null);
    }
    if (jobQuery.data?.status === "failed") {
      setError(jobQuery.data.errorMessage ?? "Generation failed");
      setJobId(null);
    }
  }, [jobQuery.data]);

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
    if (!hasKey || !storedKey) {
      setError("API key belum dikonfigurasi. Tambahkan di Settings.");
      return;
    }

    setResult(null);
    setError(null);
    setJobId(null);

    generate.mutate({
      examType: examType as any,
      section: section as any,
      formats: selectedFormats as any,
      difficulty: difficulty + 1,
      topics: selectedTopics,
      questionCount,
      mode,
      apiKeyConfig: {
        baseUrl: storedKey.baseUrl,
        apiKey: storedKey.apiKey,
        model: storedKey.modelName,
        maxTokens: storedKey.maxTokens ?? 16384,
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

      {!hasKey && (
        <div className="mb-8 p-4 rounded-[var(--radius-lg)] bg-[var(--badge-blue-bg)] text-[var(--badge-blue-text)] text-sm flex items-center gap-3 border-2 border-[var(--badge-blue-bg)]">
          <MaterialIcon name="warning" />
          <span>API key belum dikonfigurasi.</span>
          <Link to="/settings" className="font-semibold underline">
            Tambahkan di Settings →
          </Link>
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
                  <input
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
              {FORMATS.map((f) => (
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
            <input
              type="range"
              min={1}
              max={20}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full h-2 bg-[var(--warm-silver)] rounded-full appearance-none cursor-pointer accent-[var(--clay-black)]"
            />
          </div>
        </div>

        {/* Live Preview Card (Right) */}
        <div className="lg:col-span-4 sticky top-8">
          <Card className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] clay-shadow rounded-[var(--radius-xl)]">
            <CardHeader>
              <div className="flex items-center gap-3">
                <MaterialIcon name="analytics" className="text-[var(--matcha-600)]" />
                <CardTitle className="font-headline text-xl text-[var(--clay-black)]">Test Blueprint</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-[var(--oat-border)]">
                <span className="text-[var(--warm-charcoal)]">Estimasi Durasi</span>
                <span className="font-bold text-[var(--clay-black)]">{questionCount * 2} Menit</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-[var(--oat-border)]">
                <span className="text-[var(--warm-charcoal)]">Jumlah Soal</span>
                <span className="font-bold text-[var(--clay-black)]">{questionCount} Soal</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-[var(--oat-border)]">
                <span className="text-[var(--warm-charcoal)]">Format</span>
                <span className="font-bold text-[var(--clay-black)]">{selectedFormats.length} Jenis</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-[var(--oat-border)]">
                <span className="text-[var(--warm-charcoal)]">Ujian</span>
                <span className="font-bold text-[var(--clay-black)]">
                  {EXAM_TYPES.find((t) => t.id === examType)?.name}
                </span>
              </div>

              {/* AI Confidence Score Orbit */}
              <div className="bg-[var(--oat-light)] rounded-[var(--radius-lg)] p-6 flex flex-col items-center gap-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--matcha-600)] to-transparent" />
                <span className="text-xs font-label uppercase tracking-widest text-[var(--warm-charcoal)] font-bold">
                  AI Confidence Score
                </span>
                <div className="relative flex items-center justify-center">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle className="text-[var(--warm-silver)]" cx="64" cy="64" fill="transparent" r="56" stroke="currentColor" strokeWidth="8" />
                    <circle
                      className="text-[var(--matcha-600)]"
                      cx="64"
                      cy="64"
                      fill="transparent"
                      r="56"
                      stroke="currentColor"
                      strokeDasharray="351.85"
                      strokeDashoffset={351.85 - (351.85 * (weaknessAlign / 100))}
                      strokeWidth="8"
                    />
                  </svg>
                  <span className="absolute text-3xl font-headline font-extrabold text-[var(--clay-black)]">{Math.round(weaknessAlign)}%</span>
                </div>
                <p className="text-[11px] text-center text-[var(--warm-charcoal)] px-2 leading-tight">
                  Probabilitas tinggi untuk mengatasi blindspot linguistik utama.
                </p>
              </div>

              {/* Mode Toggle */}
              <div className="flex gap-1 p-1 rounded-[var(--radius-lg)] bg-[var(--oat-light)]">
                <button
                  onClick={() => setMode("quick")}
                  className={`flex-1 py-2 px-3 rounded-[var(--radius-md)] text-sm font-semibold transition-all ${
                    mode === "quick"
                      ? "bg-[var(--pure-white)] text-[var(--clay-black)] clay-shadow"
                      : "text-[var(--warm-charcoal)] hover:text-[var(--clay-black)]"
                  }`}
                >
                  <MaterialIcon name="flash_on" className="text-sm mr-1" />
                  Quick
                </button>
                <button
                  onClick={() => setMode("agentic")}
                  className={`flex-1 py-2 px-3 rounded-[var(--radius-md)] text-sm font-semibold transition-all ${
                    mode === "agentic"
                      ? "bg-[var(--pure-white)] text-[var(--clay-black)] clay-shadow"
                      : "text-[var(--warm-charcoal)] hover:text-[var(--clay-black)]"
                  }`}
                >
                  <MaterialIcon name="psychology" className="text-sm mr-1" />
                  Agentic
                </button>
              </div>

              {mode === "agentic" && (
                <div className="p-3 rounded-[var(--radius-md)] bg-[var(--badge-blue-bg)] border-2 border-[var(--badge-blue-bg)] text-xs text-[var(--badge-blue-text)]">
                  <div className="flex items-center gap-2 mb-1">
                    <MaterialIcon name="info" className="text-sm" />
                    <span className="font-semibold">Mode Agentic</span>
                  </div>
                  <p>Multi-step validation: passage → validate → questions → self-check → quality score. Lebih lambat tapi kualitas lebih terjamin.</p>
                </div>
              )}

              {/* Primary CTA */}
              <Button
                className="w-full py-5 rounded-[var(--radius-lg)] bg-[var(--clay-black)] text-[var(--pure-white)] font-bold text-lg flex items-center justify-center gap-3 clay-shadow clay-hover hover:bg-[var(--warm-charcoal)] transition-all active:scale-95 h-auto"
                onClick={handleGenerate}
                disabled={isGenerating || generate.isPending || selectedFormats.length === 0 || !hasKey}
              >
                <MaterialIcon name="auto_awesome" className="group-hover:rotate-12 transition-transform" />
                {isGenerating
                  ? mode === "agentic"
                    ? `Agentic... ${jobQuery.data?.progress ?? 0}%`
                    : `Generating... ${jobQuery.data?.progress ?? 0}%`
                  : "Generate & Launch"}
              </Button>

              {/* Progress */}
              {isGenerating && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--matcha-300)]/20 border-2 border-[var(--matcha-300)]">
                    <MaterialIcon name="psychology" className="text-[var(--matcha-600)] animate-pulse" />
                    <div>
                      <p className="text-sm font-semibold text-[var(--matcha-800)]">
                        {jobQuery.data?.progressMessage ?? "Sedang berjalan..."}
                      </p>
                      <p className="text-xs text-[var(--warm-charcoal)]">
                        {mode === "agentic"
                          ? "Passage → Validate → Questions → Self-Check → Score"
                          : "Quick generation mode"}
                      </p>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-[var(--oat-border)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--matcha-600)] transition-all duration-500"
                      style={{ width: `${jobQuery.data?.progress ?? 5}%` }}
                    />
                  </div>
                  <p className="text-xs text-[var(--warm-charcoal)] text-center">
                    Bisa ditinggal — hasil akan muncul otomatis
                  </p>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-[var(--radius-md)] bg-[var(--badge-blue-bg)] text-[var(--badge-blue-text)] text-sm border-2 border-[var(--badge-blue-bg)]">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="mt-16 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-headline font-bold text-[var(--clay-black)]">Hasil Generate</h2>
              <p className="text-sm text-[var(--warm-charcoal)] mt-1">
                Paket latihan berhasil dibuat! Soal juga tersimpan di Bank Soal (privat). Jawaban & penjelasan disembunyikan agar latihan tetap fair.
              </p>
            </div>
            <div className="flex gap-3">
              {generatedPackageId && (
                <Link to="/package/$id" params={{ id: generatedPackageId }}>
                  <Button className="bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)] clay-hover rounded-[var(--radius-lg)]">
                    <MaterialIcon name="play_arrow" className="mr-2" />
                    Lihat Paket
                  </Button>
                </Link>
              )}
              <Link to="/bank">
                <Button className="bg-[var(--matcha-600)] text-[var(--pure-white)] hover:bg-[var(--matcha-800)] clay-hover rounded-[var(--radius-lg)]">
                  <MaterialIcon name="database" className="mr-2" />
                  Bank Soal
                </Button>
              </Link>
            </div>
          </div>

          <div className="text-sm text-[var(--warm-charcoal)] mb-4 font-mono">
            Model: {result.meta.model} · Tokens: {result.meta.tokensUsed ?? "?"} · Waktu: {result.meta.durationMs}ms · {result.questions.length} soal
          </div>

          {result.questions.map((q, idx) => (
            <Card key={idx} className="clay-shadow clay-hover bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="bg-[var(--matcha-600)] text-[var(--pure-white)] w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] font-bold text-sm">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-bold text-[var(--matcha-600)] uppercase tracking-tighter">
                    {q.format.replace(/_/g, " ")}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-5 rounded-[var(--radius-lg)] bg-[var(--oat-light)] text-[var(--clay-black)] leading-relaxed whitespace-pre-wrap text-base">
                  {q.passageText}
                </div>
                <p className="font-medium text-[var(--clay-black)] text-lg">{q.questionText}</p>
                {"options" in q && q.options && (
                  <div className="space-y-2">
                    {q.options.map((opt) => (
                      <div
                        key={opt.key}
                        className="flex items-center p-4 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--oat-light)]"
                      >
                        <span className="w-6 h-6 rounded-full border-2 border-[var(--oat-border)] flex items-center justify-center mr-3 text-xs font-bold text-[var(--warm-charcoal)]">
                          {opt.key}
                        </span>
                        <span className="text-[var(--clay-black)]">{opt.text}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  {q.skillTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full bg-[var(--oat-light)] text-xs font-medium text-[var(--warm-charcoal)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
