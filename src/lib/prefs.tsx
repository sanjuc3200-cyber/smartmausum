import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Persona = "student" | "farmer" | "traveller" | "general";
export type Interest =
  | "daily"
  | "rainfall"
  | "temperature"
  | "travel"
  | "agriculture"
  | "air"
  | "severe";

export interface Prefs {
  onboarded: boolean;
  name: string;
  cityId: string;
  persona: Persona;
  interests: Interest[];
  destinationId: string;
  notifications: { severe: boolean; daily: boolean; rain: boolean; agri: boolean };
}

export const PERSONAS: { id: Persona; label: string; emoji: string; blurb: string }[] = [
  { id: "student", label: "Student", emoji: "🎒", blurb: "Commute, rain & daily plans" },
  { id: "farmer", label: "Farmer", emoji: "🌾", blurb: "Rainfall, humidity & crops" },
  { id: "traveller", label: "Traveller", emoji: "✈️", blurb: "Destinations & warnings" },
  { id: "general", label: "General", emoji: "🏠", blurb: "Weather, forecast & alerts" },
];

export const INTERESTS: { id: Interest; label: string; emoji: string }[] = [
  { id: "daily", label: "Daily Weather", emoji: "🌤" },
  { id: "rainfall", label: "Rainfall", emoji: "🌧" },
  { id: "temperature", label: "Temperature", emoji: "🌡" },
  { id: "travel", label: "Travel", emoji: "🧳" },
  { id: "agriculture", label: "Agriculture", emoji: "🌾" },
  { id: "air", label: "Air Quality", emoji: "🍃" },
  { id: "severe", label: "Severe Weather Alerts", emoji: "⚠️" },
];

export const PERSONA_DEFAULT_INTERESTS: Record<Persona, Interest[]> = {
  student: ["daily", "rainfall", "travel", "severe"],
  farmer: ["rainfall", "temperature", "agriculture", "severe"],
  traveller: ["travel", "daily", "severe", "air"],
  general: ["daily", "temperature", "severe"],
};

const DEFAULT_PREFS: Prefs = {
  onboarded: false,
  name: "",
  cityId: "hyderabad",
  persona: "general",
  interests: ["daily", "temperature", "severe"],
  destinationId: "chennai",
  notifications: { severe: true, daily: true, rain: true, agri: false },
};

const KEY = "mausam-prefs-v1";

interface Ctx {
  prefs: Prefs;
  hydrated: boolean;
  update: (patch: Partial<Prefs>) => void;
  toggleInterest: (i: Interest) => void;
  reset: () => void;
}

const PrefsContext = createContext<Ctx | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(KEY, JSON.stringify(prefs));
  }, [prefs, hydrated]);

  const update = useCallback((patch: Partial<Prefs>) => setPrefs((p) => ({ ...p, ...patch })), []);
  const toggleInterest = useCallback(
    (i: Interest) =>
      setPrefs((p) => ({
        ...p,
        interests: p.interests.includes(i) ? p.interests.filter((x) => x !== i) : [...p.interests, i],
      })),
    [],
  );
  const reset = useCallback(() => setPrefs(DEFAULT_PREFS), []);

  const value = useMemo(() => ({ prefs, hydrated, update, toggleInterest, reset }), [prefs, hydrated, update, toggleInterest, reset]);
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs outside provider");
  return ctx;
}
