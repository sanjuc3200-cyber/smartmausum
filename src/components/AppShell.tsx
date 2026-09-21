import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Map, CalendarDays, BellRing, UserRound, CloudSun, Search, RefreshCw } from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { sortedAlerts, getCity } from "@/lib/weather-data";
import { usePrefs, formatTemp } from "@/lib/prefs";
import { getApiStatus, useCityWeather, useLocationWeather } from "@/lib/weather-api";
import { CitySearchModal } from "@/components/weather/CitySearchModal";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/forecast", label: "Forecast", icon: CalendarDays },
  { to: "/map", label: "Live Radar Map", icon: Map },
  { to: "/alerts", label: "Severe Alerts", icon: BellRing },
  { to: "/profile", label: "Settings", icon: UserRound },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hideNav = pathname.startsWith("/onboarding");
  const extremeCount = sortedAlerts().filter((a) => a.level === "extreme").length;
  const severeCount = sortedAlerts().filter((a) => a.level === "severe" || a.level === "extreme").length;
  const { prefs, update } = usePrefs();
  const { data: liveCity } = useLocationWeather(prefs.activeLocation);
  const currentCity = liveCity ?? getCity(prefs.cityId);
  const apiStatus = getApiStatus();
  const [cityModalOpen, setCityModalOpen] = useState(false);

  // Global shortcut to open City Search modal: Ctrl+K, Cmd+K, or /
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && document.activeElement?.tagName !== "INPUT")) {
        e.preventDefault();
        setCityModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      {/* Desktop Top Navigation Bar (Visible on tablet & desktop >= 640px) */}
      {!hideNav && (
        <header className="hidden sm:block sticky top-0 z-40 w-full border-b border-border/80 bg-card/90 backdrop-blur-xl shadow-xs">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">
            {/* Brand Logo & Station Tag */}
            <Link to="/" className="flex items-center gap-3 font-display text-lg font-extrabold tracking-tight text-foreground hover:opacity-90 transition-opacity shrink-0">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl hero-gradient text-on-hero shadow-glow">
                <CloudSun className="h-5 w-5" />
              </span>
              <div className="leading-tight">
                <span className="block font-bold text-base md:text-lg">Mausam Insight</span>
                <span className="block text-[10px] font-bold text-primary uppercase tracking-widest">
                  India Weather Portal
                </span>
              </div>
            </Link>

            {/* Quick City Search & Switcher Bar */}
            <div className="flex-1 max-w-md mx-2">
              <button
                onClick={() => setCityModalOpen(true)}
                className="group flex w-full items-center justify-between rounded-full bg-secondary/80 hover:bg-secondary border border-border/70 px-4 py-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-all shadow-xs"
              >
                <span className="flex items-center gap-2 truncate">
                  <Search className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate text-foreground font-medium">
                    {currentCity.name}, {currentCity.state}
                  </span>
                </span>
                <span className="flex items-center gap-2 shrink-0 pl-2">
                  <span className="font-display font-bold text-foreground bg-card/80 px-2 py-0.5 rounded-full border border-border/60">
                    {formatTemp(currentCity.temp, prefs.tempUnit)}
                  </span>
                  <kbd className="hidden lg:inline-flex items-center rounded-md border border-border/80 bg-card px-1.5 py-0.5 text-[9.5px] font-mono text-muted-foreground group-hover:border-primary/40">
                    Ctrl K
                  </kbd>
                </span>
              </button>
            </div>

            {/* Navigation & Controls */}
            <div className="flex items-center gap-2.5">
              {/* Desktop Nav Links */}
              <nav className="flex items-center gap-1">
                {NAV.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className="relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-bold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                    activeProps={{ className: "bg-primary/10 text-primary hover:bg-primary/15" }}
                    activeOptions={{ exact: to === "/" }}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden md:inline">{label}</span>
                    {to === "/alerts" && severeCount > 0 && (
                      <span className="ml-0.5 rounded-full bg-level-extreme px-1.5 py-0.2 text-[10px] font-extrabold text-white animate-pulse">
                        {severeCount}
                      </span>
                    )}
                    {to === "/profile" && prefs.auth?.isLoggedIn && (
                      <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" title={`Signed in as ${prefs.auth.identifier}`} />
                    )}
                  </Link>
                ))}
              </nav>

              {/* Temperature Unit Switcher (°C / °F) */}
              <div className="flex items-center rounded-xl bg-secondary/80 p-0.5 border border-border/60 text-xs font-bold shrink-0">
                <button
                  onClick={() => update({ tempUnit: "C" })}
                  title="Show temperatures in Celsius"
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition-all ${
                    prefs.tempUnit !== "F"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  °C
                </button>
                <button
                  onClick={() => update({ tempUnit: "F" })}
                  title="Show temperatures in Fahrenheit"
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition-all ${
                    prefs.tempUnit === "F"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  °F
                </button>
              </div>

              {/* API Status Badge */}
              <span
                className="hidden xl:inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary shrink-0"
                title={apiStatus.isLive ? "Connected to live weather API" : "Serving verified IMD official station data"}
              >
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                {apiStatus.isLive ? "Live Radar API" : "Official IMD"}
              </span>
            </div>
          </div>
        </header>
      )}

      {/* Main Container: Wide full desktop layout (max-w-7xl) on desktop, responsive on mobile */}
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex-1 transition-all">
        <main className={hideNav ? "min-h-dvh" : "min-h-dvh pb-20 sm:pb-12"}>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (ONLY visible on small mobile screens < 640px) */}
      {!hideNav && (
        <nav
          aria-label="Main navigation"
          className="sm:hidden fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]"
        >
          <div className="glass-light flex items-center justify-between rounded-[1.6rem] px-2 py-2 shadow-float backdrop-blur-xl border border-white/40 dark:border-white/10">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="group relative flex flex-1 flex-col items-center gap-1 rounded-2xl py-1.5 text-[10.5px] font-semibold text-muted-foreground transition-all press"
                activeProps={{ className: "text-primary" }}
                activeOptions={{ exact: to === "/" }}
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`relative flex h-9 w-12 items-center justify-center rounded-2xl transition-all duration-300 ${
                        isActive ? "bg-primary text-primary-foreground shadow-glow" : "group-hover:bg-secondary"
                      }`}
                    >
                      <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.4 : 2} />

                      {to === "/alerts" && extremeCount > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-level-extreme px-1 text-[9px] font-bold text-primary-foreground ring-2 ring-card animate-pulse">
                          {extremeCount}
                        </span>
                      )}
                    </span>
                    <span>{label}</span>
                  </>
                )}
              </Link>
            ))}
          </div>
        </nav>
      )}

      {/* Global Interactive City Picker Modal */}
      <CitySearchModal
        isOpen={cityModalOpen}
        onClose={() => setCityModalOpen(false)}
        title="Select Weather Station"
      />
    </div>
  );
}
