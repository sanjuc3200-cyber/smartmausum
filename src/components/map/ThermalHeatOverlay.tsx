import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { CITIES, type City } from "@/lib/weather-data";

interface ThermalHeatOverlayProps {
  opacity?: number;
  liveData?: Record<string, Partial<City>>;
}

// Color stops for temperature gradient (RGB values)
function tempToRgb(t: number): [number, number, number] {
  if (t <= 10) return [59, 130, 246];   // Deep Blue
  if (t <= 18) return [6, 182, 212];    // Cyan
  if (t <= 24) return [16, 185, 129];   // Emerald Green
  if (t <= 29) return [234, 179, 8];    // Yellow
  if (t <= 34) return [249, 115, 22];   // Orange
  if (t <= 40) return [239, 68, 68];    // Red
  return [168, 85, 247];                // Purple / Extreme Heat
}

function interpolateRgb(t: number): [number, number, number] {
  // Key stops: 10, 18, 24, 29, 34, 40
  const stops = [
    { t: 8, rgb: [37, 99, 235] as [number, number, number] },
    { t: 16, rgb: [6, 182, 212] as [number, number, number] },
    { t: 23, rgb: [16, 185, 129] as [number, number, number] },
    { t: 28, rgb: [234, 179, 8] as [number, number, number] },
    { t: 34, rgb: [249, 115, 22] as [number, number, number] },
    { t: 39, rgb: [239, 68, 68] as [number, number, number] },
    { t: 45, rgb: [147, 51, 234] as [number, number, number] },
  ];

  if (t <= stops[0]!.t) return stops[0]!.rgb;
  if (t >= stops[stops.length - 1]!.t) return stops[stops.length - 1]!.rgb;

  for (let i = 0; i < stops.length - 1; i++) {
    const s1 = stops[i]!;
    const s2 = stops[i + 1]!;
    if (t >= s1.t && t <= s2.t) {
      const factor = (t - s1.t) / (s2.t - s1.t);
      return [
        Math.round(s1.rgb[0] + (s2.rgb[0] - s1.rgb[0]) * factor),
        Math.round(s1.rgb[1] + (s2.rgb[1] - s1.rgb[1]) * factor),
        Math.round(s1.rgb[2] + (s2.rgb[2] - s1.rgb[2]) * factor),
      ];
    }
  }
  return tempToRgb(t);
}

export default function ThermalHeatOverlay({
  opacity = 0.55,
  liveData,
}: ThermalHeatOverlayProps) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.className = "leaflet-zoom-animated pointer-events-none";
    canvas.style.position = "absolute";
    canvas.style.left = "0";
    canvas.style.top = "0";
    canvas.style.zIndex = "350";
    canvas.style.opacity = `${opacity}`;
    canvas.style.transition = "opacity 0.2s ease";

    const pane = map.getPanes().overlayPane;
    pane.appendChild(canvas);
    canvasRef.current = canvas;

    // Station points
    const stations = CITIES.map((c) => {
      const live = liveData?.[c.id];
      return {
        lat: c.lat,
        lng: c.lng,
        temp: live?.temp ?? c.temp,
      };
    });

    const drawHeatmap = () => {
      const size = map.getSize();
      const width = size.x;
      const height = size.y;
      if (width <= 0 || height <= 0) return;

      canvas.width = width;
      canvas.height = height;

      const topLeft = map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(canvas, topLeft);

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Use a low-resolution offscreen grid (e.g. 90x60) for fast bilinear interpolation
      const gridW = 90;
      const gridH = Math.max(Math.round(gridW * (height / width)), 40);
      const offscreen = document.createElement("canvas");
      offscreen.width = gridW;
      offscreen.height = gridH;
      const offCtx = offscreen.getContext("2d");
      if (!offCtx) return;

      const imgData = offCtx.createImageData(gridW, gridH);
      const data = imgData.data;

      // Project stations to lat/lng
      for (let y = 0; y < gridH; y++) {
        const py = (y / gridH) * height;
        for (let x = 0; x < gridW; x++) {
          const px = (x / gridW) * width;
          const latLng = map.containerPointToLatLng([px, py]);
          const lat = latLng.lat;
          const lng = latLng.lng;

          let sumTemp = 0;
          let sumWeight = 0;

          for (let i = 0; i < stations.length; i++) {
            const st = stations[i]!;
            const dLat = lat - st.lat;
            const dLng = lng - st.lng;
            const distSq = dLat * dLat + dLng * dLng;
            // IDW with smooth distance drop-off
            const weight = 1 / Math.pow(distSq + 0.4, 1.4);

            sumTemp += st.temp * weight;
            sumWeight += weight;
          }

          const temp = sumWeight > 0 ? sumTemp / sumWeight : 28;
          const [r, g, b] = interpolateRgb(temp);

          const idx = (y * gridW + x) * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          // Smooth alpha mask: slightly transparent so base map labels and topography show through
          data[idx + 3] = 195;
        }
      }

      offCtx.putImageData(imgData, 0, 0);

      // Render scaled smoothly onto main canvas
      ctx.clearRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(offscreen, 0, 0, width, height);
    };

    drawHeatmap();

    map.on("moveend", drawHeatmap);
    map.on("zoomend", drawHeatmap);
    map.on("resize", drawHeatmap);

    return () => {
      map.off("moveend", drawHeatmap);
      map.off("zoomend", drawHeatmap);
      map.off("resize", drawHeatmap);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, [map, opacity, liveData]);

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.style.opacity = `${opacity}`;
    }
  }, [opacity]);

  return null;
}
