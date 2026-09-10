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

export type TempUnit = "C" | "F";

export interface UserAuth {
  isLoggedIn: boolean;
  type?: "phone" | "email";
  identifier?: string;
  name?: string;
  loginTime?: string;
}

export interface Prefs {
  onboarded: boolean;
  name: string;
  cityId: string;
  persona: Persona;
  interests: Interest[];
  destinationId: string;
  notifications: { severe: boolean; daily: boolean; rain: boolean; agri: boolean };
  tempUnit: TempUnit;
  auth?: UserAuth;
}

export function formatTemp(celsius: number, unit: TempUnit = "C"): string {
  if (unit === "F") {
    return `${Math.round((celsius * 9) / 5 + 32)}°`;
  }
  return `${Math.round(celsius)}°`;
}

export function formatTempValue(celsius: number, unit: TempUnit = "C"): number {
  if (unit === "F") {
    return Math.round((celsius * 9) / 5 + 32);
  }
  return Math.round(celsius);
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
  onboarded: true,
  name: "Vandana",
  cityId: "hyderabad",
  persona: "general",
  interests: ["daily", "temperature", "severe"],
  destinationId: "chennai",
  notifications: { severe: true, daily: true, rain: true, agri: false },
  tempUnit: "C",
  auth: {
    isLoggedIn: false,
  },
};

const KEY = "mausam-prefs-v1";

interface Ctx {
  prefs: Prefs;
  hydrated: boolean;
  update: (patch: Partial<Prefs>) => void;
  toggleInterest: (i: Interest) => void;
  reset: () => void;
  login: (authData: { type: "phone" | "email"; identifier: string; name?: string }) => void;
  logout: () => void;
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

  const login = useCallback((authData: { type: "phone" | "email"; identifier: string; name?: string }) => {
    setPrefs((p) => ({
      ...p,
      auth: {
        isLoggedIn: true,
        type: authData.type,
        identifier: authData.identifier,
        name: authData.name || p.name,
        loginTime: new Date().toISOString(),
      },
      name: authData.name || p.name,
    }));
  }, []);

  const logout = useCallback(() => {
    setPrefs((p) => ({
      ...p,
      auth: {
        isLoggedIn: false,
      },
    }));
  }, []);

  const value = useMemo(
    () => ({ prefs, hydrated, update, toggleInterest, reset, login, logout }),
    [prefs, hydrated, update, toggleInterest, reset, login, logout],
  );
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs outside provider");
  return ctx;
}
