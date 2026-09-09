import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
  Sun,
  ShieldAlert,
} from "lucide-react";
import { usePrefs, formatTemp, formatTempValue } from "@/lib/prefs";
import { getApiStatus } from "@/lib/weather-api";
import { rankCards, personaLabel, type CardId } from "@/lib/personalization";
import {
  CONDITION_LABEL,
  aqiLabel,
  alertsForCity,
  dailyFor,
  getCity,
  hourlyFor,
  sortedAlerts,
  LEVEL_META,
} from "@/lib/weather-data";
import { WeatherIcon, heroGradientFor } from "@/components/WeatherIcon";
import { AlertCard, DailyList, HourlyStrip, SectionTitle, StatTile, TrustNote } from "@/components/weather/Widgets";
import { CitySearchModal } from "@/components/weather/CitySearchModal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IMD MAUSAM — Your Personalized Weather" },
      { name: "description", content: "Official IMD weather, forecasts and alerts organised around your location, persona and interests." },
      { property: "og:title", content: "IMD MAUSAM — Your Personalized Weather" },
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
  const { prefs, hydrated, update } = usePrefs();
  const apiStatus = getApiStatus();
  const navigate = useNavigate();
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const city = getCity(prefs.cityId);
  const dest = getCity(prefs.destinationId);
  const hourly = useMemo(() => hourlyFor(city), [city]);
  const daily = useMemo(() => dailyFor(city), [city]);
  const cards = useMemo(() => rankCards(prefs), [prefs]);
  const cityAlerts = alertsForCity(city.id);
  const globalAlerts = sortedAlerts().filter((a) => a.cityId !== city.id).slice(0, 2);
  const aqi = aqiLabel(city.aqi);
  const hero = heroGradientFor(city.condition);
  const nextRain = hourly.find((h) => h.rainProb >= 60);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const renderCard = (id: CardId, reason: string) => {
    switch (id) {
      case "alerts":
        return (
          <Card key={id} title="Weather alerts" hint={reason} to="/alerts">
            <div className="space-y-2">
              {cityAlerts.length > 0 ? (
                cityAlerts.map((a) => <AlertCard key={a.id} alert={a} cityName={city.name} />)
              ) : (
                <div className="flex items-center gap-3 rounded-2xl bg-level-normal-soft/80 p-3.5 text-[12px] font-semibold text-level-normal border border-level-normal/20">
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-level-normal/15">
                    ✓
                  </span>
                  <div>
                    <p className="font-bold text-foreground">No active warnings for {city.name}</p>
                    <p className="text-[11px] text-muted-foreground font-normal">Atmospheric parameters within normal thresholds.</p>
                  </div>
                </div>
              )}
              {globalAlerts.map((a) => (
                <AlertCard key={a.id} alert={a} cityName={getCity(a.cityId).name} compact />
              ))}
            </div>
          </Card>
        );
      case "current":
        return null; // rendered as hero
      case "rain":
        return (
          <Card key={id} title="Rainfall" hint={reason}>
            <div className="flex items-center gap-4">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
                <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--secondary)" strokeWidth="3.5" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--rain)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${city.rainProb * 0.974} 100`} />
                </svg>
                <span className="absolute font-display text-lg font-extrabold">{city.rainProb}%</span>
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-[13px] font-bold">Chance of rain today</p>
                <p className="text-[11.5px] text-muted-foreground">
                  {city.rain} mm in the last 24h. {nextRain && nextRain.label !== "Now" ? `Next spell around ${nextRain.label}.` : nextRain ? "Rain likely right now." : "No major spell expected."}
                </p>
                <div className="flex gap-1 pt-1">
                  {hourly.slice(0, 12).map((h, i) => (
                    <span key={i} className="h-6 w-full rounded-sm bg-rain/15" style={{ background: `color-mix(in oklab, var(--rain) ${h.rainProb}%, var(--secondary))` }} />
                  ))}
                </div>
                <p className="text-[9.5px] text-muted-foreground">Next 12 hours intensity</p>
              </div>
            </div>
          </Card>
        );
      case "hourly":
        return (
          <Card key={id} title="Hourly forecast" hint={reason} to="/forecast" className="md:col-span-2">
            <HourlyStrip hours={hourly} compact />
          </Card>
        );
      case "daily":
        return (
          <Card key={id} title="7-day forecast" hint={reason} to="/forecast">
            <DailyList days={daily} limit={5} />
          </Card>
        );
      case "travel":
        return (
          <Card key={id} title="Travel weather" hint={reason} to="/map">
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-2xl bg-secondary/70 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">From</p>
                <p className="text-[13px] font-bold truncate">{city.name}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <WeatherIcon condition={city.condition} className="h-4 w-4" />
                  <span className="font-display text-base font-bold">{formatTemp(city.temp, prefs.tempUnit)}</span>
                </div>
              </div>
              <Plane className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 rounded-2xl bg-primary/8 p-3 ring-1 ring-primary/15">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">To</p>
                <p className="text-[13px] font-bold truncate">{dest.name}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <WeatherIcon condition={dest.condition} className="h-4 w-4" />
                  <span className="font-display text-base font-bold">{formatTemp(dest.temp, prefs.tempUnit)}</span>
                </div>
              </div>
            </div>
            <p className="mt-2.5 text-[11.5px] text-muted-foreground">
              {dest.alertLevel !== "normal" ? (
                <span className={`font-semibold ${LEVEL_META[dest.alertLevel].text}`}>
                  ⚠ {LEVEL_META[dest.alertLevel].label} alert at {dest.name}. {dest.summary}
                </span>
              ) : (
                <>Good conditions at {dest.name}. {dest.summary}</>
              )}
            </p>
          </Card>
        );
      case "humidity":
        return (
          <StatTile key={id} icon={<Droplets className="h-3.5 w-3.5" />} label="Humidity" value={city.humidity} unit="%" sub={city.humidity > 80 ? "Very humid — fungal risk for crops" : city.humidity > 60 ? "Comfortable to humid" : "Dry air"} tone="rain" />
        );
      case "wind":
        return (
          <StatTile key={id} icon={<Wind className="h-3.5 w-3.5" />} label="Wind" value={city.wind} unit="km/h" sub={`From ${city.windDir} · ${city.wind > 30 ? "strong gusts" : city.wind > 15 ? "breezy" : "calm"}`} tone="wind" />
        );
      case "temperature":
        return (
          <StatTile key={id} icon={<Thermometer className="h-3.5 w-3.5" />} label="Temperature" value={`${formatTemp(daily[0]?.lo ?? city.temp - 3, prefs.tempUnit)} / ${formatTemp(daily[0]?.hi ?? city.temp + 4, prefs.tempUnit)}`} sub={`Feels like ${formatTemp(city.feels, prefs.tempUnit)} now`} tone="sun" />
        );
      case "aqi":
        return (
          <StatTile key={id} icon={<Leaf className="h-3.5 w-3.5" />} label="Air quality" value={city.aqi} unit="AQI" sub={aqi.label} tone={city.aqi > 100 ? "sun" : "default"} />
        );
      case "sun":
        return (
          <div key={id} className="card-surface flex items-center justify-between p-4 hover:border-primary/30 transition-all shadow-card">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sun/20 text-sun">
                <Sunrise className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-[10.5px] text-muted-foreground">Sunrise</span>
                <span className="font-display text-sm font-bold">{city.sunrise}</span>
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-level-severe/15 text-level-severe">
                <Sunset className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-[10.5px] text-muted-foreground">Sunset</span>
                <span className="font-display text-sm font-bold">{city.sunset}</span>
              </span>
            </div>
          </div>
        );
      case "agri":
        return (
          <Card key={id} title="Agro-weather advisory" hint={reason}>
            <div className="space-y-2">
              {[
                { icon: Sprout, t: "Sowing / field work", d: city.rainProb > 60 ? "Postpone spraying & fertiliser application — rain likely within 24h." : "Favourable window for spraying and sowing today." },
                { icon: Droplets, t: "Irrigation", d: city.rain > 20 ? `Skip irrigation — ${city.rain} mm received.` : "Light irrigation advised for standing crops." },
                { icon: Wind, t: "Wind & drying", d: city.wind > 25 ? "Strong winds — secure nurseries and avoid spraying." : "Winds calm; suitable for harvest drying." },
              ].map((r) => (
                <div key={r.t} className="flex gap-3 rounded-2xl bg-level-normal-soft/70 p-3">
                  <r.icon className="mt-0.5 h-4 w-4 shrink-0 text-level-normal" />
                  <div><p className="text-[12.5px] font-bold">{r.t}</p><p className="text-[11.5px] text-muted-foreground">{r.d}</p></div>
                </div>
              ))}
            </div>
          </Card>
        );
    }
  };

  // Stat tiles pair into a 2-col grid; others full-width
  const small: CardId[] = ["humidity", "wind", "temperature", "aqi"];
  const blocks: React.ReactNode[] = [];
  let buffer: React.ReactNode[] = [];
  const flush = () => {
    if (buffer.length) {
      blocks.push(<div key={"grid" + blocks.length} className="grid grid-cols-2 gap-2.5 md:col-span-1">{buffer}</div>);
      buffer = [];
    }
  };
  cards.forEach((c) => {
    const node = renderCard(c.id, c.reason);
    if (!node) return;
    if (small.includes(c.id)) buffer.push(node);
    else {
      flush();
      blocks.push(node);
    }
  });
  flush();

  return (
    <div className="page-gradient min-h-dvh">
      {/* HERO SECTION: Responsive dynamic atmospheric card */}
      <header className={`${hero} relative overflow-hidden rounded-b-[2.5rem] md:rounded-[2.5rem] md:m-4 px-5 md:px-8 pb-7 pt-[max(env(safe-area-inset-top),1.2rem)] md:pt-8 text-on-hero shadow-float transition-all`}>
        {/* Ambient atmospheric lighting orbs */}
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-on-hero/15 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -left-12 bottom-0 h-48 w-48 rounded-full bg-on-hero/10 blur-2xl" />

        {/* Top Header Bar inside Hero */}
        <div className="relative flex items-center justify-between gap-2">
          <div>
            <p className="text-[12px] font-medium text-on-hero-muted flex items-center gap-1.5">
              {greeting()}{prefs.name ? `, ${prefs.name}` : ""} 👋
              <span className="inline-flex items-center rounded-full bg-on-hero/15 px-2 py-0.5 text-[9.5px] font-bold text-on-hero">
                {apiStatus.isLive ? "🟢 Live API" : "⚡ IMD Shield"}
              </span>
            </p>

            {/* Clickable City Switcher Button */}
            <button
              onClick={() => setCityModalOpen(true)}
              className="group mt-1 flex items-center gap-1.5 rounded-full bg-on-hero/15 hover:bg-on-hero/25 px-3.5 py-1 text-[13.5px] font-bold text-on-hero transition-all border border-on-hero/20 hover:scale-[1.02] shadow-xs"
              title="Click to change city"
            >
              <MapPin className="h-3.5 w-3.5 text-on-hero" />
              <span>{city.name}, {city.state}</span>
              <span className="ml-1 text-[9.5px] bg-on-hero/25 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold group-hover:bg-on-hero/35 transition-colors">
                Change ▾
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
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
              className="glass hidden sm:flex h-10 items-center rounded-full pl-1.5 pr-3 text-[11px] font-bold hover:bg-on-hero/20 transition-all press"
            >
              <span className="mr-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-on-hero/90 text-[12px] shadow-xs">
                {prefs.persona === "student" ? "🎒" : prefs.persona === "farmer" ? "🌾" : prefs.persona === "traveller" ? "✈️" : "🏠"}
              </span>
              <span>{personaLabel(prefs.persona)}</span>
            </Link>
          </div>
        </div>

        {/* Responsive Hero Body: Stacked on mobile, 2-column dashboard on desktop */}
        <div className="relative mt-6 md:mt-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Main Temperature & Animated Weather Icon */}
          <div className="md:col-span-6 flex items-end justify-between">
            <div>
              <div className="flex items-start gap-1">
                <span className="font-display text-[84px] md:text-[92px] font-extrabold leading-[0.82] tracking-tighter">
                  {formatTempValue(city.temp, prefs.tempUnit)}
                </span>
                <div className="mt-1 flex flex-col items-start gap-1">
                  <button
                    onClick={() => update({ tempUnit: prefs.tempUnit === "C" ? "F" : "C" })}
                    title={`Switch to °${prefs.tempUnit === "C" ? "F" : "C"}`}
                    className="rounded-xl bg-on-hero/20 hover:bg-on-hero/35 px-2.5 py-1 font-display text-xs font-bold tracking-tight text-on-hero transition-all border border-on-hero/25 active:scale-95 shadow-xs"
                  >
                    °{prefs.tempUnit} ⇄
                  </button>
                </div>
              </div>

              <p className="mt-2.5 text-base md:text-lg font-bold flex items-center gap-2">
                <span>{CONDITION_LABEL[city.condition]}</span>
                {city.alertLevel !== "normal" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-on-hero/25 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">
                    <ShieldAlert className="h-3 w-3" /> {city.alertLevel}
                  </span>
                )}
              </p>

              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-on-hero-muted font-medium">
                <span>Feels like {formatTemp(city.feels, prefs.tempUnit)}</span>
                <span>·</span>
                <span className="flex items-center gap-1 font-semibold text-on-hero">
                  <span className="text-sun">↑</span> H {formatTemp(daily[0]?.hi ?? city.temp + 4, prefs.tempUnit)}
                  <span className="text-primary-glow">↓</span> L {formatTemp(daily[0]?.lo ?? city.temp - 3, prefs.tempUnit)}
                </span>
              </div>
            </div>

            <div className="animate-float shrink-0">
              <WeatherIcon condition={city.condition} className="h-24 w-24 md:h-32 md:w-32 text-on-hero drop-shadow-[0_12px_24px_rgba(0,0,0,0.3)]" inherit />
            </div>
          </div>

          {/* Today's Summary Glass Card (Right column on desktop) */}
          <div className="md:col-span-6 glass relative rounded-3xl p-4 md:p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-on-hero-muted">Today's Outlook</p>
              <span className="text-[11px] text-on-hero-muted font-semibold">{city.name} Station</span>
            </div>
            <p className="mt-1.5 text-[13px] md:text-[13.5px] font-medium leading-snug">{city.summary}</p>

            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
              {[
                { i: CloudRain, l: "Rain", v: `${city.rainProb}%` },
                { i: Droplets, l: "Humidity", v: `${city.humidity}%` },
                { i: Wind, l: "Wind", v: `${city.wind} km/h` },
                { i: Leaf, l: "AQI", v: `${city.aqi}` },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl bg-on-hero/12 py-2.5 px-1 border border-on-hero/10">
                  <s.i className="mx-auto h-3.5 w-3.5 text-on-hero-muted" />
                  <p className="mt-1 font-display text-[13.5px] font-bold leading-tight">{s.v}</p>
                  <p className="text-[9.5px] text-on-hero-muted font-semibold mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Personalized Indicator */}
      <div className="flex items-center justify-between px-5 pt-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="absolute inset-0 rounded-full bg-primary/30 animate-pulse-ring" />
          </span>
          <div>
            <p className="text-[13px] font-bold text-foreground">Personalized for you</p>
            <p className="text-[11px] text-muted-foreground">
              {personaLabel(prefs.persona)} · {prefs.interests.length} interests · {cards.length - 1} priority cards
            </p>
          </div>
        </div>
        <Link to="/profile" className="press rounded-full bg-secondary hover:bg-secondary/80 px-3.5 py-1.5 text-[11.5px] font-bold text-primary transition-all">
          Customize
        </Link>
      </div>

      {/* Ranked Cards: Responsive grid on desktop, single column on mobile */}
      <div
        key={prefs.persona + prefs.interests.join() + prefs.cityId + prefs.tempUnit}
        className="stagger space-y-3.5 md:space-y-0 md:grid md:grid-cols-2 md:gap-4.5 px-4 pt-3.5 max-w-6xl mx-auto"
      >
        {blocks}
      </div>

      {/* Quick Access Grid */}
      <div className="px-4 pt-6 max-w-6xl mx-auto">
        <SectionTitle title="Quick Explore" hint="Direct access to live features" />
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { to: "/map", l: "Interactive Map", e: "🗺️" },
            { to: "/forecast", l: "7-Day Forecast", e: "📅" },
            { to: "/alerts", l: "Warnings & Alerts", e: "⚠️" },
            { to: "/profile", l: "Settings", e: "⚙️" },
          ].map((q) => (
            <Link
              key={q.l}
              to={q.to}
              className="card-surface press flex flex-col items-center gap-1.5 py-3.5 hover:border-primary/40 transition-all hover:shadow-md"
            >
              <span className="text-2xl">{q.e}</span>
              <span className="text-[11.5px] font-bold text-foreground text-center">{q.l}</span>
            </Link>
          ))}
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
    <section className={`card-surface p-4 hover:border-primary/25 transition-all shadow-card hover:shadow-md ${className}`}>
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-foreground">{title}</h2>
          {hint && (
            <p className="flex items-center gap-1 text-[10.5px] font-medium text-primary">
              <Sparkles className="h-2.5 w-2.5" /> {hint}
            </p>
          )}
        </div>
        {to && (
          <Link to={to} className="flex items-center text-[11.5px] font-bold text-primary hover:underline">
            See all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
