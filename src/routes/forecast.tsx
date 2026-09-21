import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronDown, Droplets, Wind, MapPin, Sparkles } from "lucide-react";
import { usePrefs, formatTemp } from "@/lib/prefs";
import { CITIES, CONDITION_LABEL, dailyFor, getCity, hourlyFor, getAllCities } from "@/lib/weather-data";
import { useLocationWeather, useLocationForecast } from "@/lib/weather-api";
import { WeatherIcon } from "@/components/WeatherIcon";
import { DailyList, HourlyStrip, SectionTitle, TrustNote } from "@/components/weather/Widgets";

export const Route = createFileRoute("/forecast")({
  head: () => ({
    meta: [
      { title: "Hourly & 7-Day Forecast — IMD MAUSAM" },
      { name: "description", content: "Detailed hourly and 7-day IMD forecasts with rain probability, temperature and wind." },
      { property: "og:title", content: "Hourly & 7-Day Forecast — IMD MAUSAM" },
      { property: "og:description", content: "Detailed hourly and 7-day IMD forecasts with rain probability, temperature and wind." },
    ],
  }),
  component: ForecastPage,
});

const POPULAR_CITIES = ["hyderabad", "delhi", "mumbai", "bengaluru", "chennai", "kolkata", "jaipur"];

function ForecastPage() {
  const { prefs, update } = usePrefs();
  const [tab, setTab] = useState<"hourly" | "daily">("hourly");
  const activeLoc = prefs.activeLocation;

  const { data: liveCity } = useLocationWeather(activeLoc);
  const { data: liveForecast } = useLocationForecast(activeLoc);

  const city = liveCity ?? getCity(activeLoc.id);
  const hourly = useMemo(() => liveForecast?.hourly ?? hourlyFor(city), [liveForecast, city]);
  const daily = useMemo(() => liveForecast?.daily ?? dailyFor(city), [liveForecast, city]);
  const maxT = Math.max(...hourly.map((h) => h.temp));
  const minT = Math.min(...hourly.map((h) => h.temp));
  const allCities = useMemo(() => getAllCities(), []);

  const handleSelectCity = (id: string) => {
    const c = getCity(id);
    if (c) {
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
    }
  };

  return (
    <div className="page-gradient min-h-dvh px-4 pt-[max(env(safe-area-inset-top),1rem)] max-w-6xl mx-auto pb-12">
      {/* Header & City Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-foreground">Forecast Intelligence</h1>
          <p className="text-[12px] text-muted-foreground">High-precision hourly predictions and 7-day outlook</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="relative">
            <select
              value={activeLoc.id}
              onChange={(e) => handleSelectCity(e.target.value)}
              className="appearance-none rounded-full bg-card py-2 pl-3.5 pr-8 text-[12.5px] font-bold shadow-card border border-border/80 outline-none hover:border-primary/40 transition-colors cursor-pointer"
              aria-label="Choose city"
            >
              {!allCities.some((c) => c.id === activeLoc.id) && (
                <option value={activeLoc.id}>{activeLoc.name} ({activeLoc.state || "Custom"})</option>
              )}
              {allCities.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.state})</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </label>
        </div>
      </div>

      {/* Quick City Filter Chips */}
      <div className="hide-scroll mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider pr-1 flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-primary" /> Cities:
        </span>
        {POPULAR_CITIES.map((id) => {
          const c = getCity(id);
          const isSelected = activeLoc.id === id;
          return (
            <button
              key={id}
              onClick={() => handleSelectCity(id)}
              className={`shrink-0 rounded-full px-3 py-1 text-[11.5px] font-bold transition-all ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.name}
            </button>
          );
        })}
      </div>

      {/* City Hero Overview Card */}
      <div key={city.id} className="card-surface mt-4 flex items-center justify-between p-5 animate-fade-in shadow-card">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span>{city.name}, {city.state}</span>
          </div>
          <p className="font-display text-[42px] font-extrabold leading-none mt-1 text-foreground">
            {formatTemp(city.temp, prefs.tempUnit)}
          </p>
          <p className="text-[13px] font-bold text-foreground mt-1">{CONDITION_LABEL[city.condition]}</p>
          <p className="text-[11.5px] text-muted-foreground">
            Feels like {formatTemp(city.feels, prefs.tempUnit)} · Humidity {city.humidity}% · Wind {city.wind} km/h
          </p>
        </div>
        <div className="animate-float">
          <WeatherIcon condition={city.condition} isNight={city.isNight ?? false} className="h-16 w-16 text-primary drop-shadow-md" />
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="mt-4 flex rounded-2xl bg-secondary/80 p-1 border border-border/60 max-w-md mx-auto">
        {(["hourly", "daily"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl py-2 text-[13px] font-bold transition-all ${
              tab === t ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "hourly" ? "24-Hour Timeline" : "7-Day Extended Outlook"}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "hourly" ? (
        <div key="h" className="mt-5 space-y-4 animate-fade-in">
          <div className="card-surface p-4 shadow-card">
            <SectionTitle
              title="Next 24 Hours Breakdown"
              hint={`Peak ${formatTemp(maxT, prefs.tempUnit)} · Low ${formatTemp(minT, prefs.tempUnit)}`}
            />
            <HourlyStrip hours={hourly} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Temperature Curve */}
            <div className="card-surface p-4 shadow-card">
              <SectionTitle title="Temperature Curve" hint="Continuous thermal profile" />
              <svg viewBox="0 0 240 70" className="h-28 w-full mt-2">
                <defs>
                  <linearGradient id="tg" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {(() => {
                  const pts = hourly.map((h, i) => [i * 10 + 5, 60 - ((h.temp - minT) / Math.max(1, maxT - minT)) * 45] as const);
                  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
                  return (
                    <>
                      <path d={`${d} L235,70 L5,70 Z`} fill="url(#tg)" />
                      <path d={d} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />
                      {pts.filter((_, i) => i % 4 === 0).map((p, i) => (
                        <g key={i}>
                          <circle cx={p[0]} cy={p[1]} r="3" fill="var(--card)" stroke="var(--primary)" strokeWidth="2" />
                          <text x={p[0]} y={p[1] - 7} textAnchor="middle" fontSize="7.5" fontWeight="700" fill="var(--foreground)">
                            {formatTemp(hourly[i * 4]?.temp ?? 0, prefs.tempUnit)}
                          </text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>

            {/* Rain & Wind by Hour */}
            <div className="card-surface p-4 shadow-card">
              <SectionTitle title="Precipitation & Wind Dynamics" hint="Every 3 hours" />
              <div className="space-y-2 mt-2">
                {hourly.filter((_, i) => i % 3 === 0).map((h) => (
                  <div key={h.label} className="flex items-center gap-2.5 text-[12px] hover:bg-secondary/40 px-2 py-1 rounded-xl transition-colors">
                    <span className="w-14 font-bold text-muted-foreground">{h.label}</span>
                    <Droplets className="h-3.5 w-3.5 text-rain" />
                    <div className="h-2 flex-1 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full bg-rain transition-all" style={{ width: `${h.rainProb}%` }} />
                    </div>
                    <span className="w-9 text-right font-bold text-foreground">{h.rainProb}%</span>
                    <Wind className="ml-1 h-3.5 w-3.5 text-wind" />
                    <span className="w-14 text-right font-semibold text-muted-foreground">{h.wind} km/h</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div key="d" className="mt-5 space-y-4 animate-fade-in">
          <div className="card-surface px-5 py-3 shadow-card">
            <SectionTitle title="7-Day Synoptic Outlook" hint="Temperature range & rain chance" />
            <DailyList days={daily} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {daily.slice(0, 4).map((d) => (
              <div key={d.label} className="card-surface p-4 hover:border-primary/30 transition-all shadow-card">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-bold text-foreground">{d.label}</p>
                  <WeatherIcon condition={d.condition} className="h-4.5 w-4.5" />
                </div>
                <p className="text-[10.5px] text-muted-foreground mt-0.5">{d.date} · {CONDITION_LABEL[d.condition]}</p>
                <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11.5px]">
                  <span className="text-muted-foreground">Rain</span>
                  <span className="font-bold text-foreground text-right">{d.rain} mm</span>
                  <span className="text-muted-foreground">Humidity</span>
                  <span className="font-bold text-foreground text-right">{d.humidity}%</span>
                  <span className="text-muted-foreground">Wind</span>
                  <span className="font-bold text-foreground text-right">{d.wind} km/h</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <TrustNote />
    </div>
  );
}
