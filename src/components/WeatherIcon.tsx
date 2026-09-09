import { Sun, CloudSun, Cloud, CloudRain, CloudRainWind, CloudLightning, Haze } from "lucide-react";
import type { Condition } from "@/lib/weather-data";

const MAP = {
  sunny: { Icon: Sun, cls: "text-sun" },
  partly: { Icon: CloudSun, cls: "text-primary-glow" },
  cloudy: { Icon: Cloud, cls: "text-muted-foreground" },
  rain: { Icon: CloudRain, cls: "text-rain" },
  "heavy-rain": { Icon: CloudRainWind, cls: "text-primary" },
  storm: { Icon: CloudLightning, cls: "text-primary-deep" },
  haze: { Icon: Haze, cls: "text-level-moderate" },
} as const;

export function WeatherIcon({
  condition,
  className = "h-6 w-6",
  inherit = false,
}: {
  condition: Condition;
  className?: string;
  inherit?: boolean;
}) {
  const { Icon, cls } = MAP[condition];
  return <Icon className={`${className} ${inherit ? "" : cls}`} strokeWidth={1.9} aria-label={condition} />;
}

export function heroGradientFor(condition: Condition) {
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
    default:
      return "hero-gradient";
  }
}
