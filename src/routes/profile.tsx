import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronDown,
  MapPin,
  Sparkles,
  Plane,
  RotateCcw,
  BellRing,
  CloudLightning,
} from "lucide-react";
import { CITIES } from "@/lib/weather-data";
import { INTERESTS, PERSONAS, PERSONA_DEFAULT_INTERESTS, usePrefs } from "@/lib/prefs";
import { rankCards } from "@/lib/personalization";
import { TrustNote } from "@/components/weather/Widgets";
import { getApiStatus } from "@/lib/weather-api";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Preferences — IMD MAUSAM" },
      {
        name: "description",
        content: "Set your location, persona, weather interests and notifications to personalize your MAUSAM homepage.",
      },
      { property: "og:title", content: "Profile & Preferences — IMD MAUSAM" },
      { property: "og:description", content: "Set your location, persona, weather interests and notifications." },
    ],
  }),
  component: ProfilePage,
});

const CARD_NAMES: Record<string, string> = {
  alerts: "Alerts",
  current: "Current weather",
  rain: "Rainfall",
  hourly: "Hourly",
  daily: "7-day",
  travel: "Travel",
  humidity: "Humidity",
  wind: "Wind",
  agri: "Agro advisory",
  aqi: "Air quality",
  temperature: "Temperature",
  sun: "Sunrise/Sunset",
};

function ProfilePage() {
  const { prefs, update, toggleInterest, reset } = usePrefs();
  const ranked = rankCards(prefs);
  const apiStatus = getApiStatus();

  return (
    <div className="page-gradient min-h-dvh px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-12">
      {/* Fresh Profile Header */}
      <div className="flex items-center gap-3.5">
        <span className="flex h-13 w-13 items-center justify-center rounded-2xl hero-gradient text-2xl shadow-glow">
          {PERSONAS.find((p) => p.id === prefs.persona)?.emoji || "🌤️"}
        </span>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl font-extrabold leading-tight truncate">
            {prefs.name || "Your Profile"}
          </h1>
          <p className="text-[12px] text-muted-foreground">
            Preferences & persona drive your personalized weather dashboard
          </p>
        </div>
      </div>

      <div className="stagger mt-5 space-y-4">
        {/* Name & location */}
        <section className="card-surface p-4">
          <h2 className="text-[14px] font-bold">Location & Profile</h2>
          <input
            value={prefs.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="Your name"
            className="mt-3 w-full rounded-xl bg-secondary px-3.5 py-2.5 text-[13px] font-medium outline-none ring-primary/30 focus:ring-2"
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Select
              icon={<MapPin className="h-3.5 w-3.5" />}
              label="Home city"
              value={prefs.cityId}
              onChange={(v) => update({ cityId: v })}
            />
            <Select
              icon={<Plane className="h-3.5 w-3.5" />}
              label="Destination"
              value={prefs.destinationId}
              onChange={(v) => update({ destinationId: v })}
            />
          </div>
        </section>

        {/* Temperature Unit */}
        <section className="card-surface p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-bold">Temperature Unit</h2>
              <p className="text-[11px] text-muted-foreground">Select Celsius or Fahrenheit across all dashboards</p>
            </div>
            <div className="flex rounded-xl bg-secondary p-1 border border-border/60 self-start sm:self-auto">
              <button
                onClick={() => update({ tempUnit: "C" })}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  prefs.tempUnit !== "F" ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                °C (Celsius)
              </button>
              <button
                onClick={() => update({ tempUnit: "F" })}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  prefs.tempUnit === "F" ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                °F (Fahrenheit)
              </button>
            </div>
          </div>
        </section>

        {/* Persona */}
        <section className="card-surface p-4">
          <h2 className="text-[14px] font-bold">I am a…</h2>
          <p className="text-[11px] text-muted-foreground">Switch persona to see the homepage re-rank instantly</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {PERSONAS.map((p) => (
              <button
                key={p.id}
                onClick={() => update({ persona: p.id, interests: PERSONA_DEFAULT_INTERESTS[p.id] })}
                className={`press flex items-center gap-2.5 rounded-2xl border p-3 text-left transition-all ${
                  prefs.persona === p.id ? "border-primary bg-primary/8 shadow-glow" : "border-border bg-card"
                }`}
              >
                <span className="text-2xl">{p.emoji}</span>
                <span>
                  <span className="block text-[13px] font-bold">{p.label}</span>
                  <span className="block text-[10px] leading-tight text-muted-foreground">{p.blurb}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Weather Interests */}
        <section className="card-surface p-4">
          <h2 className="text-[14px] font-bold">Weather interests</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {INTERESTS.map((i) => {
              const on = prefs.interests.includes(i.id);
              return (
                <button
                  key={i.id}
                  onClick={() => toggleInterest(i.id)}
                  className={`press rounded-full px-3 py-2 text-[12px] font-bold transition-all ${
                    on ? "bg-primary text-primary-foreground shadow-glow" : "bg-secondary text-foreground"
                  }`}
                >
                  {i.emoji} {i.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Live preview of ranking */}
        <section className="rounded-2xl bg-primary-deep p-4 text-on-hero">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary-glow" />
            <h2 className="text-[14px] font-bold">Your homepage order</h2>
          </div>
          <p className="text-[11px] text-on-hero-muted">Live preview — updates as you change preferences</p>
          <ol className="mt-3 flex flex-wrap gap-1.5">
            {ranked.map((c, i) => (
              <li
                key={c.id}
                className="flex items-center gap-1.5 rounded-full bg-on-hero/12 py-1 pl-1 pr-2.5 text-[11px] font-semibold"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-glow text-[10px] font-extrabold text-primary-deep">
                  {i + 1}
                </span>
                {CARD_NAMES[c.id]}
              </li>
            ))}
          </ol>
          <Link
            to="/"
            className="press mt-3 inline-flex rounded-full bg-on-hero px-4 py-2 text-[12px] font-bold text-primary-deep"
          >
            View personalized home
          </Link>
        </section>

        {/* Live Weather API Status & Keys */}
        <section className="card-surface p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CloudLightning className="h-4 w-4 text-primary" />
              <h2 className="text-[14px] font-bold">Live Weather API Connection</h2>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${
                apiStatus.isLive
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {apiStatus.isLive ? `🟢 Live (${apiStatus.provider})` : "⚡ Built-in IMD Mode"}
            </span>
          </div>
          <p className="mt-2 text-[12px] text-muted-foreground leading-relaxed">
            Active Provider: <strong className="text-foreground font-semibold">{apiStatus.provider}</strong>.
            Add your free API key into <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px]">.env</code> to stream real-time weather reports for any city!
          </p>
          <div className="mt-2.5 rounded-xl bg-secondary/60 p-2.5 text-[11.5px] space-y-1 text-muted-foreground">
            <div className="font-semibold text-foreground">Recommended Free API Keys:</div>
            <div>• <strong>OpenWeatherMap</strong>: 1,000 free calls/day (Current + 5-day forecast)</div>
            <div>• <strong>WeatherAPI.com</strong>: 1,000,000 free calls/month (Current + AQI + Forecast)</div>
          </div>
        </section>

        {/* Notifications */}
        <section className="card-surface p-4">
          <div className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-primary" />
            <h2 className="text-[14px] font-bold">Notifications</h2>
          </div>
          <div className="mt-2 divide-y divide-border/70">
            {(
              [
                ["severe", "Severe weather alerts", "Orange & red warnings, instantly"],
                ["daily", "Daily morning briefing", "7 AM summary for your city"],
                ["rain", "Rain starting soon", "Nowcast alerts before rain"],
                ["agri", "Agro-advisories", "Sowing, spraying & irrigation tips"],
              ] as const
            ).map(([k, t, d]) => (
              <label key={k} className="flex items-center justify-between py-3">
                <span>
                  <span className="block text-[13px] font-semibold">{t}</span>
                  <span className="block text-[11px] text-muted-foreground">{d}</span>
                </span>
                <button
                  role="switch"
                  aria-checked={prefs.notifications[k]}
                  onClick={() => update({ notifications: { ...prefs.notifications, [k]: !prefs.notifications[k] } })}
                  className={`relative h-7 w-12 rounded-full transition-colors ${
                    prefs.notifications[k] ? "bg-primary" : "bg-border"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-card shadow transition-all ${
                      prefs.notifications[k] ? "left-[calc(100%-1.625rem)]" : "left-0.5"
                    }`}
                  />
                </button>
              </label>
            ))}
          </div>
        </section>

        {/* Reset */}
        <button
          onClick={() => {
            reset();
          }}
          className="press flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-[12.5px] font-bold text-muted-foreground hover:bg-secondary transition-colors"
        >
          <RotateCcw className="h-4 w-4" /> Restart onboarding demo
        </button>
      </div>

      <TrustNote />
    </div>
  );
}

function Select({
  icon,
  label,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="relative block rounded-xl bg-secondary px-3 py-2">
      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-transparent pr-5 text-[13px] font-bold outline-none"
      >
        {CITIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute bottom-2.5 right-2.5 h-4 w-4 text-muted-foreground" />
    </label>
  );
}
