import { CITIES, type City } from "./weather-data";

export interface ApiStatus {
  hasKey: boolean;
  provider: "OpenWeatherMap" | "WeatherAPI" | "IMD Standard (Built-in)";
  apiKeyName?: string | undefined;
  isLive: boolean;
}

export function getApiStatus(): ApiStatus {
  const env = import.meta.env as Record<string, string | undefined>;
  const openWeatherKey = env["VITE_OPENWEATHER_API_KEY"];
  const weatherApiKey = env["VITE_WEATHERAPI_KEY"];

  if (openWeatherKey && openWeatherKey.trim().length > 0) {
    return {
      hasKey: true,
      provider: "OpenWeatherMap",
      apiKeyName: "VITE_OPENWEATHER_API_KEY",
      isLive: true,
    };
  }

  if (weatherApiKey && weatherApiKey.trim().length > 0) {
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
 * Fetch live weather from OpenWeatherMap or WeatherAPI if configured,
 * otherwise fall back seamlessly to curated IMD high-fidelity data.
 */
export async function fetchLiveCityWeather(cityId: string): Promise<Partial<City> | null> {
  const env = import.meta.env as Record<string, string | undefined>;
  const openWeatherKey = env["VITE_OPENWEATHER_API_KEY"];
  const weatherApiKey = env["VITE_WEATHERAPI_KEY"];
  const defaultCity = CITIES[0]!;
  const fallback = CITIES.find((c) => c.id === cityId) || defaultCity;

  try {
    if (openWeatherKey && openWeatherKey.trim().length > 0) {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${fallback.lat}&lon=${fallback.lng}&appid=${openWeatherKey}&units=metric`
      );
      if (res.ok) {
        const data = await res.json();
        return {
          temp: Math.round(data.main.temp),
          feels: Math.round(data.main.feels_like),
          humidity: data.main.humidity,
          wind: Math.round((data.wind.speed * 18) / 5), // m/s to km/h
          cloud: data.clouds.all,
          pressure: data.main.pressure,
          visibility: Math.round(data.visibility / 1000),
        };
      }
    }

    if (weatherApiKey && weatherApiKey.trim().length > 0) {
      const res = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${fallback.lat},${fallback.lng}&aqi=yes`
      );
      if (res.ok) {
        const data = await res.json();
        return {
          temp: Math.round(data.current.temp_c),
          feels: Math.round(data.current.feelslike_c),
          humidity: data.current.humidity,
          wind: Math.round(data.current.wind_kph),
          cloud: data.current.cloud,
          uv: data.current.uv,
          pressure: Math.round(data.current.pressure_mb),
          visibility: Math.round(data.current.vis_km),
        };
      }
    }
  } catch (err) {
    console.warn("External weather API unavailable, falling back to IMD dataset:", err);
  }

  return null;
}
