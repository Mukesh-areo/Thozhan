// A Leaflet page shared by the native WebView map and the web iframe map. Markers arrive as
// messages, so the map moves smoothly instead of reloading.
//
// OpenStreetMap's public tiles are fine for development and demos; the pilot needs its own
// tile server or a paid provider (OSM's tile usage policy forbids heavy app traffic).

export interface MapMarker {
  lat: number;
  lon: number;
  kind: 'pickup' | 'drop' | 'driver' | 'me';
}

export const MAP_HTML = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#m{margin:0;height:100%;background:#e8ede7}
.pin{width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 4px #0006}
.pickup{background:#174a3b}.drop{background:#b3261e}.me{background:#2f6fde}
.driver{width:30px;height:30px;font-size:22px;line-height:30px;text-align:center;border:0;box-shadow:none;background:none}</style>
</head><body><div id="m"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map = L.map('m', { zoomControl: false, attributionControl: true }).setView([13.0627, 80.2507], 12);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
var layer = L.layerGroup().addTo(map);
var fitted = '';
function update(markers) {
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
