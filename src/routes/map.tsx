import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useMemo, useState } from "react";
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
} from "lucide-react";
import { usePrefs } from "@/lib/prefs";
import {
  CITIES,
  CONDITION_LABEL,
  LEVEL_META,
  alertsForCity,
  dailyFor,
  getCity,
  hourlyFor,
} from "@/lib/weather-data";
import { WeatherIcon } from "@/components/WeatherIcon";
import { AlertCard, DailyList, HourlyStrip, LevelBadge, SectionTitle, TrustNote } from "@/components/weather/Widgets";
import type { MapLayer } from "@/components/map/LeafletMap";

const LeafletMap = lazy(() => import("@/components/map/LeafletMap"));

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Interactive Weather Map — IMD MAUSAM" },
      { name: "description", content: "Tap any Indian city to see live IMD weather, rainfall, wind and alert layers." },
      { property: "og:title", content: "Interactive Weather Map — IMD MAUSAM" },
      { property: "og:description", content: "Tap any Indian city to see live IMD weather, rainfall, wind and alert layers." },
    ],
  }),
  component: MapPage,
});

const LAYERS: { id: MapLayer; label: string; icon: typeof CloudRain; emoji: string }[] = [
  { id: "temperature", label: "Temperature", icon: Thermometer, emoji: "🌡" },
  { id: "rainfall", label: "Rainfall", icon: CloudRain, emoji: "🌧" },
  { id: "wind", label: "Wind", icon: Wind, emoji: "💨" },
  { id: "alerts", label: "Alerts", icon: AlertTriangle, emoji: "⚠" },
];

const LEGEND: Record<MapLayer, { label: string; colors: string[] }> = {
  temperature: { label: "°C", colors: ["oklch(0.6 0.15 240)", "oklch(0.7 0.13 200)", "oklch(0.8 0.15 95)", "oklch(0.72 0.18 55)", "oklch(0.58 0.22 28)"] },
  rainfall: { label: "mm", colors: ["oklch(0.85 0.05 230)", "oklch(0.72 0.12 235)", "oklch(0.58 0.16 245)", "oklch(0.42 0.17 260)"] },
  wind: { label: "km/h", colors: ["oklch(0.8 0.06 200)", "oklch(0.68 0.1 200)", "oklch(0.6 0.14 185)", "oklch(0.5 0.16 170)"] },
  alerts: { label: "level", colors: [LEVEL_META.moderate.dot, LEVEL_META.severe.dot, LEVEL_META.extreme.dot] },
};

function MapPage() {
  const { prefs } = usePrefs();
  const [selectedId, setSelectedId] = useState(prefs.cityId);
  const [layer, setLayer] = useState<MapLayer>("temperature");
  const [layersOpen, setLayersOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [mapRef, setMapRef] = useState<L.Map | null>(null);

  const city = getCity(selectedId);
  const hourly = useMemo(() => hourlyFor(city), [city]);
  const daily = useMemo(() => dailyFor(city), [city]);
  const alerts = alertsForCity(city.id);
  const results = query.trim()
    ? CITIES.filter((c) => (c.name + " " + c.state).toLowerCase().includes(query.toLowerCase())).slice(0, 5)
    : [];

  const select = useCallback((id: string, fly = false) => {
    setSelectedId(id);
    if (fly) {
      const c = getCity(id);
      setFlyTarget([c.lat, c.lng]);
    }
    setQuery("");
  }, []);

  const trend = daily[2] && daily[0] ? daily[2].hi - daily[0].hi : 0;
  const onMapReady = useCallback((m: L.Map) => setMapRef(m), []);

  return (
    <div className="flex h-dvh flex-col">
      {/* MAP — top 50% */}
      <section className="relative h-[50dvh] shrink-0 overflow-hidden" aria-label="Interactive weather map">
        <ClientOnly fallback={<MapSkeleton />}>
          <Suspense fallback={<MapSkeleton />}>
            <LeafletMap layer={layer} selectedId={selectedId} onSelect={(id) => select(id)} flyTarget={flyTarget} onMapReady={onMapReady} />
          </Suspense>
        </ClientOnly>

        {/* Search */}
        <div className="absolute left-3 right-3 top-[max(env(safe-area-inset-top),0.75rem)] z-[500]">
          <div className="glass-light flex items-center gap-2 rounded-2xl px-3 py-2.5 shadow-card">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city or state…"
              className="w-full bg-transparent text-[13.5px] font-medium outline-none placeholder:text-muted-foreground"
              aria-label="Search location"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear search">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          {results.length > 0 && (
            <div className="card-surface mt-2 overflow-hidden animate-fade-in">
              {results.map((c) => (
                <button
                  key={c.id}
                  onClick={() => select(c.id, true)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-secondary"
                >
                  <WeatherIcon condition={c.condition} className="h-5 w-5" />
                  <span className="flex-1">
                    <span className="block text-[13px] font-semibold">{c.name}</span>
                    <span className="block text-[11px] text-muted-foreground">{c.state}</span>
                  </span>
                  <span className="font-display text-sm font-bold">{c.temp}°</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Layer chips */}
        <div className="hide-scroll absolute left-3 right-14 top-[calc(max(env(safe-area-inset-top),0.75rem)+3.4rem)] z-[450] flex gap-1.5 overflow-x-auto">
          {LAYERS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLayer(l.id)}
              className={`press flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11.5px] font-bold shadow-card transition-all ${
                layer === l.id ? "bg-primary text-primary-foreground" : "glass-light text-foreground"
              }`}
            >
              <span>{l.emoji}</span>
              {l.label}
            </button>
          ))}
        </div>

        {/* Right controls */}
        <div className="absolute right-3 top-[calc(max(env(safe-area-inset-top),0.75rem)+3.4rem)] z-[450] flex flex-col gap-1.5">
          <button
            onClick={() => setLayersOpen((o) => !o)}
            aria-label="Map layers"
            className={`press flex h-9 w-9 items-center justify-center rounded-xl shadow-card ${layersOpen ? "bg-primary text-primary-foreground" : "glass-light"}`}
          >
            <Layers className="h-4 w-4" />
          </button>
        </div>
        {layersOpen && (
          <div className="card-surface absolute right-3 top-[calc(max(env(safe-area-inset-top),0.75rem)+6.2rem)] z-[460] w-44 p-2 animate-scale-in">
            <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Weather layers</p>
            {LAYERS.map((l) => (
              <button
                key={l.id}
                onClick={() => {
                  setLayer(l.id);
                  setLayersOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-[12.5px] font-semibold ${layer === l.id ? "bg-primary/10 text-primary" : ""}`}
              >
                <l.icon className="h-4 w-4" /> {l.label}
              </button>
            ))}
          </div>
        )}

        <div className="absolute bottom-3 right-3 z-[450] flex flex-col gap-1.5">
          <button onClick={() => mapRef?.zoomIn()} aria-label="Zoom in" className="press glass-light flex h-9 w-9 items-center justify-center rounded-xl shadow-card">
            <Plus className="h-4 w-4" />
          </button>
          <button onClick={() => mapRef?.zoomOut()} aria-label="Zoom out" className="press glass-light flex h-9 w-9 items-center justify-center rounded-xl shadow-card">
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={() => select(prefs.cityId, true)}
            aria-label="Current location"
            className="press flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow"
          >
            <LocateFixed className="h-4 w-4" />
          </button>
        </div>

        {/* Legend */}
        <div className="glass-light absolute bottom-3 left-3 z-[450] rounded-xl px-2.5 py-1.5 shadow-card">
          <div className="flex items-center gap-1">
            {LEGEND[layer].colors.map((c) => (
              <span key={c} className="h-2 w-5 rounded-sm" style={{ background: c }} />
            ))}
            <span className="ml-1 text-[10px] font-bold text-muted-foreground">{LEGEND[layer].label}</span>
          </div>
          <p className="mt-0.5 text-[9.5px] text-muted-foreground">
            {layer === "alerts" ? "Yellow → Orange → Red" : "Low → High"} · tap a city
          </p>
        </div>
      </section>

      {/* DETAILS — bottom 50%, scrollable */}
      <section key={city.id} className="relative flex-1 overflow-y-auto rounded-t-[1.8rem] bg-background shadow-[0_-12px_30px_-20px_oklch(0.3_0.1_255/0.5)]" aria-live="polite">
        <div className="sticky top-0 z-10 flex justify-center bg-background/90 pb-1 pt-2 backdrop-blur">
          <span className="h-1 w-10 rounded-full bg-border" />
        </div>
        <div className="space-y-4 px-4 pb-28 animate-fade-in">
          {/* Selected location header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-primary">Selected location</p>
              <h1 className="font-display text-2xl font-extrabold leading-tight">{city.name}</h1>
              <p className="text-[12.5px] text-muted-foreground">{city.state}, India</p>
              <div className="mt-2 flex items-center gap-2">
                {city.alertLevel === "normal" ? (
                  <span className="rounded-full bg-level-normal-soft px-2 py-0.5 text-[10px] font-bold text-level-normal">No warning</span>
                ) : (
                  <LevelBadge level={city.alertLevel} />
                )}
                <span className="text-[11px] text-muted-foreground">{alerts.length} active {alerts.length === 1 ? "warning" : "warnings"}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-start justify-end gap-1">
                <WeatherIcon condition={city.condition} className="mt-1 h-8 w-8" />
                <span className="font-display text-[52px] font-extrabold leading-none">{city.temp}°</span>
              </div>
              <p className="text-[12.5px] font-semibold">{CONDITION_LABEL[city.condition]}</p>
              <p className="text-[11px] text-muted-foreground">Feels like {city.feels}°</p>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Droplets, label: "Humidity", v: `${city.humidity}%`, cls: "text-rain bg-rain/10" },
              { icon: Wind, label: "Wind", v: `${city.wind} km/h`, cls: "text-wind bg-wind/15" },
              { icon: Compass, label: "Direction", v: city.windDir, cls: "text-primary bg-secondary" },
              { icon: CloudRain, label: "Rainfall", v: `${city.rain} mm`, cls: "text-primary bg-primary/10" },
              { icon: Cloud, label: "Cloud cover", v: `${city.cloud}%`, cls: "text-muted-foreground bg-secondary" },
              { icon: Droplets, label: "Rain chance", v: `${city.rainProb}%`, cls: "text-rain bg-rain/10" },
            ].map((s) => (
              <div key={s.label} className="card-surface flex flex-col gap-1.5 p-3">
                <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${s.cls}`}>
                  <s.icon className="h-3.5 w-3.5" />
                </span>
                <p className="text-[10.5px] font-semibold text-muted-foreground">{s.label}</p>
                <p className="font-display text-[15px] font-bold leading-none">{s.v}</p>
              </div>
            ))}
          </div>

          {/* Warning */}
          {alerts.length > 0 ? (
            <div>
              <SectionTitle title="Important warning" hint="Official IMD bulletin" />
              <div className="space-y-2">
                {alerts.map((a) => (
                  <AlertCard key={a.id} alert={a} cityName={city.name} />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl bg-level-normal-soft p-3.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-level-normal text-primary-foreground">✓</span>
              <div>
                <p className="text-[13px] font-bold">No weather warning in force</p>
                <p className="text-[11px] text-muted-foreground">{city.summary}</p>
              </div>
            </div>
          )}

          {/* Hourly */}
          <div>
            <SectionTitle title="Hourly forecast" hint="Next 24 hours" />
            <HourlyStrip hours={hourly} />
          </div>

          {/* Trend */}
          <div className="card-surface flex items-center gap-3 p-3.5">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${trend >= 0 ? "bg-sun/20 text-level-severe" : "bg-rain/10 text-rain"}`}>
              {trend >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            </span>
            <div className="flex-1">
              <p className="text-[13px] font-bold">Weather trend</p>
              <p className="text-[11.5px] text-muted-foreground">
                {trend >= 0 ? `Warming by ${trend}°` : `Cooling by ${Math.abs(trend)}°`} over 3 days ·{" "}
                {(daily[1]?.rainProb ?? 0) > 50 ? "rain continues tomorrow" : "drier conditions ahead"}
              </p>
            </div>
          </div>

          {/* 7-day */}
          <div className="card-surface px-4 py-2">
            <SectionTitle title="7-day forecast" hint="Rain probability & temperature range" />
            <DailyList days={daily} />
          </div>

          <TrustNote />
        </div>
      </section>
    </div>
  );
}

function MapSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-sky-soft">
      <div className="flex flex-col items-center gap-2 text-primary">
        <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
        <span className="text-[12px] font-semibold">Loading India weather map…</span>
      </div>
    </div>
  );
}
