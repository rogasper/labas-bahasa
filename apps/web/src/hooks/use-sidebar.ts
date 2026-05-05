import { useSyncExternalStore } from "react";

const STORAGE_KEY = "labas_sidebar_collapsed";

function getSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

function getServerSnapshot(): boolean {
  return false;
}

function subscribe(callback: () => void) {
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

export function useSidebar() {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = () => {
    const next = !getSnapshot();
    localStorage.setItem(STORAGE_KEY, String(next));
    // Dispatch storage event manually so other instances in the same tab update immediately
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: String(next) }));
  };

  return { collapsed, toggle };
}
