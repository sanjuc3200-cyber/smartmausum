import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Clock, MapPin, ShieldCheck, Share2, CheckCircle2 } from "lucide-react";
import { ALERTS, LEVEL_META, getCity } from "@/lib/weather-data";
import { ALERT_ICON, LevelBadge, TrustNote } from "@/components/weather/Widgets";

export const Route = createFileRoute("/alerts/$id")({
  loader: ({ params }) => {
    const alert = ALERTS.find((a) => a.id === params.id);
    if (!alert) throw notFound();
    return { alert };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Alert not found — IMD MAUSAM" }, { name: "robots", content: "noindex" }] };
    const t = `${loaderData.alert.type} — ${loaderData.alert.region} | IMD MAUSAM`;
    return {
      meta: [
        { title: t },
        { name: "description", content: loaderData.alert.description.slice(0, 155) },
        { property: "og:title", content: t },
        { property: "og:description", content: loaderData.alert.description.slice(0, 155) },
      ],
    };
  },
  component: AlertDetail,
  notFoundComponent: () => (
    <div className="p-8 text-center">
      <p className="font-bold">Alert not found</p>
      <Link to="/alerts" className="text-primary">Back to alerts</Link>
    </div>
  ),
});

function AlertDetail() {
  const { alert } = Route.useLoaderData();
  const m = LEVEL_META[alert.level];
  const Icon = ALERT_ICON[alert.type];
  const city = getCity(alert.cityId);

  return (
    <div className="min-h-dvh bg-background">
      <header className={`${m.color} relative overflow-hidden rounded-b-[2rem] px-5 pb-7 pt-[max(env(safe-area-inset-top),1rem)] text-primary-foreground`}>
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-on-hero/15 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <Link to="/alerts" aria-label="Back" className="glass flex h-10 w-10 items-center justify-center rounded-full">
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <span className="glass rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider">{m.badge} alert</span>
          <button aria-label="Share" className="glass flex h-10 w-10 items-center justify-center rounded-full">
            <Share2 className="h-4 w-4" />
          </button>
        </div>
        <div className="relative mt-6 flex items-start gap-4 animate-fade-in">
          <span className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-on-hero/20">
            <span className="absolute inset-0 rounded-3xl bg-on-hero/25 animate-pulse-ring" />
            <Icon className="relative h-8 w-8" />
          </span>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider opacity-85">{alert.type}</p>
            <h1 className="font-display text-[22px] font-extrabold leading-tight">{alert.title}</h1>
            <p className="mt-1.5 flex items-center gap-1 text-[12px] opacity-90"><MapPin className="h-3.5 w-3.5" /> {alert.region}</p>
          </div>
        </div>
      </header>

      <div className="stagger space-y-4 px-4 pt-4">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="card-surface p-3.5">
            <p className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground"><Clock className="h-3 w-3" /> Issued</p>
            <p className="mt-1 text-[13px] font-bold">{alert.issued}</p>
          </div>
          <div className="card-surface p-3.5">
            <p className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground"><Clock className="h-3 w-3" /> Valid till</p>
            <p className="mt-1 text-[13px] font-bold">{alert.validTill}</p>
          </div>
        </div>

        <div className="card-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[15px] font-bold">Official bulletin</h2>
            <LevelBadge level={alert.level} />
          </div>
          <p className="text-[13px] leading-relaxed text-foreground/90">{alert.description}</p>
        </div>

        <div className={`rounded-2xl ${m.soft} p-4`}>
          <h2 className="text-[13.5px] font-bold">Expected impact</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-foreground/85">{alert.impact}</p>
        </div>

        <div className="card-surface p-4">
          <h2 className="mb-2.5 text-[15px] font-bold">What you should do</h2>
          <ul className="space-y-2">
            {alert.advice.map((a) => (
              <li key={a} className="flex items-start gap-2.5 text-[13px]">
                <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${m.text}`} />
                {a}
              </li>
            ))}
          </ul>
        </div>

        <div className="card-surface flex items-center justify-between p-4">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">Current conditions · {city.name}</p>
            <p className="mt-1 font-display text-xl font-extrabold">{city.temp}° · {city.rain} mm · {city.wind} km/h</p>
          </div>
          <Link to="/map" className="press rounded-full bg-primary px-3.5 py-2 text-[11.5px] font-bold text-primary-foreground">View on map</Link>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-secondary/70 p-3 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
          Issued by India Meteorological Department. This warning is shown unmodified.
        </div>
        <TrustNote />
      </div>
    </div>
  );
}
