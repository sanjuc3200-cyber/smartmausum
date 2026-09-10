import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { CITIES, type City } from "@/lib/weather-data";

interface WindStreamOverlayProps {
  opacity?: number;
  speedMultiplier?: number;
  densityMultiplier?: number;
  liveData?: Record<string, Partial<City>>;
}

interface Particle {
  x: number;
  y: number;
  oldX: number;
  oldY: number;
  age: number;
  maxAge: number;
  speed: number;
}

// Wind speed color scale for streamlines (High contrast on bright & light maps)
function getWindColor(speedKmh: number, alpha = 0.85): string {
  if (speedKmh < 15) return `rgba(2, 132, 199, ${alpha})`;  // Vivid Sky / Ocean Blue
  if (speedKmh < 28) return `rgba(16, 185, 129, ${alpha})`; // Emerald Green
  if (speedKmh < 45) return `rgba(217, 119, 6, ${alpha})`;  // Amber Gold
  if (speedKmh < 65) return `rgba(234, 88, 12, ${alpha})`;  // Rich Orange
  if (speedKmh < 85) return `rgba(225, 29, 72, ${alpha})`;  // Crimson Red
  return `rgba(147, 51, 234, ${alpha})`;                    // Purple / Storm
}

export default function WindStreamOverlay({
  opacity = 0.85,
  speedMultiplier = 1.0,
  densityMultiplier = 1.0,
  liveData,
}: WindStreamOverlayProps) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    // 1. Create and setup canvas element in Leaflet's overlay pane
    const canvas = document.createElement("canvas");
    canvas.className = "leaflet-zoom-animated pointer-events-none";
    canvas.style.position = "absolute";
    canvas.style.left = "0";
    canvas.style.top = "0";
    canvas.style.zIndex = "400";
    canvas.style.opacity = `${opacity}`;
    canvas.style.transition = "opacity 0.2s ease";

    const pane = map.getPanes().overlayPane;
    pane.appendChild(canvas);
    canvasRef.current = canvas;

    // Station wind vector field preparation
    const stations = CITIES.map((c) => {
      const live = liveData?.[c.id];
      const windSpeed = live?.wind ?? c.wind;
      const windDeg = live?.windDeg ?? c.windDeg;
      // Flow direction is heading towards (windDeg + 180)
      const flowRad = ((windDeg + 180) % 360) * (Math.PI / 180);
      const u = Math.sin(flowRad) * (windSpeed / 10);
      const v = -Math.cos(flowRad) * (windSpeed / 10);
      return {
        lat: c.lat,
        lng: c.lng,
        speed: windSpeed,
        u,
        v,
      };
    });

    let width = 0;
    let height = 0;

    const resetCanvas = () => {
      const size = map.getSize();
      width = size.x;
      height = size.y;
      canvas.width = width;
      canvas.height = height;

      const topLeft = map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(canvas, topLeft);

      // Re-initialize particles across visible canvas
      const count = Math.round(180 * densityMultiplier);
      particlesRef.current = Array.from({ length: count }, () => {
        const x = Math.random() * width;
        const y = Math.random() * height;
        return {
          x,
          y,
          oldX: x,
          oldY: y,
          age: Math.floor(Math.random() * 80),
          maxAge: 40 + Math.floor(Math.random() * 60),
          speed: 15,
        };
      });
    };

    resetCanvas();

    // Calculate interpolated wind vector at screen coordinate (px, py)
    const getVectorAtPoint = (px: number, py: number): { u: number; v: number; speed: number } => {
      const pt = map.containerPointToLatLng([px, py]);
      const lat = pt.lat;
      const lng = pt.lng;

      let sumU = 0;
      let sumV = 0;
      let sumSpeed = 0;
      let sumWeight = 0;

      for (let i = 0; i < stations.length; i++) {
        const st = stations[i]!;
        const dLat = lat - st.lat;
        const dLng = lng - st.lng;
        const distSq = dLat * dLat + dLng * dLng;
        // Inverse distance squared weighting
        const weight = 1 / (distSq + 0.15);

        sumU += st.u * weight;
        sumV += st.v * weight;
        sumSpeed += st.speed * weight;
        sumWeight += weight;
      }

      if (sumWeight <= 0) return { u: 0, v: 0, speed: 10 };
      return {
        u: sumU / sumWeight,
        v: sumV / sumWeight,
        speed: sumSpeed / sumWeight,
      };
    };

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isMoving = false;

    const onMoveStart = () => {
      isMoving = true;
    };

    const onMoveEnd = () => {
      isMoving = false;
      resetCanvas();
    };

    map.on("movestart", onMoveStart);
    map.on("moveend", onMoveEnd);
    map.on("zoomend", resetCanvas);
    map.on("resize", resetCanvas);

    // Animation Loop
    const render = () => {
      if (!isMoving && ctx && width > 0 && height > 0) {
        // Subtle trail fading: fade previous trails smoothly
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
        ctx.fillRect(0, 0, width, height);

        ctx.globalCompositeOperation = "source-over";
        ctx.lineWidth = 2.0;
        ctx.lineCap = "round";

        const particles = particlesRef.current;
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i]!;
          p.age++;

          if (p.age > p.maxAge || p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
            p.x = Math.random() * width;
            p.y = Math.random() * height;
            p.oldX = p.x;
            p.oldY = p.y;
            p.age = 0;
            p.maxAge = 40 + Math.floor(Math.random() * 60);
            continue;
          }

          const { u, v, speed } = getVectorAtPoint(p.x, p.y);
          p.speed = speed;

          // Scale particle step by local wind velocity and speedMultiplier
          const velocityScale = Math.min(Math.max((speed / 12) * speedMultiplier, 0.8), 5.0);
          p.oldX = p.x;
          p.oldY = p.y;
          p.x += u * velocityScale;
          p.y += v * velocityScale;

          // Alpha curve: fades in quickly, peaks, fades out gracefully
          const lifeProgress = p.age / p.maxAge;
          const alpha = lifeProgress < 0.2 ? lifeProgress / 0.2 : (1 - lifeProgress);
          ctx.strokeStyle = getWindColor(speed, Math.max(alpha * 0.9, 0.15));

          ctx.beginPath();
          ctx.moveTo(p.oldX, p.oldY);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      map.off("movestart", onMoveStart);
      map.off("moveend", onMoveEnd);
      map.off("zoomend", resetCanvas);
      map.off("resize", resetCanvas);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, [map, opacity, speedMultiplier, densityMultiplier, liveData]);

  // Handle dynamic opacity changes smoothly
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.style.opacity = `${opacity}`;
    }
  }, [opacity]);

  return null;
}
