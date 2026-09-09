import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, MapPin, Check, ShieldCheck, CloudSun } from "lucide-react";
import { CITIES } from "@/lib/weather-data";
import { INTERESTS, PERSONAS, PERSONA_DEFAULT_INTERESTS, usePrefs, type Persona } from "@/lib/prefs";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Get started — IMD MAUSAM" },
      { name: "description", content: "Choose your location, persona and weather interests to personalize IMD MAUSAM." },
      { property: "og:title", content: "Get started — IMD MAUSAM" },
      { property: "og:description", content: "Choose your location, persona and weather interests to personalize IMD MAUSAM." },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const { prefs, update, toggleInterest } = usePrefs();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const steps = ["Welcome", "Location", "Persona", "Interests", "Alerts"];

  const next = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else {
      update({ onboarded: true });
      navigate({ to: "/" });
    }
  };

  return (
    <div className="hero-gradient relative flex min-h-dvh flex-col overflow-hidden text-on-hero">
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-on-hero/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-10 h-72 w-72 rounded-full bg-primary-glow/30 blur-3xl" />

      <div className="relative flex items-center justify-between px-6 pt-[max(env(safe-area-inset-top),1.25rem)]">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-on-hero/90 text-primary"><CloudSun className="h-4.5 w-4.5" /></span>
          <span className="font-display text-sm font-extrabold tracking-wide">IMD MAUSAM</span>
        </div>
        <div className="flex gap-1">
          {steps.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i <= step ? "w-6 bg-on-hero" : "w-2 bg-on-hero/30"}`} />
          ))}
        </div>
      </div>

      <div key={step} className="relative flex flex-1 flex-col px-6 pt-8 animate-fade-in">
        {step === 0 && (
          <>
            <div className="animate-float mt-6 text-7xl">🌤️</div>
            <h1 className="mt-6 font-display text-[34px] font-extrabold leading-[1.05]">Weather that knows what matters to you.</h1>
            <p className="mt-3 text-[14px] leading-relaxed text-on-hero-muted">
              Official IMD forecasts and warnings, intelligently prioritised for your location, your work and your plans.
            </p>
            <div className="mt-6 space-y-2">
              {["Personalised homepage", "Interactive India weather map", "Smart severity-ranked alerts"].map((f) => (
                <div key={f} className="glass flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold">
                  <Check className="h-4 w-4 text-primary-glow" /> {f}
                </div>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="font-display text-[30px] font-extrabold leading-tight">Where are you?</h1>
            <p className="mt-2 text-[13.5px] text-on-hero-muted">We'll centre your weather around this place.</p>
            <button
              onClick={() => update({ cityId: "hyderabad" })}
              className="glass press mt-5 flex items-center gap-3 rounded-2xl p-3.5 text-left"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-on-hero text-primary"><MapPin className="h-5 w-5" /></span>
              <span><span className="block text-[13.5px] font-bold">Use current location</span><span className="block text-[11px] text-on-hero-muted">Detected: Hyderabad, Telangana</span></span>
            </button>
            <p className="mt-5 text-[11px] font-bold uppercase tracking-wider text-on-hero-muted">Or pick a city</p>
            <div className="mt-2 grid max-h-[40dvh] grid-cols-2 gap-2 overflow-y-auto pb-2">
              {CITIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => update({ cityId: c.id })}
                  className={`press rounded-xl px-3 py-2.5 text-left text-[12.5px] font-bold transition-all ${prefs.cityId === c.id ? "bg-on-hero text-primary shadow-float" : "glass"}`}
                >
                  {c.name}
                  <span className={`block text-[10px] font-medium ${prefs.cityId === c.id ? "text-primary/70" : "text-on-hero-muted"}`}>{c.state}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="font-display text-[30px] font-extrabold leading-tight">Which best describes you?</h1>
            <p className="mt-2 text-[13.5px] text-on-hero-muted">This sets your default weather priorities.</p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => update({ persona: p.id as Persona, interests: PERSONA_DEFAULT_INTERESTS[p.id] })}
                  className={`press flex flex-col items-start gap-2 rounded-2xl p-4 text-left transition-all ${prefs.persona === p.id ? "bg-on-hero text-foreground shadow-float" : "glass"}`}
                >
                  <span className="text-3xl">{p.emoji}</span>
                  <span className="text-[15px] font-bold">{p.label}</span>
                  <span className={`text-[11px] leading-tight ${prefs.persona === p.id ? "text-muted-foreground" : "text-on-hero-muted"}`}>{p.blurb}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="font-display text-[30px] font-extrabold leading-tight">What do you care about?</h1>
            <p className="mt-2 text-[13.5px] text-on-hero-muted">Pick as many as you like — we pre-selected some for a {PERSONAS.find((p) => p.id === prefs.persona)?.label.toLowerCase()}.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {INTERESTS.map((i) => {
                const on = prefs.interests.includes(i.id);
                return (
                  <button
                    key={i.id}
                    onClick={() => toggleInterest(i.id)}
                    className={`press flex items-center gap-1.5 rounded-full px-3.5 py-2.5 text-[13px] font-bold transition-all ${on ? "bg-on-hero text-primary shadow-float" : "glass"}`}
                  >
                    {on && <Check className="h-3.5 w-3.5" />}
                    {i.emoji} {i.label}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="font-display text-[30px] font-extrabold leading-tight">Stay ahead of severe weather</h1>
            <p className="mt-2 text-[13.5px] text-on-hero-muted">Choose what we should notify you about.</p>
            <div className="mt-5 space-y-2">
              {(
                [
                  ["severe", "Severe weather alerts", "Orange & red IMD warnings"],
                  ["daily", "Daily morning briefing", "One summary at 7 AM"],
                  ["rain", "Rain starting soon", "Nowcast before rain begins"],
                  ["agri", "Agro-advisories", "For farming decisions"],
                ] as const
              ).map(([k, t, d]) => (
                <button
                  key={k}
                  onClick={() => update({ notifications: { ...prefs.notifications, [k]: !prefs.notifications[k] } })}
                  className={`press flex w-full items-center justify-between rounded-2xl p-3.5 text-left transition-all ${prefs.notifications[k] ? "bg-on-hero text-foreground shadow-float" : "glass"}`}
                >
                  <span><span className="block text-[13.5px] font-bold">{t}</span><span className={`block text-[11px] ${prefs.notifications[k] ? "text-muted-foreground" : "text-on-hero-muted"}`}>{d}</span></span>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full ${prefs.notifications[k] ? "bg-primary text-primary-foreground" : "border border-on-hero/50"}`}>{prefs.notifications[k] && <Check className="h-3.5 w-3.5" />}</span>
                </button>
              ))}
            </div>
            <div className="glass mt-5 flex items-center gap-2.5 rounded-xl p-3 text-[11.5px]">
              <ShieldCheck className="h-4 w-4 shrink-0 text-primary-glow" />
              Weather information powered by official IMD data. We only organise it — never change it.
            </div>
          </>
        )}
      </div>

      <div className="relative px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-4">
        <button
          onClick={next}
          className="press flex w-full items-center justify-center gap-2 rounded-2xl bg-on-hero py-4 font-display text-[15px] font-extrabold text-primary shadow-float"
        >
          {step === 0 ? "Get started" : step === steps.length - 1 ? "Build my homepage" : "Continue"}
          <ArrowRight className="h-4.5 w-4.5" />
        </button>
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="mt-2 w-full py-2 text-[12.5px] font-semibold text-on-hero-muted">
            Back
          </button>
        )}
      </div>
    </div>
  );
}
