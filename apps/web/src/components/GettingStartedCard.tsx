import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

const LS_KEY = "labas-getting-started-dismissed";

const steps = [
  {
    num: 1,
    title: "Generate Soal",
    desc: "Buat soal latihan AI sesuai exam yang kamu pilih. Pilih jenis ujian, section, format, dan topik.",
    link: "/generate",
    icon: "auto_awesome" as const,
    color: "matcha",
  },
  {
    num: 2,
    title: "Buat Paket",
    desc: "Kumpulkan soal dari Bank Soal jadi paket latihan. Bisa manual atau pakai Auto Bundle.",
    link: "/bank",
    icon: "folder" as const,
    color: "slushie",
  },
  {
    num: 3,
    title: "Mulai Latihan",
    desc: "Kerjakan paket soal, lihat skor, dan pantau perkembangan belajarmu.",
    link: "/packages",
    icon: "play_arrow" as const,
    color: "lemon",
  },
];

const colorMap: Record<string, { bg: string; text: string; badge: string }> = {
  matcha: { bg: "bg-[var(--matcha-300)]", text: "text-[var(--matcha-800)]", badge: "bg-[var(--matcha-300)]/30" },
  slushie: { bg: "bg-[var(--slushie-500)]", text: "text-[var(--slushie-800)]", badge: "bg-[var(--slushie-500)]/20" },
  lemon: { bg: "bg-[var(--lemon-400)]", text: "text-[var(--lemon-800)]", badge: "bg-[var(--lemon-400)]/30" },
};

export function GettingStartedCard() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(LS_KEY) === "true";
    if (!dismissed) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(LS_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Card className="mb-8 bg-gradient-to-br from-[var(--matcha-300)]/20 to-[var(--slushie-500)]/20 border-2 border-[var(--matcha-400)] rounded-[var(--radius-xl)] relative overflow-hidden">
      <div className="absolute -right-12 -top-12 w-48 h-48 ai-glow pointer-events-none opacity-20" />
      <CardContent className="p-6 md:p-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-[var(--clay-black)] rounded-[var(--radius-xl)] flex items-center justify-center">
              <MaterialIcon name="school" className="text-2xl text-[var(--pure-white)]" />
            </div>
            <div>
              <h2 className="text-xl font-headline font-bold text-[var(--clay-black)]">
                Mulai Belajar
              </h2>
              <p className="text-sm text-[var(--warm-charcoal)]">
                Ikuti 3 langkah mudah untuk memulai latihan.
              </p>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="text-[var(--warm-silver)] hover:text-[var(--clay-black)] transition-colors cursor-pointer"
          >
            <MaterialIcon name="close" className="text-xl" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {steps.map((step) => {
            const c = colorMap[step.color];
            return (
              <Link
                key={step.num}
                to={step.link}
                className="flex items-start gap-4 p-4 rounded-[var(--radius-xl)] bg-[var(--pure-white)] border-2 border-[var(--oat-border)] hover:border-[var(--matcha-400)] transition-all group clay-hover"
              >
                <div className={`h-10 w-10 ${c.bg} rounded-[var(--radius-lg)] flex items-center justify-center shrink-0`}>
                  <span className="text-sm font-black text-[var(--matcha-800)]">{step.num}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <MaterialIcon name={step.icon} className={`text-sm ${c.text}`} />
                    <h3 className="font-headline font-bold text-[var(--clay-black)] group-hover:text-[var(--matcha-800)] transition-colors">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-xs text-[var(--warm-charcoal)] leading-relaxed">
                    {step.desc}
                  </p>
                </div>
                <MaterialIcon name="chevron_right" className="text-lg text-[var(--warm-silver)] group-hover:text-[var(--matcha-800)] shrink-0 self-center transition-colors" />
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
