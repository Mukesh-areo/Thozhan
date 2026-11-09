import { haversineMeters } from '@thozhan/meter';
import { PLACES } from '@thozhan/shared';
import type { Locale } from '@thozhan/i18n';
import type { Place } from './api';

/** Demo landmarks until geocoding (Photon on OpenStreetMap) is connected. */
export const placesFor = (locale: Locale): Place[] => PLACES.map((p) => ({ name: p[locale], lat: p.lat, lon: p.lon }));

/** Straight-line distance × 1.25 as a stand-in for road routing (OSRM) in quotes. */
export const estimateMeters = (a: Place, b: Place) => Math.round(haversineMeters(a, b) * 1.25);
