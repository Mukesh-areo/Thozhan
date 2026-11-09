// Device-independent core of the virtual meter: turns a stream of GPS fixes into
// billable distance and waiting time. No device APIs here, so it runs in the app,
// on the server (to re-check a synced track) and in tests.
import { calculateFare, type FareBreakdown, type TariffRule, type Terrain } from '@thozhan/tariff';

export interface GpsFix {
  lat: number;
  lon: number;
  accuracyMeters: number;
  /** Epoch milliseconds from the location provider, not the wall clock. */
  timestamp: number;
  /** Android reports mock-provider fixes; any such fix is rejected. */
  isMock?: boolean;
}

export interface MeterConfig {
  /** Discard fixes less accurate than this. */
  maxAccuracyMeters: number;
  /** Discard fixes implying a faster speed than the vehicle can reach. */
  maxSpeedKmh: number;
  /** Below this speed the vehicle counts as waiting. */
  waitingSpeedKmh: number;
  /** A slow run is charged as waiting only once it lasts this long. */
  waitingAfterSeconds: number;
  /** Movement of the smoothed position smaller than this is treated as GPS jitter. */
  minMoveMeters: number;
  /** Kalman process noise: how fast the true position may drift, in m/s. */
  smoothingMps: number;
  /** A gap longer than this between accepted fixes is flagged on the receipt. */
  maxGapSeconds: number;
}

export const AUTO_METER_CONFIG: MeterConfig = Object.freeze({
  maxAccuracyMeters: 25,
  maxSpeedKmh: 80,
  waitingSpeedKmh: 5,
  waitingAfterSeconds: 60,
  minMoveMeters: 8,
  smoothingMps: 3,
  maxGapSeconds: 30,
});

export type MeterFlag = 'gps-gap' | 'speed-jump' | 'clock-skew' | 'mock-location' | 'low-accuracy';

export interface MeterSnapshot {
  startedAt: number | null;
  elapsedSeconds: number;
  distanceMeters: number;
  waitingSeconds: number;
  acceptedFixes: number;
  rejectedFixes: number;
  flags: MeterFlag[];
}

const EARTH_RADIUS_M = 6371008.8;
const M_PER_DEG_LAT = (Math.PI / 180) * EARTH_RADIUS_M;
const rad = (deg: number) => (deg * Math.PI) / 180;

export function haversineMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

interface Point {
  x: number;
  y: number;
  timestamp: number;
}

export function createMeter(config: MeterConfig = AUTO_METER_CONFIG) {
  const maxSpeed = config.maxSpeedKmh / 3.6;
  const waitSpeed = config.waitingSpeedKmh / 3.6;
  const flags = new Set<MeterFlag>();
  // Local planar frame (metres) around the first fix; accurate enough at city scale.
  let origin: { lat: number; lon: number; mPerDegLon: number } | null = null;
  // Smoothed position and its variance (m²).
  let smooth: Point | null = null;
  let variance = 0;
  let anchor: Point | null = null;
  let last: GpsFix | null = null;
  let startedAt: number | null = null;
  let distance = 0;
  let waiting = 0;
  let slowRun = 0;
  let accepted = 0;
  let rejected = 0;

  const reject = (flag?: MeterFlag) => {
    rejected++;
    if (flag) flags.add(flag);
    return false;
  };

  /** Feed one fix; returns whether it was accepted. */
  function addFix(fix: GpsFix): boolean {
    if (fix.isMock) return reject('mock-location');
    if (!(fix.accuracyMeters <= config.maxAccuracyMeters)) return reject('low-accuracy');
    if (!last || !origin || !smooth || !anchor) {
      origin = { lat: fix.lat, lon: fix.lon, mPerDegLon: M_PER_DEG_LAT * Math.cos(rad(fix.lat)) };
      smooth = anchor = { x: 0, y: 0, timestamp: fix.timestamp };
      variance = fix.accuracyMeters ** 2;
      last = fix;
      startedAt = fix.timestamp;
      accepted++;
      return true;
    }
    const dt = (fix.timestamp - last.timestamp) / 1000;
    if (dt <= 0) return reject('clock-skew');

    const measured = { x: (fix.lon - origin.lon) * origin.mPerDegLon, y: (fix.lat - origin.lat) * M_PER_DEG_LAT };
    // Reject physically impossible jumps before they can pull the filter. Compare raw fix to
    // raw fix: the smoothed position trails a moving vehicle and would flag honest fixes.
    if (haversineMeters(last, fix) - (last.accuracyMeters + fix.accuracyMeters) > maxSpeed * dt) return reject('speed-jump');

    const predicted = variance + dt * config.smoothingMps ** 2;
    const gain = predicted / (predicted + fix.accuracyMeters ** 2);
    smooth = {
      x: smooth.x + gain * (measured.x - smooth.x),
      y: smooth.y + gain * (measured.y - smooth.y),
      timestamp: fix.timestamp,
    };
    variance = (1 - gain) * predicted;

    let slow = true;
    const fromAnchor = Math.hypot(smooth.x - anchor.x, smooth.y - anchor.y);
    if (fromAnchor >= config.minMoveMeters) {
      const segmentSpeed = fromAnchor / ((smooth.timestamp - anchor.timestamp) / 1000);
      distance += fromAnchor;
      slow = segmentSpeed < waitSpeed;
      anchor = smooth;
    }

    if (dt > config.maxGapSeconds) flags.add('gps-gap');
    if (slow) {
      const before = slowRun;
      slowRun += dt;
      if (slowRun >= config.waitingAfterSeconds) waiting += before < config.waitingAfterSeconds ? slowRun : dt;
    } else {
      slowRun = 0;
    }
    last = fix;
    accepted++;
    return true;
  }

  function snapshot(): MeterSnapshot {
    return {
      startedAt,
      elapsedSeconds: startedAt !== null && last ? (last.timestamp - startedAt) / 1000 : 0,
      distanceMeters: Math.round(distance),
      waitingSeconds: Math.round(waiting),
      acceptedFixes: accepted,
      rejectedFixes: rejected,
      flags: [...flags].sort(),
    };
  }

  return { addFix, snapshot };
}

export type Meter = ReturnType<typeof createMeter>;

export { simulatedFixes } from './simulate.ts';

/** Live or final fare for the meter's current reading. */
export function meterFare(rule: TariffRule, reading: MeterSnapshot, terrain: Terrain = 'plain'): FareBreakdown {
  if (reading.startedAt === null) throw new RangeError('Meter has not received a usable GPS fix');
  return calculateFare(rule, {
    distanceMeters: reading.distanceMeters,
    waitingSeconds: reading.waitingSeconds,
    rideSeconds: reading.elapsedSeconds,
    startedAt: reading.startedAt,
    terrain,
  });
}
