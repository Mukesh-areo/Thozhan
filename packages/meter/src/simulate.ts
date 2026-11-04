// Synthetic GPS track: drive, a signal stop, drive, a long wait, drive.
import type { GpsFix } from './index.ts';

/** Seconds of [speed km/h] legs: drive, a signal stop, drive, a long wait, drive. */
const SIM_PROFILE: [number, number][] = [
  [150, 28],
  [75, 0],
  [180, 32],
  [140, 0],
  [240, 26],
];

/** One fix per second along `route`, with ±4 m of seeded noise; used for demos and tests. */
export function simulatedFixes(route: readonly (readonly [number, number])[], startAt: number): GpsFix[] {
  const segments = route.slice(1).map((to, i) => {
    const from = route[i]!;
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
    return [...route.at(-1)!] as [number, number];
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
