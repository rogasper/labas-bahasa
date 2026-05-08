import { useState, useEffect } from "react";
import { Joyride, type Step, type EventData } from "react-joyride";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

const joyrideOptions = {
  primaryColor: "var(--matcha-600)",
  textColor: "var(--clay-black)",
  backgroundColor: "var(--pure-white)",
  arrowColor: "var(--pure-white)",
  overlayColor: "rgba(0,0,0,0.4)",
};

const joyrideStyles = {
  buttonBack: { color: "var(--warm-charcoal)", fontSize: "14px", fontWeight: 500 } as any,
  buttonSkip: { color: "var(--warm-charcoal)", fontSize: "14px", fontWeight: 500 } as any,
  tooltipContainer: { textAlign: "left" } as any,
  tooltipContent: { fontSize: "14px", lineHeight: "1.6", padding: "8px 0" } as any,
  tooltipTitle: { fontSize: "18px", fontWeight: 700, fontFamily: "Manrope, sans-serif" } as any,
};

const joyrideLocale = { back: "Kembali", close: "Tutup", last: "Selesai", next: "Lanjut", skip: "Lewati" };

// ── Global site tour ──

const LS_GLOBAL = "labas-tour-completed";
const TRIGGER_GLOBAL = "labas-tour-trigger";

const globalSteps: Step[] = [
  { target: "body" as any, placement: "center", title: "Selamat Datang di Labas!", content: "Platform latihan ujian bahasa berbasis AI. Yuk, kita lihat fitur-fitur utamanya!", hideOverlay: true },
  { target: "[data-tour='dashboard-stats']", title: "Ringkasan Aktivitas", content: "Pantau jumlah latihan, waktu belajar, soal terjawab, dan akurasi kamu di sini.", spotlightPadding: 8 },
  { target: "[data-tour='nav-generate']", title: "AI Lab — Generate Soal", content: "Buat soal latihan sendiri pakai AI. Pilih jenis ujian, section, format, dan topik.", spotlightPadding: 4 },
  { target: "[data-tour='nav-bank']", title: "Bank Soal — Buat Paket", content: "Atur soal-soal kamu jadi paket latihan dari bank soal.", spotlightPadding: 4 },
  { target: "[data-tour='nav-packages']", title: "Paket Soal — Mulai Latihan", content: "Temukan paket soal dari komunitas atau buatan sendiri.", spotlightPadding: 4 },
  { target: "[data-tour='nav-analytics']", title: "Analytics — Evaluasi", content: "Lihat analitik mendalam: skor, tren, dan rekomendasi belajar.", spotlightPadding: 4 },
  { target: "body" as any, placement: "center", title: "Siap Belajar?", content: "Setiap halaman punya panduan sendiri. Cari tombol <strong>?</strong> di pojok kanan bawah halaman!", hideOverlay: true },
];

export function TourGuide() {
  const [run, setRun] = useState(false);

  useEffect(() => {
    const onTrigger = () => { localStorage.removeItem(LS_GLOBAL); setRun(true); };
    window.addEventListener(TRIGGER_GLOBAL, onTrigger);

    const completed = localStorage.getItem(LS_GLOBAL);
    if (!completed) {
      const timer = setTimeout(() => setRun(true), 800);
      return () => { clearTimeout(timer); window.removeEventListener(TRIGGER_GLOBAL, onTrigger); };
    }

    return () => window.removeEventListener(TRIGGER_GLOBAL, onTrigger);
  }, []);

  const handleEvent = (data: EventData) => {
    const { action, status } = data;
    if (status === "finished" || status === "skipped") { localStorage.setItem(LS_GLOBAL, "true"); setRun(false); }
    if (action === "close" || action === "skip") setRun(false);
  };

  return (
    <Joyride steps={globalSteps} run={run} continuous
      options={{ ...joyrideOptions, showProgress: true, buttons: ["back", "primary", "skip"] }}
      locale={joyrideLocale} styles={joyrideStyles} onEvent={handleEvent}
    />
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
  const [run, setRun] = useState(false);

  useEffect(() => {
    const onTrigger = () => { localStorage.removeItem(storageKey); setRun(true); };
    window.addEventListener(storageKey, onTrigger);

    const completed = localStorage.getItem(storageKey);
    if (!completed && autoDelay !== undefined) {
      const timer = setTimeout(() => setRun(true), autoDelay);
      return () => { clearTimeout(timer); window.removeEventListener(storageKey, onTrigger); };
    }

    return () => window.removeEventListener(storageKey, onTrigger);
  }, []);

  const handleEvent = (data: EventData) => {
    const { action, status } = data;
    if (status === "finished" || status === "skipped") { localStorage.setItem(storageKey, "true"); setRun(false); }
    if (action === "close" || action === "skip") setRun(false);
  };

  return (
    <Joyride steps={steps} run={run} continuous
      options={{ ...joyrideOptions, showProgress: true, buttons: ["back", "primary", "skip"] }}
      locale={joyrideLocale} styles={joyrideStyles} onEvent={handleEvent}
    />
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
