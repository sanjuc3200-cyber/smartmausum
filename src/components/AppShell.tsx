import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Map, CalendarDays, BellRing, UserRound, CloudSun } from "lucide-react";
import type { ReactNode } from "react";
import { sortedAlerts } from "@/lib/weather-data";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/map", label: "Map", icon: Map },
  { to: "/forecast", label: "Forecast", icon: CalendarDays },
  { to: "/alerts", label: "Alerts", icon: BellRing },
  { to: "/profile", label: "Profile", icon: UserRound },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hideNav = pathname.startsWith("/onboarding");
  const extremeCount = sortedAlerts().filter((a) => a.level === "extreme").length;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Desktop Top Navigation Bar (only on md: and larger) */}
      {!hideNav && (
        <header className="hidden md:block sticky top-0 z-50 w-full border-b border-border/80 bg-background/85 backdrop-blur-xl shadow-xs">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
            <Link to="/" className="flex items-center gap-2.5 font-display text-lg font-extrabold tracking-tight text-foreground hover:opacity-90 transition-opacity">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl hero-gradient text-on-hero shadow-glow">
                <CloudSun className="h-5 w-5" />
              </span>
              <span>Mausam Insight</span>
            </Link>

            <nav className="flex items-center gap-1">
              {NAV.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-bold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                  activeProps={{ className: "bg-primary/10 text-primary hover:bg-primary/15" }}
                  activeOptions={{ exact: to === "/" }}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                  {to === "/alerts" && extremeCount > 0 && (
                    <span className="ml-1 rounded-full bg-level-extreme px-1.5 py-0.2 text-[10px] font-extrabold text-white">
                      {extremeCount}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          </div>
        </header>
      )}

      {/* Main Container: Responsive - full mobile on small screens, expands naturally on desktop */}
      <div className="mx-auto w-full max-w-md md:max-w-4xl lg:max-w-5xl min-h-dvh transition-all">
        <main className={hideNav ? "min-h-dvh" : "min-h-dvh pb-24 md:pb-12"}>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (hidden on desktop md:) */}
      {!hideNav && (
        <nav
          aria-label="Main navigation"
          className="md:hidden fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]"
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
    </div>
  );
}
