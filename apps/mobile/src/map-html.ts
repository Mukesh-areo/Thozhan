// A Leaflet page shared by the native WebView map and the web iframe map. Markers arrive as
// messages, so the map moves smoothly instead of reloading.
//
// The tile server comes from EXPO_PUBLIC_MAP_TILE_URL and EXPO_PUBLIC_MAP_ATTRIBUTION. Leaflet
// itself and the tiles both come over the network, so the page shows a message in both
// languages when either cannot be loaded, rather than an empty box.
import { t } from '@thozhan/i18n';
import { DEFAULT_MAP_ATTRIBUTION, DEFAULT_MAP_TILE_URL } from '@thozhan/shared';

export interface MapMarker {
  lat: number;
  lon: number;
  kind: 'pickup' | 'drop' | 'driver' | 'me';
  /** The driver's vehicle, drawn in place of a pin. */
  emoji?: string;
  /** Shown in a bubble above the pin. */
  label?: string;
}

const SLOW_LOAD_MS = 10000;
const TILE_ERRORS_BEFORE_MESSAGE = 3;

/** A value that is safe inside an inline script, even if it contains "</script>". */
const scriptValue = (value: string) => JSON.stringify(value).replace(/</g, '\\u003c');

export function buildMapHtml(tileUrl: string, attribution: string): string {
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body,#m{margin:0;height:100%;background:#e8ede7}
.leaflet-tile-pane{filter:saturate(.55) brightness(1.04)}
.leaflet-bottom{margin-bottom:24px}
.pin{width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 4px #0006}
.pickup{background:#174a3b}.drop{background:#b3261e}.me{background:#2f6fde}
.bubble{position:absolute;bottom:32px;left:50%;transform:translateX(-50%);background:#174a3b;color:#fff;padding:7px 18px;border-radius:99px;font:700 15px/1.3 system-ui,sans-serif;white-space:nowrap;box-shadow:0 2px 8px #0005}
.driver{width:38px;height:38px;font-size:22px;line-height:34px;text-align:center;border:2px solid #174a3b;box-shadow:0 2px 6px #0005;background:#fff}
#f{display:none;position:fixed;inset:0;z-index:1000;align-items:center;justify-content:center;text-align:center;padding:16px;pointer-events:none;font:15px/1.4 system-ui,sans-serif;color:#14201b}
#f div{background:#fffd;border-radius:12px;padding:10px 14px}#f p{margin:4px 0}
.failed #f{display:flex}</style>
<script>
var mapStuck = false;
function mapFailed(stuck) { mapStuck = mapStuck || !!stuck; document.documentElement.className = 'failed'; }
function mapOk() { if (!mapStuck) document.documentElement.className = ''; }
var mapSlow = setTimeout(function () { if (!window.L) mapFailed(); }, ${SLOW_LOAD_MS});
</script>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" onerror="mapFailed(true)">
</head><body><div id="m"></div>
<div id="f" role="alert"><div><p lang="ta">${t('ta', 'm.map.failed')}</p><p lang="en">${t('en', 'm.map.failed')}</p></div></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" onerror="mapFailed(true)"></script>
<script>
var map = null;
var layer = null;
var fitted = '';
if (window.L) {
  try {
    clearTimeout(mapSlow);
    mapOk();
    map = L.map('m', { zoomControl: false, attributionControl: true }).setView([13.0627, 80.2507], 12);
    var tiles = L.tileLayer(${scriptValue(tileUrl)}, { maxZoom: 19, attribution: ${scriptValue(attribution)} }).addTo(map);
    var tilesLoaded = 0, tileErrors = 0;
    tiles.on('tileload', function () { tilesLoaded++; mapOk(); });
    tiles.on('tileerror', function () { tileErrors++; if (!tilesLoaded && tileErrors >= ${TILE_ERRORS_BEFORE_MESSAGE}) mapFailed(); });
    layer = L.layerGroup().addTo(map);
  } catch (err) { mapFailed(true); }
}
function escapeHtml(text) { var el = document.createElement('div'); el.textContent = text; return el.innerHTML; }
function update(markers, route) {
  if (!map) return;
  layer.clearLayers();
  var pts = [];
  if (route) {
    var stops = markers.filter(function (m) { return m.kind === 'pickup' || m.kind === 'drop'; }).map(function (m) { return [m.lat, m.lon]; });
    if (stops.length === 2) L.polyline(stops, { color: '#174a3b', weight: 4, dashArray: '1 10', lineCap: 'round' }).addTo(layer);
  }
  markers.forEach(function (m) {
    var html = m.kind === 'driver' ? escapeHtml(m.emoji || '🛺') : m.label ? '<div class="bubble">' + escapeHtml(m.label) + '</div>' : '';
    var icon = L.divIcon({ className: 'pin ' + m.kind, html: html, iconSize: m.kind === 'driver' ? [38, 38] : [18, 18] });
    L.marker([m.lat, m.lon], { icon: icon }).addTo(layer);
    pts.push([m.lat, m.lon]);
  });
  var key = markers.filter(function (m) { return m.kind !== 'driver'; }).map(function (m) { return m.lat + ',' + m.lon; }).join('|') || 'driver';
  if (pts.length && key !== fitted) {
    fitted = key;
    lastPts = pts;
    fit();
  }
}
// The sheet below the map often grows just after new markers arrive, so fit again when the map's size changes.
var lastPts = null;
function fit() {
  if (!lastPts || !lastPts.length) return;
  var h = map.getSize().y;
  if (lastPts.length === 1) map.setView(lastPts[0], 15);
  else map.fitBounds(lastPts, { paddingTopLeft: [40, Math.min(124, h * 0.42)], paddingBottomRight: [40, Math.min(64, h * 0.22)], maxZoom: 16 });
}
if (map) map.on('resize', fit);
function onMessage(e) { try { var d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; if (d && d.markers) update(d.markers, d.route); } catch (err) {} }
window.addEventListener('message', onMessage);
document.addEventListener('message', onMessage);
window.update = update;
</script></body></html>`;
}

export const MAP_HTML = buildMapHtml(process.env.EXPO_PUBLIC_MAP_TILE_URL || DEFAULT_MAP_TILE_URL, process.env.EXPO_PUBLIC_MAP_ATTRIBUTION || DEFAULT_MAP_ATTRIBUTION);
