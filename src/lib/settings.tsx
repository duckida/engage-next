import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type SettingsValue = {
  /** Treat classes as finishing 5 minutes early in the "In class" progress bar. */
  endEarly: boolean;
  setEndEarly: (endEarly: boolean) => void;
};

const STORAGE_KEY = "engage-next-end-early";
const SettingsContext = createContext<SettingsValue | null>(null);

function storedEndEarly(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [endEarly, setEndEarly] = useState<boolean>(storedEndEarly);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(endEarly));
  }, [endEarly]);

  const value = useMemo(() => ({ endEarly, setEndEarly }), [endEarly]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("useSettings must be used inside SettingsProvider");
  return value;
}
