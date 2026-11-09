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
}

const SLOW_LOAD_MS = 10000;
const TILE_ERRORS_BEFORE_MESSAGE = 3;

/** A value that is safe inside an inline script, even if it contains "</script>". */
const scriptValue = (value: string) => JSON.stringify(value).replace(/</g, '\\u003c');

export function buildMapHtml(tileUrl: string, attribution: string): string {
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body,#m{margin:0;height:100%;background:#e8ede7}
.pin{width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 4px #0006}
.pickup{background:#174a3b}.drop{background:#b3261e}.me{background:#2f6fde}
.driver{width:30px;height:30px;font-size:22px;line-height:30px;text-align:center;border:0;box-shadow:none;background:none}
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
function update(markers) {
  if (!map) return;
  layer.clearLayers();
  var pts = [];
  markers.forEach(function (m) {
    var html = m.kind === 'driver' ? '🛺' : '';
    var icon = L.divIcon({ className: 'pin ' + m.kind, html: html, iconSize: m.kind === 'driver' ? [30, 30] : [18, 18] });
    L.marker([m.lat, m.lon], { icon: icon }).addTo(layer);
    pts.push([m.lat, m.lon]);
  });
  var key = markers.filter(function (m) { return m.kind !== 'driver'; }).map(function (m) { return m.lat + ',' + m.lon; }).join('|');
  if (pts.length && key !== fitted) {
    fitted = key;
    if (pts.length === 1) map.setView(pts[0], 15); else map.fitBounds(pts, { padding: [36, 36], maxZoom: 16 });
  }
}
function onMessage(e) { try { var d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; if (d && d.markers) update(d.markers); } catch (err) {} }
window.addEventListener('message', onMessage);
document.addEventListener('message', onMessage);
window.update = update;
</script></body></html>`;
}

export const MAP_HTML = buildMapHtml(process.env.EXPO_PUBLIC_MAP_TILE_URL || DEFAULT_MAP_TILE_URL, process.env.EXPO_PUBLIC_MAP_ATTRIBUTION || DEFAULT_MAP_ATTRIBUTION);
