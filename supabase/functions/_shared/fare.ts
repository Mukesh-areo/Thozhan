// Server-side fare: replays the GPS track through the same meter core the phone uses, then
// prices it with the shared tariff engine. Apps never send a fare the server trusts.
import { createMeter, type GpsFix } from '@thozhan/meter';
import { calculateFare, getActiveRule, type FareBreakdown, type Terrain } from '@thozhan/tariff';

/** Fewer accepted fixes than this and the track is not trusted for billing distance. */
export const MIN_TRACK_FIXES = 10;

export interface Measured {
  distanceMeters: number;
  waitingSeconds: number;
  flags: string[];
}

export function measureTrack(fixes: GpsFix[], fallbackMeters: number | null): Measured {
  const meter = createMeter();
  for (const fix of [...fixes].sort((a, b) => a.timestamp - b.timestamp)) meter.addFix(fix);
  const reading = meter.snapshot();
  if (reading.acceptedFixes < MIN_TRACK_FIXES && fallbackMeters) {
    // No usable track (GPS off, or a phone that lost signal): bill the route estimate shown
    // at booking, and say so on the receipt.
    return {
      distanceMeters: fallbackMeters,
      waitingSeconds: 0,
      flags: [...reading.flags, 'no-gps-track'],
    };
  }
  return {
    distanceMeters: reading.distanceMeters,
    waitingSeconds: reading.waitingSeconds,
    flags: reading.flags,
  };
}

export function priceTrip(input: {
  category: string;
  startedAt: string | number;
  endedAt: string | number;
  measured: Measured;
  terrain?: Terrain;
  weightGrams?: number;
}): FareBreakdown {
  const startedAt = new Date(input.startedAt);
  const rule = getActiveRule(input.category, startedAt);
  return calculateFare(rule, {
    distanceMeters: input.measured.distanceMeters,
    waitingSeconds: input.measured.waitingSeconds,
    rideSeconds: Math.max(0, (new Date(input.endedAt).getTime() - startedAt.getTime()) / 1000),
    startedAt,
    terrain: input.terrain ?? 'plain',
    ...(input.weightGrams ? { weightGrams: input.weightGrams } : {}),
  });
}
