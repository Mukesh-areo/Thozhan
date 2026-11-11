// Used when no tile server is configured. OpenStreetMap's public tiles are fine for development
// and demos, but their usage policy forbids production app traffic: a pilot build must set the
// tile URL and attribution (docs/MOBILE_MVP.md lists the settings).
export const DEFAULT_MAP_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const DEFAULT_MAP_ATTRIBUTION = '© OpenStreetMap';
