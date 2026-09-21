import { useQuery } from "@tanstack/react-query";
import { CITIES, getCity, registerCustomCity, type City, type Condition } from "./weather-data";
import type { SelectedLocation } from "./prefs";

export interface ApiStatus {
  hasKey: boolean;
  provider: "OpenWeatherMap" | "WeatherAPI" | "IMD Standard (Built-in)";
  apiKeyName?: string | undefined;
  isLive: boolean;
}

/**
 * Clean and validate API key string (strips extra characters or whitespace)
 */
function cleanKey(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  // OpenWeather API keys are 32 hex characters
  const match = trimmed.match(/^[a-fA-F0-9]{32}/);
  if (match) return match[0];
  return trimmed.length > 10 ? trimmed : null;
}

export function getApiStatus(): ApiStatus {
  const env = import.meta.env as Record<string, string | undefined>;
  const openWeatherKey = cleanKey(env["VITE_OPENWEATHER_API_KEY"]);
  const weatherApiKey = cleanKey(env["VITE_WEATHERAPI_KEY"]);

  if (openWeatherKey) {
    return {
      hasKey: true,
      provider: "OpenWeatherMap",
      apiKeyName: "VITE_OPENWEATHER_API_KEY",
      isLive: true,
    };
  }

  if (weatherApiKey) {
    return {
      hasKey: true,
      provider: "WeatherAPI",
      apiKeyName: "VITE_WEATHERAPI_KEY",
      isLive: true,
    };
  }

  return {
    hasKey: false,
    provider: "IMD Standard (Built-in)",
    apiKeyName: undefined,
    isLive: false,
  };
}

/**
 * Map OpenWeather numeric weather codes to app condition types
 */
export function mapOpenWeatherCondition(weatherId: number): Condition {
  // 2xx: Thunderstorm
  if (weatherId >= 200 && weatherId < 300) return "storm";
  // 3xx: Drizzle
  if (weatherId >= 300 && weatherId < 500) return "rain";
  // 5xx: Rain
  if (weatherId >= 500 && weatherId < 600) {
    if (weatherId === 502 || weatherId === 503 || weatherId === 504 || weatherId === 522) {
      return "heavy-rain";
    }
    return "rain";
  }
  // 6xx: Snow
  if (weatherId >= 600 && weatherId < 700) return "snow";
  // 7xx: Atmosphere (Mist, Smoke, Haze, Fog, Dust, Sand)
  if (weatherId >= 700 && weatherId < 800) return "haze";
  // 800: Clear sky
  if (weatherId === 800) return "sunny";
  // 801, 802: Few / scattered clouds
  if (weatherId === 801 || weatherId === 802) return "partly";
  // 803, 804: Broken / overcast clouds
  if (weatherId >= 803) return "cloudy";
  return "partly";
}

/**
 * Convert wind direction degrees to 16-point compass string
 */
export function degreesToCompass(deg: number): string {
  const val = Math.floor(deg / 22.5 + 0.5);
  const arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return arr[val % 16] ?? "N";
}

/**
 * Format unix timestamp in seconds with timezone offset into HH:mm (24h)
 */
export function formatSunTime(unixSeconds: number, timezoneOffsetSec = 19800): string {
  const d = new Date((unixSeconds + timezoneOffsetSec) * 1000);
  const h = String(d.getUTCHours()).padStart(2, "0");
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Estimate standard Indian AQI from OpenWeather PM2.5 or 1-5 scale
 */
export function openWeatherAqiToAqi(owmAqi: number, pm25?: number): number {
  if (pm25 !== undefined && pm25 >= 0) {
    if (pm25 <= 30) return Math.round((pm25 / 30) * 50);
    if (pm25 <= 60) return Math.round(50 + ((pm25 - 30) / 30) * 50);
    if (pm25 <= 90) return Math.round(100 + ((pm25 - 60) / 30) * 100);
    if (pm25 <= 120) return Math.round(200 + ((pm25 - 90) / 30) * 100);
    if (pm25 <= 250) return Math.round(300 + ((pm25 - 120) / 130) * 100);
    return Math.min(500, Math.round(400 + ((pm25 - 250) / 130) * 100));
  }
  const scale: Record<number, number> = { 1: 35, 2: 70, 3: 125, 4: 175, 5: 280 };
  return scale[owmAqi] ?? 60;
}

// In-memory cache for live weather responses (60s TTL)
const liveCityCache = new Map<string, { data: City; fetchedAt: number }>();
const CACHE_TTL_MS = 60 * 1000;

/**
 * Fetch live weather from OpenWeatherMap using EXACT latitude and longitude coordinates.
 * Always requests metric units (Celsius, m/s).
 */
export async function fetchLiveWeatherByCoords(
  lat: number,
  lon: number,
  name: string,
  state?: string,
  cityId?: string
): Promise<City> {
  const id = cityId || `geo_${lat.toFixed(4)}_${lon.toFixed(4)}`;
  const fallback = getCity(id);

  const env = import.meta.env as Record<string, string | undefined>;
  const openWeatherKey = cleanKey(env["VITE_OPENWEATHER_API_KEY"]);

  console.log(`[Mausam Coordinates] Fetching OpenWeather for "${name}" at Lat: ${lat}, Lon: ${lon} (units=metric)`);

  if (!openWeatherKey) {
    console.warn("[Mausam] No VITE_OPENWEATHER_API_KEY found, returning fallback data.");
    return { ...fallback, lat, lng: lon, name, state: state || fallback.state };
  }

  try {
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${openWeatherKey}&units=metric`;
    const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${openWeatherKey}`;

    const [weatherRes, aqiRes] = await Promise.allSettled([
      fetch(weatherUrl),
      fetch(aqiUrl),
    ]);

    if (weatherRes.status === "fulfilled" && weatherRes.value.ok) {
      const data = await weatherRes.value.json();

      let liveAqi = fallback.aqi;
      if (aqiRes.status === "fulfilled" && aqiRes.value.ok) {
        try {
          const aqiData = await aqiRes.value.json();
          const firstAqi = aqiData.list?.[0];
          if (firstAqi) {
            liveAqi = openWeatherAqiToAqi(firstAqi.main?.aqi ?? 2, firstAqi.components?.pm2_5);
          }
        } catch {}
      }

      const weatherItem = data.weather?.[0];
      const condition = weatherItem ? mapOpenWeatherCondition(weatherItem.id) : fallback.condition;
      const weatherIcon = weatherItem?.icon || "";
      const isNight =
        weatherIcon.endsWith("n") ||
        (data.dt && data.sys?.sunrise && data.sys?.sunset
          ? data.dt < data.sys.sunrise || data.dt > data.sys.sunset
          : false);

      const windKmh = Math.round((data.wind?.speed ?? 0) * 3.6);
      const windDeg = data.wind?.deg ?? 0;
      const windDir = degreesToCompass(windDeg);

      const tzOffset = typeof data.timezone === "number" ? data.timezone : 19800;
      const sunrise = data.sys?.sunrise ? formatSunTime(data.sys.sunrise, tzOffset) : fallback.sunrise;
      const sunset = data.sys?.sunset ? formatSunTime(data.sys.sunset, tzOffset) : fallback.sunset;

      const rainAmount =
        data.rain?.["1h"] ??
        data.rain?.["3h"] ??
        (data.snow?.["1h"] ?? data.snow?.["3h"] ?? 0);
      const rawDesc = weatherItem?.description || "Clear sky";
      const desc = rawDesc.charAt(0).toUpperCase() + rawDesc.slice(1);

      const rainProb =
        condition === "heavy-rain" || condition === "storm"
          ? 90
          : condition === "rain"
          ? 75
          : Math.min(100, Math.round((data.clouds?.all ?? 0) * 0.7));

      const merged: City = {
        ...fallback,
        id,
        name: name || data.name || fallback.name,
        state: state || fallback.state,
        lat,
        lng: lon,
        temp: Math.round(data.main.temp),
        feels: Math.round(data.main.feels_like),
        condition,
        description: desc,
        isNight,
        icon: weatherIcon,
        humidity: data.main.humidity,
        wind: windKmh,
        windDir,
        windDeg,
        rain: Math.round(rainAmount * 10) / 10,
        rainProb,
        cloud: data.clouds?.all ?? fallback.cloud,
        pressure: data.main.pressure ?? fallback.pressure,
        visibility: data.visibility ? Math.round((data.visibility / 1000) * 10) / 10 : fallback.visibility,
        sunrise,
        sunset,
        aqi: liveAqi,
        summary: `${desc}. Live observation for ${name || data.name}.`,
      };

      console.log(`[Mausam Weather Response] OpenWeather data for "${merged.name}" (${lat}, ${lon}):`, {
        station: data.name,
        coordinates: { lat, lon },
        temperature: `${merged.temp}°C`,
        feelsLike: `${merged.feels}°C`,
        humidity: `${merged.humidity}%`,
        windSpeed: `${merged.wind} km/h (${merged.windDir})`,
        pressure: `${merged.pressure} hPa`,
        visibility: `${merged.visibility} km`,
        weatherDescription: desc,
        condition: merged.condition,
        isNight,
        sunrise: merged.sunrise,
        sunset: merged.sunset,
      });

      registerCustomCity(merged);
      liveCityCache.set(id, { data: merged, fetchedAt: Date.now() });
      return merged;
    } else {
      console.warn(`[Mausam] OpenWeather Current Weather failed with status:`, weatherRes.status === "fulfilled" ? weatherRes.value.status : "error");
    }
  } catch (err) {
    console.error("[Mausam] Error fetching live weather by coordinates:", err);
  }

  return { ...fallback, lat, lng: lon, name, state: state || fallback.state };
}

/**
 * Fetch live weather from OpenWeatherMap using the city's registered coordinates.
 */
export async function fetchLiveCityWeather(cityId: string): Promise<City> {
  const fallback = getCity(cityId);
  const cached = liveCityCache.get(cityId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }
  return fetchLiveWeatherByCoords(
    fallback.lat,
    fallback.lng,
    fallback.name,
    fallback.state,
    fallback.id
  );
}

/**
 * React Hook to access reactive, live weather data for any city ID
 */
export function useCityWeather(cityId: string) {
  const fallback = getCity(cityId);

  return useQuery<City>({
    queryKey: ["cityWeather", cityId],
    queryFn: () => fetchLiveCityWeather(cityId),
    placeholderData: fallback,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}

/**
 * React Hook to access reactive, live weather data strictly by latitude & longitude
 */
export function useLocationWeather(loc: SelectedLocation) {
  const fallback = getCity(loc.id);

  return useQuery<City>({
    queryKey: ["locationWeather", loc.lat.toFixed(4), loc.lng.toFixed(4)],
    queryFn: () =>
      fetchLiveWeatherByCoords(
        loc.lat,
        loc.lng,
        loc.name,
        loc.state,
        loc.id
      ),
    placeholderData: fallback,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}

export interface GeocodedLocation {
  id: string;
  name: string;
  state?: string | undefined;
  country: string;
  lat: number;
  lng: number;
  displayName: string;
}

/**
 * Search locations using OpenWeather Geocoding API with exact coordinates
 */
export async function searchLocations(query: string): Promise<GeocodedLocation[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const env = import.meta.env as Record<string, string | undefined>;
  const openWeatherKey = cleanKey(env["VITE_OPENWEATHER_API_KEY"]);

  const results: GeocodedLocation[] = [];
  const seenCoords = new Set<string>();

  const addLocation = (loc: GeocodedLocation) => {
    const key = `${loc.lat.toFixed(3)}_${loc.lng.toFixed(3)}`;
    if (!seenCoords.has(key)) {
      seenCoords.add(key);
      results.push(loc);
    }
  };

  // 1. Check for 6-digit Indian PIN code (e.g. 506001, 110001, 452001)
  const isPin = /^\d{6}$/.test(q);
  if (openWeatherKey && isPin) {
    try {
      const pinUrl = `https://api.openweathermap.org/geo/1.0/zip?zip=${q},IN&appid=${openWeatherKey}`;
      const pinRes = await fetch(pinUrl);
      if (pinRes.ok) {
        const pinData = (await pinRes.json()) as {
          name: string;
          lat: number;
          lon: number;
          country: string;
        };
        if (pinData.lat && pinData.lon) {
          const id = `geo_${pinData.lat.toFixed(4)}_${pinData.lon.toFixed(4)}`;
          addLocation({
            id,
            name: `${pinData.name} (${q})`,
            state: "India",
            country: pinData.country || "IN",
            lat: pinData.lat,
            lng: pinData.lon,
            displayName: `${pinData.name} (${q}), India`,
          });
        }
      }
    } catch (pinErr) {
      console.error("[Mausam Geocoding] PIN search failed:", pinErr);
    }
  }

  // 2. Direct query to OpenWeather Geocoding API for exact coordinates
  if (openWeatherKey) {
    try {
      console.log(`[Mausam Geocoding] Querying OpenWeather Geocoding API for: "${q}"`);
      const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=8&appid=${openWeatherKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as Array<{
          name: string;
          lat: number;
          lon: number;
          country: string;
          state?: string;
        }>;

        console.log(`[Mausam Geocoding] Received ${data.length} results from OpenWeather for "${q}"`);

        for (const item of data) {
          const id = `geo_${item.lat.toFixed(4)}_${item.lon.toFixed(4)}`;
          const stateStr = item.state ? `${item.state}, ${item.country}` : item.country;
          addLocation({
            id,
            name: item.name,
            state: item.state,
            country: item.country,
            lat: item.lat,
            lng: item.lon,
            displayName: `${item.name}, ${stateStr}`,
          });
        }
      } else {
        console.warn(`[Mausam Geocoding] API returned status: ${res.status}`);
      }
    } catch (err) {
      console.error("[Mausam Geocoding] API search failed:", err);
    }
  }

  // Fallback to local stations if geocoding returns no results or offline
  if (results.length === 0) {
    const qLower = q.toLowerCase();
    for (const c of CITIES) {
      if (c.name.toLowerCase().includes(qLower) || c.state.toLowerCase().includes(qLower)) {
        addLocation({
          id: c.id,
          name: c.name,
          state: c.state,
          country: "IN",
          lat: c.lat,
          lng: c.lng,
          displayName: `${c.name}, ${c.state}`,
        });
      }
    }
  }

  return results;
}


