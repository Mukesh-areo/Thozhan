// POST { tripId, action: 'complete' | 'deliver' | 'return', otp? } — driver ends a trip.
// The fare comes from the server's own copy of the GPS track, never from the app.
import type { GpsFix } from '@thozhan/meter';
import type { Terrain } from '@thozhan/tariff';
import { measureTrack, priceTrip } from '../_shared/fare.ts';
import { HttpError, body, endpoint, json, requireUser } from '../_shared/http.ts';

interface TripRow {
  category: string;
  flow: string;
  status: string;
  started_at: string | null;
  estimate_meters: number | null;
  terrain: Terrain;
  parcel: { weightGrams?: number } | null;
}

export const handler = endpoint(async (req, ctx) => {
  const driver = await requireUser(req, ctx);
  const { tripId, action, otp } = await body<{
    tripId?: string;
    action?: string;
    otp?: string;
  }>(req);
  if (!tripId || !['complete', 'deliver', 'return'].includes(action ?? '')) throw new HttpError('bad_request');

  const { trip, fixes } = await ctx.rpc<{ trip: TripRow; fixes: GpsFix[] }>('trip_for_finish_internal', { p_trip: tripId, p_driver: driver });
  if (!trip.started_at) throw new HttpError('wrong_state');
  const endedAt = Date.now();
  const measured = measureTrack(fixes, trip.estimate_meters);
  const fare = priceTrip({
    category: trip.category,
    startedAt: trip.started_at,
    endedAt,
    measured,
    terrain: trip.terrain,
    ...(trip.parcel?.weightGrams ? { weightGrams: trip.parcel.weightGrams } : {}),
  });
  const result = await ctx.rpc('finish_trip_internal', {
    p_trip: tripId,
    p_driver: driver,
    p_action: action,
    p_otp: otp ?? null,
    p_distance: measured.distanceMeters,
    p_waiting: measured.waitingSeconds,
    p_fare: fare,
    p_flags: measured.flags,
  });
  return json(result);
});
