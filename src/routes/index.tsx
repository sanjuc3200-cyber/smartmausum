import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  MapPin,
  Sparkles,
  Droplets,
  Wind,
  CloudRain,
  Thermometer,
  Leaf,
  Plane,
  Sunrise,
  Sunset,
  ChevronRight,
  Bell,
  Sprout,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { usePrefs, formatTemp, formatTempValue } from "@/lib/prefs";
import { getApiStatus } from "@/lib/weather-api";
import { personaLabel } from "@/lib/personalization";
import {
  CONDITION_LABEL,
  aqiLabel,
  alertsForCity,
  dailyFor,
  getCity,
  hourlyFor,
  sortedAlerts,
  LEVEL_META,
  type Condition,
} from "@/lib/weather-data";
import { WeatherIcon, heroGradientFor } from "@/components/WeatherIcon";
import { WeatherBackdrop } from "@/components/weather/WeatherBackdrop";
import { AlertCard, DailyList, HourlyStrip, SectionTitle, StatTile, TrustNote } from "@/components/weather/Widgets";
import { CitySearchModal } from "@/components/weather/CitySearchModal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IMD MAUSAM — Your Personalized Weather Portal" },
      { name: "description", content: "Official IMD weather, forecasts and alerts organised around your location, persona and interests." },
      { property: "og:title", content: "IMD MAUSAM — Your Personalized Weather Portal" },
      { property: "og:description", content: "Official IMD weather, forecasts and alerts organised around your location, persona and interests." },
    ],
  }),
  component: HomePage,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function HomePage() {
  const { prefs, update } = usePrefs();
  const apiStatus = getApiStatus();
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [previewCondition, setPreviewCondition] = useState<Condition | null>(null);

  const city = getCity(prefs.cityId);
  const dest = getCity(prefs.destinationId);
  const hourly = useMemo(() => hourlyFor(city), [city]);
  const daily = useMemo(() => dailyFor(city), [city]);
  const cityAlerts = alertsForCity(city.id);
  const globalAlerts = sortedAlerts().filter((a) => a.cityId !== city.id).slice(0, 3);
  const aqi = aqiLabel(city.aqi);
  const activeCondition = previewCondition ?? city.condition;
  const hero = heroGradientFor(activeCondition);
  const nextRain = hourly.find((h) => h.rainProb >= 60);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <div className="min-h-dvh pb-12">
      {/* HERO SECTION: Wide Atmospheric Banner (Full Desktop Width) */}
      <header className={`${hero} relative overflow-hidden rounded-3xl my-4 px-6 md:px-8 py-6 md:py-8 text-on-hero shadow-float transition-all`}>
        {/* Ambient atmospheric lighting orbs */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-on-hero/15 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-on-hero/10 blur-2xl" />

        {/* Top Header Bar inside Hero */}
        <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-on-hero/15 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[13px] font-semibold text-on-hero flex items-center gap-2">
              <span>{greeting()}{prefs.name ? `, ${prefs.name}` : ""} 👋</span>
              <span className="inline-flex items-center rounded-full bg-on-hero/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-on-hero">
                {apiStatus.isLive ? "🟢 Live Radar" : "⚡ Official IMD"}
              </span>
            </p>

            {/* Clickable City Switcher Button */}
            <button
              onClick={() => setCityModalOpen(true)}
              className="group flex items-center gap-2 rounded-full bg-on-hero/20 hover:bg-on-hero/30 px-4 py-1.5 text-[13.5px] font-bold text-on-hero transition-all border border-on-hero/25 hover:scale-[1.02] shadow-xs"
              title="Click to change city"
            >
              <MapPin className="h-3.5 w-3.5 text-on-hero" />
              <span>{city.name}, {city.state}</span>
              <span className="ml-1 text-[9.5px] bg-on-hero/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold group-hover:bg-on-hero/45 transition-colors">
                Change ▾
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick Refresh Weather Button */}
            <button
              onClick={handleRefresh}
              aria-label="Refresh weather"
              title="Refresh weather data"
              className="glass flex h-10 w-10 items-center justify-center rounded-full hover:bg-on-hero/20 transition-all active:scale-95"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>

            {/* Alerts Bell */}
            <Link
              to="/alerts"
              aria-label="Alerts"
              className="glass relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-on-hero/20 transition-colors"
            >
              <Bell className="h-4.5 w-4.5" />
              {cityAlerts.length > 0 && (
                <span className={`absolute right-2 top-2 h-2.5 w-2.5 rounded-full ${LEVEL_META[cityAlerts[0]!.level].color} ring-2 ring-card animate-pulse`} />
              )}
            </Link>

            {/* Persona Quick Pill */}
            <Link
              to="/profile"
              className="glass flex h-10 items-center rounded-full pl-2 pr-3.5 text-[12px] font-bold hover:bg-on-hero/20 transition-all press"
            >
              <span className="mr-2 flex h-7 w-7 items-center justify-center rounded-full bg-on-hero/90 text-[13px] shadow-xs">
                {prefs.persona === "student" ? "🎒" : prefs.persona === "farmer" ? "🌾" : prefs.persona === "traveller" ? "✈️" : "🏠"}
              </span>
              <span>{personaLabel(prefs.persona)}</span>
            </Link>
          </div>
        </div>

        {/* Hero Body: 2-Column Desktop Grid */}
        <div className="relative mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Main Temperature & Animated Weather Icon */}
          <div className="lg:col-span-6 flex items-end justify-between">
            <div>
              <div className="flex items-start gap-2">
                <span className="font-display text-[84px] md:text-[98px] font-extrabold leading-[0.82] tracking-tighter">
                  {formatTempValue(city.temp, prefs.tempUnit)}
                </span>
                <div className="mt-2 flex flex-col items-start gap-1">
                  <button
                    onClick={() => update({ tempUnit: prefs.tempUnit === "C" ? "F" : "C" })}
                    title={`Switch to °${prefs.tempUnit === "C" ? "F" : "C"}`}
                    className="rounded-xl bg-on-hero/20 hover:bg-on-hero/35 px-3 py-1 font-display text-sm font-extrabold tracking-tight text-on-hero transition-all border border-on-hero/25 active:scale-95 shadow-xs"
                  >
                    °{prefs.tempUnit} ⇄
                  </button>
                </div>
              </div>

              <p className="mt-3 text-lg md:text-xl font-bold flex items-center gap-2">
                <span>{CONDITION_LABEL[city.condition]}</span>
                {city.alertLevel !== "normal" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-on-hero/25 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide">
                    <ShieldAlert className="h-3.5 w-3.5" /> {city.alertLevel}
                  </span>
                )}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px] text-on-hero-muted font-medium">
                <span>Feels like {formatTemp(city.feels, prefs.tempUnit)}</span>
                <span>·</span>
                <span className="flex items-center gap-1 font-semibold text-on-hero">
                  <span className="text-sun">↑</span> H {formatTemp(daily[0]?.hi ?? city.temp + 4, prefs.tempUnit)}
                  <span className="text-primary-glow">↓</span> L {formatTemp(daily[0]?.lo ?? city.temp - 3, prefs.tempUnit)}
                </span>
              </div>
            </div>

            <div className="animate-float shrink-0 pl-4">
              <WeatherIcon condition={city.condition} className="h-28 w-28 md:h-36 md:w-36 text-on-hero drop-shadow-[0_14px_28px_rgba(0,0,0,0.35)]" inherit />
            </div>
          </div>

          {/* Today's Synoptic Daily Summary Card with Atmospheric Animated Backdrop */}
          <div className="lg:col-span-6 glass relative rounded-3xl p-5 md:p-6 shadow-xl border border-white/20 overflow-hidden group transition-all">
            {/* Animated Weather Backdrop on Back Side */}
            <WeatherBackdrop condition={activeCondition} />

            {/* Foreground Content Container with Enhanced Contrast & Legibility */}
            <div className="relative z-10">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse ring-2 ring-emerald-400/30" />
                  <p className="text-[11.5px] font-bold uppercase tracking-wider text-on-hero">
                    Daily Meteorological Summary
                  </p>
                </div>

                {/* Quick Weather Animation Preview Switcher */}
                <div className="flex items-center gap-1 rounded-full bg-black/25 backdrop-blur-md px-2 py-0.5 border border-white/15 shadow-xs">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-on-hero-muted mr-1 hidden sm:inline">
                    Effects:
                  </span>
                  {[
                    { id: "auto", label: "Auto", icon: "🌐", cond: null },
                    { id: "rain", label: "Rain", icon: "🌧️", cond: "rain" as Condition },
                    { id: "sunny", label: "Sunny", icon: "☀️", cond: "sunny" as Condition },
                    { id: "haze", label: "Foggy", icon: "🌫️", cond: "haze" as Condition },
                    { id: "storm", label: "Storm", icon: "⚡", cond: "storm" as Condition },
                  ].map((tab) => {
                    const isSelected = tab.cond === null ? previewCondition === null : previewCondition === tab.cond;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setPreviewCondition(tab.cond)}
                        title={`Preview ${tab.label} animation`}
                        className={`press px-2 py-0.5 rounded-full text-[10.5px] font-extrabold transition-all flex items-center gap-1 ${
                          isSelected
                            ? "bg-white/30 text-white shadow-xs scale-105"
                            : "text-on-hero-muted hover:text-white hover:bg-white/10"
                        }`}
                      >
                        <span>{tab.icon}</span>
                        <span className="hidden xl:inline">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between">
                <p className="text-[11.5px] text-on-hero-muted font-semibold">
                  {city.name} Observational Station · <span className="capitalize text-on-hero">{CONDITION_LABEL[activeCondition]} Atmosphere</span>
                </p>
              </div>

              <p className="mt-2 text-[14px] md:text-[14.5px] font-medium leading-relaxed drop-shadow-xs text-on-hero">
                {city.summary}
              </p>

              {/* 4 Metric Capsules */}
              <div className="mt-5 grid grid-cols-4 gap-2.5 text-center">
                {[
                  { i: CloudRain, l: "Rain Chance", v: `${city.rainProb}%` },
                  { i: Droplets, l: "Humidity", v: `${city.humidity}%` },
                  { i: Wind, l: "Wind", v: `${city.wind} km/h` },
                  { i: Leaf, l: "AQI", v: `${city.aqi}` },
                ].map((s) => (
                  <div
                    key={s.l}
                    className="rounded-2xl bg-black/20 backdrop-blur-md py-3 px-1.5 border border-white/15 shadow-xs transition-all hover:bg-black/30 hover:scale-[1.02]"
                  >
                    <s.i className="mx-auto h-4 w-4 text-on-hero-muted" />
                    <p className="mt-1.5 font-display text-base font-extrabold leading-tight text-on-hero">{s.v}</p>
                    <p className="text-[10px] text-on-hero-muted font-semibold mt-0.5">{s.l}</p>
                  </div>
                ))}
              </div>

              {/* Sunrise & Sunset Meter */}
              <div className="mt-4 flex items-center justify-between pt-3 border-t border-on-hero/15 text-[11.5px] font-medium text-on-hero-muted">
                <span className="flex items-center gap-1.5">
                  <Sunrise className="h-4 w-4 text-sun" /> Sunrise: <strong className="text-on-hero font-bold">{city.sunrise}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <Sunset className="h-4 w-4 text-level-severe" /> Sunset: <strong className="text-on-hero font-bold">{city.sunset}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Personalized Indicator */}
      <div className="flex items-center justify-between px-2 py-2">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="absolute inset-0 rounded-full bg-primary/30 animate-pulse-ring" />
          </span>
          <div>
            <p className="text-[13px] font-bold text-foreground">Personalized Weather Workstation</p>
            <p className="text-[11px] text-muted-foreground">
              {personaLabel(prefs.persona)} · Tailored for {city.name} observation data
            </p>
          </div>
        </div>
        <Link to="/profile" className="press rounded-full bg-secondary hover:bg-secondary/80 px-4 py-1.5 text-[12px] font-bold text-primary transition-all">
          Customize Dashboard
        </Link>
      </div>

      {/* DESKTOP WORKSTATION GRID: 12 Columns (8 Main + 4 Sidebar) */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: 8 Columns on Desktop (Main Visual Weather Workstation) */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. 24-Hour Timeline Forecast Card with Interactive Inspector */}
          <Card
            title="24-Hour Timeline Forecast"
            hint="Click any hour to inspect detailed rain and wind parameters"
            to="/forecast"
          >
            <HourlyStrip hours={hourly} compact={false} />
          </Card>

          {/* 2. 7-Day Synoptic Outlook */}
          <Card
            title="7-Day Synoptic Forecast Outlook"
            hint="Weekly temperature range and precipitation probability"
            to="/forecast"
          >
            <DailyList days={daily} limit={7} />
          </Card>

          {/* 3. Rainfall Dynamics & 12-Hour Intensity */}
          <Card title="Precipitation & Rainfall Dynamics" hint="Accumulated radar and forecast">
            <div className="flex flex-col sm:flex-row items-center gap-6 p-2">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
                <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--secondary)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--rain)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${city.rainProb * 0.974} 100`} />
                </svg>
                <span className="absolute font-display text-xl font-extrabold text-foreground">{city.rainProb}%</span>
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-[14px] font-bold text-foreground">Rainfall Probability & Status</p>
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  {city.rain} mm measured in the last 24h. {nextRain && nextRain.label !== "Now" ? `Next major spell expected around ${nextRain.label}.` : nextRain ? "Rain likely active now." : "No severe showers predicted today."}
                </p>
                <div className="flex gap-1 pt-1">
                  {hourly.slice(0, 16).map((h, i) => (
                    <span key={i} title={`${h.label}: ${h.rainProb}%`} className="h-7 w-full rounded-md transition-all hover:scale-110" style={{ background: `color-mix(in oklab, var(--rain) ${h.rainProb}%, var(--secondary))` }} />
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                  <span>Now</span>
                  <span>Next 6 Hours</span>
                  <span>Next 12 Hours</span>
                  <span>Next 16 Hours</span>
                </div>
              </div>
            </div>
          </Card>

          {/* 4. Travel Route Weather */}
          <Card title="Travel Route Weather Planner" hint="Compare departure vs destination" to="/map">
            <div className="flex items-center gap-4">
              <div className="flex-1 rounded-2xl bg-secondary/70 p-4 border border-border/60">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Origin</p>
                <p className="text-[14px] font-bold truncate text-foreground">{city.name}, {city.state}</p>
                <div className="mt-2 flex items-center gap-2">
                  <WeatherIcon condition={city.condition} className="h-5 w-5" />
                  <span className="font-display text-lg font-bold">{formatTemp(city.temp, prefs.tempUnit)}</span>
                  <span className="text-[11px] text-muted-foreground font-medium">({CONDITION_LABEL[city.condition]})</span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-1 shrink-0">
                <Plane className="h-6 w-6 text-primary animate-pulse" />
                <span className="text-[10px] font-bold text-muted-foreground">Route</span>
              </div>

              <div className="flex-1 rounded-2xl bg-primary/8 p-4 ring-1 ring-primary/20 border border-primary/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Destination</p>
                <p className="text-[14px] font-bold truncate text-foreground">{dest.name}, {dest.state}</p>
                <div className="mt-2 flex items-center gap-2">
                  <WeatherIcon condition={dest.condition} className="h-5 w-5" />
                  <span className="font-display text-lg font-bold text-primary">{formatTemp(dest.temp, prefs.tempUnit)}</span>
                  <span className="text-[11px] text-muted-foreground font-medium">({CONDITION_LABEL[dest.condition]})</span>
                </div>
              </div>
            </div>

            <p className="mt-3 text-[12px] text-muted-foreground">
              {dest.alertLevel !== "normal" ? (
                <span className={`font-semibold ${LEVEL_META[dest.alertLevel].text}`}>
                  ⚠ {LEVEL_META[dest.alertLevel].label} alert active at {dest.name}. {dest.summary}
                </span>
              ) : (
                <>Good conditions reported at {dest.name}. {dest.summary}</>
              )}
            </p>
          </Card>
        </div>

        {/* RIGHT COLUMN: 4 Columns on Desktop (Sidebar for Alerts, Environment & Advice) */}
        <div className="lg:col-span-4 space-y-6">
          {/* 1. Official Weather Alerts */}
          <Card title="Weather Warnings & Bulletins" hint="Official IMD Alerts" to="/alerts">
            <div className="space-y-2.5">
              {cityAlerts.length > 0 ? (
                cityAlerts.map((a) => <AlertCard key={a.id} alert={a} cityName={city.name} />)
              ) : (
                <div className="flex items-center gap-3 rounded-2xl bg-level-normal-soft/80 p-3.5 text-[12px] font-semibold text-level-normal border border-level-normal/25">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-level-normal/15 text-sm">
                    ✓
                  </span>
                  <div>
                    <p className="font-bold text-foreground">All Clear for {city.name}</p>
                    <p className="text-[11px] text-muted-foreground font-normal">No extreme weather warnings in effect.</p>
                  </div>
                </div>
              )}
              {globalAlerts.map((a) => (
                <AlertCard key={a.id} alert={a} cityName={getCity(a.cityId).name} compact />
              ))}
            </div>
          </Card>

          {/* 2. Environmental & Atmospheric Stat Tiles (2x2 Grid) */}
          <div>
            <SectionTitle title="Atmospheric Parameters" hint="Real-time sensors" />
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                icon={<Droplets className="h-4 w-4" />}
                label="Humidity"
                value={city.humidity}
                unit="%"
                sub={city.humidity > 80 ? "High humidity" : city.humidity > 60 ? "Comfortable" : "Dry air"}
                tone="rain"
              />
              <StatTile
                icon={<Wind className="h-4 w-4" />}
                label="Wind Speed"
                value={city.wind}
                unit="km/h"
                sub={`From ${city.windDir} · ${city.wind > 30 ? "Gusts" : "Gentle"}`}
                tone="wind"
              />
              <StatTile
                icon={<Leaf className="h-4 w-4" />}
                label="Air Quality"
                value={city.aqi}
                unit="AQI"
                sub={aqi.label}
                tone={city.aqi > 100 ? "sun" : "default"}
              />
              <StatTile
                icon={<Thermometer className="h-4 w-4" />}
                label="Day Range"
                value={`${formatTemp(daily[0]?.lo ?? city.temp - 3, prefs.tempUnit)} / ${formatTemp(daily[0]?.hi ?? city.temp + 4, prefs.tempUnit)}`}
                sub={`Feels ${formatTemp(city.feels, prefs.tempUnit)}`}
                tone="sun"
              />
            </div>
          </div>

          {/* 3. Agro-Weather Advisory */}
          <Card title="Agro-Weather Advisory" hint="Agricultural guidelines">
            <div className="space-y-2.5">
              {[
                { icon: Sprout, t: "Sowing / Field Work", d: city.rainProb > 60 ? "Postpone spraying & fertiliser — heavy rain predicted." : "Favourable window for field work today." },
                { icon: Droplets, t: "Irrigation Schedule", d: city.rain > 20 ? `Skip irrigation — ${city.rain} mm received.` : "Light irrigation advised for crops." },
                { icon: Wind, t: "Wind & Harvesting", d: city.wind > 25 ? "Secure polyhouses and fruit crops." : "Calm winds; suitable for drying." },
              ].map((r) => (
                <div key={r.t} className="flex gap-3 rounded-2xl bg-level-normal-soft/70 p-3 border border-border/50">
                  <r.icon className="mt-0.5 h-4 w-4 shrink-0 text-level-normal" />
                  <div>
                    <p className="text-[12.5px] font-bold text-foreground">{r.t}</p>
                    <p className="text-[11.5px] text-muted-foreground leading-snug">{r.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 4. Quick Explore Desktop Links */}
          <div className="card-surface p-4 border border-border/70 shadow-card">
            <SectionTitle title="Quick Portal Tools" />
            <div className="grid grid-cols-2 gap-2.5 mt-2">
              {[
                { to: "/map", l: "Live Radar Map", e: "🗺️" },
                { to: "/forecast", l: "7-Day Forecast", e: "📅" },
                { to: "/alerts", l: "Severe Alerts", e: "⚠️" },
                { to: "/profile", l: "Settings & Prefs", e: "⚙️" },
              ].map((q) => (
                <Link
                  key={q.l}
                  to={q.to}
                  className="press flex items-center gap-2.5 rounded-2xl bg-secondary/80 hover:bg-secondary p-3 transition-all hover:border-primary/40 border border-transparent"
                >
                  <span className="text-xl">{q.e}</span>
                  <span className="text-[12px] font-bold text-foreground">{q.l}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <TrustNote />

      {/* Interactive City Search Modal */}
      <CitySearchModal
        isOpen={cityModalOpen}
        onClose={() => setCityModalOpen(false)}
        title="Select Weather Station"
      />
    </div>
  );
}

function Card({
  title,
  hint,
  to,
  className = "",
  children,
}: {
  title: string;
  hint?: string;
  to?: "/alerts" | "/forecast" | "/map";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`card-surface p-5 hover:border-primary/25 transition-all shadow-card hover:shadow-md ${className}`}>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">{title}</h2>
          {hint && (
            <p className="flex items-center gap-1 text-[11px] font-medium text-primary mt-0.5">
              <Sparkles className="h-3 w-3" /> {hint}
            </p>
          )}
        </div>
        {to && (
          <Link to={to} className="flex items-center text-[12px] font-bold text-primary hover:underline gap-0.5">
            See details <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
