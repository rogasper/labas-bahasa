import { MaterialIcon } from "@/components/ui/MaterialIcon";

interface CpnsPageHeaderProps {
  icon: string;
  title: string;
  subtitle: string;
}

export function CpnsPageHeader({ icon, title, subtitle }: CpnsPageHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="h-10 w-10 rounded-[var(--radius-lg)] bg-[var(--blueberry-800)] flex items-center justify-center">
        <MaterialIcon name={icon as any} className="text-lg text-[var(--pure-white)]" />
      </div>
      <div>
        <h1 className="text-xl font-headline font-bold text-[var(--clay-black)]">{title}</h1>
        <p className="text-xs text-[var(--warm-charcoal)]">{subtitle}</p>
      </div>
    </div>
  );
}
