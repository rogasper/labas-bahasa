import { Button } from "@labas/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { EXAM_TYPES } from "@/lib/generate-constants";

interface TestBlueprintCardProps {
  examType: string;
  section: string;
  selectedFormats: string[];
  questionCount: number;
  weaknessAlign: number;
  mode: "quick" | "agentic";
  setMode: (mode: "quick" | "agentic") => void;
  isGenerating: boolean;
  generatePending: boolean;
  hasKey: boolean;
  error: string | null;
  onGenerate: () => void;
}

export function TestBlueprintCard({
  examType,
  selectedFormats,
  questionCount,
  weaknessAlign,
  mode,
  setMode,
  isGenerating,
  generatePending,
  hasKey,
  error,
  onGenerate,
}: TestBlueprintCardProps) {
  return (
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
              className={`flex-1 py-2 px-3 rounded-[var(--radius-md)] text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                mode === "quick"
                  ? "bg-[var(--pure-white)] text-[var(--clay-black)] clay-shadow"
                  : "text-[var(--warm-charcoal)] hover:text-[var(--clay-black)]"
              }`}
            >
              <MaterialIcon name="flash_on" className="text-sm mr-1" />
              <span>
              Quick
              </span>
            </button>
            <button
              onClick={() => setMode("agentic")}
              className={`flex-1 py-2 px-3 rounded-[var(--radius-md)] text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                mode === "agentic"
                  ? "bg-[var(--pure-white)] text-[var(--clay-black)] clay-shadow"
                  : "text-[var(--warm-charcoal)] hover:text-[var(--clay-black)]"
              }`}
            >
              <MaterialIcon name="psychology" className="text-sm mr-1" />
              <span>
              Agentic
              </span>
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
            onClick={onGenerate}
            disabled={isGenerating || generatePending || selectedFormats.length === 0 || !hasKey}
          >
            <MaterialIcon name="auto_awesome" className="group-hover:rotate-12 transition-transform" />
            {isGenerating
              ? mode === "agentic"
                ? "Agentic..."
                : "Generating..."
              : "Generate & Launch"}
          </Button>

          {error && (
            <div className="p-4 rounded-[var(--radius-md)] bg-[var(--badge-blue-bg)] text-[var(--badge-blue-text)] text-sm border-2 border-[var(--badge-blue-bg)]">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
