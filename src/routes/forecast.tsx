import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronDown, Droplets, Wind } from "lucide-react";
import { usePrefs } from "@/lib/prefs";
import { CITIES, CONDITION_LABEL, dailyFor, getCity, hourlyFor } from "@/lib/weather-data";
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

function ForecastPage() {
  const { prefs } = usePrefs();
  const [cityId, setCityId] = useState(prefs.cityId);
  const [tab, setTab] = useState<"hourly" | "daily">("hourly");
  const city = getCity(cityId);
  const hourly = useMemo(() => hourlyFor(city), [city]);
  const daily = useMemo(() => dailyFor(city), [city]);
  const maxT = Math.max(...hourly.map((h) => h.temp));
  const minT = Math.min(...hourly.map((h) => h.temp));

  return (
    <div className="page-gradient min-h-dvh px-4 pt-[max(env(safe-area-inset-top),1rem)]">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold">Forecast</h1>
        <label className="relative">
          <select
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
            className="appearance-none rounded-full bg-card py-2 pl-3.5 pr-8 text-[12.5px] font-bold shadow-card outline-none"
            aria-label="Choose city"
          >
            {CITIES.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </label>
      </div>

      <div key={city.id} className="card-surface mt-4 flex items-center justify-between p-4 animate-fade-in">
        <div>
          <p className="text-[12px] text-muted-foreground">{city.state}</p>
          <p className="font-display text-[40px] font-extrabold leading-none">{city.temp}°</p>
          <p className="text-[12.5px] font-semibold">{CONDITION_LABEL[city.condition]}</p>
        </div>
        <WeatherIcon condition={city.condition} className="h-14 w-14" />
      </div>

      <div className="mt-4 flex rounded-full bg-secondary p-1">
        {(["hourly", "daily"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full py-2 text-[12.5px] font-bold transition-all ${tab === t ? "bg-card text-primary shadow-card" : "text-muted-foreground"}`}
          >
            {t === "hourly" ? "Hourly" : "7-Day"}
          </button>
        ))}
      </div>

      {tab === "hourly" ? (
        <div key="h" className="mt-4 space-y-4 animate-fade-in">
          <div>
            <SectionTitle title="Next 24 hours" hint={`High ${maxT}° · Low ${minT}°`} />
            <HourlyStrip hours={hourly} />
          </div>
          <div className="card-surface p-4">
            <SectionTitle title="Temperature curve" />
            <svg viewBox="0 0 240 70" className="h-20 w-full">
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
                    <path d={d} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
                    {pts.filter((_, i) => i % 4 === 0).map((p, i) => (
                      <g key={i}>
                        <circle cx={p[0]} cy={p[1]} r="2.5" fill="var(--card)" stroke="var(--primary)" strokeWidth="2" />
                        <text x={p[0]} y={p[1] - 6} textAnchor="middle" fontSize="7" fontWeight="700" fill="var(--foreground)">{hourly[i * 4]?.temp}°</text>
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
          <div className="card-surface p-4">
            <SectionTitle title="Rain & wind by hour" />
            <div className="space-y-1.5">
              {hourly.filter((_, i) => i % 3 === 0).map((h) => (
                <div key={h.label} className="flex items-center gap-2 text-[11.5px]">
                  <span className="w-12 font-semibold text-muted-foreground">{h.label}</span>
                  <Droplets className="h-3 w-3 text-rain" />
                  <div className="h-2 flex-1 rounded-full bg-secondary"><div className="h-full rounded-full bg-rain" style={{ width: `${h.rainProb}%` }} /></div>
                  <span className="w-8 text-right font-bold">{h.rainProb}%</span>
                  <Wind className="ml-1 h-3 w-3 text-wind" />
                  <span className="w-12 text-right font-semibold">{h.wind} km/h</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div key="d" className="mt-4 space-y-4 animate-fade-in">
          <div className="card-surface px-4 py-2">
            <SectionTitle title="7-day outlook" hint="Temperature range & rain chance" />
            <DailyList days={daily} />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {daily.slice(0, 4).map((d) => (
              <div key={d.label} className="card-surface p-3.5">
                <p className="text-[12px] font-bold">{d.label}</p>
                <p className="text-[10.5px] text-muted-foreground">{d.date} · {CONDITION_LABEL[d.condition]}</p>
                <div className="mt-2 grid grid-cols-2 gap-1 text-[11px]">
                  <span className="text-muted-foreground">Rain</span><span className="font-bold">{d.rain} mm</span>
                  <span className="text-muted-foreground">Humidity</span><span className="font-bold">{d.humidity}%</span>
                  <span className="text-muted-foreground">Wind</span><span className="font-bold">{d.wind} km/h</span>
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
