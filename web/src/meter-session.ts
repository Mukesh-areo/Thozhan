// Connects the device-independent meter core to a fix source: the phone's GPS or a
// demo simulation that replays a Chennai street route ten times faster than real time.
import { createMeter, meterFare, type GpsFix, type MeterSnapshot } from '@thozhan/meter';
import { getActiveRule, type FareBreakdown, type Terrain } from '@thozhan/tariff';
import { SIMULATION_ROUTE } from './places.ts';

export type FixSource = 'gps' | 'simulation';

export interface MeterReading {
  snapshot: MeterSnapshot;
  fare: FareBreakdown | null;
}

export interface MeterSession {
  source: FixSource;
  terrain: Terrain;
  vehicleNumber: string | null;
  read(): MeterReading;
  stop(): MeterReading & { endedAt: number };
}

export type GpsError = 'unsupported' | 'denied' | 'unavailable' | 'timeout';

interface Options {
  source: FixSource;
  terrain: Terrain;
  vehicleNumber: string | null;
  onUpdate: (reading: MeterReading) => void;
  onError: (error: GpsError) => void;
}

/** Seconds of [speed km/h] legs: drive, a signal stop, drive, a long wait, drive. */
const SIM_PROFILE: [number, number][] = [
  [150, 28],
  [75, 0],
  [180, 32],
  [140, 0],
  [240, 26],
];
const SIM_SPEEDUP = 10;

export function simulatedFixes(startAt: number): GpsFix[] {
  const segments = SIMULATION_ROUTE.slice(1).map((to, i) => {
    const from = SIMULATION_ROUTE[i]!;
    const north = (to[0] - from[0]) * 111195;
    const east = (to[1] - from[1]) * 111195 * Math.cos((from[0] * Math.PI) / 180);
    return { from, to, meters: Math.hypot(north, east) };
  });
  const total = segments.reduce((n, s) => n + s.meters, 0);
  const at = (d: number): [number, number] => {
    let left = Math.min(d, total);
    for (const s of segments) {
      if (left <= s.meters) {
        const f = left / s.meters;
        return [s.from[0] + (s.to[0] - s.from[0]) * f, s.from[1] + (s.to[1] - s.from[1]) * f];
      }
      left -= s.meters;
    }
    return SIMULATION_ROUTE.at(-1)!;
  };
  let seed = 42;
  const noise = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296 - 0.5) * 8 / 111195;
  const fixes: GpsFix[] = [];
  let travelled = 0;
  let t = 0;
  for (const [seconds, kmh] of SIM_PROFILE) {
    for (let i = 0; i < seconds; i++, t++) {
      const [lat, lon] = at(travelled);
      fixes.push({ lat: lat + noise(), lon: lon + noise(), accuracyMeters: 6, timestamp: startAt + t * 1000 });
      travelled += kmh / 3.6;
    }
  }
  return fixes;
}

export function startMeter(options: Options): MeterSession {
  const meter = createMeter();
  const startedAt = Date.now();
  const rule = getActiveRule('auto', new Date(startedAt));
  let stopped = false;
  let cleanup = () => {};

  const read = (): MeterReading => {
    const snapshot = meter.snapshot();
    return { snapshot, fare: snapshot.startedAt === null ? null : meterFare(rule, snapshot, options.terrain) };
  };
  const feed = (fix: GpsFix) => {
    if (stopped) return;
    meter.addFix(fix);
    options.onUpdate(read());
  };

  if (options.source === 'simulation') {
    const fixes = simulatedFixes(startedAt);
    let i = 0;
    const timer = setInterval(() => {
      const fix = fixes[i++];
      if (fix) feed(fix);
      else clearInterval(timer);
    }, 1000 / SIM_SPEEDUP);
    cleanup = () => clearInterval(timer);
  } else {
    const geo = globalThis.navigator?.geolocation;
    if (!geo) {
      setTimeout(() => options.onError('unsupported'));
    } else {
      const id = geo.watchPosition(
        (p) => feed({ lat: p.coords.latitude, lon: p.coords.longitude, accuracyMeters: p.coords.accuracy, timestamp: p.timestamp }),
        (e) => options.onError(e.code === 1 ? 'denied' : e.code === 3 ? 'timeout' : 'unavailable'),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 },
      );
      // Keep the screen on while the meter runs; browsers pause GPS for hidden pages.
      let lock: { release(): Promise<void> } | null = null;
      (navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<{ release(): Promise<void> }> } }).wakeLock
        ?.request('screen')
        .then((l) => (lock = l))
        .catch(() => {});
      cleanup = () => {
        geo.clearWatch(id);
        lock?.release().catch(() => {});
      };
    }
  }

  return {
    source: options.source,
    terrain: options.terrain,
    vehicleNumber: options.vehicleNumber,
    read,
    stop() {
      stopped = true;
      cleanup();
      return { ...read(), endedAt: Date.now() };
    },
  };
}
