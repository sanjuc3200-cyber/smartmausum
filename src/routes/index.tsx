import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
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
} from "lucide-react";
import { usePrefs } from "@/lib/prefs";
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
  const { prefs, hydrated } = usePrefs();
  const apiStatus = getApiStatus();
  const navigate = useNavigate();

  useEffect(() => {
    if (hydrated && !prefs.onboarded) navigate({ to: "/onboarding" });
  }, [hydrated, prefs.onboarded, navigate]);

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

  const renderCard = (id: CardId, reason: string) => {
    switch (id) {
      case "alerts":
        return (
          <Card key={id} title="Weather alerts" hint={reason} to="/alerts">
            <div className="space-y-2">
              {cityAlerts.length > 0 ? (
                cityAlerts.map((a) => <AlertCard key={a.id} alert={a} cityName={city.name} />)
              ) : (
                <p className="rounded-2xl bg-level-normal-soft p-3 text-[12px] font-semibold text-level-normal">No warning for {city.name}. All clear.</p>
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
          <Card key={id} title="Hourly forecast" hint={reason} to="/forecast">
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
                <p className="text-[13px] font-bold">{city.name}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <WeatherIcon condition={city.condition} className="h-4 w-4" />
                  <span className="font-display text-base font-bold">{city.temp}°</span>
                </div>
              </div>
              <Plane className="h-5 w-5 text-primary" />
              <div className="flex-1 rounded-2xl bg-primary/8 p-3 ring-1 ring-primary/15">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">To</p>
                <p className="text-[13px] font-bold">{dest.name}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <WeatherIcon condition={dest.condition} className="h-4 w-4" />
                  <span className="font-display text-base font-bold">{dest.temp}°</span>
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
          <StatTile key={id} icon={<Thermometer className="h-3.5 w-3.5" />} label="Temperature" value={`${daily[0]?.lo}° / ${daily[0]?.hi}°`} sub={`Feels like ${city.feels}° now`} tone="sun" />
        );
      case "aqi":
        return (
          <StatTile key={id} icon={<Leaf className="h-3.5 w-3.5" />} label="Air quality" value={city.aqi} unit="AQI" sub={aqi.label} tone={city.aqi > 100 ? "sun" : "default"} />
        );
      case "sun":
        return (
          <div key={id} className="card-surface flex items-center justify-between p-3.5">
            <div className="flex items-center gap-2"><Sunrise className="h-4 w-4 text-sun" /><span><span className="block text-[10.5px] text-muted-foreground">Sunrise</span><span className="font-display text-sm font-bold">{city.sunrise}</span></span></div>
            <div className="flex items-center gap-2"><Sunset className="h-4 w-4 text-level-severe" /><span><span className="block text-[10.5px] text-muted-foreground">Sunset</span><span className="font-display text-sm font-bold">{city.sunset}</span></span></div>
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
      blocks.push(<div key={"grid" + blocks.length} className="grid grid-cols-2 gap-2.5">{buffer}</div>);
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
      {/* HERO */}
      <header className={`${hero} relative overflow-hidden rounded-b-[2rem] px-5 pb-6 pt-[max(env(safe-area-inset-top),1rem)] text-on-hero shadow-float`}>
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-on-hero/10 blur-2xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-on-hero/10 blur-2xl" />

        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-[12px] font-medium text-on-hero-muted flex items-center gap-1.5">
              {greeting()}{prefs.name ? `, ${prefs.name}` : ""} 👋
              <span className="inline-flex items-center rounded-full bg-on-hero/15 px-1.5 py-0.2 text-[9px] font-bold text-on-hero">
                {apiStatus.isLive ? "🟢 Live API" : "⚡ IMD Shield"}
              </span>
            </p>
            <Link to="/profile" className="mt-0.5 flex items-center gap-1 text-[15px] font-bold">
              <MapPin className="h-4 w-4" /> {city.name}, {city.state}
              <ChevronRight className="h-3.5 w-3.5 opacity-70" />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/alerts" aria-label="Alerts" className="glass relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-on-hero/20 transition-colors">
              <Bell className="h-4.5 w-4.5" />
              {cityAlerts.length > 0 && <span className={`absolute right-2 top-2 h-2 w-2 rounded-full ${LEVEL_META[cityAlerts[0]!.level].color} ring-2 ring-primary-deep/40 animate-pulse`} />}
            </Link>
            <Link to="/profile" className="glass flex h-10 items-center rounded-full pl-1.5 pr-3 text-[11px] font-bold hover:bg-on-hero/20 transition-all press">
              <span className="mr-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-on-hero/90 text-[12px] shadow-xs">
                {prefs.persona === "student" ? "🎒" : prefs.persona === "farmer" ? "🌾" : prefs.persona === "traveller" ? "✈️" : "🏠"}
              </span>
              <span>{personaLabel(prefs.persona)}</span>
            </Link>
          </div>
        </div>

        <div className="relative mt-6 flex items-end justify-between">
          <div>
            <div className="flex items-start">
              <span className="font-display text-[84px] font-extrabold leading-[0.85] tracking-tighter">{city.temp}</span>
              <span className="mt-2 font-display text-3xl font-bold">°C</span>
            </div>
            <p className="mt-2 text-[15px] font-semibold">{CONDITION_LABEL[city.condition]}</p>
            <p className="text-[12px] text-on-hero-muted">
              Feels like {city.feels}° · H {daily[0]?.hi}° L {daily[0]?.lo}°
            </p>
          </div>
          <div className="animate-float">
            <WeatherIcon condition={city.condition} className="h-24 w-24 text-on-hero drop-shadow-[0_10px_20px_rgba(0,0,0,0.25)]" inherit />
          </div>
        </div>

        <div className="glass relative mt-5 rounded-2xl p-3.5">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-on-hero-muted">Today's summary</p>
          <p className="mt-1 text-[13px] font-medium leading-snug">{city.summary}</p>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            {[
              { i: CloudRain, l: "Rain", v: `${city.rainProb}%` },
              { i: Droplets, l: "Humidity", v: `${city.humidity}%` },
              { i: Wind, l: "Wind", v: `${city.wind}` },
              { i: Leaf, l: "AQI", v: `${city.aqi}` },
            ].map((s) => (
              <div key={s.l} className="rounded-xl bg-on-hero/10 py-2">
                <s.i className="mx-auto h-3.5 w-3.5 text-on-hero-muted" />
                <p className="mt-1 font-display text-[13.5px] font-bold">{s.v}</p>
                <p className="text-[9.5px] text-on-hero-muted">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Personalized indicator */}
      <div className="flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="absolute inset-0 rounded-full bg-primary/30 animate-pulse-ring" />
          </span>
          <div>
            <p className="text-[12.5px] font-bold">Personalized for you</p>
            <p className="text-[10.5px] text-muted-foreground">
              {personaLabel(prefs.persona)} · {prefs.interests.length} interests · {cards.length - 1} cards ranked
            </p>
          </div>
        </div>
        <Link to="/profile" className="press rounded-full bg-secondary px-3 py-1.5 text-[11px] font-bold text-primary">
          Tune
        </Link>
      </div>

      {/* Ranked cards - responsive grid on desktop, single column on mobile */}
      <div key={prefs.persona + prefs.interests.join() + prefs.cityId} className="stagger space-y-3.5 md:space-y-0 md:grid md:grid-cols-2 md:gap-4 px-4 pt-3.5">
        {blocks}
      </div>

      {/* Quick access */}
      <div className="px-4 pt-5">
        <SectionTitle title="Quick access" />
        <div className="grid grid-cols-4 gap-2">
          {[
            { to: "/map", l: "Map", e: "🗺️" },
            { to: "/forecast", l: "Forecast", e: "📅" },
            { to: "/alerts", l: "Alerts", e: "⚠️" },
            { to: "/profile", l: "Prefs", e: "⚙️" },
          ].map((q) => (
            <Link key={q.l} to={q.to} className="card-surface press flex flex-col items-center gap-1.5 py-3">
              <span className="text-xl">{q.e}</span>
              <span className="text-[11px] font-bold">{q.l}</span>
            </Link>
          ))}
        </div>
      </div>
      <TrustNote />
    </div>
  );
}

function Card({ title, hint, to, children }: { title: string; hint?: string; to?: "/alerts" | "/forecast" | "/map"; children: React.ReactNode }) {
  return (
    <section className="card-surface p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="text-[15px] font-bold">{title}</h2>
          {hint && (
            <p className="flex items-center gap-1 text-[10.5px] font-medium text-primary">
              <Sparkles className="h-2.5 w-2.5" /> {hint}
            </p>
          )}
        </div>
        {to && (
          <Link to={to} className="flex items-center text-[11.5px] font-bold text-primary">
            See all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
