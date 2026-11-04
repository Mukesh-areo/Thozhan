// The street-hail meter on the phone. It works offline: the run and its GPS fixes are saved
// on the device, the live fare comes from the local tariff copy, and finished runs wait in an
// outbox until they upload to `sync-meter`, where the server reprices them from the fixes.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMeter, meterFare, simulatedFixes, type GpsFix, type MeterSnapshot } from '@thozhan/meter';
import { SIMULATION_ROUTE } from '@thozhan/shared';
import { getActiveRule, type FareBreakdown, type Terrain } from '@thozhan/tariff';
import * as Crypto from 'expo-crypto';
import { invoke, type Trip } from './api';
import { track, type Tracking } from './location';

const RUN_KEY = 'thozhan-meter-run';
const OUTBOX_KEY = 'thozhan-meter-outbox';
/** The demo route replays ten times faster than real time. */
const DEMO_SPEEDUP = 10;

export type Source = 'gps' | 'demo';

export interface MeterRun {
  clientKey: string;
  startedAt: number;
  vehicleNumber: string;
  terrain: Terrain;
  source: Source;
  fixes: GpsFix[];
}

export interface FinishedRun extends MeterRun {
  endedAt: number;
  fare: FareBreakdown | null;
  snapshot: MeterSnapshot;
}

export interface MeterState {
  run: MeterRun | null;
  snapshot: MeterSnapshot | null;
  fare: FareBreakdown | null;
  background: boolean;
  outbox: FinishedRun[];
  /** Server trip ids for uploaded runs, by client key. */
  synced: Record<string, string>;
}

let state: MeterState = { run: null, snapshot: null, fare: null, background: false, outbox: [], synced: {} };
const subscribers = new Set<() => void>();
let meter = createMeter();
let tracking: Tracking | null = null;
let demoTimer: ReturnType<typeof setInterval> | null = null;
let saveTimer: ReturnType<typeof setInterval> | null = null;
let loaded = false;

function set(patch: Partial<MeterState>) {
  state = { ...state, ...patch };
  for (const fn of subscribers) fn();
}

export const meterStore = {
  get: () => state,
  subscribe(fn: () => void) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  },
};

function read(run: MeterRun) {
  const snapshot = meter.snapshot();
  const fare = snapshot.startedAt === null ? null : meterFare(getActiveRule('auto', new Date(run.startedAt)), snapshot, run.terrain);
  return { snapshot, fare };
}

function feed(fix: GpsFix) {
  const run = state.run;
  if (!run) return;
  run.fixes.push(fix);
  meter.addFix(fix);
  set({ run: { ...run }, ...read(run) });
}

const persistRun = () => (state.run ? AsyncStorage.setItem(RUN_KEY, JSON.stringify(state.run)) : AsyncStorage.removeItem(RUN_KEY)).catch(() => {});
const persistOutbox = () => AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(state.outbox)).catch(() => {});

async function startSource(run: MeterRun, notice: { title: string; body: string }, skip = 0): Promise<boolean> {
  if (run.source === 'demo') {
    const fixes = simulatedFixes(SIMULATION_ROUTE, run.startedAt);
    let i = skip;
    demoTimer = setInterval(() => {
      const fix = fixes[i];
      if (!fix) {
        if (demoTimer) clearInterval(demoTimer);
      } else if (fix.timestamp <= Date.now()) {
        i++;
        feed(fix);
      }
    }, 1000 / DEMO_SPEEDUP);
    return true;
  }
  tracking = await track(feed, notice);
  set({ background: tracking?.background ?? false });
  return tracking !== null;
}

/** Restores a run interrupted by an app restart, and the outbox. */
export async function loadMeter(notice: { title: string; body: string }) {
  if (loaded) return;
  loaded = true;
  try {
    const outbox = JSON.parse((await AsyncStorage.getItem(OUTBOX_KEY)) ?? '[]') as FinishedRun[];
    const saved = await AsyncStorage.getItem(RUN_KEY);
    set({ outbox });
    if (saved) {
      const run = JSON.parse(saved) as MeterRun;
      meter = createMeter();
      for (const fix of run.fixes) meter.addFix(fix);
      set({ run, ...read(run) });
      await startSource(run, notice, run.fixes.length);
      saveTimer = setInterval(persistRun, 5000);
    }
  } catch {
    // a corrupt store must not stop the app
  }
}

export async function startMeter(
  options: { vehicleNumber: string; terrain: Terrain; source: Source },
  notice: { title: string; body: string },
): Promise<boolean> {
  if (state.run) return true;
  meter = createMeter();
  // The demo route is a recorded 13-minute trip replayed ten times faster; backdate its start
  // so each fix is already in the past when it plays (the server rejects future timestamps).
  const lengthMs = simulatedFixes(SIMULATION_ROUTE, 0).at(-1)!.timestamp;
  const startedAt = options.source === 'demo' ? Date.now() - lengthMs * (1 - 1 / DEMO_SPEEDUP) : Date.now();
  const run: MeterRun = {
    clientKey: Crypto.randomUUID(),
    startedAt,
    vehicleNumber: options.vehicleNumber.trim(),
    terrain: options.terrain,
    source: options.source,
    fixes: [],
  };
  set({ run, snapshot: null, fare: null });
  const ok = await startSource(run, notice);
  if (!ok) {
    set({ run: null });
    return false;
  }
  persistRun();
  saveTimer = setInterval(persistRun, 5000);
  return true;
}

export async function stopMeter(): Promise<FinishedRun | null> {
  const run = state.run;
  if (!run) return null;
  tracking?.stop();
  tracking = null;
  if (demoTimer) clearInterval(demoTimer);
  if (saveTimer) clearInterval(saveTimer);
  const { snapshot, fare } = read(run);
  const endedAt = run.source === 'demo' ? (run.fixes.at(-1)?.timestamp ?? Date.now()) : Date.now();
  const finished: FinishedRun = { ...run, endedAt, fare, snapshot };
  set({ run: null, snapshot: null, fare: null, outbox: [...state.outbox, finished] });
  await AsyncStorage.removeItem(RUN_KEY).catch(() => {});
  await persistOutbox();
  return finished;
}

/** Uploads waiting runs. Returns the server trip for `clientKey` when it uploaded. */
export async function syncMeter(clientKey?: string): Promise<Trip | null> {
  let wanted: Trip | null = null;
  for (const item of [...state.outbox]) {
    try {
      const trip = await invoke<Trip>('sync-meter', {
        clientKey: item.clientKey,
        vehicleNumber: item.vehicleNumber || undefined,
        terrain: item.terrain,
        startedAt: item.startedAt,
        endedAt: item.endedAt,
        fixes: item.fixes,
      });
      if (item.clientKey === clientKey) wanted = trip;
      set({ outbox: state.outbox.filter((o) => o.clientKey !== item.clientKey), synced: { ...state.synced, [item.clientKey]: trip.id } });
      await persistOutbox();
    } catch {
      break; // offline: try again later
    }
  }
  return wanted;
}
