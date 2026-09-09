import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldAlert } from "lucide-react";
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
  const counts = { extreme: all.filter((a) => a.level === "extreme").length, severe: all.filter((a) => a.level === "severe").length, moderate: all.filter((a) => a.level === "moderate").length };

  return (
    <div className="page-gradient min-h-dvh px-4 pt-[max(env(safe-area-inset-top),1rem)]">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-level-extreme/10 text-level-extreme">
          <ShieldAlert className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-extrabold leading-tight">Alerts</h1>
          <p className="text-[12px] text-muted-foreground">{all.length} official IMD warnings in force</p>
        </div>
      </div>

      {/* Level summary */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {(["normal", "moderate", "severe", "extreme"] as AlertLevel[]).map((l) => (
          <div key={l} className={`rounded-2xl ${LEVEL_META[l].soft} p-2.5 text-center`}>
            <span className={`mx-auto block h-2.5 w-2.5 rounded-full ${LEVEL_META[l].color}`} />
            <p className="mt-1.5 font-display text-lg font-extrabold leading-none">{l === "normal" ? "—" : counts[l]}</p>
            <p className="text-[9.5px] font-bold uppercase tracking-wide text-muted-foreground">{LEVEL_META[l].label}</p>
          </div>
        ))}
      </div>

      {mine.length > 0 && (
        <div className="mt-5">
          <SectionTitle title="For your locations" hint={`${getCity(prefs.cityId).name} · ${getCity(prefs.destinationId).name}`} />
          <div className="stagger space-y-2">
            {mine.map((a) => <AlertCard key={a.id} alert={a} cityName={getCity(a.cityId).name} />)}
          </div>
        </div>
      )}

      <div className="mt-5">
        <SectionTitle
          title="All India"
          action={
            <div className="flex gap-1">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  onClick={() => setFilter(l)}
                  className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold capitalize transition-all ${filter === l ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          }
        />
        <div key={filter} className="stagger space-y-2">
          {list.map((a) => <AlertCard key={a.id} alert={a} cityName={getCity(a.cityId).name} />)}
          {list.length === 0 && <p className="rounded-2xl bg-card p-4 text-center text-[12px] text-muted-foreground">No alerts at this level.</p>}
        </div>
      </div>
      <TrustNote />
    </div>
  );
}
