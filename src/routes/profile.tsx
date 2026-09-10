import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ChevronDown,
  MapPin,
  Sparkles,
  Plane,
  RotateCcw,
  BellRing,
  CloudLightning,
  Settings2,
  LogIn,
  LogOut,
  Phone,
  Mail,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { CITIES } from "@/lib/weather-data";
import { INTERESTS, PERSONAS, PERSONA_DEFAULT_INTERESTS, usePrefs } from "@/lib/prefs";
import { rankCards } from "@/lib/personalization";
import { TrustNote } from "@/components/weather/Widgets";
import { getApiStatus } from "@/lib/weather-api";
import { AuthModal } from "@/components/auth/AuthModal";

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
  const { prefs, update, toggleInterest, reset, logout } = usePrefs();
  const [authModalOpen, setAuthModalOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("login") !== null;
    }
    return false;
  });
  const [authDefaultMode, setAuthDefaultMode] = useState<"phone" | "email">(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("mode") === "email" ? "email" : "phone";
    }
    return "phone";
  });
  const ranked = rankCards(prefs);
  const apiStatus = getApiStatus();

  return (
    <div className="min-h-dvh py-6 max-w-7xl mx-auto">
      {/* Desktop Profile Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl hero-gradient text-3xl shadow-glow text-on-hero">
            {PERSONAS.find((p) => p.id === prefs.persona)?.emoji || "🌤️"}
          </span>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold text-foreground">
              {prefs.name ? `${prefs.name}'s Weather Settings` : "Settings & Personalization"}
            </h1>
            <p className="text-[13px] text-muted-foreground">
              Configure your observation station, interests, temperature units, and alerts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {prefs.auth?.isLoggedIn ? (
            <button
              onClick={() => {
                setAuthDefaultMode(prefs.auth?.type || "phone");
                setAuthModalOpen(true);
              }}
              className="press inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-4 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 transition-all shadow-xs"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>{prefs.auth.identifier}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setAuthDefaultMode("phone");
                setAuthModalOpen(true);
              }}
              className="press inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground shadow-glow hover:opacity-95 transition-all"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Log In</span>
            </button>
          )}

          <Link
            to="/"
            className="press inline-flex items-center gap-1.5 rounded-full bg-secondary hover:bg-secondary/80 border border-border/80 px-4 py-2 text-xs font-bold text-foreground transition-all shadow-xs"
          >
            <span>Dashboard</span> →
          </Link>
        </div>
      </div>

      {/* ACCOUNT & AUTHENTICATION CARD */}
      <div className="mt-6">
        <section className="card-surface p-5 sm:p-6 shadow-card border border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-sky-500/5">
          {prefs.auth?.isLoggedIn ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-xs">
                  <UserCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-foreground">{prefs.auth.name || prefs.name}</h2>
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10.5px] font-extrabold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      <ShieldCheck className="h-3 w-3 text-emerald-500" /> Verified Citizen Account
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Logged in via {prefs.auth.type === "phone" ? "Mobile Number" : "Email"}:{" "}
                    <strong className="text-foreground font-mono">{prefs.auth.identifier}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAuthDefaultMode(prefs.auth?.type || "phone");
                    setAuthModalOpen(true);
                  }}
                  className="press px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border/70 text-xs font-bold text-foreground transition-all"
                >
                  Switch Account
                </button>
                <button
                  onClick={logout}
                  className="press flex items-center gap-1.5 px-4 py-2 rounded-xl bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 text-xs font-bold text-destructive transition-all"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Mausam Citizen Account</span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground">
                    Sign In to Save Preferences & Sync Weather Alerts
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-2xl">
                    Log in with your <strong>Mobile Number</strong> or <strong>Email Address</strong> to receive personalized severe storm bulletins, SMS nowcasting alerts, and cloud sync across your devices.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    setAuthDefaultMode("phone");
                    setAuthModalOpen(true);
                  }}
                  className="press flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground shadow-glow hover:opacity-95 transition-all"
                >
                  <Phone className="h-4 w-4" />
                  <span>Login with Mobile Number</span>
                </button>

                <button
                  onClick={() => {
                    setAuthDefaultMode("email");
                    setAuthModalOpen(true);
                  }}
                  className="press flex items-center gap-2 rounded-2xl bg-card hover:bg-secondary/80 border border-border px-4 py-2.5 text-xs font-bold text-foreground transition-all shadow-xs"
                >
                  <Mail className="h-4 w-4 text-primary" />
                  <span>Login with Email Address</span>
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* 2-Column Desktop Grid (Left: Identity & Units / Right: Interests & API) */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Name & location */}
          <section className="card-surface p-5 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-primary" />
              <h2 className="text-base font-bold text-foreground">Location & Station Preferences</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Set your primary station and default travel destination</p>

            <label className="block text-xs font-semibold text-muted-foreground mb-1">Your Name</label>
            <input
              value={prefs.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="Your name (e.g. Vandana)"
              className="w-full rounded-xl bg-secondary px-4 py-2.5 text-[13.5px] font-medium outline-none ring-primary/30 focus:ring-2 border border-border/60"
            />

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                icon={<MapPin className="h-4 w-4 text-primary" />}
                label="Home Station"
                value={prefs.cityId}
                onChange={(v) => update({ cityId: v })}
              />
              <Select
                icon={<Plane className="h-4 w-4 text-primary" />}
                label="Travel Destination"
                value={prefs.destinationId}
                onChange={(v) => update({ destinationId: v })}
              />
            </div>
          </section>

          {/* Temperature Unit */}
          <section className="card-surface p-5 shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-foreground">Temperature Measurement Unit</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Applies across all charts, hourly curves, and tiles</p>
              </div>
              <div className="flex rounded-xl bg-secondary p-1 border border-border/60 shrink-0">
                <button
                  onClick={() => update({ tempUnit: "C" })}
                  className={`rounded-lg px-4 py-2 text-xs font-extrabold transition-all ${
                    prefs.tempUnit !== "F"
                      ? "bg-card text-primary shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  °C (Celsius)
                </button>
                <button
                  onClick={() => update({ tempUnit: "F" })}
                  className={`rounded-lg px-4 py-2 text-xs font-extrabold transition-all ${
                    prefs.tempUnit === "F"
                      ? "bg-card text-primary shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  °F (Fahrenheit)
                </button>
              </div>
            </div>
          </section>

          {/* Persona */}
          <section className="card-surface p-5 shadow-card">
            <h2 className="text-base font-bold text-foreground">User Persona Archetype</h2>
            <p className="text-xs text-muted-foreground mt-0.5 mb-4">
              Select your persona to automatically prioritize modules on the home dashboard
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => update({ persona: p.id, interests: PERSONA_DEFAULT_INTERESTS[p.id] })}
                  className={`press flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                    prefs.persona === p.id
                      ? "border-primary bg-primary/8 shadow-glow"
                      : "border-border/70 bg-card hover:bg-secondary/40"
                  }`}
                >
                  <span className="text-2xl">{p.emoji}</span>
                  <div>
                    <span className="block text-[13.5px] font-bold text-foreground">{p.label}</span>
                    <span className="block text-[11px] text-muted-foreground mt-0.5">{p.blurb}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Notifications */}
          <section className="card-surface p-5 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <BellRing className="h-4 w-4 text-primary" />
              <h2 className="text-base font-bold text-foreground">Notification Dispatchers</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Choose which meteorological events you want alerts for</p>
            <div className="divide-y divide-border/60">
              {(
                [
                  ["severe", "Severe Weather Warnings", "Orange & red IMD warnings immediately"],
                  ["daily", "Daily Morning Forecast", "7:00 AM summary briefing"],
                  ["rain", "Precipitation Nowcasting", "Alerts 30 mins before rain starts"],
                  ["agri", "Agro-Meteorological Alerts", "Sowing, spraying & crop harvest guidance"],
                ] as const
              ).map(([k, t, d]) => (
                <label key={k} className="flex items-center justify-between py-3 cursor-pointer">
                  <span>
                    <span className="block text-[13px] font-bold text-foreground">{t}</span>
                    <span className="block text-[11px] text-muted-foreground">{d}</span>
                  </span>
                  <button
                    role="switch"
                    aria-checked={prefs.notifications[k]}
                    onClick={() => update({ notifications: { ...prefs.notifications, [k]: !prefs.notifications[k] } })}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      prefs.notifications[k] ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`block h-5 w-5 rounded-full bg-white transition-transform ${
                        prefs.notifications[k] ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Weather Interests */}
          <section className="card-surface p-5 shadow-card">
            <h2 className="text-base font-bold text-foreground">Weather Topic Interests</h2>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">
              Click tags to toggle modules on your dashboard
            </p>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => {
                const on = prefs.interests.includes(i.id);
                return (
                  <button
                    key={i.id}
                    onClick={() => toggleInterest(i.id)}
                    className={`press rounded-full px-3.5 py-2 text-xs font-bold transition-all ${
                      on
                        ? "bg-primary text-primary-foreground shadow-glow"
                        : "bg-secondary text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {i.emoji} {i.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Live Preview of Ranking */}
          <section className="rounded-3xl bg-primary-deep p-6 text-on-hero shadow-float">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary-glow" />
              <h2 className="text-base font-bold">Your Personalized Feed Priority</h2>
            </div>
            <p className="text-xs text-on-hero-muted mt-1">
              Dynamic rank computed in real-time based on your persona & selected interests:
            </p>
            <ol className="mt-4 flex flex-wrap gap-2">
              {ranked.map((c, i) => (
                <li
                  key={c.id}
                  className="flex items-center gap-2 rounded-full bg-on-hero/15 py-1.5 pl-1.5 pr-3 text-xs font-bold"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-glow text-[10px] font-black text-primary-deep">
                    {i + 1}
                  </span>
                  {CARD_NAMES[c.id]}
                </li>
              ))}
            </ol>
            <Link
              to="/"
              className="press mt-5 inline-flex items-center gap-1.5 rounded-full bg-on-hero px-5 py-2.5 text-xs font-extrabold text-primary-deep shadow-md hover:opacity-90"
            >
              Open Tailored Dashboard →
            </Link>
          </section>

          {/* Live Weather API Status & Keys */}
          <section className="card-surface p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CloudLightning className="h-4 w-4 text-primary" />
                <h2 className="text-base font-bold text-foreground">API Data Stream Engine</h2>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  apiStatus.isLive
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {apiStatus.isLive ? `🟢 Live (${apiStatus.provider})` : "⚡ Official IMD Shield"}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Provider Engine: <strong className="text-foreground">{apiStatus.provider}</strong>.
              Connect free API keys into your <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px]">.env</code> file anytime to query live weather data worldwide.
            </p>
            <div className="mt-3 rounded-2xl bg-secondary/60 p-3 text-xs space-y-1.5 text-muted-foreground border border-border/50">
              <div className="font-bold text-foreground">Supported Providers:</div>
              <div>• <strong>OpenWeatherMap</strong>: 1,000 free calls/day</div>
              <div>• <strong>WeatherAPI.com</strong>: 1,000,000 free calls/month</div>
            </div>
          </section>

          {/* Reset Action */}
          <div className="pt-2">
            <button
              onClick={reset}
              className="press flex items-center justify-center gap-2 w-full rounded-2xl border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 py-3 text-xs font-bold text-destructive transition-colors"
            >
              <RotateCcw className="h-4 w-4" /> Reset All Preferences to Factory Defaults
            </button>
          </div>
        </div>
      </div>

      <TrustNote />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authDefaultMode}
      />
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
    <div className="rounded-xl bg-secondary/80 p-3 border border-border/60">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
        {icon}
        <span>{label}</span>
      </div>
      <div className="relative mt-1.5">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-transparent text-[13.5px] font-bold text-foreground outline-none pr-6 cursor-pointer"
        >
          {CITIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.state})
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  );
}
