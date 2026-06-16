import { Link } from "@tanstack/react-router";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

interface CpnsPackageCardProps {
  pkg: any;
}

export function CpnsPackageCard({ pkg }: CpnsPackageCardProps) {
  return (
    <Card className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-xl)] hover:border-[var(--matcha-400)] transition-all">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <span className="px-2 py-0.5 rounded-full bg-[var(--blueberry-800)]/10 text-[var(--blueberry-800)] text-[10px] font-semibold">CPNS</span>
        </div>
        <h3 className="font-headline font-bold text-[var(--clay-black)] mb-1 line-clamp-2">{pkg.title}</h3>
        {pkg.description && (
          <p className="text-xs text-[var(--warm-charcoal)] line-clamp-2 mb-3">{pkg.description}</p>
        )}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--oat-border)]">
          <div className="flex gap-3 text-xs text-[var(--warm-charcoal)]">
            <span className="flex items-center gap-1">
              <MaterialIcon name="quiz" className="text-xs" />
              {pkg.totalQuestions}
            </span>
            <span className="flex items-center gap-1">
              <MaterialIcon name="folder" className="text-xs" />
              {pkg.totalSections}
            </span>
            {pkg.estimatedDurationMin && (
              <span className="flex items-center gap-1">
                <MaterialIcon name="timer" className="text-xs" />
                {pkg.estimatedDurationMin}m
              </span>
            )}
          </div>
          <Link to="/package/$id/take" params={{ id: pkg.id }} className="shrink-0">
            <Button className="bg-[var(--matcha-600)] text-[var(--pure-white)] rounded-[var(--radius-lg)] h-8 text-xs">
              Mulai
            </Button>
          </Link>
        </div>
        <div className="mt-2 pt-2 border-t border-[var(--oat-border)]">
          <Link to="/package/$id" params={{ id: pkg.id }} className="text-xs text-[var(--matcha-600)] font-semibold hover:underline">
            Lihat Detail →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
