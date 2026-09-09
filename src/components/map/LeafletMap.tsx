import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import {
  CITIES,
  LEVEL_META,
  alertsForCity,
  rainColor,
  tempColor,
  windColor,
  type City,
} from "@/lib/weather-data";

export type MapLayer = "temperature" | "rainfall" | "wind" | "alerts";

const EMOJI: Record<City["condition"], string> = {
  sunny: "☀️",
  partly: "⛅",
  cloudy: "☁️",
  rain: "🌧️",
  "heavy-rain": "⛈️",
  storm: "🌩️",
  haze: "🌫️",
};

function markerHtml(city: City, layer: MapLayer, selected: boolean) {
  let color = "var(--primary)";
  let value = `${city.temp}°`;
  if (layer === "temperature") color = tempColor(city.temp);
  if (layer === "rainfall") {
    color = rainColor(city.rain);
    value = `${city.rain}mm`;
  }
  if (layer === "wind") {
    color = windColor(city.wind);
    value = `${city.wind}km/h`;
  }
  if (layer === "alerts") {
    color = LEVEL_META[city.alertLevel].dot;
    value = city.alertLevel === "normal" ? "OK" : LEVEL_META[city.alertLevel].label;
  }
  const hasAlert = city.alertLevel === "extreme" || city.alertLevel === "severe";
  const arrow =
    layer === "wind"
      ? `<span style="display:inline-block;transform:rotate(${city.windDeg + 180}deg);font-size:11px;line-height:1">↑</span>`
      : `<span style="font-size:12px;line-height:1">${EMOJI[city.condition]}</span>`;
  return `<div class="mausam-marker ${selected ? "selected" : ""}" style="--pin-color:${color}">
    ${hasAlert && (layer === "alerts" || selected) ? '<span class="ring"></span>' : ""}
    <div class="pin"><span class="dot"></span>${arrow}<span>${value}</span></div>
  </div>`;
}

function FlyTo({ target, zoom }: { target: [number, number] | null; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), zoom), { duration: 0.9 });
  }, [target, zoom, map]);
  return null;
}

function ZoomBridge({ onReady }: { onReady: (m: L.Map) => void }) {
  const map = useMap();
  useEffect(() => onReady(map), [map, onReady]);
  return null;
}

export default function LeafletMap({
  layer,
  selectedId,
  onSelect,
  flyTarget,
  onMapReady,
}: {
  layer: MapLayer;
  selectedId: string;
  onSelect: (id: string) => void;
  flyTarget: [number, number] | null;
  onMapReady: (m: L.Map) => void;
}) {
  const icons = useMemo(
    () =>
      Object.fromEntries(
        CITIES.map((c) => [
          c.id,
          L.divIcon({ className: "leaflet-div-icon", html: markerHtml(c, layer, c.id === selectedId), iconSize: [0, 0] }),
        ]),
      ),
    [layer, selectedId],
  );

  return (
    <MapContainer
      center={[21.5, 79]}
      zoom={4.6}
      zoomSnap={0.2}
      zoomControl={false}
      attributionControl={true}
      className="h-full w-full"
      minZoom={4}
      maxZoom={10}
      maxBounds={[
        [4, 62],
        [39, 100],
      ]}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; OSM'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
      />
      <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png" opacity={0.6} />

      {CITIES.map((c) => {
        let color = tempColor(c.temp);
        let radius = 60000;
        let opacity = 0.28;
        if (layer === "rainfall") {
          color = rainColor(c.rain);
          radius = 30000 + c.rain * 1800;
          opacity = 0.35;
        } else if (layer === "wind") {
          color = windColor(c.wind);
          radius = 25000 + c.wind * 2500;
          opacity = 0.3;
        } else if (layer === "alerts") {
          if (c.alertLevel === "normal") return null;
          color = LEVEL_META[c.alertLevel].dot;
          radius = 50000 + (c.alertLevel === "extreme" ? 90000 : c.alertLevel === "severe" ? 60000 : 30000);
          opacity = 0.32;
        } else {
          radius = 45000 + Math.abs(c.temp - 28) * 8000;
        }
        return (
          <Circle
            key={c.id + layer}
            center={[c.lat, c.lng]}
            radius={radius}
            pathOptions={{ color, fillColor: color, fillOpacity: opacity, weight: 1, opacity: 0.5 }}
            eventHandlers={{ click: () => onSelect(c.id) }}
          />
        );
      })}

      {CITIES.map((c) => (
        <Marker
          key={c.id}
          position={[c.lat, c.lng]}
          icon={icons[c.id]}
          zIndexOffset={c.id === selectedId ? 1000 : alertsForCity(c.id).length ? 500 : 0}
          eventHandlers={{ click: () => onSelect(c.id) }}
        />
      ))}

      <FlyTo target={flyTarget} zoom={6} />
      <ZoomBridge onReady={onMapReady} />
    </MapContainer>
  );
}
