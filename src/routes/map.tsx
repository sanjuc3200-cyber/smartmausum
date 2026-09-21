import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type L from "leaflet";
import {
  Search,
  LocateFixed,
  Plus,
  Minus,
  CloudRain,
  Thermometer,
  Wind,
  Map as MapIcon,
  AlertTriangle,
  Droplets,
  Cloud,
  Compass,
  X,
  MapPin,
  RefreshCw,
  Loader2,
  Navigation,
  Eye,
} from "lucide-react";
import { usePrefs, formatTemp, type SelectedLocation } from "@/lib/prefs";
import {
  CITIES,
  CONDITION_LABEL,
  LEVEL_META,
  alertsForCity,
  dailyFor,
  getCity,
  hourlyFor,
  type City,
} from "@/lib/weather-data";
import {
  fetchLiveWeatherByCoords,
  searchLocations,
  reverseGeocodeCoords,
  useLocationWeather,
  useLocationForecast,
  type GeocodedLocation,
} from "@/lib/weather-api";
import { WeatherIcon } from "@/components/WeatherIcon";
import { AlertCard, DailyList, HourlyStrip, LevelBadge } from "@/components/weather/Widgets";
import type { BasemapType, MapLayer } from "@/components/map/LeafletMap";
import {
  fetchRadarMetadata,
  fetchLiveObservations,
  getBeaufortInfo,
  type RadarFrame,
  type RadarMetadata,
} from "@/lib/radar-api";

const LeafletMap = lazy(() => import("@/components/map/LeafletMap"));

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Live Weather Radar & Tracking Map — IMD MAUSAM" },
      {
        name: "description",
        content: "Track live precipitation radar, animated wind streams, thermal heatmaps, and IMD severe weather warnings.",
      },
      { property: "og:title", content: "Live Weather Radar & Tracking Map — IMD MAUSAM" },
      {
        property: "og:description",
        content: "Track live precipitation radar, animated wind streams, thermal heatmaps, and IMD severe weather warnings.",
      },
    ],
  }),
  component: MapPage,
});

type ActiveWeatherLayer = "none" | "rain" | "wind" | "temperature";

const WEATHER_MODES = [
  { id: "none" as const, label: "Base Map", icon: MapIcon, emoji: "🗺️" },
  { id: "rain" as const, label: "Rain Radar", icon: CloudRain, emoji: "🌧️" },
  { id: "wind" as const, label: "Wind Stream", icon: Wind, emoji: "💨" },
  { id: "temperature" as const, label: "Temperature", icon: Thermometer, emoji: "🌡️" },
];

function MapSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-sky-50/50">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="font-display text-sm font-semibold text-muted-foreground animate-pulse">
          Loading Navigation Map & Radar Engine…
        </p>
      </div>
    </div>
  );
}

function MapPage() {
  const { prefs, update } = usePrefs();
  const [layer, setLayer] = useState<ActiveWeatherLayer>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("layer");
      if (p === "wind" || p === "temperature" || p === "rain") {
        return p;
      }
    }
    return "rain";
  });

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodedLocation[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [mapRef, setMapRef] = useState<L.Map | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Radar Metadata & live wind observations
  const [radarMeta, setRadarMeta] = useState<RadarMetadata | null>(null);
  const [radarLoading, setRadarLoading] = useState<boolean>(false);
  const [liveData, setLiveData] = useState<Record<string, Partial<City>>>({});
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Default active location: preference if present, otherwise Hyderabad (sensible India start view)
  const activeLocation: SelectedLocation = useMemo(() => {
    if (prefs.activeLocation) return prefs.activeLocation;
    const defaultCity = getCity(prefs.cityId) || getCity("hyderabad");
    return {
      id: defaultCity.id,
      name: defaultCity.name,
      state: defaultCity.state,
      country: "IN",
      lat: defaultCity.lat,
      lng: defaultCity.lng,
    };
  }, [prefs.activeLocation, prefs.cityId]);

  // Reactive live weather and forecast strictly tied to active location coordinates
  const { data: liveWeather, isLoading: weatherLoading, refetch: refetchWeather } = useLocationWeather(activeLocation);
  const { data: liveForecast, isLoading: forecastLoading } = useLocationForecast(activeLocation);

  const city: City = useMemo(() => {
    if (liveWeather) return liveWeather;
    const fallback = getCity(activeLocation.id) || getCity("hyderabad");
    return {
      ...fallback,
      name: activeLocation.name,
      state: activeLocation.state || fallback.state,
      lat: activeLocation.lat,
      lng: activeLocation.lng,
    };
  }, [liveWeather, activeLocation]);

  const hourly = useMemo(() => liveForecast?.hourly ?? hourlyFor(city), [liveForecast, city]);
  const daily = useMemo(() => liveForecast?.daily ?? dailyFor(city), [liveForecast, city]);
  const alerts = useMemo(() => alertsForCity(city.id), [city.id]);
  const beaufort = useMemo(() => getBeaufortInfo(city.wind), [city.wind]);

  // 1. Load radar metadata
  const loadRadarData = useCallback(async () => {
    setRadarLoading(true);
    try {
      const data = await fetchRadarMetadata();
      setRadarMeta(data);
    } catch (e) {
      console.error("Failed to load radar metadata:", e);
    } finally {
      setRadarLoading(false);
    }
  }, []);

  // 2. Load live station observations
  const loadLiveData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchLiveObservations();
      setLiveData(data);
      refetchWeather();
    } catch (e) {
      console.error("Failed to load live observations:", e);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchWeather]);

  useEffect(() => {
    loadRadarData();
    loadLiveData();
    const interval = setInterval(() => {
      loadRadarData();
      loadLiveData();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadRadarData, loadLiveData]);

  // Select latest available radar frame directly
  const currentRadarFrame = useMemo(() => {
    if (!radarMeta || layer !== "rain") return null;
    return radarMeta.past.length > 0
      ? radarMeta.past[radarMeta.past.length - 1] ?? null
      : null;
  }, [radarMeta, layer]);

  // Debounced search for villages, localities, towns, districts, cities worldwide
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const data = await searchLocations(q);
        setSearchResults(data);
      } catch (err) {
        console.error("Map search geocoding failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  // User selects a location from the search results
  const selectGeocoded = useCallback(
    (loc: GeocodedLocation) => {
      const newLoc: SelectedLocation = {
        id: loc.id,
        name: loc.name,
        state: loc.state,
        country: loc.country,
        lat: loc.lat,
        lng: loc.lng,
      };

      update({
        cityId: loc.id,
        activeLocation: newLoc,
      });

      setFlyTarget([loc.lat, loc.lng]);
      setQuery("");
      setSearchResults([]);
    },
    [update]
  );

  // Handle clicking on map to select coordinates
  const handleMapClick = useCallback(
    async (lat: number, lng: number) => {
      const id = `geo_${lat.toFixed(4)}_${lng.toFixed(4)}`;
      const fallbackName = `${lat.toFixed(3)}°, ${lng.toFixed(3)}°`;

      // Set initial coordinates immediately
      const initialLoc: SelectedLocation = {
        id,
        name: fallbackName,
        lat,
        lng,
        country: "IN",
      };
      update({ activeLocation: initialLoc, cityId: id });
      setFlyTarget([lat, lng]);

      // Reverse geocode to resolve friendly town/village name
      try {
        const rev = await reverseGeocodeCoords(lat, lng);
        if (rev && rev.name) {
          update({
            activeLocation: {
              id,
              name: rev.name,
              state: rev.state,
              country: rev.country || "IN",
              lat,
              lng,
            },
            cityId: id,
          });
        }
      } catch (e) {
        console.error("Failed to reverse geocode clicked point:", e);
      }
    },
    [update]
  );

  // Handle My Location device geolocation
  const handleMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        await handleMapClick(latitude, longitude);
      },
      (err) => {
        setIsLocating(false);
        console.warn("Geolocation access denied or failed:", err.message);
        alert("Could not access your location. Please check your browser location permissions.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, [handleMapClick]);

  const onMapReady = useCallback((m: L.Map) => setMapRef(m), []);

  return (
    <div className="flex flex-col lg:flex-row h-full lg:h-[calc(100vh-5.5rem)] gap-3.5 py-2.5">
      {/* ---------------------------------------------------- */}
      {/* MAP WORKSTATION CANVAS                               */}
      {/* ---------------------------------------------------- */}
      <section
        className="relative h-[56dvh] lg:h-full lg:flex-1 shrink-0 lg:shrink rounded-3xl overflow-hidden shadow-card border border-border/80 bg-sky-50"
        aria-label="Live Meteorological Radar and Tracking Map"
      >
        <ClientOnly fallback={<MapSkeleton />}>
          <Suspense fallback={<MapSkeleton />}>
            <LeafletMap
              layer={layer}
              flyTarget={flyTarget}
              onMapReady={onMapReady}
              onMapClick={handleMapClick}
              radarFrame={currentRadarFrame}
              radarHost={radarMeta?.host}
              layerOpacity={0.82}
              basemap="voyager"
              liveData={liveData}
              activeLocation={activeLocation}
              activeLocationTemp={city.temp}
              activeLocationCondition={city.condition}
            />
          </Suspense>
        </ClientOnly>

        {/* TOP BAR: Search & Geocoding Input */}
        <div className="absolute left-3 right-3 top-3 z-[500] flex items-center gap-2 max-w-lg">
          <div className="relative flex flex-1 items-center gap-2 rounded-2xl px-3.5 py-2 shadow-float backdrop-blur-xl border border-slate-200/90 bg-white/95 text-slate-800">
            {isSearching ? (
              <RefreshCw className="h-4 w-4 animate-spin text-primary shrink-0" />
            ) : (
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
            )}
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search village, town, district, city worldwide…"
              className="w-full bg-transparent text-[13px] font-semibold outline-none placeholder:text-slate-400 text-slate-800"
              aria-label="Search village, district, or city"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setSearchResults([]);
                }}
                aria-label="Clear search"
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Geocoded Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="card-surface absolute left-3 top-14 z-[550] overflow-hidden rounded-2xl shadow-float border border-border/80 animate-fade-in w-[calc(100%-1.5rem)] max-w-lg max-h-72 overflow-y-auto">
            {searchResults.map((loc) => {
              const stateDisplay = loc.state ? `${loc.state}, ${loc.country}` : loc.country;
              return (
                <button
                  key={loc.id}
                  onClick={() => selectGeocoded(loc)}
                  className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-secondary/80 border-b border-border/40 last:border-none"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <span className="block text-[13px] font-bold text-foreground truncate">{loc.name}</span>
                      <span className="block text-[11px] text-muted-foreground truncate">{stateDisplay}</span>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground shrink-0 bg-secondary/80 px-2 py-0.5 rounded-md">
                    {loc.lat.toFixed(2)}°, {loc.lng.toFixed(2)}°
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* WEATHER LAYER SELECTOR DOCK (Top Left, below search) */}
        <div className="absolute left-3 top-15 z-[450] flex gap-1.5 overflow-x-auto py-1 max-w-[calc(100%-5rem)] hide-scroll">
          {WEATHER_MODES.map((m) => {
            const isActive = layer === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setLayer(m.id)}
                className={`press flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold shadow-float transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-glow scale-105"
                    : "bg-white/95 text-slate-700 hover:text-slate-900 backdrop-blur-xl border border-slate-200/90"
                }`}
              >
                <span>{m.emoji}</span>
                <span>{m.label}</span>
                {m.id === "rain" && radarLoading && (
                  <RefreshCw className="h-3 w-3 animate-spin text-primary-foreground" />
                )}
              </button>
            );
          })}
        </div>

        {/* RIGHT MAP NAVIGATION CONTROLS (Only Zoom +, Zoom -, My Location) */}
        <div className="absolute bottom-20 sm:bottom-24 right-3 z-[450] flex flex-col gap-1.5">
          <button
            onClick={() => mapRef?.zoomIn()}
            aria-label="Zoom in"
            title="Zoom In"
            className="press flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 backdrop-blur-xl border border-slate-200/90 text-slate-700 hover:text-slate-950 shadow-float"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={() => mapRef?.zoomOut()}
            aria-label="Zoom out"
            title="Zoom Out"
            className="press flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 backdrop-blur-xl border border-slate-200/90 text-slate-700 hover:text-slate-950 shadow-float"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={handleMyLocation}
            aria-label="Center on my location"
            title="My Current Location"
            disabled={isLocating}
            className="press flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow"
          >
            {isLocating ? (
              <RefreshCw className="h-4 w-4 animate-spin text-white" />
            ) : (
              <LocateFixed className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* DYNAMIC METEOROLOGICAL COLOR SCALE LEGEND (Bottom Left) */}
        {layer !== "none" && (
          <div className="absolute bottom-3 left-3 z-[450] rounded-xl px-2.5 py-1.5 shadow-float border border-slate-200/90 bg-white/95 backdrop-blur-xl text-slate-800">
            {layer === "rain" && (
              <div>
                <div className="flex items-center gap-1">
                  <span className="h-2 w-4 rounded-xs bg-emerald-500" title="Light: 0.1-1 mm/h" />
                  <span className="h-2 w-4 rounded-xs bg-yellow-400" title="Moderate: 1-5 mm/h" />
                  <span className="h-2 w-4 rounded-xs bg-orange-500" title="Heavy: 5-15 mm/h" />
                  <span className="h-2 w-4 rounded-xs bg-red-600" title="Very Heavy: 15-30 mm/h" />
                  <span className="h-2 w-4 rounded-xs bg-purple-600" title="Severe / Hail: >30 mm/h" />
                  <span className="ml-1 text-[10px] font-bold text-slate-700">Precipitation (dBZ)</span>
                </div>
                <p className="mt-0.5 text-[9px] text-slate-500">Light (0.1 mm/h) &rarr; Heavy Hail (&gt;30 mm/h)</p>
              </div>
            )}

            {layer === "wind" && (
              <div>
                <div className="flex items-center gap-1">
                  <span className="h-2 w-4 rounded-xs bg-sky-400" title="Calm: <15 km/h" />
                  <span className="h-2 w-4 rounded-xs bg-emerald-400" title="Moderate: 15-30 km/h" />
                  <span className="h-2 w-4 rounded-xs bg-yellow-400" title="Fresh: 30-45 km/h" />
                  <span className="h-2 w-4 rounded-xs bg-orange-500" title="Strong: 45-65 km/h" />
                  <span className="h-2 w-4 rounded-xs bg-rose-600" title="Gale: >65 km/h" />
                  <span className="ml-1 text-[10px] font-bold text-slate-700">Wind Velocity</span>
                </div>
                <p className="mt-0.5 text-[9px] text-slate-500">Calm (&lt;15 km/h) &rarr; Gale Force (&gt;65 km/h)</p>
              </div>
            )}

            {layer === "temperature" && (
              <div>
                <div className="flex items-center gap-1">
                  <span className="h-2 w-4 rounded-xs bg-blue-500" title="Cool: <18°C" />
                  <span className="h-2 w-4 rounded-xs bg-cyan-400" title="Mild: 18-24°C" />
                  <span className="h-2 w-4 rounded-xs bg-emerald-400" title="Pleasant: 24-28°C" />
                  <span className="h-2 w-4 rounded-xs bg-yellow-400" title="Warm: 28-34°C" />
                  <span className="h-2 w-4 rounded-xs bg-orange-500" title="Hot: 34-39°C" />
                  <span className="h-2 w-4 rounded-xs bg-purple-600" title="Heatwave: >40°C" />
                  <span className="ml-1 text-[10px] font-bold text-slate-700">Thermal Gradient</span>
                </div>
                <p className="mt-0.5 text-[9px] text-slate-500">Cool (&lt;18°C) &rarr; Heat Wave (&gt;40°C)</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ---------------------------------------------------- */}
      {/* METEOROLOGICAL WORKSTATION TELEMETRY SIDEBAR         */}
      {/* ---------------------------------------------------- */}
      <section
        key={city.id}
        className="relative flex-1 lg:w-[420px] lg:flex-none overflow-y-auto rounded-3xl bg-card border border-border/80 p-4 sm:p-5 shadow-card"
        aria-live="polite"
      >
        <div className="space-y-4 pb-12 lg:pb-4 animate-fade-in">
          {/* Station / Location Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-primary mb-0.5">
                <MapPin className="h-3.5 w-3.5" />
                <p className="text-[10.5px] font-extrabold uppercase tracking-wider">Selected Location</p>
              </div>
              <h1 className="font-display text-2xl font-extrabold leading-tight">{city.name}</h1>
              <p className="text-[12.5px] text-muted-foreground">
                {[city.state, activeLocation.country || "IN"].filter(Boolean).join(", ")}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-mono text-[10.5px] text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded-md">
                  {city.lat.toFixed(4)}°N, {city.lng.toFixed(4)}°E
                </span>
                {city.observationTimeFormatted && (
                  <span className="text-[10.5px] text-muted-foreground">
                    Observed: {city.observationTimeFormatted}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-start justify-end gap-1">
                <WeatherIcon condition={city.condition} className="mt-1 h-8 w-8" />
                <span className="font-display text-[46px] font-extrabold leading-none">
                  {formatTemp(city.temp, prefs.tempUnit)}
                </span>
              </div>
              <p className="text-[12.5px] font-bold">{CONDITION_LABEL[city.condition]}</p>
              <p className="text-[11px] text-muted-foreground">
                Feels like {formatTemp(city.feels, prefs.tempUnit)}
              </p>
            </div>
          </div>

          {/* Quick Refresh Telemetry Bar */}
          <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2 text-[11px]">
            <span className="font-medium text-muted-foreground">
              {weatherLoading ? "Fetching live OpenWeather telemetry…" : "Live Weather Telemetry"}
            </span>
            <button
              onClick={loadLiveData}
              disabled={isRefreshing}
              className="flex items-center gap-1 font-bold text-primary hover:underline"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* Core Telemetry 4-Pack */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl border border-border/70 bg-card p-3 shadow-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <CloudRain className="h-3.5 w-3.5 text-sky-500" />
                <span className="text-[10px] font-bold uppercase">Precipitation</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="font-display text-xl font-extrabold">{city.rain} mm</span>
                <span className="text-[11px] text-muted-foreground">{city.rain > 0 ? "Rain recorded" : "Dry surface"}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card p-3 shadow-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Wind className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-[10px] font-bold uppercase">Wind Speed</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="font-display text-xl font-extrabold">{city.wind} km/h</span>
                <span className="text-[11px] text-muted-foreground">{city.windDir} ({city.windDeg}°)</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card p-3 shadow-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Droplets className="h-3.5 w-3.5 text-cyan-500" />
                <span className="text-[10px] font-bold uppercase">Humidity</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="font-display text-xl font-extrabold">{city.humidity}%</span>
                <span className="text-[11px] text-muted-foreground">Relative</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card p-3 shadow-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Compass className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-[10px] font-bold uppercase">Pressure</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="font-display text-xl font-extrabold">{city.pressure} hPa</span>
                <span className="text-[11px] text-muted-foreground">Barometer</span>
              </div>
            </div>
          </div>

          {/* Active Severe Alert (If present) */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-rose-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Active Weather Warning</span>
              </div>
              {alerts.map((a) => (
                <AlertCard key={a.id} alert={a} cityName={city.name} />
              ))}
            </div>
          )}

          {/* 24-Hour Timeline Forecast (Derived from OpenWeather API) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-extrabold uppercase tracking-wider text-muted-foreground">
                24-Hour Forecast Progression
              </span>
              <span className="text-[10.5px] text-muted-foreground">Location Local Time</span>
            </div>
            <HourlyStrip hours={hourly} />
          </div>

          {/* 5-Day Outlook */}
          <div className="space-y-2 pt-2">
            <span className="text-[11.5px] font-extrabold uppercase tracking-wider text-muted-foreground">
              5-Day Outlook
            </span>
            <DailyList days={daily} />
          </div>
        </div>
      </section>
    </div>
  );
}
