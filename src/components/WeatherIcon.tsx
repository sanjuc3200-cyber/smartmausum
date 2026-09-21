import { Sun, CloudSun, Cloud, CloudRain, CloudRainWind, CloudLightning, Haze, Snowflake, Moon, CloudMoon } from "lucide-react";
import type { Condition } from "@/lib/weather-data";

const MAP = {
  sunny: { Icon: Sun, cls: "text-sun" },
  partly: { Icon: CloudSun, cls: "text-primary-glow" },
  cloudy: { Icon: Cloud, cls: "text-muted-foreground" },
  rain: { Icon: CloudRain, cls: "text-rain" },
  "heavy-rain": { Icon: CloudRainWind, cls: "text-primary" },
  storm: { Icon: CloudLightning, cls: "text-primary-deep" },
  haze: { Icon: Haze, cls: "text-level-moderate" },
  snow: { Icon: Snowflake, cls: "text-sky-200" },
} as const;

export function WeatherIcon({
  condition,
  isNight = false,
  className = "h-6 w-6",
  inherit = false,
}: {
  condition: Condition;
  isNight?: boolean;
  className?: string;
  inherit?: boolean;
}) {
  if (isNight && condition === "sunny") {
    return <Moon className={`${className} ${inherit ? "" : "text-sky-200"}`} strokeWidth={1.9} aria-label="Clear night" />;
  }
  if (isNight && condition === "partly") {
    return <CloudMoon className={`${className} ${inherit ? "" : "text-sky-200"}`} strokeWidth={1.9} aria-label="Partly cloudy night" />;
  }
  const config = MAP[condition] ?? MAP.sunny;
  const { Icon, cls } = config;
  return <Icon className={`${className} ${inherit ? "" : cls}`} strokeWidth={1.9} aria-label={condition} />;
}

export function heroGradientFor(condition: Condition, isNight = false) {
  if (isNight && condition === "sunny") {
    return "hero-gradient-storm"; // Deep midnight aesthetic for clear nights
  }
  switch (condition) {
    case "storm":
      return "hero-gradient-storm";
    case "rain":
    case "heavy-rain":
    case "cloudy":
      return "hero-gradient-rain";
    case "sunny":
    case "haze":
      return "hero-gradient-sun";
    case "snow":
      return "hero-gradient-snow";
    default:
      return "hero-gradient";
  }
}

