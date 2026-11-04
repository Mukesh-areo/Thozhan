import type { Locale } from '@thozhan/i18n';

export interface Place {
  en: string;
  ta: string;
  lat: number;
  lon: number;
}

// Demo landmarks until geocoding is connected.
export const PLACES: readonly Place[] = [
  { en: 'Chennai Central', ta: 'சென்னை சென்ட்ரல்', lat: 13.0837, lon: 80.2707 },
  { en: 'Marina Beach', ta: 'மெரினா கடற்கரை', lat: 13.05, lon: 80.2824 },
  { en: 'T. Nagar', ta: 'தி. நகர்', lat: 13.0418, lon: 80.2341 },
  { en: 'Anna Nagar', ta: 'அண்ணா நகர்', lat: 13.085, lon: 80.2101 },
  { en: 'Guindy Metro', ta: 'கிண்டி மெட்ரோ', lat: 13.0098, lon: 80.2121 },
  { en: 'Adyar', ta: 'அடையாறு', lat: 13.0012, lon: 80.2565 },
  { en: 'Chennai Airport', ta: 'சென்னை விமான நிலையம்', lat: 12.9941, lon: 80.1709 },
];

export const placeName = (index: number | null, locale: Locale) => (index === null ? '—' : (PLACES[index]?.[locale] ?? '—'));

/** Straight-line distance × 1.25 as a stand-in for road routing. */
export function estimateRouteMeters(from: number, to: number): number {
  const a = PLACES[from]!;
  const b = PLACES[to]!;
  const km = Math.hypot((a.lat - b.lat) * 111.195, (a.lon - b.lon) * 108.3);
  return Math.round(km * 1.25 * 1000);
}

/** A real Chennai street path (Central → Egmore → Nungambakkam) for the meter simulation. */
export const SIMULATION_ROUTE: readonly [number, number][] = [
  [13.0827, 80.2752],
  [13.0806, 80.2685],
  [13.0789, 80.2612],
  [13.0763, 80.2548],
  [13.0732, 80.2489],
  [13.0688, 80.2441],
  [13.0636, 80.2405],
  [13.0589, 80.2378],
  [13.0544, 80.2341],
];
