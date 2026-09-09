import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldAlert, AlertTriangle, Filter } from "lucide-react";
import { usePrefs } from "@/lib/prefs";
import { LEVEL_META, getCity, sortedAlerts, type AlertLevel } from "@/lib/weather-data";
import { AlertCard, SectionTitle, TrustNote } from "@/components/weather/Widgets";

export const Route = createFileRoute("/alerts/")({
  head: () => ({
    meta: [
      { title: "Weather Alerts & Warnings — IMD MAUSAM" },
      { name: "description", content: "All active IMD weather warnings ranked by severity: cyclone, heavy rain, heat wave, flood and wind." },
      { property: "og:title", content: "Weather Alerts & Warnings — IMD MAUSAM" },
      { property: "og:description", content: "All active IMD weather warnings ranked by severity." },
    ],
  }),
  component: AlertsPage,
});

const LEVELS: (AlertLevel | "all")[] = ["all", "extreme", "severe", "moderate"];

function AlertsPage() {
  const { prefs } = usePrefs();
  const [filter, setFilter] = useState<AlertLevel | "all">("all");
  const all = sortedAlerts();
  const list = filter === "all" ? all : all.filter((a) => a.level === filter);
  const mine = all.filter((a) => a.cityId === prefs.cityId || a.cityId === prefs.destinationId);
  const counts = {
    extreme: all.filter((a) => a.level === "extreme").length,
    severe: all.filter((a) => a.level === "severe").length,
    moderate: all.filter((a) => a.level === "moderate").length,
  };

  return (
    <div className="min-h-dvh py-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="flex items-center gap-3.5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-level-extreme/15 text-level-extreme shadow-sm">
            <ShieldAlert className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold text-foreground">
              Weather Warnings & Bulletins
            </h1>
            <p className="text-[13px] text-muted-foreground">
              {all.length} official IMD observation alerts currently active across India
            </p>
          </div>
        </div>

        {/* Severity Filter Pills */}
        <div className="flex items-center gap-1.5 bg-secondary/80 p-1 rounded-2xl border border-border/70 self-start sm:self-auto">
          <span className="text-[11px] font-bold text-muted-foreground px-2 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Filter:
          </span>
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => setFilter(l)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold capitalize transition-all ${
                filter === l
                  ? "bg-card text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Summary Stats Row */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["normal", "moderate", "severe", "extreme"] as AlertLevel[]).map((l) => (
          <div
            key={l}
            className={`rounded-2xl ${LEVEL_META[l].soft} p-4 text-center border border-border/60 shadow-xs transition-all hover:scale-[1.02]`}
          >
            <span className={`mx-auto block h-3 w-3 rounded-full ${LEVEL_META[l].color}`} />
            <p className="mt-2 font-display text-2xl font-extrabold leading-none text-foreground">
              {l === "normal" ? "Normal" : counts[l]}
            </p>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
              {LEVEL_META[l].label} Tier
            </p>
          </div>
        ))}
      </div>

      {/* For Your Locations */}
      {mine.length > 0 && (
        <div className="mt-8">
          <SectionTitle
            title="Monitored Locations"
            hint={`Stations: ${getCity(prefs.cityId).name} · ${getCity(prefs.destinationId).name}`}
          />
          <div className="stagger grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
            {mine.map((a) => (
              <AlertCard key={a.id} alert={a} cityName={getCity(a.cityId).name} />
            ))}
          </div>
        </div>
      )}

      {/* All India Alerts Grid */}
      <div className="mt-8">
        <SectionTitle
          title="All-India Weather Bulletins"
          hint={`${list.length} warnings matching active filter`}
        />
        <div key={filter} className="stagger grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
          {list.map((a) => (
            <AlertCard key={a.id} alert={a} cityName={getCity(a.cityId).name} />
          ))}
          {list.length === 0 && (
            <div className="col-span-full rounded-2xl bg-card p-12 text-center text-muted-foreground border border-border/80 shadow-card">
              <AlertTriangle className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="font-bold text-sm text-foreground">No active alerts at this level</p>
              <p className="text-xs mt-1">All monitoring stations in this category report safe conditions.</p>
            </div>
          )}
        </div>
      </div>

      <TrustNote />
    </div>
  );
}
