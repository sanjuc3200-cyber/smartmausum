import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type L from "leaflet";
import {
  Search,
  LocateFixed,
  Plus,
  Minus,
  Layers,
  CloudRain,
  Thermometer,
  Wind,
  AlertTriangle,
  Droplets,
  Cloud,
  Compass,
  TrendingUp,
  TrendingDown,
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Eye,
  EyeOff,
  Sliders,
  Radio,
  MapPin,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { usePrefs, formatTemp } from "@/lib/prefs";
import {
  CITIES,
  CONDITION_LABEL,
  LEVEL_META,
  alertsForCity,
  dailyFor,
  getCity,
  hourlyFor,
  registerCustomCity,
  type City,
} from "@/lib/weather-data";
import {
  fetchLiveWeatherByCoords,
  searchLocations,
  type GeocodedLocation,
} from "@/lib/weather-api";
import { WeatherIcon } from "@/components/WeatherIcon";
import { AlertCard, DailyList, HourlyStrip, LevelBadge, SectionTitle, TrustNote } from "@/components/weather/Widgets";
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

type ExtendedLayer = "rain" | "wind" | "temperature" | "satellite" | "alerts";

interface LayerMeta {
  id: ExtendedLayer;
  label: string;
  icon: typeof CloudRain;
  emoji: string;
  badge: string;
}

const LAYERS: LayerMeta[] = [
  { id: "rain", label: "Live Rain Radar", icon: CloudRain, emoji: "🌧️", badge: "Doppler" },
  { id: "wind", label: "Live Wind Stream", icon: Wind, emoji: "💨", badge: "Streamlines" },
  { id: "temperature", label: "Live Temperature", icon: Thermometer, emoji: "🌡️", badge: "Thermal" },
  { id: "satellite", label: "Satellite Cloud", icon: Cloud, emoji: "☁️", badge: "Infrared" },
  { id: "alerts", label: "IMD Severe Alerts", icon: AlertTriangle, emoji: "⚠️", badge: "Warnings" },
];

const REGION_HOTSPOTS = [
  { name: "All India", coords: [22.0, 79.5] as [number, number], zoom: 4.8 },
  { name: "Bay of Bengal (Monsoon)", coords: [19.5, 87.0] as [number, number], zoom: 6.0 },
  { name: "Mumbai & Coast", coords: [18.9, 73.0] as [number, number], zoom: 6.4 },
  { name: "Delhi & North", coords: [28.6, 77.2] as [number, number], zoom: 6.4 },
  { name: "Chennai & South", coords: [13.1, 80.3] as [number, number], zoom: 6.4 },
  { name: "Northeast (Assam)", coords: [26.1, 92.0] as [number, number], zoom: 6.2 },
];

function MapPage() {
  const { prefs, update } = usePrefs();
  const [selectedId, setSelectedId] = useState(prefs.cityId);
  const [layer, setLayer] = useState<ExtendedLayer>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("layer");
      if (p === "wind" || p === "temperature" || p === "satellite" || p === "alerts" || p === "rain") {
        return p;
      }
    }
    return "rain";
  });
  const [query, setQuery] = useState("");
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [mapRef, setMapRef] = useState<L.Map | null>(null);

  // Radar State
  const [radarMeta, setRadarMeta] = useState<RadarMetadata | null>(null);
  const [frameIndex, setFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playSpeed, setPlaySpeed] = useState<number>(1); // 1x, 1.5x, 2x

  // Map Appearance & Layer Controls
  const [basemap, setBasemap] = useState<BasemapType>("voyager");
  const [layerOpacity, setLayerOpacity] = useState<number>(0.85);
  const [showMarkers, setShowMarkers] = useState<boolean>(true);
  const [toolsOpen, setToolsOpen] = useState<boolean>(false);

  // Live observations batch (Open-Meteo)
  const [liveData, setLiveData] = useState<Record<string, Partial<City>>>({});
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // 1. Fetch radar metadata on load
  const loadRadarData = useCallback(async () => {
    try {
      const data = await fetchRadarMetadata();
      setRadarMeta(data);
      // Start at the latest available past frame
      if (data.past.length > 0) {
        setFrameIndex(data.past.length - 1);
      }
    } catch (e) {
      console.error("Failed to load radar metadata:", e);
    }
  }, []);

  // 2. Fetch live station observations
  const loadLiveData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchLiveObservations();
      setLiveData(data);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Failed to load live observations:", e);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRadarData();
    loadLiveData();

    // Auto-refresh live data every 5 minutes
    const interval = setInterval(() => {
      loadRadarData();
      loadLiveData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [loadRadarData, loadLiveData]);

  // Current radar / satellite frame
  const framesList: RadarFrame[] = useMemo(() => {
    if (!radarMeta) return [];
    if (layer === "satellite") {
      return radarMeta.satellite.length > 0 ? radarMeta.satellite : radarMeta.past;
    }
    return radarMeta.allRadarFrames.length > 0 ? radarMeta.allRadarFrames : radarMeta.past;
  }, [radarMeta, layer]);

  const currentFrame = framesList[frameIndex] ?? null;

  // Radar playback ticker
  useEffect(() => {
    if (!isPlaying || framesList.length <= 1) return;
    if (layer !== "rain" && layer !== "satellite") return;

    const intervalMs = Math.round(1100 / playSpeed);
    const timer = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % framesList.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, framesList.length, playSpeed, layer]);

  const baseCity = getCity(selectedId);
  const city: City = useMemo(() => {
    const live = liveData[baseCity.id];
    if (!live) return baseCity;
    return {
      ...baseCity,
      temp: live.temp ?? baseCity.temp,
      humidity: live.humidity ?? baseCity.humidity,
      wind: live.wind ?? baseCity.wind,
      windDeg: live.windDeg ?? baseCity.windDeg,
      windDir: live.windDir ?? baseCity.windDir,
      rain: live.rain ?? baseCity.rain,
      cloud: live.cloud ?? baseCity.cloud,
      pressure: live.pressure ?? baseCity.pressure,
    };
  }, [baseCity, liveData]);

  const hourly = useMemo(() => hourlyFor(city), [city]);
  const daily = useMemo(() => dailyFor(city), [city]);
  const alerts = alertsForCity(city.id);
  const beaufort = useMemo(() => getBeaufortInfo(city.wind), [city.wind]);

  const results = query.trim()
    ? CITIES.filter((c) => (c.name + " " + c.state).toLowerCase().includes(query.toLowerCase())).slice(0, 5)
    : [];

  const [searchResults, setSearchResults] = useState<GeocodedLocation[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

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
        console.error("Map geocoding search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [query]);

  const selectGeocoded = useCallback(
    async (loc: GeocodedLocation) => {
      update({
        cityId: loc.id,
        activeLocation: {
          id: loc.id,
          name: loc.name,
          state: loc.state,
          country: loc.country,
          lat: loc.lat,
          lng: loc.lng,
        },
      });
      setSelectedId(loc.id);
      setFlyTarget([loc.lat, loc.lng]);
      setQuery("");
      setSearchResults([]);

      try {
        const live = await fetchLiveWeatherByCoords(
          loc.lat,
          loc.lng,
          loc.name,
          loc.state,
          loc.id
        );
        registerCustomCity(live);
        setLiveData((prev) => ({ ...prev, [loc.id]: live }));
      } catch (e) {
        console.error("Error fetching live weather for selected map coordinates:", e);
      }
    },
    [update]
  );

  const select = useCallback(
    (id: string, fly = false) => {
      const c = getCity(id);
      update({
        cityId: id,
        activeLocation: {
          id: c.id,
          name: c.name,
          state: c.state,
          country: "IN",
          lat: c.lat,
          lng: c.lng,
        },
      });
      setSelectedId(id);
      if (fly) {
        setFlyTarget([c.lat, c.lng]);
      }
      setQuery("");
      setSearchResults([]);
    },
    [update]
  );

  const jumpToHotspot = (coords: [number, number], zoom: number) => {
    if (mapRef) {
      mapRef.flyTo(coords, zoom, { duration: 1.2 });
    }
  };

  const onMapReady = useCallback((m: L.Map) => setMapRef(m), []);

  return (
    <div className="flex flex-col lg:flex-row h-full lg:h-[calc(100vh-5.5rem)] gap-3.5 py-2.5">
      {/* MAP WORKSTATION CANVAS */}
      <section
        className="relative h-[56dvh] lg:h-full lg:flex-1 shrink-0 lg:shrink rounded-3xl overflow-hidden shadow-card border border-border/80 bg-sky-50/70"
        aria-label="Live Meteorological Radar and Tracking Map"
      >
        <ClientOnly fallback={<MapSkeleton />}>
          <Suspense fallback={<MapSkeleton />}>
            <LeafletMap
              layer={layer}
              selectedId={selectedId}
              onSelect={(id) => select(id)}
              flyTarget={flyTarget}
              onMapReady={onMapReady}
              radarFrame={currentFrame}
              radarHost={radarMeta?.host}
              layerOpacity={layerOpacity}
              basemap={basemap}
              liveData={liveData}
              showMarkers={showMarkers}
              activeLocation={prefs.activeLocation}
              activeLocationTemp={liveData[selectedId]?.temp ?? city.temp}
            />
          </Suspense>
        </ClientOnly>

        {/* TOP BAR: Search & City Jump */}
        <div className="absolute left-3 right-3 top-3 z-[500] flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-2xl px-3.5 py-2 shadow-float backdrop-blur-xl border border-slate-200/90 bg-white/95 text-slate-800">
            {isSearching ? (
              <RefreshCw className="h-4 w-4 animate-spin text-primary shrink-0" />
            ) : (
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
            )}
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search any locality, district, city worldwide…"
              className="w-full bg-transparent text-[13px] font-semibold outline-none placeholder:text-slate-400 text-slate-800"
              aria-label="Search city or radar station"
            />
            {query && (
              <button onClick={() => { setQuery(""); setSearchResults([]); }} aria-label="Clear search" className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Quick Refresh Live Data Button */}
          <button
            onClick={loadLiveData}
            title="Refresh real-time radar & station telemetry"
            disabled={isRefreshing}
            className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/90 text-slate-700 hover:text-slate-900 shadow-float"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </button>
        </div>

        {/* Geocoded Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="card-surface absolute left-3 right-3 top-14 z-[550] overflow-hidden rounded-2xl shadow-float border border-border/80 animate-fade-in max-w-md max-h-72 overflow-y-auto">
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

        {/* LAYER SELECTOR DOCK (Top Left, below search) */}
        <div className="hide-scroll absolute left-3 right-14 top-15 z-[450] flex gap-1.5 overflow-x-auto py-1">
          {LAYERS.map((l) => {
            const isActive = layer === l.id;
            return (
              <button
                key={l.id}
                onClick={() => setLayer(l.id)}
                className={`press flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold shadow-float transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-glow scale-105"
                    : "bg-white/95 text-slate-700 hover:text-slate-900 backdrop-blur-xl border border-slate-200/90"
                }`}
              >
                <span>{l.emoji}</span>
                <span>{l.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wide ${
                    isActive ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600 font-extrabold"
                  }`}
                >
                  {l.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* TOP RIGHT: Map Settings & Tools Toggle */}
        <div className="absolute right-3 top-15 z-[450] flex flex-col gap-1.5">
          <button
            onClick={() => setToolsOpen((o) => !o)}
            aria-label="Map appearance & layers"
            title="Map Appearance & Opacity"
            className={`press flex h-9 w-9 items-center justify-center rounded-xl shadow-float backdrop-blur-xl border border-slate-200/90 ${
              toolsOpen ? "bg-primary text-primary-foreground" : "bg-white/95 text-slate-700 hover:text-slate-900"
            }`}
          >
            <Sliders className="h-4 w-4" />
          </button>
        </div>

        {/* MAP TOOLS & DISPLAY SETTINGS POPOVER */}
        {toolsOpen && (
          <div className="card-surface absolute right-3 top-26 z-[460] w-64 p-3.5 rounded-2xl shadow-float border border-border/80 animate-scale-in text-[12px] space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-border/60">
              <span className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Map Display Tools</span>
              <button onClick={() => setToolsOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Basemap Switcher */}
            <div>
              <p className="text-[10.5px] font-semibold text-muted-foreground mb-1.5">Base Canvas</p>
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    { id: "voyager", label: "Google Map" },
                    { id: "satellite", label: "Satellite" },
                    { id: "dark", label: "Dark Radar" },
                  ] as const
                ).map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBasemap(b.id)}
                    className={`px-2 py-1.5 rounded-xl font-bold text-[11px] text-center transition-all ${
                      basemap === b.id
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Layer Opacity Slider */}
            <div>
              <div className="flex items-center justify-between text-[10.5px] font-semibold text-muted-foreground mb-1">
                <span>Overlay Opacity</span>
                <span className="font-mono font-bold text-foreground">{Math.round(layerOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="1.0"
                step="0.05"
                value={layerOpacity}
                onChange={(e) => setLayerOpacity(parseFloat(e.target.value))}
                className="w-full accent-primary h-1.5 bg-secondary rounded-lg cursor-pointer"
              />
            </div>

            {/* Markers Toggle */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11.5px] font-semibold">City Observation Pins</span>
              <button
                onClick={() => setShowMarkers((m) => !m)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold ${
                  showMarkers ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                }`}
              >
                {showMarkers ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {showMarkers ? "Shown" : "Hidden"}
              </button>
            </div>
          </div>
        )}

        {/* REGION HOTSPOTS QUICK-SELECT (Floating Pills, Left Center) */}
        <div className="hidden sm:flex absolute left-3 top-26 z-[440] flex-col gap-1 max-w-[155px]">
          <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-slate-500 drop-shadow-xs px-1">
            Regional Focus
          </span>
          <div className="flex flex-col gap-1">
            {REGION_HOTSPOTS.map((h) => (
              <button
                key={h.name}
                onClick={() => jumpToHotspot(h.coords, h.zoom)}
                className="press text-left px-2.5 py-1 rounded-xl bg-white/95 hover:bg-white text-slate-700 hover:text-slate-950 backdrop-blur-md border border-slate-200/90 text-[11px] font-semibold shadow-xs truncate"
              >
                {h.name}
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT MAP NAVIGATION CONTROLS */}
        <div className="absolute bottom-20 sm:bottom-24 right-3 z-[450] flex flex-col gap-1.5">
          <button
            onClick={() => mapRef?.zoomIn()}
            aria-label="Zoom in"
            className="press flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 backdrop-blur-xl border border-slate-200/90 text-slate-700 hover:text-slate-950 shadow-float"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={() => mapRef?.zoomOut()}
            aria-label="Zoom out"
            className="press flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 backdrop-blur-xl border border-slate-200/90 text-slate-700 hover:text-slate-950 shadow-float"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              if (prefs.activeLocation) {
                setSelectedId(prefs.activeLocation.id);
                setFlyTarget([prefs.activeLocation.lat, prefs.activeLocation.lng]);
              } else {
                select(prefs.cityId, true);
              }
            }}
            aria-label="Center on my location"
            title="Center on My City"
            className="press flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow"
          >
            <LocateFixed className="h-4 w-4" />
          </button>
        </div>

        {/* ---------------------------------------------------- */}
        {/* RADAR TIMELINE & ANIMATION DOCK (When Rain or Sat)   */}
        {/* ---------------------------------------------------- */}
        {(layer === "rain" || layer === "satellite") && (
          <div className="absolute left-3 right-3 bottom-3 z-[470]">
            <div className="rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/90 p-2.5 sm:px-4 sm:py-2.5 shadow-float text-slate-800">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
                {/* Playback Controls & Status */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Play / Pause */}
                  <button
                    onClick={() => setIsPlaying((p) => !p)}
                    aria-label={isPlaying ? "Pause Doppler radar animation" : "Play Doppler radar animation"}
                    className="press flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow hover:scale-105"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                  </button>

                  {/* Step Back */}
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setFrameIndex((prev) => (prev > 0 ? prev - 1 : framesList.length - 1));
                    }}
                    title="Previous frame (-10m)"
                    className="press flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    <SkipBack className="h-3.5 w-3.5" />
                  </button>

                  {/* Step Forward */}
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setFrameIndex((prev) => (prev + 1) % framesList.length);
                    }}
                    title="Next frame (+10m)"
                    className="press flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    <SkipForward className="h-3.5 w-3.5" />
                  </button>

                  {/* Live / Status Indicator */}
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-[10.5px] font-extrabold text-emerald-700">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="uppercase tracking-wider">
                      {layer === "rain" ? "Doppler Feed" : "Satellite IR"}
                    </span>
                  </div>

                  {/* Speed toggle */}
                  <button
                    onClick={() => setPlaySpeed((s) => (s === 1 ? 1.5 : s === 1.5 ? 2 : 1))}
                    title="Radar animation speed"
                    className="press px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] font-mono font-bold text-slate-700"
                  >
                    {playSpeed}x
                  </button>
                </div>

                {/* Timeline Slider & Frame readout */}
                <div className="flex-1 w-full flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      type="range"
                      min={0}
                      max={Math.max(framesList.length - 1, 0)}
                      value={frameIndex}
                      onChange={(e) => {
                        setIsPlaying(false);
                        setFrameIndex(parseInt(e.target.value, 10));
                      }}
                      className="w-full accent-primary h-2 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    {/* Timestamp ticks / past vs nowcast indicators */}
                    <div className="flex justify-between text-[9px] text-slate-500 font-medium mt-0.5">
                      <span>Past 2h</span>
                      <span className="font-bold text-emerald-600">● Live Now</span>
                      <span>Nowcast</span>
                    </div>
                  </div>

                  {/* Frame time badge */}
                  <div className="shrink-0 text-right min-w-[90px]">
                    <span className="block text-[12px] font-extrabold font-mono text-slate-900 leading-tight">
                      {currentFrame?.label ?? "Live"}
                    </span>
                    <span className="block text-[10px] font-bold text-primary leading-tight">
                      {currentFrame?.relativeTime ?? "Current"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* WIND HUD & STREAM CONTROLLER (When in Wind Mode)    */}
        {/* ---------------------------------------------------- */}
        {layer === "wind" && (
          <div className="absolute left-3 right-3 bottom-3 z-[470]">
            <div className="rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/90 p-2.5 sm:px-4 sm:py-2.5 shadow-float text-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 border border-sky-200 text-sky-600">
                  <Wind className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-base font-extrabold text-slate-800">{city.name} Wind:</span>
                    <span className="font-display text-lg font-extrabold text-sky-600">{city.wind} km/h</span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {city.windDir} ({city.windDeg}°)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Beaufort Force {beaufort.number} &mdash;{" "}
                    <strong className="text-slate-900">{beaufort.label}</strong> ({beaufort.description})
                  </p>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-2 text-right">
                <div className="px-3 py-1 rounded-xl bg-slate-100 border border-slate-200">
                  <span className="block text-[9.5px] uppercase font-bold text-slate-500">Atmospheric Flow</span>
                  <span className="text-[11.5px] font-bold text-emerald-700">60 FPS Particle Stream</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TEMPERATURE HUD (When in Temperature Mode)          */}
        {/* ---------------------------------------------------- */}
        {layer === "temperature" && (
          <div className="absolute left-3 right-3 bottom-3 z-[470]">
            <div className="rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/90 p-2.5 sm:px-4 sm:py-2.5 shadow-float text-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 border border-amber-200 text-amber-600">
                  <Thermometer className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-base font-extrabold text-slate-800">{city.name} Temp:</span>
                    <span className="font-display text-lg font-extrabold text-amber-600">
                      {formatTemp(city.temp, prefs.tempUnit)}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Feels like {formatTemp(city.feels, prefs.tempUnit)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Live Thermal Gradient &mdash; {city.temp >= 38 ? "Heat Wave Alert Active" : city.temp >= 30 ? "Warm Summer Atmosphere" : "Pleasant Range"}
                  </p>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-2 text-right">
                <div className="px-3 py-1 rounded-xl bg-slate-100 border border-slate-200">
                  <span className="block text-[9.5px] uppercase font-bold text-slate-500">Interpolation</span>
                  <span className="text-[11.5px] font-bold text-amber-700">Continuous IDW Heatmap</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* DYNAMIC METEOROLOGICAL COLOR LEGEND                 */}
        {/* ---------------------------------------------------- */}
        <div className="absolute top-26 right-3 sm:top-auto sm:bottom-18 sm:left-3 z-[450] rounded-xl px-2.5 py-1.5 shadow-float border border-slate-200/90 bg-white/95 backdrop-blur-xl text-slate-800">
          {layer === "rain" && (
            <div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-4 rounded-xs bg-emerald-500" title="Light: 0.1-1 mm/h" />
                <span className="h-2 w-4 rounded-xs bg-yellow-400" title="Moderate: 1-5 mm/h" />
                <span className="h-2 w-4 rounded-xs bg-orange-500" title="Heavy: 5-15 mm/h" />
                <span className="h-2 w-4 rounded-xs bg-red-600" title="Very Heavy: 15-30 mm/h" />
                <span className="h-2 w-4 rounded-xs bg-purple-600" title="Severe / Hail: >30 mm/h" />
                <span className="ml-1 text-[10px] font-bold text-slate-700">Rainfall (dBZ)</span>
              </div>
              <p className="mt-0.5 text-[9px] text-slate-500">Light (0.1 mm/h) &rarr; Severe Hail (&gt;30 mm/h)</p>
            </div>
          )}

          {layer === "wind" && (
            <div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-4 rounded-xs bg-sky-400" title="Calm: <15 km/h" />
                <span className="h-2 w-4 rounded-xs bg-emerald-400" title="Moderate: 15-30 km/h" />
                <span className="h-2 w-4 rounded-xs bg-yellow-400" title="Fresh: 30-45 km/h" />
                <span className="h-2 w-4 rounded-xs bg-orange-500" title="Strong: 45-65 km/h" />
                <span className="h-2 w-4 rounded-xs bg-rose-600" title="Gale / Cyclone: >65 km/h" />
                <span className="ml-1 text-[10px] font-bold text-slate-700">Wind Speed</span>
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
                <span className="ml-1 text-[10px] font-bold text-slate-700">Thermal Scale</span>
              </div>
              <p className="mt-0.5 text-[9px] text-slate-500">Cool (&lt;18°C) &rarr; Heat Wave (&gt;40°C)</p>
            </div>
          )}

          {layer === "satellite" && (
            <div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-5 rounded-xs bg-slate-700" />
                <span className="h-2 w-5 rounded-xs bg-slate-400" />
                <span className="h-2 w-5 rounded-xs bg-white border border-slate-300" />
                <span className="ml-1 text-[10px] font-bold text-slate-700">IR Clouds</span>
              </div>
              <p className="mt-0.5 text-[9px] text-slate-500">Clear &rarr; Dense Cloud Shield</p>
            </div>
          )}

          {layer === "alerts" && (
            <div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-4 rounded-xs bg-level-normal" />
                <span className="h-2 w-4 rounded-xs bg-level-moderate" />
                <span className="h-2 w-4 rounded-xs bg-level-severe" />
                <span className="h-2 w-4 rounded-xs bg-level-extreme" />
                <span className="ml-1 text-[10px] font-bold text-slate-700">IMD Alert</span>
              </div>
              <p className="mt-0.5 text-[9px] text-slate-500">Green &rarr; Yellow &rarr; Orange &rarr; Red</p>
            </div>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* METEOROLOGICAL WORKSTATION TELEMETRY SIDEBAR         */}
      {/* ---------------------------------------------------- */}
      <section
        key={city.id}
        className="relative flex-1 lg:w-[420px] lg:flex-none overflow-y-auto rounded-3xl bg-card border border-border/80 p-4 sm:p-5 shadow-card"
        aria-live="polite"
      >
        <div className="sticky top-0 z-10 lg:hidden flex justify-center bg-card/90 pb-1 pt-1 backdrop-blur">
          <span className="h-1 w-10 rounded-full bg-border" />
        </div>

        <div className="space-y-4 pb-12 lg:pb-4 animate-fade-in">
          {/* Station / City Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-primary mb-0.5">
                <MapPin className="h-3.5 w-3.5" />
                <p className="text-[10.5px] font-extrabold uppercase tracking-wider">Meteorological Station</p>
              </div>
              <h1 className="font-display text-2xl font-extrabold leading-tight">{city.name}</h1>
              <p className="text-[12.5px] text-muted-foreground">{city.state}, India</p>

              <div className="mt-2 flex items-center gap-2">
                {city.alertLevel === "normal" ? (
                  <span className="rounded-full bg-level-normal-soft px-2.5 py-0.5 text-[10px] font-bold text-level-normal">
                    No warning in force
                  </span>
                ) : (
                  <LevelBadge level={city.alertLevel} />
                )}
                <span className="text-[11px] text-muted-foreground">
                  {alerts.length} active {alerts.length === 1 ? "bulletin" : "bulletins"}
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-start justify-end gap-1">
                <WeatherIcon condition={city.condition} className="mt-1 h-8 w-8" />
                <span className="font-display text-[48px] font-extrabold leading-none">
                  {formatTemp(city.temp, prefs.tempUnit)}
                </span>
              </div>
              <p className="text-[12.5px] font-bold">{CONDITION_LABEL[city.condition]}</p>
              <p className="text-[11px] text-muted-foreground">
                Feels like {formatTemp(city.feels, prefs.tempUnit)}
              </p>
            </div>
          </div>

          {/* Real-time Tracking Telemetry Grid */}
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                icon: CloudRain,
                label: "Precipitation",
                v: `${city.rain} mm`,
                cls: "text-primary bg-primary/10",
                sub: `${city.rainProb}% chance`,
              },
              {
                icon: Wind,
                label: "Wind Speed",
                v: `${city.wind} km/h`,
                cls: "text-wind bg-wind/15",
                sub: `${city.windDir} (${city.windDeg}°)`,
              },
              {
                icon: Compass,
                label: "Beaufort",
                v: `F-${beaufort.number}`,
                cls: "text-primary bg-secondary",
                sub: beaufort.label,
              },
              {
                icon: Droplets,
                label: "Humidity",
                v: `${city.humidity}%`,
                cls: "text-rain bg-rain/10",
                sub: "Relative",
              },
              {
                icon: Cloud,
                label: "Cloud Cover",
                v: `${city.cloud}%`,
                cls: "text-muted-foreground bg-secondary",
                sub: "Sky coverage",
              },
              {
                icon: Radio,
                label: "Barometer",
                v: `${city.pressure} hPa`,
                cls: "text-primary bg-secondary",
                sub: "Surface level",
              },
            ].map((s) => (
              <div key={s.label} className="card-surface flex flex-col gap-1 p-2.5 rounded-2xl border border-border/60">
                <div className="flex items-center justify-between">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${s.cls}`}>
                    <s.icon className="h-3 w-3" />
                  </span>
                  <span className="text-[9.5px] font-semibold text-muted-foreground truncate">{s.sub}</span>
                </div>
                <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">{s.label}</p>
                <p className="font-display text-[14px] font-extrabold leading-none text-foreground">{s.v}</p>
              </div>
            ))}
          </div>

          {/* Active IMD Warning Alert Card */}
          {alerts.length > 0 ? (
            <div>
              <SectionTitle title="Active IMD Weather Warning" hint="Official Doppler & Satellite Bulletin" />
              <div className="space-y-2">
                {alerts.map((a) => (
                  <AlertCard key={a.id} alert={a} cityName={city.name} />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl bg-level-normal-soft p-3.5 border border-level-normal/20">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-level-normal text-primary-foreground font-bold">
                ✓
              </span>
              <div>
                <p className="text-[12.5px] font-bold text-foreground">Station Alert Status: Normal</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{city.summary}</p>
              </div>
            </div>
          )}

          {/* Hourly Forecast Strip */}
          <div>
            <SectionTitle title="Station Hourly Forecast" hint="Next 24 hours" />
            <HourlyStrip hours={hourly} />
          </div>

          {/* 7-day outlook */}
          <div className="card-surface px-4 py-3 rounded-2xl border border-border/70">
            <SectionTitle title="7-Day Synoptic Outlook" hint="Rain chance & temp range" />
            <DailyList days={daily} />
          </div>

          {/* Live Data Sync Note */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-secondary/60 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Live Doppler & Open-Meteo Synced</span>
            </span>
            <span className="font-mono text-[10px]" suppressHydrationWarning>
              {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>

          <TrustNote />
        </div>
      </section>
    </div>
  );
}

function MapSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-sky-50 text-slate-800">
      <div className="flex flex-col items-center gap-3">
        <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
        <span className="text-[13px] font-bold text-slate-700">Initializing Live Radar & Tracking Engine…</span>
        <span className="text-[11px] text-slate-500">Connecting to Google Maps & Indian Meteorological Stations</span>
      </div>
    </div>
  );
}
