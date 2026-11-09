import { t } from '@thozhan/i18n';
import { DEFAULT_MAP_ATTRIBUTION, DEFAULT_MAP_TILE_URL } from '@thozhan/shared';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';

export interface Pin {
  lat: number;
  lon: number;
  kind: 'driver' | 'busy' | 'pickup' | 'drop' | 'sos';
  label?: string;
}

const COLORS: Record<Pin['kind'], string> = { driver: '#1e7a46', busy: '#a15c00', pickup: '#174a3b', drop: '#b3261e', sos: '#d00' };
const TILE_URL = import.meta.env.VITE_MAP_TILE_URL || DEFAULT_MAP_TILE_URL;
const ATTRIBUTION = import.meta.env.VITE_MAP_ATTRIBUTION || DEFAULT_MAP_ATTRIBUTION;
const TILE_ERRORS_BEFORE_MESSAGE = 3;

export function LiveMap({ pins, height = 360, fit = false }: { pins: Pin[]; height?: number; fit?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const fitted = useRef(false);
  const [tilesFailed, setTilesFailed] = useState(false);

  useEffect(() => {
    if (!box.current || map.current) return;
    map.current = L.map(box.current, { zoomControl: true }).setView([13.0627, 80.2507], 12);
    let loaded = 0;
    let errors = 0;
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION })
      .on('tileload', () => {
        loaded++;
        setTilesFailed(false);
      })
      .on('tileerror', () => {
        errors++;
        if (!loaded && errors >= TILE_ERRORS_BEFORE_MESSAGE) setTilesFailed(true);
      })
      .addTo(map.current);
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

  return (
    <div style={{ position: 'relative' }}>
      <div ref={box} style={{ height, borderRadius: 16, overflow: 'hidden' }} />
      {tilesFailed ? (
        <div role="alert" style={{ position: 'absolute', inset: 0, zIndex: 1000, display: 'grid', placeContent: 'center', textAlign: 'center', padding: 16, pointerEvents: 'none' }}>
          <div style={{ background: '#fffd', borderRadius: 12, padding: '10px 14px' }}>
            <div lang="ta">{t('ta', 'm.map.failed')}</div>
            <div lang="en">{t('en', 'm.map.failed')}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
