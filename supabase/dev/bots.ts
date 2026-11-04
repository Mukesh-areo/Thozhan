// Demo driver bots for local development: the two seeded drivers go online near Chennai
// Central and T. Nagar, accept offers and move each trip along, so one person can try the
// passenger app alone. They use the same API as the driver app. Being a demo, they read the
// passenger's OTP straight from the database, and when a trip starts they write a simulated,
// back-dated GPS track for it so the server measures the fare as it would for a real phone.
import { simulatedFixes } from '@thozhan/meter';
import type { Database } from './db.ts';
import { signJwt } from './server.ts';

const BOTS = [
  {
    id: '00000000-0000-4000-a000-000000000011',
    phone: '919000000011',
    home: [13.0827, 80.2752] as const,
  },
  {
    id: '00000000-0000-4000-a000-000000000012',
    phone: '919000000012',
    home: [13.0418, 80.2341] as const,
  },
];

/** Seconds a bot waits in each state before taking the next step. */
const PACE: Record<string, [number, string]> = {
  ACCEPTED: [6, 'arrive'],
  ARRIVED: [5, 'start'],
  AT_PICKUP: [5, 'pickup'],
  PICKED_UP: [3, 'depart'],
  IN_PROGRESS: [25, 'complete'],
  IN_TRANSIT: [20, 'reach-drop'],
  AT_DROP: [4, 'deliver'],
};

export function startBots(db: Database, app: (req: Request) => Promise<Response>, baseUrl: string) {
  const busy = new Set<string>();
  const seen = new Map<string, number>();

  async function call(bot: (typeof BOTS)[number], path: string, body: unknown) {
    const token = signJwt({
      sub: bot.id,
      role: 'authenticated',
      phone: bot.phone,
      exp: Math.floor(Date.now() / 1000) + 600,
    });
    const res = await app(
      new Request(baseUrl + path, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      }),
    );
    const text = await res.text();
    if (!res.ok) throw new Error(`${path}: ${text}`);
    return text ? JSON.parse(text) : null;
  }

  async function step(bot: (typeof BOTS)[number]) {
    const inbox = await call(bot, '/rest/v1/rpc/driver_inbox', {});
    const trip = inbox.trip;
    if (!trip) {
      await call(bot, '/rest/v1/rpc/driver_set_online', {
        p_online: true,
        p_lat: bot.home[0],
        p_lon: bot.home[1],
      });
      const offer = inbox.offers[0];
      if (offer && Date.parse(offer.expiresAt) - Date.now() < 27000) {
        await call(bot, '/rest/v1/rpc/accept_offer', { p_offer: offer.id });
        console.log(`[bots] ${bot.phone} accepted ${offer.trip.code}`);
      }
      return;
    }
    const pace = PACE[trip.status];
    if (!pace) return;
    // When this bot first saw the trip in its current state.
    const key = trip.id + trip.status;
    if (!seen.has(key)) {
      seen.set(key, Date.now());
      if (trip.status === 'IN_PROGRESS' || trip.status === 'IN_TRANSIT') await writeTrack(trip);
    }
    const waited = (Date.now() - seen.get(key)!) / 1000;

    // Move towards pickup before arriving and towards the drop once on board.
    const target = ['ACCEPTED'].includes(trip.status) ? trip.pickup : ['IN_PROGRESS', 'IN_TRANSIT'].includes(trip.status) ? trip.dropoff : null;
    if (target) {
      const f = Math.min(1, waited / pace[0]);
      const from = trip.status === 'ACCEPTED' ? { lat: bot.home[0], lon: bot.home[1] } : trip.pickup;
      await db.pg.query(`update drivers set lat = $2, lon = $3, location_at = now() where id = $1`, [
        bot.id,
        from.lat + (target.lat - from.lat) * f,
        from.lon + (target.lon - from.lon) * f,
      ]);
    } else {
      await db.pg.query(`update drivers set location_at = now() where id = $1`, [bot.id]);
    }
    if (waited < pace[0]) return;

    const [, action] = pace;
    const { rows } = await db.pg.query<{ start_otp: string; drop_otp: string }>(`select start_otp, drop_otp from trips where id = $1`, [trip.id]);
    const otp = action === 'start' || action === 'pickup' ? rows[0]!.start_otp : action === 'deliver' ? rows[0]!.drop_otp : undefined;
    if (action === 'complete' || action === 'deliver')
      await call(bot, '/functions/v1/finish-trip', {
        tripId: trip.id,
        action,
        otp,
      });
    else
      await call(bot, '/rest/v1/rpc/trip_action', {
        p_trip: trip.id,
        p_action: action,
        p_otp: otp ?? null,
      });
    console.log(`[bots] ${bot.phone} ${action} ${trip.code}`);
  }

  async function writeTrack(trip: { id: string; pickup: { lat: number; lon: number }; dropoff: { lat: number; lon: number } }) {
    const route = [
      [trip.pickup.lat, trip.pickup.lon],
      [trip.dropoff.lat, trip.dropoff.lon],
    ] as const;
    const fixes = simulatedFixes(route, 0);
    const startAt = Date.now() - fixes.length * 1000;
    await db.pg.query(
      `insert into track_points (trip_id, at, lat, lon, accuracy)
       select $1, to_timestamp((f->>'t')::float8 / 1000), (f->>'lat')::float8, (f->>'lon')::float8, 6
       from jsonb_array_elements($2::jsonb) f on conflict do nothing`,
      [trip.id, JSON.stringify(fixes.map((f) => ({ t: startAt + f.timestamp, lat: f.lat, lon: f.lon })))],
    );
  }

  setInterval(() => {
    for (const bot of BOTS) {
      if (busy.has(bot.id)) continue;
      busy.add(bot.id);
      step(bot)
        .catch((e) => console.warn('[bots]', String(e.message ?? e)))
        .finally(() => busy.delete(bot.id));
    }
  }, 1500);
  console.log('[bots] demo drivers running: +91 90000 00011 (Chennai Central), +91 90000 00012 (T. Nagar)');
}
