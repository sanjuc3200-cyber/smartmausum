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
import type { RadarFrame } from "@/lib/radar-api";
import WindStreamOverlay from "./WindStreamOverlay";
import ThermalHeatOverlay from "./ThermalHeatOverlay";

export type MapLayer = "rain" | "wind" | "temperature" | "satellite" | "alerts" | "rainfall"; // backward compatibility
export type BasemapType = "dark" | "voyager" | "satellite";

const EMOJI: Record<City["condition"], string> = {
  sunny: "☀️",
  partly: "⛅",
  cloudy: "☁️",
  rain: "🌧️",
  "heavy-rain": "⛈️",
  storm: "🌩️",
  haze: "🌫️",
};

function markerHtml(city: City, layer: MapLayer, selected: boolean, live?: Partial<City>) {
  const currentTemp = live?.temp ?? city.temp;
  const currentRain = live?.rain ?? city.rain;
  const currentWind = live?.wind ?? city.wind;
  const currentWindDeg = live?.windDeg ?? city.windDeg;

  let color = "var(--primary)";
  let value = `${currentTemp}°`;
  let iconHtml = `<span style="font-size:12px;line-height:1">${EMOJI[city.condition]}</span>`;

  const normLayer = layer === "rainfall" ? "rain" : layer;

  if (normLayer === "temperature") {
    color = tempColor(currentTemp);
    value = `${currentTemp}°`;
  } else if (normLayer === "rain") {
    color = rainColor(currentRain);
    value = currentRain > 0 ? `${currentRain}mm` : "0mm";
    iconHtml = `<span style="font-size:12px;line-height:1">🌧️</span>`;
  } else if (normLayer === "wind") {
    color = windColor(currentWind);
    value = `${currentWind}k`;
    iconHtml = `<span style="display:inline-block;transform:rotate(${currentWindDeg + 180}deg);font-size:12px;line-height:1;font-weight:900">↑</span>`;
  } else if (normLayer === "satellite") {
    color = "oklch(0.7 0.1 230)";
    value = `${live?.cloud ?? city.cloud}%`;
    iconHtml = `<span style="font-size:12px;line-height:1">☁️</span>`;
  } else if (normLayer === "alerts") {
    color = LEVEL_META[city.alertLevel].dot;
    value = city.alertLevel === "normal" ? "Normal" : LEVEL_META[city.alertLevel].label;
    iconHtml = `<span style="font-size:12px;line-height:1">⚠</span>`;
  }

  const hasAlert = city.alertLevel === "extreme" || city.alertLevel === "severe";

  return `<div class="mausam-marker ${selected ? "selected" : ""}" style="--pin-color:${color}">
    ${hasAlert && (normLayer === "alerts" || selected) ? '<span class="ring"></span>' : ""}
    <div class="pin" title="${city.name} (${value})"><span class="dot"></span>${iconHtml}<span>${city.name}</span><span style="opacity:0.85;font-weight:800">${value}</span></div>
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
  radarFrame,
  radarHost = "https://tilecache.rainviewer.com",
  layerOpacity = 0.8,
  basemap = "voyager",
  liveData = {},
  showMarkers = true,
}: {
  layer: MapLayer;
  selectedId: string;
  onSelect: (id: string) => void;
  flyTarget: [number, number] | null;
  onMapReady: (m: L.Map) => void;
  radarFrame?: RadarFrame | null;
  radarHost?: string;
  layerOpacity?: number;
  basemap?: BasemapType;
  liveData?: Record<string, Partial<City>>;
  showMarkers?: boolean;
}) {
  const normLayer = layer === "rainfall" ? "rain" : layer;

  const icons = useMemo(
    () =>
      Object.fromEntries(
        CITIES.map((c) => [
          c.id,
          L.divIcon({
            className: "leaflet-div-icon",
            html: markerHtml(c, normLayer, c.id === selectedId, liveData[c.id]),
            iconSize: [0, 0],
          }),
        ]),
      ),
    [normLayer, selectedId, liveData],
  );

  const googleApiKey =
    (import.meta.env as Record<string, string | undefined>)["VITE_GOOGLE_MAPS_API_KEY"] ||
    "AIzaSyDKViJX7wDjJVLFIaAqpRA22mJwPBKc_h4";

  return (
    <MapContainer
      center={[22.0, 79.5]}
      zoom={4.7}
      zoomSnap={0.2}
      zoomControl={false}
      attributionControl={true}
      className="h-full w-full bg-sky-50"
      minZoom={4}
      maxZoom={19}
      maxBounds={[
        [2, 60],
        [40, 102],
      ]}
    >
      {/* 1. Basemap Tiles (Bright Google Maps Roadmap with API Key) */}
      {basemap === "voyager" && (
        <TileLayer
          attribution='Map data &copy; <a href="https://maps.google.com" target="_blank" rel="noreferrer">Google Maps</a>'
          url={`https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${googleApiKey}`}
          subdomains={["0", "1", "2", "3"]}
          maxZoom={19}
        />
      )}

      {basemap === "dark" && (
        <>
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a> &copy; OSM'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
            opacity={0.85}
            zIndex={500}
          />
        </>
      )}

      {basemap === "satellite" && (
        <TileLayer
          attribution='Imagery &copy; <a href="https://maps.google.com" target="_blank" rel="noreferrer">Google Maps</a>'
          url={`https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&key=${googleApiKey}`}
          subdomains={["0", "1", "2", "3"]}
          maxZoom={19}
        />
      )}

      {/* 2. LIVE RAIN / RADAR LAYER (RainViewer real-time Doppler radar tile stream) */}
      {normLayer === "rain" && radarFrame && (
        <TileLayer
          key={`radar-${radarFrame.path}`}
          url={`${radarHost}${radarFrame.path}/256/{z}/{x}/{y}/2/1_1.png`}
          opacity={layerOpacity}
          zIndex={300}
          tileSize={256}
          attribution='Live Radar &copy; <a href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">RainViewer</a>'
        />
      )}

      {/* 3. SATELLITE CLOUDS LAYER (RainViewer infrared satellite) */}
      {normLayer === "satellite" && radarFrame && (
        <TileLayer
          key={`sat-${radarFrame.path}`}
          url={`${radarHost}${radarFrame.path}/256/{z}/{x}/{y}/0/0_0.png`}
          opacity={layerOpacity * 0.9}
          zIndex={300}
          tileSize={256}
          attribution='Satellite &copy; <a href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">RainViewer</a>'
        />
      )}

      {/* 4. LIVE WIND STREAMLINES (Canvas Particle Velocity Layer) */}
      {normLayer === "wind" && (
        <WindStreamOverlay
          opacity={layerOpacity}
          speedMultiplier={1.1}
          densityMultiplier={1.0}
          liveData={liveData}
        />
      )}

      {/* 5. LIVE TEMPERATURE HEATMAP (Canvas Inverse Distance Thermal Gradient) */}
      {normLayer === "temperature" && (
        <ThermalHeatOverlay
          opacity={layerOpacity * 0.65}
          liveData={liveData}
        />
      )}

      {/* 6. Alert circles (when Alerts mode is active) */}
      {normLayer === "alerts" &&
        CITIES.map((c) => {
          if (c.alertLevel === "normal") return null;
          const color = LEVEL_META[c.alertLevel].dot;
          const radius =
            55000 + (c.alertLevel === "extreme" ? 95000 : c.alertLevel === "severe" ? 65000 : 35000);
          return (
            <Circle
              key={c.id + normLayer}
              center={[c.lat, c.lng]}
              radius={radius}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.35,
                weight: 1.5,
                opacity: 0.8,
              }}
              eventHandlers={{ click: () => onSelect(c.id) }}
            />
          );
        })}

      {/* 7. City / Station Observation Pins */}
      {showMarkers &&
        CITIES.map((c) => (
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
