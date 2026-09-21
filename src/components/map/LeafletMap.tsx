import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { RadarFrame } from "@/lib/radar-api";
import type { SelectedLocation } from "@/lib/prefs";
import WindStreamOverlay from "./WindStreamOverlay";
import ThermalHeatOverlay from "./ThermalHeatOverlay";

export type MapLayer = "none" | "rain" | "wind" | "temperature" | "satellite" | "alerts";
export type BasemapType = "voyager" | "dark" | "satellite";

const EMOJI: Record<string, string> = {
  sunny: "☀️",
  partly: "⛅",
  cloudy: "☁️",
  rain: "🌧️",
  "heavy-rain": "⛈️",
  storm: "🌩️",
  haze: "🌫️",
  mist: "🌫️",
  fog: "🌫️",
  snow: "❄️",
};

function weatherPinHtml(name: string, temp?: number, conditionEmoji: string = "⛅") {
  const tempStr = temp !== undefined ? `${Math.round(temp)}°` : "";
  return `<div class="mausam-weather-pin">
    <div class="pin-card">
      <span class="pin-icon">${conditionEmoji}</span>
      <span class="pin-title">${name}</span>
      ${tempStr ? `<span class="pin-temp">${tempStr}</span>` : ""}
    </div>
    <div class="pin-needle"></div>
  </div>`;
}

function FlyTo({ target, zoom = 11 }: { target: [number, number] | null; zoom?: number | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target, zoom, { duration: 1.2 });
    }
  }, [target, zoom, map]);
  return null;
}

function ZoomBridge({ onReady }: { onReady: (m: L.Map) => void }) {
  const map = useMap();
  useEffect(() => onReady(map), [map, onReady]);
  return null;
}

function MapClickHandler({ onClick }: { onClick?: ((lat: number, lng: number) => void) | undefined }) {
  useMapEvents({
    click(e) {
      if (onClick) {
        onClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export default function LeafletMap({
  layer = "rain",
  flyTarget,
  onMapReady,
  onMapClick,
  radarFrame,
  radarHost = "https://tilecache.rainviewer.com",
  layerOpacity = 0.82,
  basemap = "voyager",
  liveData = {},
  activeLocation,
  activeLocationTemp,
  activeLocationCondition,
}: {
  layer: MapLayer;
  flyTarget: [number, number] | null;
  onMapReady: (m: L.Map) => void;
  onMapClick?: ((lat: number, lng: number) => void) | undefined;
  radarFrame?: RadarFrame | null | undefined;
  radarHost?: string | undefined;
  layerOpacity?: number | undefined;
  basemap?: BasemapType | undefined;
  liveData?: Record<string, { temp?: number; wind?: number; windDeg?: number }> | undefined;
  activeLocation?: SelectedLocation | undefined;
  activeLocationTemp?: number | undefined;
  activeLocationCondition?: string | undefined;
}) {
  const activeLocationIcon = useMemo(() => {
    if (!activeLocation) return null;
    const condKey = (activeLocationCondition || "").toLowerCase();
    const emoji = EMOJI[condKey] ?? "📍";
    return L.divIcon({
      className: "leaflet-div-icon",
      html: weatherPinHtml(activeLocation.name, activeLocationTemp, emoji),
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
  }, [activeLocation, activeLocationTemp, activeLocationCondition]);

  const cartoKey = (import.meta.env.VITE_CARTO_API_KEY || "").trim();
  const hasCartoKey = Boolean(cartoKey);
  const cartoKeyParam = hasCartoKey ? `?key=${encodeURIComponent(cartoKey)}` : "";

  return (
    <MapContainer
      center={activeLocation ? [activeLocation.lat, activeLocation.lng] : [22.0, 79.5]}
      zoom={activeLocation ? 10 : 5}
      zoomSnap={0.5}
      zoomDelta={1}
      zoomControl={false}
      attributionControl={true}
      className="h-full w-full bg-sky-50"
      minZoom={2}
      maxZoom={19}
    >
      {/* 1. Base Map: Clean Navigation Canvas (CARTO Voyager with authenticated key; OSM fallback when unconfigured) */}
      {basemap === "voyager" && (
        hasCartoKey ? (
          <TileLayer
            key="carto-voyager"
            attribution='&copy; <a href="https://carto.com/" target="_blank" rel="noreferrer">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'
            url={`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png${cartoKeyParam}`}
            subdomains={["a", "b", "c", "d"]}
            minZoom={2}
            maxNativeZoom={19}
            maxZoom={19}
          />
        ) : (
          <TileLayer
            key="osm-standard"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            subdomains={["a", "b", "c"]}
            minZoom={2}
            maxNativeZoom={19}
            maxZoom={19}
          />
        )
      )}

      {basemap === "dark" && (
        hasCartoKey ? (
          <TileLayer
            key="carto-dark"
            attribution='&copy; <a href="https://carto.com/" target="_blank" rel="noreferrer">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'
            url={`https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png${cartoKeyParam}`}
            subdomains={["a", "b", "c", "d"]}
            minZoom={2}
            maxNativeZoom={19}
            maxZoom={19}
          />
        ) : (
          <TileLayer
            key="esri-dark"
            attribution='Tiles &copy; Esri &mdash; &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            minZoom={2}
            maxNativeZoom={16}
            maxZoom={19}
          />
        )
      )}

      {basemap === "satellite" && (
        <TileLayer
          key="google-sat"
          attribution='Imagery &copy; <a href="https://maps.google.com" target="_blank" rel="noreferrer">Google Maps</a>'
          url="https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
          subdomains={["0", "1", "2", "3"]}
          minZoom={2}
          maxNativeZoom={18}
          maxZoom={19}
        />
      )}

      {/* 2. Weather Overlay Layer: Exactly ONE mode active at a time */}
      {layer === "rain" && radarFrame && (
        <TileLayer
          key={`radar-${radarFrame.path}`}
          url={`${radarHost || "https://tilecache.rainviewer.com"}${radarFrame.path}/256/{z}/{x}/{y}/2/1_1.png`}
          opacity={layerOpacity}
          zIndex={300}
          tileSize={256}
          minZoom={2}
          maxNativeZoom={7}
          maxZoom={19}
          attribution='Live Radar &copy; <a href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">RainViewer</a>'
        />
      )}

      {layer === "wind" && (
        <WindStreamOverlay
          opacity={layerOpacity}
          speedMultiplier={1.1}
          densityMultiplier={1.0}
          liveData={liveData}
        />
      )}

      {layer === "temperature" && (
        <ThermalHeatOverlay
          opacity={layerOpacity * 0.65}
          liveData={liveData}
        />
      )}

      {/* 3. Clean Weather Location Marker (Single source of truth) */}
      {activeLocation && activeLocationIcon && (
        <Marker
          position={[activeLocation.lat, activeLocation.lng]}
          icon={activeLocationIcon}
          zIndexOffset={3000}
        />
      )}

      <FlyTo target={flyTarget} zoom={11} />
      <ZoomBridge onReady={onMapReady} />
      <MapClickHandler onClick={onMapClick} />
    </MapContainer>
  );
}
