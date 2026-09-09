import type { Interest, Persona, Prefs } from "./prefs";
import { LEVEL_ORDER, alertsForCity, getCity } from "./weather-data";

export type CardId =
  | "alerts"
  | "current"
  | "rain"
  | "hourly"
  | "daily"
  | "travel"
  | "humidity"
  | "wind"
  | "agri"
  | "aqi"
  | "temperature"
  | "sun";

export interface RankedCard {
  id: CardId;
  score: number;
  reason: string;
}

const PERSONA_WEIGHTS: Record<Persona, Partial<Record<CardId, number>>> = {
  student: { current: 10, rain: 9, travel: 8, daily: 7, hourly: 6, alerts: 6, aqi: 2, temperature: 3 },
  farmer: { rain: 10, humidity: 9, temperature: 8, wind: 7, agri: 9, daily: 6, alerts: 6, hourly: 3, current: 5 },
  traveller: { travel: 10, daily: 8, alerts: 8, current: 7, hourly: 5, wind: 4, aqi: 4, sun: 3 },
  general: { current: 10, hourly: 8, daily: 8, alerts: 7, temperature: 4, rain: 4, humidity: 2, wind: 2 },
};

const INTEREST_BOOST: Record<Interest, Partial<Record<CardId, number>>> = {
  daily: { daily: 4, hourly: 3 },
  rainfall: { rain: 5, hourly: 1 },
  temperature: { temperature: 5, sun: 1 },
  travel: { travel: 5, wind: 1 },
  agriculture: { agri: 6, humidity: 3, rain: 2 },
  air: { aqi: 6 },
  severe: { alerts: 5, wind: 1 },
};

const REASONS: Record<CardId, string> = {
  alerts: "Active warning for your area",
  current: "Always shown",
  rain: "You follow rainfall",
  hourly: "Plan your next hours",
  daily: "Weekly outlook",
  travel: "Travel interest",
  humidity: "Useful for crops",
  wind: "Wind matters to you",
  agri: "Agriculture interest",
  aqi: "Air quality interest",
  temperature: "Temperature interest",
  sun: "Daylight planning",
};

export function rankCards(prefs: Prefs): RankedCard[] {
  const scores: Partial<Record<CardId, number>> = {};
  const add = (id: CardId, n: number) => (scores[id] = (scores[id] ?? 0) + n);

  Object.entries(PERSONA_WEIGHTS[prefs.persona]).forEach(([k, v]) => add(k as CardId, v ?? 0));
  prefs.interests.forEach((i) => Object.entries(INTEREST_BOOST[i]).forEach(([k, v]) => add(k as CardId, v ?? 0)));

  // Current weather is the anchor
  add("current", 20);

  // Alerts escalate to the top
  const city = getCity(prefs.cityId);
  const alerts = alertsForCity(prefs.cityId);
  const top = alerts[0];
  if (top) {
    const lvl = LEVEL_ORDER[top.level];
    if (lvl >= 3) add("alerts", 40);
    else if (lvl >= 2) add("alerts", 25);
    else add("alerts", 8);
  }
  if (city.rainProb >= 70) add("rain", 4);
  if (city.aqi > 150) add("aqi", 4);

  return (Object.entries(scores) as [CardId, number][])
    .filter(([, s]) => s >= 4)
    .sort((a, b) => b[1] - a[1])
    .map(([id, score]) => ({
      id,
      score,
      reason:
        id === "alerts" && top
          ? `${top.level === "extreme" ? "Extreme" : top.level === "severe" ? "Severe" : "Moderate"} alert nearby`
          : REASONS[id],
    }));
}

export function personaLabel(p: Persona) {
  return { student: "Student", farmer: "Farmer", traveller: "Traveller", general: "General User" }[p];
}
