import { Suspense, lazy } from "react";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import type { Step } from "react-joyride";

const TourGuideImpl = lazy(() => import("./TourGuideImpl").then((m) => ({ default: m.TourGuideImpl })));
const PageTourImpl = lazy(() => import("./TourGuideImpl").then((m) => ({ default: m.PageTourImpl })));

export type { Step };

const LS_GLOBAL = "labas-tour-completed";
const TRIGGER_GLOBAL = "labas-tour-trigger";

export function TourGuide() {
  return (
    <Suspense fallback={null}>
      <TourGuideImpl />
    </Suspense>
  );
}

export function triggerGlobalTour() {
  window.dispatchEvent(new CustomEvent(TRIGGER_GLOBAL));
}

// ── Page-specific tour ──

interface PageTourProps {
  storageKey: string;
  steps: Step[];
  autoDelay?: number;
}

export function PageTour({ storageKey, steps, autoDelay }: PageTourProps) {
  return (
    <Suspense fallback={null}>
      <PageTourImpl storageKey={storageKey} steps={steps} autoDelay={autoDelay} />
    </Suspense>
  );
}

export function triggerPageTour(storageKey: string) {
  window.dispatchEvent(new CustomEvent(storageKey));
}

// ── Floating help button ──

interface TourHelpButtonProps {
  storageKey: string;
  label?: string;
}

export function TourHelpButton({ storageKey, label = "Panduan Halaman" }: TourHelpButtonProps) {
  return (
    <button
      onClick={() => triggerPageTour(storageKey)}
      title={label}
      className="fixed top-4 right-4 z-40 w-10 h-10 flex items-center justify-center bg-[var(--clay-black)] text-[var(--pure-white)] shadow-lg hover:bg-[var(--warm-charcoal)] transition-all clay-hover cursor-pointer hover:scale-105 active:scale-95 rounded-full"
    >
      <MaterialIcon name="help" className="text-lg" />
    </button>
  );
}
