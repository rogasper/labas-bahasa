import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

export type AppMode = "bahasa" | "kedinasan";

interface AppModeContextValue {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

const AppModeContext = createContext<AppModeContextValue>({
  mode: "bahasa",
  setMode: () => {},
});

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>("bahasa");

  const setMode = useCallback((m: AppMode) => {
    setModeState(m);
  }, []);

  return (
    <AppModeContext.Provider value={{ mode, setMode }}>
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode() {
  return useContext(AppModeContext);
}
