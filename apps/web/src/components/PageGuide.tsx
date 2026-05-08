import { useState } from "react";
import { Card, CardContent } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

interface GuideItem {
  icon: string;
  title: string;
  desc: string;
}

interface PageGuideProps {
  items: GuideItem[];
  title?: string;
}

export function PageGuide({ items, title = "Petunjuk" }: PageGuideProps) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="mb-8 bg-[var(--pure-white)] border-2 border-[var(--slushie-500)]/30 rounded-[var(--radius-xl)] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 md:p-5 cursor-pointer hover:bg-[var(--oat-light)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-[var(--slushie-500)]/20 rounded-[var(--radius-lg)] flex items-center justify-center shrink-0">
            <MaterialIcon name="help" className="text-lg text-[var(--slushie-800)]" />
          </div>
          <div className="text-left">
            <h3 className="font-headline font-bold text-[var(--clay-black)]">{title}</h3>
            <p className="text-xs text-[var(--warm-charcoal)]">
              {open ? "Tutup petunjuk" : `Klik untuk lihat ${items.length} panduan`}
            </p>
          </div>
        </div>
        <MaterialIcon
          name={open ? "expand_less" : "expand_more"}
          className="text-xl text-[var(--warm-charcoal)]"
        />
      </button>

      {open && (
        <div className="px-4 md:px-5 pb-5 space-y-3 border-t border-[var(--oat-border)] pt-4">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-[var(--radius-lg)] bg-[var(--oat-light)]">
              <div className="h-8 w-8 bg-[var(--pure-white)] rounded-[var(--radius-md)] flex items-center justify-center shrink-0 shadow-sm">
                <MaterialIcon name={item.icon} className="text-sm text-[var(--matcha-600)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--clay-black)]">{item.title}</p>
                <p className="text-xs text-[var(--warm-charcoal)] mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
