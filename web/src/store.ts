// Browser-local demo state. Pure functions only (no DOM), so they are unit tested directly.
import { calculateFare, getActiveRule, type FareBreakdown, type Terrain } from '@thozhan/tariff';
import { getCategory, isTerminal, transition, type TripAction, type TripFlow, type TripStatus } from '@thozhan/shared';
import { estimateRouteMeters } from './places.ts';

export const STORAGE_KEY = 'thozhan-v2';

export type Payment = 'cash' | 'upi';

export interface Trip {
  id: string;
  created: number;
  flow: TripFlow;
  category: string;
  pickup: number | null;
  drop: number | null;
  distanceMeters: number;
  fare: FareBreakdown;
  status: TripStatus;
  startOtp: string;
  dropOtp: string | null;
  payment: Payment;
  departure: string | null;
  parcel: { weightGrams: number; receiver: string } | null;
  vehicleNumber: string | null;
  meterFlags: string[];
  completed: number | null;
}

export interface Case {
  id: string;
  trip: string;
  kind: 'safety' | 'overcharge';
  askedPaise: number | null;
  meterPaise: number | null;
  created: number;
}

export interface State {
  version: 2;
  trips: Trip[];
  online: boolean;
  /** IST dates (YYYY-MM-DD) on which the ₹10 driver fee was assessed. */
  charges: string[];
  cases: Case[];
  /** Service switches set from Operations (stand-in for per-zone flags). */
  flags: Record<string, boolean>;
}

export const DAILY_FEE_PAISE = 1000;

/** Demo defaults: bike taxi stays off until its legal status is clarified. */
export const DEMO_FLAGS: Readonly<Record<string, boolean>> = Object.freeze({
  auto: true,
  bike: false,
  'cab-mini': true,
  'cab-sedan': true,
  'cab-suv': true,
  'parcel-bike': true,
  'parcel-auto': true,
});

export const emptyState = (): State => ({ version: 2, trips: [], online: true, charges: [], cases: [], flags: { ...DEMO_FLAGS } });

export function parseState(raw: string | null): State {
  try {
    const s = JSON.parse(raw ?? '') as State;
    if (s && s.version === 2 && Array.isArray(s.trips) && Array.isArray(s.charges) && Array.isArray(s.cases)) {
      s.flags = { ...DEMO_FLAGS, ...s.flags };
      return s;
    }
  } catch {}
  return emptyState();
}

export const istDay = (at: number) => new Date(at + 330 * 60000).toISOString().slice(0, 10);

/** The booked ride or delivery the demo driver is working on. Meter trips are never "active" here. */
export const activeTrip = (state: State) => state.trips.find((t) => t.flow !== 'meter' && !isTerminal(t.flow, t.status));

const otp = (rand: () => number) => String(Math.floor(1000 + rand() * 9000));

/** Average city speed used to estimate the ride-time component of cab quotes. */
const CITY_SPEED_MPS = 20 / 3.6;

export function quote(category: string, distanceMeters: number, at: number, opts: { weightGrams?: number; terrain?: Terrain } = {}): FareBreakdown {
  return calculateFare(getActiveRule(category, new Date(at)), {
    distanceMeters,
    rideSeconds: distanceMeters / CITY_SPEED_MPS,
    startedAt: at,
    terrain: opts.terrain,
    weightGrams: opts.weightGrams,
  });
}

export type BookingError = 'same-place' | 'active-trip' | 'past-departure' | 'disabled' | 'weight';

export interface BookingInput {
  category: string;
  pickup: number;
  drop: number;
  payment: Payment;
  departure?: string | null;
  parcel?: { weightGrams: number; receiver: string } | null;
}

export function createBooking(state: State, input: BookingInput, now: number, rand: () => number = Math.random): { ok: true; trip: Trip } | { ok: false; error: BookingError } {
  const category = getCategory(input.category);
  if (!(state.flags[category.id] ?? category.enabledByDefault)) return { ok: false, error: 'disabled' };
  if (input.pickup === input.drop) return { ok: false, error: 'same-place' };
  if (activeTrip(state)) return { ok: false, error: 'active-trip' };
  if (input.departure && !(Date.parse(input.departure) > now)) return { ok: false, error: 'past-departure' };
  const flow: TripFlow = category.flows.includes('delivery') ? 'delivery' : 'ride';
  if (flow === 'delivery' && !(input.parcel && input.parcel.weightGrams > 0 && input.parcel.weightGrams <= (category.parcel?.maxWeightGrams ?? 0))) {
    return { ok: false, error: 'weight' };
  }
  const distanceMeters = estimateRouteMeters(input.pickup, input.drop);
  const startOtp = otp(rand);
  // The drop OTP must differ, or the pickup code would also release the parcel.
  let dropOtp: string | null = null;
  if (flow === 'delivery') {
    dropOtp = otp(rand);
    if (dropOtp === startOtp) dropOtp = String(((Number(dropOtp) - 1000 + 1) % 9000) + 1000);
  }
  const trip: Trip = {
    id: 'TZ-' + String(now).slice(-7),
    created: now,
    flow,
    category: category.id,
    pickup: input.pickup,
    drop: input.drop,
    distanceMeters,
    fare: quote(category.id, distanceMeters, input.departure ? Date.parse(input.departure) : now, { weightGrams: input.parcel?.weightGrams }),
    status: 'REQUESTED',
    startOtp,
    dropOtp,
    payment: input.payment,
    departure: input.departure || null,
    parcel: flow === 'delivery' ? input.parcel! : null,
    vehicleNumber: null,
    meterFlags: [],
    completed: null,
  };
  state.trips.unshift(trip);
  return { ok: true, trip };
}

export type ActionError = 'offline' | 'otp' | 'not-allowed' | 'no-trip';

/** Apply a driver action to the active trip, enforcing OTP guards and the daily fee. */
export function driverAction(state: State, action: TripAction, code: string | null, now: number): { ok: true; trip: Trip } | { ok: false; error: ActionError } {
  const trip = activeTrip(state);
  if (!trip) return { ok: false, error: 'no-trip' };
  if (action === 'accept' && !state.online) return { ok: false, error: 'offline' };
  const satisfied = [
    ...(code !== null && code === trip.startOtp ? (['start-otp'] as const) : []),
    ...(code !== null && code === trip.dropOtp ? (['drop-otp'] as const) : []),
  ];
  const result = transition(trip.flow, trip.status, action, { actor: 'driver', satisfied, disabledGuards: ['proof-of-delivery'] });
  if (!result.ok) return { ok: false, error: result.reason === 'guard' ? 'otp' : 'not-allowed' };
  trip.status = result.status;
  if (result.status === 'COMPLETED' || result.status === 'DELIVERED') {
    trip.completed = now;
    chargeDay(state, now);
  }
  return { ok: true, trip };
}

export function cancelActive(state: State): boolean {
  const trip = activeTrip(state);
  if (!trip) return false;
  const result = transition(trip.flow, trip.status, 'cancel', { actor: 'rider' });
  if (!result.ok) return false;
  trip.status = result.status;
  return true;
}

/** ₹10 once per IST day, after the first completed earning trip. */
export function chargeDay(state: State, now: number) {
  const day = istDay(now);
  if (!state.charges.includes(day)) state.charges.push(day);
}

export function recordMeterTrip(state: State, input: { fare: FareBreakdown; distanceMeters: number; startedAt: number; endedAt: number; vehicleNumber: string | null; flags: string[] }): Trip {
  const trip: Trip = {
    id: 'TM-' + String(input.endedAt).slice(-7),
    created: input.startedAt,
    flow: 'meter',
    category: 'auto',
    pickup: null,
    drop: null,
    distanceMeters: input.distanceMeters,
    fare: input.fare,
    status: 'COMPLETED',
    startOtp: '',
    dropOtp: null,
    payment: 'cash',
    departure: null,
    parcel: null,
    vehicleNumber: input.vehicleNumber,
    meterFlags: input.flags,
    completed: input.endedAt,
  };
  state.trips.unshift(trip);
  return trip;
}

export function addCase(state: State, input: Omit<Case, 'id'>): Case {
  const c: Case = { id: 'CASE-' + (state.cases.length + 1), ...input };
  state.cases.push(c);
  return c;
}

export interface Summary {
  requests: number;
  active: number;
  completed: number;
  grossPaise: number;
  feesPaise: number;
  meterTrips: number;
  overchargeReports: number;
  /** Mean of (asked − meter) / meter over overcharge reports, in percent. */
  averageOverchargePercent: number | null;
}

export function summarize(state: State): Summary {
  const done = state.trips.filter((t) => t.status === 'COMPLETED' || t.status === 'DELIVERED');
  const reports = state.cases.filter((c) => c.kind === 'overcharge' && c.askedPaise !== null && c.meterPaise);
  return {
    requests: state.trips.filter((t) => t.flow !== 'meter').length,
    active: activeTrip(state) ? 1 : 0,
    completed: done.length,
    grossPaise: done.filter((t) => t.flow !== 'meter').reduce((n, t) => n + t.fare.totalPaise, 0),
    feesPaise: state.charges.length * DAILY_FEE_PAISE,
    meterTrips: state.trips.filter((t) => t.flow === 'meter').length,
    overchargeReports: reports.length,
    averageOverchargePercent: reports.length
      ? Math.round(reports.reduce((n, c) => n + ((c.askedPaise! - c.meterPaise!) / c.meterPaise!) * 100, 0) / reports.length)
      : null,
  };
}
