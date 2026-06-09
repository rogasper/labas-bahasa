import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  delta?: string;
  deltaColor?: "green" | "red" | "default";
  icon?: ReactNode;
}

export function StatCard({ label, value, sub, delta, deltaColor = "default", icon }: StatCardProps) {
  const deltaColors = {
    green: "text-[var(--matcha-700)] bg-[var(--matcha-300)]/30",
    red: "text-[var(--clay-red)] bg-[var(--clay-red)]/10",
    default: "text-[var(--warm-charcoal)] bg-[var(--oat-light)]",
  };

  return (
    <div className="bg-[var(--pure-white)] rounded-[var(--radius-xl)] border border-[var(--oat-border)] p-5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm text-[var(--warm-charcoal)]">{label}</p>
        {icon}
      </div>
      <p className="text-3xl font-headline font-bold text-[var(--clay-black)] mt-1">
        {typeof value === "number" ? value.toLocaleString("id-ID") : value}
      </p>
      <div className="flex items-center gap-2 mt-2">
        {delta && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${deltaColors[deltaColor]}`}
          >
            {delta}
          </span>
        )}
        {sub && <p className="text-xs text-[var(--warm-charcoal)]">{sub}</p>}
      </div>
    </div>
  );
}
