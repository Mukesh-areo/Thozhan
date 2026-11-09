import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

export interface Pin {
  lat: number;
  lon: number;
  kind: 'driver' | 'busy' | 'pickup' | 'drop' | 'sos';
  label?: string;
}

const COLORS: Record<Pin['kind'], string> = { driver: '#1e7a46', busy: '#a15c00', pickup: '#174a3b', drop: '#b3261e', sos: '#d00' };

// OpenStreetMap's public tiles are for development and demos; the pilot needs its own tiles.
export function LiveMap({ pins, height = 360, fit = false }: { pins: Pin[]; height?: number; fit?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const fitted = useRef(false);

  useEffect(() => {
    if (!box.current || map.current) return;
    map.current = L.map(box.current, { zoomControl: true }).setView([13.0627, 80.2507], 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!layer.current || !map.current) return;
    layer.current.clearLayers();
    for (const p of pins) {
      const size = p.kind === 'sos' ? 18 : 12;
      L.circleMarker([p.lat, p.lon], { radius: size / 2 + 2, color: '#fff', weight: 2, fillColor: COLORS[p.kind], fillOpacity: 1 })
        .bindTooltip(p.label ?? '')
        .addTo(layer.current);
    }
    if (fit && pins.length && !fitted.current) {
      fitted.current = true;
      map.current.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lon])), { padding: [40, 40], maxZoom: 15 });
    }
  }, [pins, fit]);

  return <div ref={box} style={{ height, borderRadius: 16, overflow: 'hidden' }} />;
}
