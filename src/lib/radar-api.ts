import { CITIES, type City } from "./weather-data";

export interface RadarFrame {
  time: number;
  path: string;
  type: "past" | "nowcast";
  label: string;
  relativeTime: string;
}

export interface RadarMetadata {
  host: string;
  generated: number;
  past: RadarFrame[];
  nowcast: RadarFrame[];
  satellite: RadarFrame[];
  allRadarFrames: RadarFrame[];
}

// Memory cache for radar metadata to avoid spamming the RainViewer API
let cachedMetadata: { data: RadarMetadata; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Format timestamp into relative readable label (e.g. "20m ago", "NOW - LIVE", "+15m Nowcast")
 */
function formatRelativeTime(frameTime: number, nowTime: number, isNowcast: boolean): { label: string; relativeTime: string } {
  const date = new Date(frameTime * 1000);
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const diffMinutes = Math.round((frameTime - nowTime) / 60);

  if (Math.abs(diffMinutes) <= 6 && !isNowcast) {
    return { label: timeStr, relativeTime: "LIVE NOW" };
  }
  if (diffMinutes < 0) {
    return { label: timeStr, relativeTime: `${Math.abs(diffMinutes)}m ago` };
  }
  return { label: timeStr, relativeTime: `+${diffMinutes}m forecast` };
}

/**
 * Fetch real-time radar frames from RainViewer API
 */
export async function fetchRadarMetadata(): Promise<RadarMetadata> {
  const now = Date.now();
  if (cachedMetadata && now - cachedMetadata.fetchedAt < CACHE_TTL_MS) {
    return cachedMetadata.data;
  }

  try {
    const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
    if (!res.ok) throw new Error(`RainViewer API status: ${res.status}`);
    const json = await res.json();

    const host = json.host || "https://tilecache.rainviewer.com";
    const nowSec = Math.floor(now / 1000);

    const past: RadarFrame[] = (json.radar?.past || []).map((f: { time: number; path: string }) => {
      const { label, relativeTime } = formatRelativeTime(f.time, nowSec, false);
      return {
        time: f.time,
        path: f.path,
        type: "past" as const,
        label,
        relativeTime,
      };
    });

    const nowcast: RadarFrame[] = (json.radar?.nowcast || []).map((f: { time: number; path: string }) => {
      const { label, relativeTime } = formatRelativeTime(f.time, nowSec, true);
      return {
        time: f.time,
        path: f.path,
        type: "nowcast" as const,
        label,
        relativeTime,
      };
    });

    const satellite: RadarFrame[] = (json.satellite?.infrared || []).map((f: { time: number; path: string }) => {
      const { label, relativeTime } = formatRelativeTime(f.time, nowSec, false);
      return {
        time: f.time,
        path: f.path,
        type: "past" as const,
        label,
        relativeTime,
      };
    });

    const allRadarFrames = [...past, ...nowcast];

    const data: RadarMetadata = {
      host,
      generated: json.generated || nowSec,
      past,
      nowcast,
      satellite,
      allRadarFrames,
    };

    cachedMetadata = { data, fetchedAt: now };
    return data;
  } catch (err) {
    console.warn("RainViewer fetch failed, using fallback radar frames:", err);
    // Graceful fallback structure if offline
    const nowSec = Math.floor(now / 1000);
    const fallbackFrames: RadarFrame[] = Array.from({ length: 6 }).map((_, i) => {
      const time = nowSec - (5 - i) * 600;
      const { label, relativeTime } = formatRelativeTime(time, nowSec, false);
      return {
        time,
        path: `/v2/radar/fallback-${i}`,
        type: "past",
        label,
        relativeTime,
      };
    });
    return {
      host: "https://tilecache.rainviewer.com",
      generated: nowSec,
      past: fallbackFrames,
      nowcast: [],
      satellite: [],
      allRadarFrames: fallbackFrames,
    };
  }
}

/**
 * Get tile URL for a radar frame
 * Color schemes:
 * 2: TITAN (standard high-contrast weather radar)
 * 6: RAINVIEWER (default smooth colorful radar)
 */
export function getRadarTileUrl(host: string, path: string, colorScheme = 2, smooth = 1, snow = 1): string {
  return `${host}${path}/256/{z}/{x}/{y}/${colorScheme}/${smooth}_${snow}.png`;
}

/**
 * Get tile URL for infrared satellite cloud cover
 */
export function getSatelliteTileUrl(host: string, path: string): string {
  return `${host}${path}/256/{z}/{x}/{y}/0/0_0.png`;
}

// Beaufort Scale Definition
export interface BeaufortInfo {
  number: number;
  label: string;
  description: string;
  color: string;
}

export function getBeaufortInfo(kmh: number): BeaufortInfo {
  if (kmh < 2) return { number: 0, label: "Calm", description: "Smoke rises vertically", color: "oklch(0.75 0.1 200)" };
  if (kmh <= 5) return { number: 1, label: "Light Air", description: "Smoke drift indicates wind direction", color: "oklch(0.75 0.12 190)" };
  if (kmh <= 11) return { number: 2, label: "Light Breeze", description: "Wind felt on face; leaves rustle", color: "oklch(0.72 0.13 180)" };
  if (kmh <= 19) return { number: 3, label: "Gentle Breeze", description: "Leaves and small twigs in constant motion", color: "oklch(0.7 0.14 165)" };
  if (kmh <= 28) return { number: 4, label: "Moderate Breeze", description: "Small branches move; raises dust and paper", color: "oklch(0.68 0.16 145)" };
  if (kmh <= 38) return { number: 5, label: "Fresh Breeze", description: "Small trees in leaf begin to sway", color: "oklch(0.72 0.17 95)" };
  if (kmh <= 49) return { number: 6, label: "Strong Breeze", description: "Large branches in motion; umbrellas hard to use", color: "oklch(0.7 0.18 70)" };
  if (kmh <= 61) return { number: 7, label: "High Wind / Moderate Gale", description: "Whole trees in motion; walking against wind difficult", color: "oklch(0.65 0.2 45)" };
  if (kmh <= 74) return { number: 8, label: "Fresh Gale", description: "Twigs break off trees; progress generally impeded", color: "oklch(0.6 0.22 30)" };
  if (kmh <= 88) return { number: 9, label: "Strong Gale", description: "Slight structural damage occurs (roof slates blow off)", color: "oklch(0.55 0.24 20)" };
  if (kmh <= 102) return { number: 10, label: "Storm", description: "Trees uprooted; considerable structural damage", color: "oklch(0.5 0.26 10)" };
  if (kmh <= 117) return { number: 11, label: "Violent Storm", description: "Widespread damage accompanied by heavy rain", color: "oklch(0.45 0.25 350)" };
  return { number: 12, label: "Hurricane / Severe Cyclone", description: "Devastation; widespread destruction", color: "oklch(0.4 0.27 330)" };
}

/**
 * Convert degrees to 16-point compass direction
 */
export function degreesToCompass(deg: number): string {
  const val = Math.floor((deg / 22.5) + 0.5);
  const arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return arr[val % 16] ?? "N";
}

/**
 * Real-time Open-Meteo observation batch fetch for cities
 * Updates real-time meteorological conditions for map overlays
 */
export async function fetchLiveObservations(): Promise<Record<string, Partial<City>>> {
  const lats = CITIES.map((c) => c.lat).join(",");
  const lngs = CITIES.map((c) => c.lng).join(",");

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,cloud_cover`;
    const res = await fetch(url);
    if (!res.ok) return {};
    const data = await res.json();
    const list = Array.isArray(data) ? data : [data];

    const result: Record<string, Partial<City>> = {};
    list.forEach((item, idx) => {
      const city = CITIES[idx];
      if (!city || !item.current) return;
      const c = item.current;
      result[city.id] = {
        temp: Math.round(c.temperature_2m ?? city.temp),
        humidity: Math.round(c.relative_humidity_2m ?? city.humidity),
        wind: Math.round(c.wind_speed_10m ?? city.wind),
        windDeg: Math.round(c.wind_direction_10m ?? city.windDeg),
        windDir: degreesToCompass(c.wind_direction_10m ?? city.windDeg),
        rain: Math.round((c.precipitation ?? 0) * 10) / 10,
        cloud: Math.round(c.cloud_cover ?? city.cloud),
        pressure: Math.round(c.surface_pressure ?? city.pressure),
      };
    });
    return result;
  } catch (err) {
    console.warn("Open-Meteo live observation fetch failed:", err);
    return {};
  }
}
