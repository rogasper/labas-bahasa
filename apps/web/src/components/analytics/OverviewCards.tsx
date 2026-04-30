import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Card, CardContent } from "@labas/ui/components/card";
import { formatTime } from "@/lib/time";

interface OverviewCardsProps {
  data: {
    totalAttempts: number;
    completedAttempts: number;
    abandonedAttempts: number;
    avgScorePct: number;
    totalTimeSpentSec: number;
    totalQuestionsAnswered: number;
    totalCorrectAnswers: number;
    overallAccuracyPct: number;
  } | undefined;
}

export function OverviewCards({ data }: OverviewCardsProps) {
  if (!data) return null;

  const cards = [
    {
      label: "Total Latihan",
      value: data.totalAttempts,
      icon: "school",
      color: "text-[var(--matcha-600)]",
      bg: "bg-[var(--matcha-300)]/20",
    },
    {
      label: "Selesai",
      value: data.completedAttempts,
      icon: "check_circle",
      color: "text-[var(--matcha-600)]",
      bg: "bg-[var(--matcha-300)]/20",
    },
    {
      label: "Rata-rata Skor",
      value: `${data.avgScorePct}%`,
      icon: "trending_up",
      color: "text-[var(--lemon-700)]",
      bg: "bg-[var(--lemon-300)]/20",
    },
    {
      label: "Akurasi",
      value: `${data.overallAccuracyPct}%`,
      icon: "target",
      color: "text-[var(--ube-600)]",
      bg: "bg-[var(--ube-300)]/20",
    },
    {
      label: "Waktu Total",
      value: formatTime(data.totalTimeSpentSec),
      icon: "timer",
      color: "text-[var(--slushie-600)]",
      bg: "bg-[var(--slushie-300)]/20",
    },
    {
      label: "Soal Dijawab",
      value: data.totalQuestionsAnswered,
      icon: "quiz",
      color: "text-[var(--pomegranate-600)]",
      bg: "bg-[var(--pomegranate-300)]/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <Card
          key={card.label}
          className="clay-shadow bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)]"
        >
          <CardContent className="p-4">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-[var(--radius-lg)] ${card.bg} mb-3`}>
              <MaterialIcon name={card.icon} className={card.color} />
            </div>
            <div className="text-2xl font-headline font-extrabold text-[var(--clay-black)]">
              {card.value}
            </div>
            <div className="text-xs text-[var(--warm-charcoal)] mt-1">{card.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
