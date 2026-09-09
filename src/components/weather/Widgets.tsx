import { Link } from "@tanstack/react-router";
import { ChevronRight, Droplets, AlertTriangle, CloudRain, Zap, Tornado, Thermometer, Waves, Wind } from "lucide-react";
import type { ReactNode } from "react";
import { WeatherIcon } from "@/components/WeatherIcon";
import {
  LEVEL_META,
  type AlertType,
  type DayPoint,
  type HourPoint,
  type WeatherAlert,
} from "@/lib/weather-data";

/* ---------- Section header ---------- */
export function SectionTitle({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-end justify-between px-1">
      <div>
        <h2 className="text-[15px] font-bold text-foreground">{title}</h2>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- Hourly strip ---------- */
export function HourlyStrip({ hours, compact = false }: { hours: HourPoint[]; compact?: boolean }) {
  return (
    <div className="hide-scroll -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
      {hours.slice(0, compact ? 12 : 24).map((h, i) => (
        <div
          key={h.label + i}
          className={`flex w-[62px] shrink-0 snap-start flex-col items-center gap-1.5 rounded-2xl py-3 transition-colors ${
            i === 0 ? "bg-primary text-primary-foreground shadow-glow" : "bg-secondary/70 text-foreground"
          }`}
        >
          <span className={`text-[11px] font-semibold ${i === 0 ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
            {h.label}
          </span>
          <WeatherIcon condition={h.condition} className="h-5 w-5" inherit={i === 0} />
          <span className="font-display text-sm font-bold">{h.temp}°</span>
          <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${i === 0 ? "text-primary-foreground/85" : "text-rain"}`}>
            <Droplets className="h-2.5 w-2.5" />
            {h.rainProb}%
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- 7-day list ---------- */
export function DailyList({ days, limit = 7 }: { days: DayPoint[]; limit?: number }) {
  const min = Math.min(...days.map((d) => d.lo));
  const max = Math.max(...days.map((d) => d.hi));
  const span = Math.max(1, max - min);
  return (
    <div className="divide-y divide-border/70">
      {days.slice(0, limit).map((d) => (
        <div key={d.label} className="flex items-center gap-3 py-2.5">
          <div className="w-[76px]">
            <p className="text-[13px] font-semibold">{d.label}</p>
            <p className="text-[10.5px] text-muted-foreground">{d.date}</p>
          </div>
          <WeatherIcon condition={d.condition} className="h-5 w-5" />
          <span className="flex w-10 items-center gap-0.5 text-[11px] font-semibold text-rain">
            <Droplets className="h-3 w-3" />
            {d.rainProb}%
          </span>
          <div className="flex flex-1 items-center gap-2">
            <span className="w-7 text-right text-[12px] text-muted-foreground">{d.lo}°</span>
            <div className="relative h-1.5 flex-1 rounded-full bg-secondary">
              <div
                className="absolute h-full rounded-full"
                style={{
                  left: `${((d.lo - min) / span) * 100}%`,
                  width: `${((d.hi - d.lo) / span) * 100}%`,
                  background: "linear-gradient(90deg, var(--primary-glow), var(--sun))",
                }}
              />
            </div>
            <span className="w-7 font-display text-[13px] font-bold">{d.hi}°</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Stat tile ---------- */
export function StatTile({
  icon,
  label,
  value,
  unit,
  sub,
  tone = "default",
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  tone?: "default" | "rain" | "sun" | "wind";
}) {
  const toneCls = { default: "bg-secondary text-primary", rain: "bg-rain/12 text-rain", sun: "bg-sun/20 text-level-severe", wind: "bg-wind/15 text-wind" }[tone];
  return (
    <div className="card-surface flex flex-col gap-2 p-3.5">
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-xl ${toneCls}`}>{icon}</span>
        <span className="text-[11.5px] font-semibold text-muted-foreground">{label}</span>
      </div>
      <p className="font-display text-[22px] font-bold leading-none">
        {value}
        {unit && <span className="ml-0.5 text-[12px] font-semibold text-muted-foreground">{unit}</span>}
      </p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

/* ---------- Alert ---------- */
export const ALERT_ICON: Record<AlertType, typeof CloudRain> = {
  "Heavy Rain": CloudRain,
  Thunderstorm: Zap,
  Cyclone: Tornado,
  "Heat Wave": Thermometer,
  "Flood Warning": Waves,
  "Strong Wind": Wind,
};

export function LevelBadge({ level, size = "sm" }: { level: WeatherAlert["level"]; size?: "sm" | "md" }) {
  const m = LEVEL_META[level];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wide text-primary-foreground ${m.color} ${
        size === "sm" ? "px-2 py-0.5 text-[9.5px]" : "px-2.5 py-1 text-[11px]"
      }`}
    >
      {level === "extreme" && <AlertTriangle className="h-2.5 w-2.5" />}
      {m.label}
    </span>
  );
}

export function AlertCard({ alert, cityName, compact = false }: { alert: WeatherAlert; cityName: string; compact?: boolean }) {
  const m = LEVEL_META[alert.level];
  const Icon = ALERT_ICON[alert.type];
  return (
    <Link
      to="/alerts/$id"
      params={{ id: alert.id }}
      className={`press relative flex items-center gap-3 overflow-hidden rounded-2xl border p-3.5 ${m.soft} border-transparent shadow-card`}
    >
      <span className={`absolute inset-y-0 left-0 w-1.5 ${m.color}`} />
      <span className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${m.color} text-primary-foreground`}>
        {alert.level === "extreme" && <span className={`absolute inset-0 rounded-2xl ${m.color} animate-pulse-ring`} />}
        <Icon className="relative h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <LevelBadge level={alert.level} />
          <span className="truncate text-[11px] font-semibold text-muted-foreground">{cityName}</span>
        </div>
        <p className="mt-1 truncate text-[13.5px] font-bold leading-tight">{alert.type} · {alert.title.split(" — ")[0]}</p>
        {!compact && <p className="mt-0.5 text-[11px] text-muted-foreground">Valid till {alert.validTill}</p>}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

/* ---------- Trust footer ---------- */
export function TrustNote() {
  return (
    <p className="px-4 pb-2 pt-4 text-center text-[10.5px] leading-relaxed text-muted-foreground">
      Weather information powered by official IMD data. Personalization only reorders official information — it never
      modifies warnings.
    </p>
  );
}
