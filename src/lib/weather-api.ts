import { useQuery } from "@tanstack/react-query";
import {
  CITIES,
  getCity,
  registerCustomCity,
  hourlyFor,
  dailyFor,
  type City,
  type Condition,
  type DayPoint,
  type HourPoint,
} from "./weather-data";
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
 * Format observation timestamp in the selected location's local timezone (e.g. "10:45 PM")
 */
export function formatObservationTime(unixSeconds: number, timezoneOffsetSec = 19800): string {
  const d = new Date((unixSeconds + timezoneOffsetSec) * 1000);
  const h24 = d.getUTCHours();
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return `${h12}:${m} ${period}`;
}

export interface LocationForecast {
  hourly: HourPoint[];
  daily: DayPoint[];
  timezoneOffset: number;
  cityName: string;
  fetchedAt: number;
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
        dt: data.dt,
        timezoneOffset: tzOffset,
        observationTimeFormatted: formatObservationTime(data.dt, tzOffset),
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
        dt: merged.dt,
        observationTime: merged.observationTimeFormatted,
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

  const nowSec = Math.floor(Date.now() / 1000);
  return {
    ...fallback,
    lat,
    lng: lon,
    name,
    state: state || fallback.state,
    dt: nowSec,
    timezoneOffset: 19800,
    observationTimeFormatted: formatObservationTime(nowSec, 19800),
  };
}

/**
 * Fetch live 5-day / 3-hour forecast from OpenWeatherMap using EXACT latitude and longitude coordinates.
 * Converts and formats dates/times strictly in the selected location's local timezone.
 */
export async function fetchLiveForecastByCoords(
  lat: number,
  lon: number,
  name?: string,
  cityId?: string
): Promise<LocationForecast> {
  const id = cityId || `geo_${lat.toFixed(4)}_${lon.toFixed(4)}`;
  const fallbackCity = getCity(id);

  const env = import.meta.env as Record<string, string | undefined>;
  const openWeatherKey = cleanKey(env["VITE_OPENWEATHER_API_KEY"]);

  if (!openWeatherKey) {
    return {
      hourly: hourlyFor(fallbackCity),
      daily: dailyFor(fallbackCity),
      timezoneOffset: 19800,
      cityName: name || fallbackCity.name,
      fetchedAt: Date.now(),
    };
  }

  try {
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${openWeatherKey}&units=metric`;
    const res = await fetch(forecastUrl);
    if (!res.ok) {
      console.warn(`[Mausam Forecast] API error: ${res.status}`);
      return {
        hourly: hourlyFor(fallbackCity),
        daily: dailyFor(fallbackCity),
        timezoneOffset: 19800,
        cityName: name || fallbackCity.name,
        fetchedAt: Date.now(),
      };
    }

    const data = await res.json();
    const tzOffset: number = typeof data.city?.timezone === "number" ? data.city.timezone : 19800;
    const list: Array<any> = Array.isArray(data.list) ? data.list : [];

    if (list.length === 0) {
      return {
        hourly: hourlyFor(fallbackCity),
        daily: dailyFor(fallbackCity),
        timezoneOffset: tzOffset,
        cityName: name || data.city?.name || fallbackCity.name,
        fetchedAt: Date.now(),
      };
    }

    // 1. Hourly Forecast Points (Next 24 Hours derived from 3-hour slices)
    const hourlyPoints: HourPoint[] = list.slice(0, 8).map((item, idx) => {
      const localDate = new Date((item.dt + tzOffset) * 1000);
      const localHour = localDate.getUTCHours();
      const period = localHour >= 12 ? "PM" : "AM";
      const h12 = localHour % 12 || 12;
      const label = idx === 0 ? "Now" : `${h12} ${period}`;
      const weatherItem = item.weather?.[0];
      const condition = weatherItem ? mapOpenWeatherCondition(weatherItem.id) : "partly";
      const rainProb = Math.round((item.pop ?? 0) * 100);
      const windKmh = Math.round((item.wind?.speed ?? 0) * 3.6);

      return {
        label,
        hour: localHour,
        temp: Math.round(item.main.temp),
        rainProb,
        condition,
        wind: windKmh,
      };
    });

    // 2. Daily Forecast Points (5-day outlook grouped by local calendar date in the target timezone)
    const dayMap = new Map<string, Array<any>>();
    const nowLocal = new Date(Date.now() + tzOffset * 1000);
    const todayKey = `${nowLocal.getUTCFullYear()}-${String(nowLocal.getUTCMonth() + 1).padStart(2, "0")}-${String(nowLocal.getUTCDate()).padStart(2, "0")}`;
    const tomorrowLocal = new Date(Date.now() + tzOffset * 1000 + 86400000);
    const tomorrowKey = `${tomorrowLocal.getUTCFullYear()}-${String(tomorrowLocal.getUTCMonth() + 1).padStart(2, "0")}-${String(tomorrowLocal.getUTCDate()).padStart(2, "0")}`;

    const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (const item of list) {
      const d = new Date((item.dt + tzOffset) * 1000);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      if (!dayMap.has(key)) {
        dayMap.set(key, []);
      }
      dayMap.get(key)!.push(item);
    }

    const dailyPoints: DayPoint[] = [];
    for (const [key, items] of dayMap.entries()) {
      if (items.length === 0) continue;
      const firstItem = items[0];
      const localDate = new Date((firstItem.dt + tzOffset) * 1000);
      const dayOfWeek = localDate.getUTCDay();
      const dayOfMonth = localDate.getUTCDate();
      const month = localDate.getUTCMonth();

      let label = DAY_NAMES[dayOfWeek]!;
      if (key === todayKey) label = "Today";
      else if (key === tomorrowKey) label = "Tomorrow";

      const dateStr = `${dayOfMonth} ${MONTH_NAMES[month]}`;

      const hi = Math.round(Math.max(...items.map((i) => i.main.temp_max ?? i.main.temp)));
      const lo = Math.round(Math.min(...items.map((i) => i.main.temp_min ?? i.main.temp)));
      const rainProb = Math.round(Math.max(...items.map((i) => (i.pop ?? 0) * 100)));
      const totalRainMm = items.reduce((sum, i) => sum + (i.rain?.["3h"] ?? 0), 0);
      const rain = Math.round(totalRainMm * 10) / 10;

      // Pick midday condition (between 11am-4pm) or fallback to middle item
      const middayItem =
        items.find((i) => {
          const h = new Date((i.dt + tzOffset) * 1000).getUTCHours();
          return h >= 11 && h <= 16;
        }) ??
        items[Math.floor(items.length / 2)] ??
        items[0];

      const condition = middayItem?.weather?.[0]
        ? mapOpenWeatherCondition(middayItem.weather[0].id)
        : "partly";

      const avgHumidity = Math.round(
        items.reduce((sum, i) => sum + (i.main.humidity ?? 60), 0) / items.length
      );
      const maxWind = Math.round(
        Math.max(...items.map((i) => (i.wind?.speed ?? 0) * 3.6))
      );

      dailyPoints.push({
        label,
        date: dateStr,
        hi,
        lo,
        rainProb,
        rain,
        condition,
        humidity: avgHumidity,
        wind: maxWind,
      });
    }

    return {
      hourly: hourlyPoints,
      daily: dailyPoints,
      timezoneOffset: tzOffset,
      cityName: data.city?.name || name || fallbackCity.name,
      fetchedAt: Date.now(),
    };
  } catch (err) {
    console.error("[Mausam Forecast] Failed to fetch forecast:", err);
    return {
      hourly: hourlyFor(fallbackCity),
      daily: dailyFor(fallbackCity),
      timezoneOffset: 19800,
      cityName: name || fallbackCity.name,
      fetchedAt: Date.now(),
    };
  }
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
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}

/**
 * React Hook to access reactive, live forecast data strictly by latitude & longitude
 */
export function useLocationForecast(loc: SelectedLocation) {
  return useQuery<LocationForecast>({
    queryKey: ["locationForecast", loc.lat.toFixed(4), loc.lng.toFixed(4)],
    queryFn: () => fetchLiveForecastByCoords(loc.lat, loc.lng, loc.name, loc.id),
    staleTime: 60 * 1000, // 1 minute
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

  // 2. Query OpenWeather Geocoding API for direct matches
  if (openWeatherKey) {
    try {
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
      }
    } catch (err) {
      console.error("[Mausam Geocoding] OpenWeather search failed:", err);
    }
  }

  // 3. Query Open-Meteo Global Geocoding API (comprehensive support for villages, localities, districts, worldwide)
  try {
    const omUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=10&language=en&format=json`;
    const omRes = await fetch(omUrl);
    if (omRes.ok) {
      const omData = (await omRes.json()) as {
        results?: Array<{
          id: number;
          name: string;
          latitude: number;
          longitude: number;
          country?: string;
          country_code?: string;
          admin1?: string;
          admin2?: string;
        }>;
      };

      if (omData.results && Array.isArray(omData.results)) {
        for (const item of omData.results) {
          const id = `geo_${item.latitude.toFixed(4)}_${item.longitude.toFixed(4)}`;
          const regionParts = [item.admin2, item.admin1, item.country].filter(Boolean);
          const stateStr = regionParts.length > 0 ? regionParts.join(", ") : item.country_code || "Unknown";
          addLocation({
            id,
            name: item.name,
            state: item.admin1 || item.admin2,
            country: item.country_code?.toUpperCase() || item.country || "IN",
            lat: item.latitude,
            lng: item.longitude,
            displayName: `${item.name}, ${stateStr}`,
          });
        }
      }
    }
  } catch (omErr) {
    console.warn("[Mausam Geocoding] Open-Meteo geocoding search failed:", omErr);
  }

  // 4. Fallback to predefined cities if both geocoders yielded 0 results
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

/**
 * Reverse geocode coordinates to obtain locality/town name
 */
export async function reverseGeocodeCoords(lat: number, lon: number): Promise<{ name: string; state?: string | undefined; country: string }> {
  const env = import.meta.env as Record<string, string | undefined>;
  const key = cleanKey(env["VITE_OPENWEATHER_API_KEY"]);
  if (!key) return { name: `${lat.toFixed(3)}°, ${lon.toFixed(3)}°`, country: "" };
  try {
    const res = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${key}`);
    if (res.ok) {
      const data = (await res.json()) as Array<{ name: string; state?: string; country: string }>;
      if (data[0]) {
        return { name: data[0].name, state: data[0].state, country: data[0].country };
      }
    }
  } catch (e) {
    console.error("[Mausam Geocoding] Reverse geocoding failed:", e);
  }
  return { name: `${lat.toFixed(3)}°, ${lon.toFixed(3)}°`, country: "" };
}



