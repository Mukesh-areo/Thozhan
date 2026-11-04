// POST { clientKey, vehicleNumber?, terrain?, startedAt, endedAt, fixes } — uploads a street-hail
// meter trip recorded on the phone (possibly hours later, after being offline). The server
// replays the fixes and prices the trip itself; the phone's own fare is only a display copy.
import type { GpsFix } from '@thozhan/meter';
import { measureTrack, priceTrip } from '../_shared/fare.ts';
import { HttpError, body, endpoint, json, requireUser } from '../_shared/http.ts';

const MAX_FIXES = 4 * 3600; // four hours at 1 Hz

export const handler = endpoint(async (req, ctx) => {
  const rider = await requireUser(req, ctx);
  const input = await body<{
    clientKey?: string;
    vehicleNumber?: string;
    terrain?: 'plain' | 'ghat';
    startedAt?: number;
    endedAt?: number;
    fixes?: GpsFix[];
  }>(req);
  const { clientKey, startedAt, endedAt, fixes } = input;
  if (!clientKey || !/^[\w-]{8,64}$/.test(clientKey)) throw new HttpError('bad_request');
  if (!Array.isArray(fixes) || fixes.length > MAX_FIXES) throw new HttpError('bad_request');
  if (typeof startedAt !== 'number' || typeof endedAt !== 'number' || endedAt < startedAt || endedAt > Date.now() + 60000) {
    throw new HttpError('bad_request');
  }
  const clean = fixes.filter(
    (f) =>
      [f.lat, f.lon, f.accuracyMeters, f.timestamp].every((n) => typeof n === 'number' && Number.isFinite(n)) &&
      f.timestamp >= startedAt - 60000 &&
      f.timestamp <= endedAt + 60000,
  );
  const measured = measureTrack(clean, null);
  const terrain = input.terrain === 'ghat' ? 'ghat' : 'plain';
  const fare = priceTrip({
    category: 'auto',
    startedAt,
    endedAt,
    measured,
    terrain,
  });
  const trip = await ctx.rpc('record_meter_trip_internal', {
    p_rider: rider,
    p_client_key: clientKey,
    p_vehicle_number: input.vehicleNumber ?? null,
    p_terrain: terrain,
    p_started_at: new Date(startedAt).toISOString(),
    p_ended_at: new Date(endedAt).toISOString(),
    p_distance: measured.distanceMeters,
    p_waiting: measured.waitingSeconds,
    p_fare: fare,
    p_flags: measured.flags,
  });
  return json(trip);
});
