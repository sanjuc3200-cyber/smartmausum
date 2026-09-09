import { addDays, addHours, format } from "date-fns";

export type Condition = "sunny" | "partly" | "cloudy" | "rain" | "heavy-rain" | "storm" | "haze";
export type AlertLevel = "normal" | "moderate" | "severe" | "extreme";
export type AlertType =
  | "Heavy Rain"
  | "Thunderstorm"
  | "Cyclone"
  | "Heat Wave"
  | "Flood Warning"
  | "Strong Wind";

export interface City {
  id: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
  temp: number;
  feels: number;
  condition: Condition;
  humidity: number;
  wind: number;
  windDir: string;
  windDeg: number;
  rain: number; // mm last 24h
  rainProb: number; // %
  cloud: number; // %
  aqi: number;
  uv: number;
  visibility: number; // km
  pressure: number;
  sunrise: string;
  sunset: string;
  alertLevel: AlertLevel;
  summary: string;
}

export interface WeatherAlert {
  id: string;
  type: AlertType;
  level: AlertLevel;
  cityId: string;
  region: string;
  title: string;
  description: string;
  issued: string;
  validTill: string;
  advice: string[];
  impact: string;
}

export const CITIES: City[] = [
  {
    id: "hyderabad", name: "Hyderabad", state: "Telangana", lat: 17.385, lng: 78.4867,
    temp: 27, feels: 30, condition: "storm", humidity: 82, wind: 22, windDir: "SW", windDeg: 225,
    rain: 38, rainProb: 80, cloud: 88, aqi: 62, uv: 3, visibility: 4, pressure: 1004,
    sunrise: "06:04", sunset: "18:26", alertLevel: "severe",
    summary: "Thunderstorms with gusty winds likely this evening. Carry rain protection.",
  },
  {
    id: "vijayawada", name: "Vijayawada", state: "Andhra Pradesh", lat: 16.5062, lng: 80.648,
    temp: 29, feels: 34, condition: "rain", humidity: 79, wind: 18, windDir: "SE", windDeg: 135,
    rain: 24, rainProb: 65, cloud: 76, aqi: 55, uv: 4, visibility: 6, pressure: 1005,
    sunrise: "05:58", sunset: "18:18", alertLevel: "moderate",
    summary: "Moderate rain spells through the night; humid and warm.",
  },
  {
    id: "chennai", name: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707,
    temp: 31, feels: 37, condition: "partly", humidity: 74, wind: 16, windDir: "S", windDeg: 180,
    rain: 4, rainProb: 30, cloud: 45, aqi: 71, uv: 7, visibility: 9, pressure: 1006,
    sunrise: "05:56", sunset: "18:10", alertLevel: "normal",
    summary: "Partly cloudy and humid. Light showers possible late night.",
  },
  {
    id: "delhi", name: "New Delhi", state: "Delhi", lat: 28.6139, lng: 77.209,
    temp: 35, feels: 39, condition: "haze", humidity: 48, wind: 9, windDir: "NW", windDeg: 315,
    rain: 0, rainProb: 10, cloud: 20, aqi: 168, uv: 8, visibility: 3, pressure: 1002,
    sunrise: "06:02", sunset: "18:36", alertLevel: "moderate",
    summary: "Hot and hazy. Stay hydrated; air quality is poor.",
  },
  {
    id: "mumbai", name: "Mumbai", state: "Maharashtra", lat: 19.076, lng: 72.8777,
    temp: 26, feels: 31, condition: "heavy-rain", humidity: 92, wind: 34, windDir: "W", windDeg: 270,
    rain: 96, rainProb: 95, cloud: 100, aqi: 41, uv: 2, visibility: 2, pressure: 999,
    sunrise: "06:22", sunset: "18:44", alertLevel: "extreme",
    summary: "Extremely heavy rainfall. Avoid travel; waterlogging expected.",
  },
  {
    id: "kolkata", name: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639,
    temp: 30, feels: 36, condition: "rain", humidity: 85, wind: 14, windDir: "S", windDeg: 180,
    rain: 22, rainProb: 70, cloud: 80, aqi: 88, uv: 4, visibility: 5, pressure: 1003,
    sunrise: "05:22", sunset: "17:48", alertLevel: "moderate",
    summary: "Intermittent rain with sultry conditions.",
  },
  {
    id: "bengaluru", name: "Bengaluru", state: "Karnataka", lat: 12.9716, lng: 77.5946,
    temp: 24, feels: 25, condition: "cloudy", humidity: 70, wind: 15, windDir: "W", windDeg: 270,
    rain: 6, rainProb: 45, cloud: 82, aqi: 48, uv: 4, visibility: 8, pressure: 1010,
    sunrise: "06:08", sunset: "18:22", alertLevel: "normal",
    summary: "Pleasant and overcast. Light drizzle towards evening.",
  },
  {
    id: "jaipur", name: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873,
    temp: 36, feels: 38, condition: "sunny", humidity: 35, wind: 11, windDir: "W", windDeg: 270,
    rain: 0, rainProb: 5, cloud: 8, aqi: 96, uv: 9, visibility: 10, pressure: 1003,
    sunrise: "06:09", sunset: "18:40", alertLevel: "severe",
    summary: "Heat wave conditions. Avoid outdoor exposure 12–4 PM.",
  },
  {
    id: "bhubaneswar", name: "Bhubaneswar", state: "Odisha", lat: 20.2961, lng: 85.8245,
    temp: 28, feels: 33, condition: "heavy-rain", humidity: 90, wind: 42, windDir: "NE", windDeg: 45,
    rain: 72, rainProb: 90, cloud: 100, aqi: 39, uv: 2, visibility: 3, pressure: 996,
    sunrise: "05:36", sunset: "18:00", alertLevel: "extreme",
    summary: "Depression over Bay of Bengal. Very heavy rain with strong winds.",
  },
  {
    id: "visakhapatnam", name: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.6868, lng: 83.2185,
    temp: 28, feels: 33, condition: "rain", humidity: 88, wind: 38, windDir: "NE", windDeg: 45,
    rain: 44, rainProb: 85, cloud: 94, aqi: 44, uv: 3, visibility: 4, pressure: 998,
    sunrise: "05:46", sunset: "18:08", alertLevel: "severe",
    summary: "Squally winds 40–50 km/h along the coast. Fishermen advised not to venture out.",
  },
  {
    id: "guwahati", name: "Guwahati", state: "Assam", lat: 26.1445, lng: 91.7362,
    temp: 29, feels: 34, condition: "rain", humidity: 86, wind: 12, windDir: "E", windDeg: 90,
    rain: 56, rainProb: 80, cloud: 90, aqi: 52, uv: 3, visibility: 5, pressure: 1001,
    sunrise: "05:08", sunset: "17:36", alertLevel: "severe",
    summary: "Brahmaputra above danger mark. Flood warning in low-lying areas.",
  },
  {
    id: "lucknow", name: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462,
    temp: 33, feels: 37, condition: "partly", humidity: 58, wind: 10, windDir: "E", windDeg: 90,
    rain: 2, rainProb: 20, cloud: 40, aqi: 121, uv: 7, visibility: 6, pressure: 1003,
    sunrise: "05:50", sunset: "18:22", alertLevel: "normal",
    summary: "Warm with scattered clouds. No significant weather.",
  },
  {
    id: "kochi", name: "Kochi", state: "Kerala", lat: 9.9312, lng: 76.2673,
    temp: 27, feels: 31, condition: "rain", humidity: 88, wind: 20, windDir: "W", windDeg: 270,
    rain: 30, rainProb: 75, cloud: 86, aqi: 32, uv: 3, visibility: 6, pressure: 1008,
    sunrise: "06:14", sunset: "18:26", alertLevel: "moderate",
    summary: "Monsoon showers continue; sea rough along the coast.",
  },
  {
    id: "ahmedabad", name: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714,
    temp: 34, feels: 37, condition: "sunny", humidity: 44, wind: 13, windDir: "SW", windDeg: 225,
    rain: 0, rainProb: 8, cloud: 15, aqi: 102, uv: 9, visibility: 9, pressure: 1004,
    sunrise: "06:24", sunset: "18:52", alertLevel: "normal",
    summary: "Sunny and hot. UV index very high.",
  },
  {
    id: "pune", name: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567,
    temp: 25, feels: 27, condition: "cloudy", humidity: 78, wind: 17, windDir: "W", windDeg: 270,
    rain: 12, rainProb: 55, cloud: 85, aqi: 58, uv: 3, visibility: 7, pressure: 1008,
    sunrise: "06:20", sunset: "18:40", alertLevel: "normal",
    summary: "Overcast with light showers; comfortable temperatures.",
  },
  {
    id: "srinagar", name: "Srinagar", state: "Jammu & Kashmir", lat: 34.0837, lng: 74.7973,
    temp: 22, feels: 21, condition: "partly", humidity: 52, wind: 8, windDir: "N", windDeg: 0,
    rain: 0, rainProb: 15, cloud: 35, aqi: 28, uv: 6, visibility: 10, pressure: 1012,
    sunrise: "06:05", sunset: "18:50", alertLevel: "normal",
    summary: "Clear skies with crisp mountain air.",
  },
  {
    id: "nagpur", name: "Nagpur", state: "Maharashtra", lat: 21.1458, lng: 79.0882,
    temp: 31, feels: 35, condition: "partly", humidity: 66, wind: 12, windDir: "SW", windDeg: 225,
    rain: 5, rainProb: 35, cloud: 50, aqi: 74, uv: 6, visibility: 8, pressure: 1004,
    sunrise: "06:02", sunset: "18:28", alertLevel: "normal",
    summary: "Warm and partly cloudy; isolated showers.",
  },
  {
    id: "patna", name: "Patna", state: "Bihar", lat: 25.5941, lng: 85.1376,
    temp: 32, feels: 38, condition: "cloudy", humidity: 80, wind: 11, windDir: "E", windDeg: 90,
    rain: 14, rainProb: 60, cloud: 78, aqi: 132, uv: 5, visibility: 5, pressure: 1002,
    sunrise: "05:36", sunset: "18:06", alertLevel: "moderate",
    summary: "Humid with occasional showers; river levels rising.",
  },
];

export const ALERTS: WeatherAlert[] = [
  {
    id: "al-mumbai-rain", type: "Heavy Rain", level: "extreme", cityId: "mumbai",
    region: "Mumbai, Thane & Palghar",
    title: "Extremely heavy rainfall — Red Alert",
    description:
      "Extremely heavy rainfall (>204.5 mm) very likely at isolated places over Mumbai, Thane and Palghar districts during the next 24 hours. Waterlogging in low-lying areas and disruption to local train services expected.",
    issued: "Today, 14:30 IST", validTill: "Tomorrow, 14:30 IST",
    impact: "Flooding of roads, traffic disruption, risk to life in low-lying areas.",
    advice: ["Avoid non-essential travel", "Stay away from waterlogged roads and open drains", "Keep emergency numbers handy", "Follow BMC & IMD updates"],
  },
  {
    id: "al-odisha-cyclone", type: "Cyclone", level: "extreme", cityId: "bhubaneswar",
    region: "Coastal Odisha & North Andhra",
    title: "Deep Depression over Bay of Bengal — Cyclone Watch",
    description:
      "A deep depression over the west-central Bay of Bengal is likely to intensify into a cyclonic storm and move north-westwards, crossing the Odisha–North Andhra coast in the next 36 hours with wind speeds of 70–80 km/h gusting to 90 km/h.",
    issued: "Today, 11:00 IST", validTill: "In 48 hours",
    impact: "Damage to thatched houses, uprooting of trees, power disruption, storm surge of 1 m.",
    advice: ["Fishermen: do not venture into the sea", "Move to cyclone shelters if advised", "Secure loose objects", "Charge phones & stock essentials"],
  },
  {
    id: "al-hyd-storm", type: "Thunderstorm", level: "severe", cityId: "hyderabad",
    region: "Hyderabad, Rangareddy & Medchal",
    title: "Thunderstorm with gusty winds — Orange Alert",
    description:
      "Thunderstorm accompanied with lightning and gusty winds (40–50 km/h) very likely at isolated places during the evening and night hours.",
    issued: "Today, 15:45 IST", validTill: "Today, 23:59 IST",
    impact: "Lightning risk in open areas, minor damage to weak structures, traffic delays.",
    advice: ["Stay indoors during thunder", "Unplug electrical appliances", "Avoid sheltering under trees", "Do not stand near metal objects"],
  },
  {
    id: "al-jaipur-heat", type: "Heat Wave", level: "severe", cityId: "jaipur",
    region: "Jaipur, Sikar & Churu",
    title: "Heat wave conditions — Orange Alert",
    description:
      "Heat wave conditions very likely at isolated pockets over eastern Rajasthan with maximum temperatures 4–5°C above normal.",
    issued: "Today, 08:00 IST", validTill: "In 2 days",
    impact: "Heat illness for vulnerable people, infants, elderly and outdoor workers.",
    advice: ["Avoid going out between 12 PM and 4 PM", "Drink ORS / water frequently", "Wear light cotton clothes", "Check on elderly neighbours"],
  },
  {
    id: "al-guwahati-flood", type: "Flood Warning", level: "severe", cityId: "guwahati",
    region: "Kamrup, Barpeta & Dhubri",
    title: "Flood warning — Brahmaputra above danger level",
    description:
      "The Brahmaputra at Guwahati is flowing above the danger mark following persistent rainfall over the catchment. Rise of 20–30 cm expected in the next 24 hours.",
    issued: "Today, 09:30 IST", validTill: "In 72 hours",
    impact: "Inundation of low-lying areas, disruption of road connectivity.",
    advice: ["Move valuables to higher floors", "Avoid crossing flooded roads", "Boil drinking water", "Follow ASDMA advisories"],
  },
  {
    id: "al-vizag-wind", type: "Strong Wind", level: "severe", cityId: "visakhapatnam",
    region: "Visakhapatnam & Srikakulam coast",
    title: "Squally winds along the coast",
    description:
      "Squally weather with wind speed reaching 45–55 km/h gusting to 65 km/h likely along and off the north Andhra coast.",
    issued: "Today, 10:15 IST", validTill: "In 36 hours",
    impact: "Rough to very rough sea conditions; hazardous for small vessels.",
    advice: ["Fishermen advised not to venture out", "Secure boats and fishing gear", "Beach visits not recommended"],
  },
  {
    id: "al-vij-rain", type: "Heavy Rain", level: "moderate", cityId: "vijayawada",
    region: "Krishna & NTR districts",
    title: "Heavy rain likely — Yellow Alert",
    description: "Heavy rainfall (64.5–115.5 mm) likely at isolated places over Krishna and NTR districts.",
    issued: "Today, 13:00 IST", validTill: "Tomorrow, 08:30 IST",
    impact: "Localised waterlogging, slippery roads.",
    advice: ["Carry rain gear", "Drive carefully", "Check drainage around homes"],
  },
  {
    id: "al-delhi-heat", type: "Heat Wave", level: "moderate", cityId: "delhi",
    region: "Delhi NCR",
    title: "Hot & humid; poor air quality",
    description: "Maximum temperatures 2–3°C above normal with poor air quality (AQI 150–200).",
    issued: "Today, 07:30 IST", validTill: "Tomorrow, 07:30 IST",
    impact: "Discomfort for sensitive groups.",
    advice: ["Limit outdoor exertion", "Wear a mask if sensitive", "Stay hydrated"],
  },
  {
    id: "al-kolkata-rain", type: "Heavy Rain", level: "moderate", cityId: "kolkata",
    region: "Kolkata & South 24 Parganas",
    title: "Heavy rain at isolated places — Yellow Alert",
    description: "Heavy rain likely at one or two places with thunder and lightning.",
    issued: "Today, 12:00 IST", validTill: "Tomorrow, 12:00 IST",
    impact: "Waterlogging in low-lying pockets.",
    advice: ["Plan commute with buffer time", "Avoid open fields during lightning"],
  },
  {
    id: "al-kochi-sea", type: "Strong Wind", level: "moderate", cityId: "kochi",
    region: "Kerala coast",
    title: "Rough sea — Kallakkadal advisory",
    description: "High waves of 2.5–3.2 m forecast along the Kerala coast.",
    issued: "Today, 09:00 IST", validTill: "Tomorrow, 23:30 IST",
    impact: "Hazardous for beach-goers and small craft.",
    advice: ["Avoid beach areas", "Fishermen exercise caution"],
  },
];

export const LEVEL_ORDER: Record<AlertLevel, number> = { normal: 0, moderate: 1, severe: 2, extreme: 3 };

export const LEVEL_META: Record<AlertLevel, { label: string; badge: string; color: string; soft: string; text: string; ring: string; dot: string }> = {
  normal: { label: "Normal", badge: "Green", color: "bg-level-normal", soft: "bg-level-normal-soft", text: "text-level-normal", ring: "ring-level-normal/40", dot: "oklch(0.62 0.15 152)" },
  moderate: { label: "Moderate", badge: "Yellow", color: "bg-level-moderate", soft: "bg-level-moderate-soft", text: "text-level-moderate", ring: "ring-level-moderate/40", dot: "oklch(0.76 0.16 78)" },
  severe: { label: "Severe", badge: "Orange", color: "bg-level-severe", soft: "bg-level-severe-soft", text: "text-level-severe", ring: "ring-level-severe/40", dot: "oklch(0.67 0.2 42)" },
  extreme: { label: "Extreme", badge: "Red", color: "bg-level-extreme", soft: "bg-level-extreme-soft", text: "text-level-extreme", ring: "ring-level-extreme/40", dot: "oklch(0.55 0.22 25)" },
};

export const CONDITION_LABEL: Record<Condition, string> = {
  sunny: "Sunny",
  partly: "Partly Cloudy",
  cloudy: "Overcast",
  rain: "Rain",
  "heavy-rain": "Heavy Rain",
  storm: "Thunderstorm",
  haze: "Hazy",
};

export function getCity(id: string): City {
  return CITIES.find((c) => c.id === id) ?? CITIES[0]!;
}

export function alertsForCity(cityId: string) {
  return ALERTS.filter((a) => a.cityId === cityId).sort((a, b) => LEVEL_ORDER[b.level] - LEVEL_ORDER[a.level]);
}

export function sortedAlerts() {
  return [...ALERTS].sort((a, b) => LEVEL_ORDER[b.level] - LEVEL_ORDER[a.level]);
}

/* ---------- deterministic forecast generation ---------- */
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface HourPoint {
  label: string;
  hour: number;
  temp: number;
  rainProb: number;
  condition: Condition;
  wind: number;
}

export interface DayPoint {
  label: string;
  date: string;
  hi: number;
  lo: number;
  rainProb: number;
  rain: number;
  condition: Condition;
  humidity: number;
  wind: number;
}

const conditionFor = (base: Condition, rainProb: number, hour: number): Condition => {
  if (rainProb > 80) return base === "storm" ? "storm" : "heavy-rain";
  if (rainProb > 55) return "rain";
  if (rainProb > 35) return "cloudy";
  if (base === "haze") return "haze";
  if (hour >= 19 || hour < 6) return "partly";
  return rainProb > 20 ? "partly" : "sunny";
};

export function hourlyFor(city: City, now = new Date()): HourPoint[] {
  const rnd = seeded(city.id + "h");
  const out: HourPoint[] = [];
  for (let i = 0; i < 24; i++) {
    const d = addHours(now, i);
    const hour = d.getHours();
    const diurnal = Math.sin(((hour - 9) / 24) * Math.PI * 2) * 3;
    const temp = Math.round(city.temp + diurnal + (rnd() - 0.5) * 1.5);
    const rainProb = Math.max(0, Math.min(100, Math.round(city.rainProb + (rnd() - 0.5) * 30 + (hour >= 15 && hour <= 21 ? 10 : -5))));
    out.push({
      label: i === 0 ? "Now" : format(d, "h a"),
      hour,
      temp,
      rainProb,
      condition: conditionFor(city.condition, rainProb, hour),
      wind: Math.round(city.wind + (rnd() - 0.5) * 8),
    });
  }
  return out;
}

export function dailyFor(city: City, now = new Date()): DayPoint[] {
  const rnd = seeded(city.id + "d");
  const out: DayPoint[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(now, i);
    const drift = i * (rnd() - 0.45) * 1.2;
    const hi = Math.round(city.temp + 3 + drift + (rnd() - 0.5) * 2);
    const lo = Math.round(city.temp - 4 + drift + (rnd() - 0.5) * 2);
    const rainProb = Math.max(0, Math.min(100, Math.round(city.rainProb - i * 6 + (rnd() - 0.5) * 30)));
    out.push({
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : format(d, "EEE"),
      date: format(d, "d MMM"),
      hi,
      lo,
      rainProb,
      rain: Math.round((rainProb / 100) * city.rain * (0.6 + rnd() * 0.8)),
      condition: conditionFor(city.condition, rainProb, 12),
      humidity: Math.max(20, Math.min(98, Math.round(city.humidity + (rnd() - 0.5) * 16))),
      wind: Math.max(3, Math.round(city.wind + (rnd() - 0.5) * 10)),
    });
  }
  return out;
}

export function tempColor(t: number) {
  if (t <= 22) return "oklch(0.6 0.15 240)";
  if (t <= 27) return "oklch(0.7 0.13 200)";
  if (t <= 31) return "oklch(0.8 0.15 95)";
  if (t <= 34) return "oklch(0.72 0.18 55)";
  return "oklch(0.58 0.22 28)";
}
export function rainColor(mm: number) {
  if (mm < 5) return "oklch(0.85 0.05 230)";
  if (mm < 20) return "oklch(0.72 0.12 235)";
  if (mm < 50) return "oklch(0.58 0.16 245)";
  return "oklch(0.42 0.17 260)";
}
export function windColor(k: number) {
  if (k < 12) return "oklch(0.8 0.06 200)";
  if (k < 25) return "oklch(0.68 0.1 200)";
  if (k < 40) return "oklch(0.6 0.14 185)";
  return "oklch(0.5 0.16 170)";
}
export function aqiLabel(aqi: number) {
  if (aqi <= 50) return { label: "Good", level: "normal" as AlertLevel };
  if (aqi <= 100) return { label: "Satisfactory", level: "normal" as AlertLevel };
  if (aqi <= 150) return { label: "Moderate", level: "moderate" as AlertLevel };
  if (aqi <= 200) return { label: "Poor", level: "severe" as AlertLevel };
  return { label: "Very Poor", level: "extreme" as AlertLevel };
}
