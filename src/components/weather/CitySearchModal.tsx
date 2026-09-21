import { useState, useEffect, useMemo, useRef } from "react";
import { Search, X, MapPin, Check, AlertTriangle, Sparkles, Wind, Droplets, Loader2, Compass, History } from "lucide-react";
import { CITIES, CONDITION_LABEL, alertsForCity, getCity, getCustomCities, registerCustomCity, type City } from "@/lib/weather-data";
import { searchLocations, fetchLiveWeatherByCoords, type GeocodedLocation } from "@/lib/weather-api";
import { usePrefs, formatTemp, type SelectedLocation } from "@/lib/prefs";
import { WeatherIcon } from "@/components/WeatherIcon";

interface CitySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCity?: (cityId: string) => void;
  title?: string;
}

const POPULAR_CITY_IDS = [
  "delhi",
  "mumbai",
  "bengaluru",
  "hyderabad",
  "chennai",
  "kolkata",
  "jaipur",
  "srinagar",
  "kochi",
  "pune",
];

export function CitySearchModal({
  isOpen,
  onClose,
  onSelectCity,
  title = "Select Location",
}: CitySearchModalProps) {
  const { prefs, update } = usePrefs();
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<GeocodedLocation[]>([]);
  const [recentCities, setRecentCities] = useState<City[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens and reload recent custom cities
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSuggestions([]);
      setRecentCities(getCustomCities());
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced geocoding search using OpenWeather Geocoding API
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchLocations(q);
        setSuggestions(results);
      } catch (err) {
        console.error("Geocoding search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [search]);

  const popularCities = useMemo(() => {
    return POPULAR_CITY_IDS.map((id) => CITIES.find((c) => c.id === id)).filter(Boolean) as City[];
  }, []);

  const handleSelectCity = (c: City) => {
    const loc: SelectedLocation = {
      id: c.id,
      name: c.name,
      state: c.state,
      country: "IN",
      lat: c.lat,
      lng: c.lng,
    };
    if (onSelectCity) {
      onSelectCity(c.id);
    } else {
      update({ cityId: c.id, activeLocation: loc });
    }
    onClose();
  };

  const handleSelectGeocoded = async (loc: GeocodedLocation) => {
    console.log(`[Mausam Location Selected] "${loc.name}", State: "${loc.state || ''}", Country: "${loc.country}", Lat: ${loc.lat}, Lon: ${loc.lng}`);

    const selectedLoc: SelectedLocation = {
      id: loc.id,
      name: loc.name,
      state: loc.state,
      country: loc.country,
      lat: loc.lat,
      lng: loc.lng,
    };

    if (onSelectCity) {
      onSelectCity(loc.id);
    } else {
      update({ cityId: loc.id, activeLocation: selectedLoc });
    }
    onClose();

    // Trigger live weather fetch for exact coordinates and register in background
    try {
      const liveCity = await fetchLiveWeatherByCoords(
        loc.lat,
        loc.lng,
        loc.name,
        loc.state ? `${loc.state}, ${loc.country}` : loc.country,
        loc.id
      );
      registerCustomCity(liveCity);
    } catch (err) {
      console.error("[Mausam] Error fetching weather for geocoded location:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-start justify-center p-3 pt-12 md:pt-20 bg-background/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-border/80 bg-card shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MapPin className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-base font-bold text-foreground">{title}</h2>
              <p className="text-[11px] text-muted-foreground">Search any city, district, locality, or town worldwide</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 pb-2">
          <div className="relative flex items-center">
            {isSearching ? (
              <Loader2 className="pointer-events-none absolute left-3.5 h-4 w-4 animate-spin text-primary" />
            ) : (
              <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted-foreground" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search any locality, district, or city (e.g. Warangal, Indore, Connaught Place)..."
              className="w-full rounded-2xl bg-secondary/80 py-3 pl-10 pr-10 text-[13.5px] font-medium outline-none placeholder:text-muted-foreground ring-primary/40 focus:ring-2 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground text-xs"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Quick Pick Chips (when search is empty) */}
          {!search && (
            <div className="mt-3 space-y-2.5">
              {recentCities.length > 0 && (
                <div>
                  <p className="px-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <History className="h-3 w-3 text-primary" /> Recently Selected
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {recentCities.slice(0, 4).map((c) => {
                      const isSelected = prefs.cityId === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => handleSelectCity(c)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all ${
                            isSelected
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "bg-secondary/70 hover:bg-secondary text-foreground hover:scale-105"
                          }`}
                        >
                          <Compass className="h-3 w-3 text-primary" />
                          <span>{c.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <p className="px-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-primary" /> Popular Metros
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {popularCities.slice(0, 8).map((c) => {
                    const isSelected = prefs.cityId === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => handleSelectCity(c)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-secondary/70 hover:bg-secondary text-foreground hover:scale-105"
                        }`}
                      >
                        <WeatherIcon condition={c.condition} className="h-3.5 w-3.5" inherit={isSelected} />
                        <span>{c.name}</span>
                        <span className={`text-[11px] ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                          {formatTemp(c.temp, prefs.tempUnit)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-[360px] overflow-y-auto px-4 pb-4 divide-y divide-border/40">
          {search ? (
            // Live Geocoded Search Suggestions
            suggestions.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                {isSearching ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-xs font-semibold">Searching OpenWeather Geocoding network...</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-semibold">No locations found matching "{search}"</p>
                    <p className="mt-1 text-xs">Try searching by district name, landmark, or PIN/state</p>
                  </>
                )}
              </div>
            ) : (
              suggestions.map((loc) => {
                const isSelected = prefs.cityId === loc.id;
                const stateDisplay = loc.state ? `${loc.state}, ${loc.country}` : loc.country;

                return (
                  <button
                    key={loc.id}
                    onClick={() => handleSelectGeocoded(loc)}
                    className={`w-full flex items-center justify-between py-3 px-2 rounded-2xl transition-all text-left ${
                      isSelected ? "bg-primary/10 ring-1 ring-primary/25" : "hover:bg-secondary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-[14.5px] font-bold text-foreground truncate">
                            {loc.name}
                          </span>
                          {isSelected && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.2 text-[9px] font-extrabold text-primary-foreground">
                              <Check className="h-2.5 w-2.5" /> Selected
                            </span>
                          )}
                        </div>
                        <p className="text-[11.5px] text-muted-foreground truncate">
                          {stateDisplay}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary/80 px-2.5 py-1 text-[10px] font-mono font-medium text-muted-foreground">
                        <Compass className="h-3 w-3 text-primary" />
                        {loc.lat.toFixed(2)}°, {loc.lng.toFixed(2)}°
                      </span>
                    </div>
                  </button>
                );
              })
            )
          ) : (
            // Default Stations View (when search is empty)
            CITIES.map((c) => {
              const isSelected = prefs.cityId === c.id;
              const alerts = alertsForCity(c.id);
              const hasExtreme = alerts.some((a) => a.level === "extreme");
              const hasSevere = alerts.some((a) => a.level === "severe");

              return (
                <button
                  key={c.id}
                  onClick={() => handleSelectCity(c)}
                  className={`w-full flex items-center justify-between py-3 px-2 rounded-2xl transition-all text-left ${
                    isSelected ? "bg-primary/10 ring-1 ring-primary/25" : "hover:bg-secondary/50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary">
                      <WeatherIcon condition={c.condition} className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-[14.5px] font-bold text-foreground truncate">
                          {c.name}
                        </span>
                        {isSelected && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.2 text-[9px] font-extrabold text-primary-foreground">
                            <Check className="h-2.5 w-2.5" /> Selected
                          </span>
                        )}
                        {hasExtreme && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-level-extreme px-1.5 py-0.2 text-[9px] font-extrabold text-white">
                            <AlertTriangle className="h-2.5 w-2.5" /> Extreme
                          </span>
                        )}
                        {!hasExtreme && hasSevere && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-level-severe px-1.5 py-0.2 text-[9px] font-extrabold text-white">
                            Severe
                          </span>
                        )}
                      </div>
                      <p className="text-[11.5px] text-muted-foreground truncate">
                        {c.state} · {CONDITION_LABEL[c.condition]}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-2">
                    <span className="font-display text-lg font-extrabold text-foreground">
                      {formatTemp(c.temp, prefs.tempUnit)}
                    </span>
                    <div className="flex items-center justify-end gap-1.5 text-[10.5px] text-muted-foreground">
                      <span className="flex items-center gap-0.5 text-rain">
                        <Droplets className="h-2.5 w-2.5" />
                        {c.rainProb}%
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        <Wind className="h-2.5 w-2.5 text-wind" />
                        {c.wind}km/h
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div className="border-t border-border/60 bg-muted/40 px-5 py-2.5 text-center text-[11px] text-muted-foreground flex items-center justify-between">
          <span>Powered by OpenWeather Geocoding & IMD</span>
          <span className="hidden sm:inline text-[10px] bg-secondary px-2 py-0.5 rounded-md">Press Esc to close</span>
        </div>
      </div>
    </div>
  );
}
