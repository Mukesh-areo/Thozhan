// Connects the device-independent meter core to a fix source: the phone's GPS or a
// demo simulation that replays a Chennai street route ten times faster than real time.
import { createMeter, meterFare, simulatedFixes, type GpsFix, type MeterSnapshot } from '@thozhan/meter';
import { getActiveRule, type FareBreakdown, type Terrain } from '@thozhan/tariff';
import { SIMULATION_ROUTE } from '@thozhan/shared';

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

/** The simulation replays the street route ten times faster than real time. */
const SIM_SPEEDUP = 10;

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
    const fixes = simulatedFixes(SIMULATION_ROUTE, startedAt);
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
