import { useMemo } from "react";
import type { Condition } from "@/lib/weather-data";

interface WeatherBackdropProps {
  condition: Condition;
  className?: string;
  intensity?: "subtle" | "normal" | "vibrant";
}

// Generate deterministic particles for rain
const RAIN_DROPS = Array.from({ length: 26 }, (_, i) => {
  const left = (i * 3.85 + (i % 3) * 1.5) % 98 + 1;
  const duration = 0.75 + ((i * 17) % 7) * 0.08; // 0.75s to 1.25s
  const delay = ((i * 31) % 15) * 0.12; // 0s to 1.8s
  const height = 18 + ((i * 13) % 18); // 18px to 35px
  const opacity = 0.4 + ((i * 7) % 5) * 0.12; // 0.4 to 0.9
  return { id: i, left, duration, delay, height, opacity };
});

const RAIN_SPLASHES = [
  { id: 1, left: 12, delay: 0.2, dur: 1.1 },
  { id: 2, left: 28, delay: 0.7, dur: 0.9 },
  { id: 3, left: 45, delay: 0.4, dur: 1.2 },
  { id: 4, left: 62, delay: 1.0, dur: 0.95 },
  { id: 5, left: 78, delay: 0.5, dur: 1.15 },
  { id: 6, left: 91, delay: 0.85, dur: 1.0 },
];

const SUN_MOTES = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  left: 20 + ((i * 23) % 70),
  bottom: 10 + ((i * 19) % 50),
  size: 3 + (i % 4) * 2,
  duration: 4 + (i % 3) * 1.5,
  delay: i * 0.6,
}));

export function WeatherBackdrop({ condition, className = "", intensity = "normal" }: WeatherBackdropProps) {
  // Normalize weather type
  const isRain = condition === "rain" || condition === "heavy-rain";
  const isStorm = condition === "storm";
  const isSunny = condition === "sunny";
  const isFoggy = condition === "haze";
  const isCloudy = condition === "cloudy" || condition === "partly";
  const isPartly = condition === "partly";

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden rounded-3xl select-none ${className}`}
      aria-hidden="true"
    >
      {/* -------------------- 1. RAIN & HEAVY RAIN ANIMATION -------------------- */}
      {isRain && (
        <div className="absolute inset-0">
          {/* Ambient rainy atmospheric glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-sky-950/30 via-slate-900/20 to-sky-900/40" />

          {/* Falling Rain Drops */}
          {RAIN_DROPS.map((drop) => (
            <span
              key={drop.id}
              className="absolute w-[1.5px] rounded-full"
              style={{
                left: `${drop.left}%`,
                top: `-25px`,
                height: `${drop.height}px`,
                background: "linear-gradient(to bottom, transparent, rgba(186, 230, 253, 0.9))",
                opacity: drop.opacity,
                animation: `rain-fall ${drop.duration}s linear infinite`,
                animationDelay: `${drop.delay}s`,
              }}
            />
          ))}

          {/* Bottom Water Splash Ripples */}
          {RAIN_SPLASHES.map((splash) => (
            <span
              key={splash.id}
              className="absolute bottom-1.5 h-1.5 w-6 -translate-x-1/2 rounded-full border border-sky-300/60"
              style={{
                left: `${splash.left}%`,
                animation: `rain-splash ${splash.dur}s ease-out infinite`,
                animationDelay: `${splash.delay}s`,
              }}
            />
          ))}

          {/* Subtle Ground Moisture Glow */}
          <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-sky-400/15 to-transparent blur-xs" />
        </div>
      )}

      {/* -------------------- 2. THUNDERSTORM ANIMATION -------------------- */}
      {isStorm && (
        <div className="absolute inset-0">
          {/* Deep stormy gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/40 via-purple-950/30 to-slate-950/50" />

          {/* Rapid Driving Rain */}
          {RAIN_DROPS.slice(0, 22).map((drop) => (
            <span
              key={drop.id}
              className="absolute w-[2px] rounded-full"
              style={{
                left: `${drop.left}%`,
                top: `-30px`,
                height: `${drop.height + 8}px`,
                background: "linear-gradient(to bottom, transparent, rgba(224, 231, 255, 0.95))",
                opacity: drop.opacity,
                animation: `rain-fall ${drop.duration * 0.75}s linear infinite`,
                animationDelay: `${drop.delay}s`,
              }}
            />
          ))}

          {/* Lightning Flash Overlay (Intermittent strobe illuminating the entire card) */}
          <div
            className="absolute inset-0 bg-gradient-to-tr from-cyan-100/30 via-indigo-100/40 to-white/45 mix-blend-overlay animate-[lightning-flash_5.5s_ease-in-out_infinite]"
          />

          {/* Electric Sky Glow in Top Corner */}
          <div
            className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-cyan-400/25 blur-3xl animate-[lightning-flash_5.5s_ease-in-out_infinite]"
            style={{ animationDelay: "0.08s" }}
          />

          {/* Bottom Splashes */}
          {RAIN_SPLASHES.slice(0, 4).map((splash) => (
            <span
              key={splash.id}
              className="absolute bottom-1.5 h-2 w-7 -translate-x-1/2 rounded-full border border-indigo-200/70"
              style={{
                left: `${splash.left}%`,
                animation: `rain-splash ${splash.dur * 0.8}s ease-out infinite`,
                animationDelay: `${splash.delay}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* -------------------- 3. SUNNY & WARMTH ANIMATION -------------------- */}
      {isSunny && (
        <div className="absolute inset-0">
          {/* Warm Solar Atmospheric Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-orange-400/15 to-transparent" />

          {/* Rotating Radiant Sun Rays (Top-Right Origin) */}
          <div className="absolute -top-20 -right-20 h-72 w-72 origin-center animate-[sun-spin_28s_linear_infinite]">
            <svg viewBox="0 0 200 200" className="h-full w-full opacity-35">
              <defs>
                <radialGradient id="sun-ray-grad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffedd5" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </radialGradient>
              </defs>
              {/* 12 Radiant Rays */}
              {Array.from({ length: 12 }).map((_, i) => (
                <path
                  key={i}
                  d="M100,100 L94,0 L106,0 Z"
                  fill="url(#sun-ray-grad)"
                  transform={`rotate(${i * 30} 100 100)`}
                />
              ))}
            </svg>
          </div>

          {/* Counter-rotating subtle secondary ray ring */}
          <div className="absolute -top-20 -right-20 h-72 w-72 origin-center animate-[sun-spin-rev_40s_linear_infinite]">
            <svg viewBox="0 0 200 200" className="h-full w-full opacity-25">
              {Array.from({ length: 8 }).map((_, i) => (
                <path
                  key={i}
                  d="M100,100 L90,10 L110,10 Z"
                  fill="url(#sun-ray-grad)"
                  transform={`rotate(${i * 45 + 15} 100 100)`}
                />
              ))}
            </svg>
          </div>

          {/* Pulsing Solar Corona & Lens Flare */}
          <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-gradient-to-br from-yellow-300/40 via-amber-400/25 to-transparent blur-2xl animate-[sun-pulse_4s_ease-in-out_infinite]" />
          <div className="absolute -top-6 -right-6 h-28 w-28 rounded-full bg-amber-200/50 blur-xl animate-[sun-pulse_3s_ease-in-out_infinite]" />

          {/* Floating Warm Golden Motes / Sun Glints */}
          {SUN_MOTES.map((mote) => (
            <span
              key={mote.id}
              className="absolute rounded-full bg-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
              style={{
                left: `${mote.left}%`,
                bottom: `${mote.bottom}%`,
                width: `${mote.size}px`,
                height: `${mote.size}px`,
                animation: `sun-mote ${mote.duration}s ease-in-out infinite`,
                animationDelay: `${mote.delay}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* -------------------- 4. FOGGY / HAZE ANIMATION -------------------- */}
      {isFoggy && (
        <div className="absolute inset-0">
          {/* Moody Misty Atmospheric Base */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-300/15 via-slate-200/20 to-slate-400/15" />

          {/* Layer 1: Drifting Billowing Fog Bank (Left to Right) */}
          <div
            className="absolute -top-10 -left-[30%] h-48 w-[160%] opacity-55 blur-xl"
            style={{
              background: "radial-gradient(ellipse at 40% 50%, rgba(226, 232, 240, 0.65) 0%, rgba(203, 213, 225, 0.35) 45%, transparent 75%)",
              animation: "fog-drift-left 16s ease-in-out infinite",
            }}
          />

          {/* Layer 2: Counter-Drifting Fog Bank (Right to Left) */}
          <div
            className="absolute top-10 -left-[20%] h-44 w-[150%] opacity-45 blur-2xl"
            style={{
              background: "radial-gradient(ellipse at 60% 60%, rgba(241, 245, 249, 0.7) 0%, rgba(226, 232, 240, 0.3) 50%, transparent 80%)",
              animation: "fog-drift-right 22s ease-in-out infinite",
            }}
          />

          {/* Layer 3: Low-lying Ground Mist at Card Base */}
          <div
            className="absolute -bottom-6 -left-[25%] h-28 w-[150%] opacity-60 blur-lg"
            style={{
              background: "linear-gradient(to top, rgba(226, 232, 240, 0.6) 0%, rgba(203, 213, 225, 0.25) 60%, transparent 100%)",
              animation: "fog-drift-left 20s ease-in-out infinite",
            }}
          />

          {/* Atmospheric Light Scrim */}
          <div className="absolute inset-0 bg-slate-900/10 mix-blend-multiply" />
        </div>
      )}

      {/* -------------------- 5. CLOUDY / PARTLY CLOUDY ANIMATION -------------------- */}
      {isCloudy && (
        <div className="absolute inset-0">
          {/* Atmospheric Cloud Tint */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-400/15 via-sky-300/10 to-transparent" />

          {/* If Partly Sunny: Glowing Sun behind clouds */}
          {isPartly && (
            <div className="absolute -top-10 right-8 h-40 w-40 rounded-full bg-gradient-to-br from-amber-300/45 via-yellow-400/25 to-transparent blur-2xl animate-[sun-pulse_5s_ease-in-out_infinite]" />
          )}

          {/* Drifting Soft Cloud 1 */}
          <div
            className="absolute top-2 -left-[15%] h-36 w-[130%] opacity-40 blur-xl"
            style={{
              background: "radial-gradient(ellipse at 35% 40%, rgba(255, 255, 255, 0.7) 0%, rgba(241, 245, 249, 0.35) 50%, transparent 75%)",
              animation: "cloud-drift-ambient 24s ease-in-out infinite",
            }}
          />

          {/* Drifting Soft Cloud 2 */}
          <div
            className="absolute bottom-2 -left-[10%] h-32 w-[125%] opacity-35 blur-lg"
            style={{
              background: "radial-gradient(ellipse at 65% 60%, rgba(248, 250, 252, 0.65) 0%, rgba(226, 232, 240, 0.3) 55%, transparent 80%)",
              animation: "cloud-drift-ambient 30s ease-in-out infinite",
              animationDelay: "-8s",
            }}
          />
        </div>
      )}

      {/* Subtle Bottom Card Edge Sheen */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
    </div>
  );
}
