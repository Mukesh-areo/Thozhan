import type { TripFlow } from './services.ts';

export type TripStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'METER_RUNNING'
  | 'METER_PAUSED'
  | 'AT_PICKUP'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'AT_DROP'
  | 'DELIVERED'
  | 'RETURNED'
  | 'COMPLETED'
  | 'CANCELLED';

export type TripAction =
  | 'accept'
  | 'arrive'
  | 'start'
  | 'pause'
  | 'resume'
  | 'pickup'
  | 'depart'
  | 'reach-drop'
  | 'deliver'
  | 'return'
  | 'complete'
  | 'cancel';

export type Actor = 'rider' | 'driver' | 'ops' | 'system';

/** What a transition needs before the server allows it. */
export type Guard = 'start-otp' | 'drop-otp' | 'proof-of-delivery';

interface Transition {
  from: TripStatus[];
  to: TripStatus;
  by: Actor[];
  guards?: Guard[];
}

type Machine = { initial: TripStatus; terminal: TripStatus[]; transitions: Partial<Record<TripAction, Transition>> };

export const MACHINES: Readonly<Record<TripFlow, Machine>> = Object.freeze({
  ride: {
    initial: 'REQUESTED',
    terminal: ['COMPLETED', 'CANCELLED'],
    transitions: {
      accept: { from: ['REQUESTED'], to: 'ACCEPTED', by: ['driver'] },
      arrive: { from: ['ACCEPTED'], to: 'ARRIVED', by: ['driver'] },
      start: { from: ['ARRIVED'], to: 'IN_PROGRESS', by: ['driver'], guards: ['start-otp'] },
      complete: { from: ['IN_PROGRESS'], to: 'COMPLETED', by: ['driver', 'ops'] },
      cancel: { from: ['REQUESTED', 'ACCEPTED', 'ARRIVED'], to: 'CANCELLED', by: ['rider', 'driver', 'ops', 'system'] },
    },
  },
  meter: {
    initial: 'METER_RUNNING',
    terminal: ['COMPLETED', 'CANCELLED'],
    transitions: {
      pause: { from: ['METER_RUNNING'], to: 'METER_PAUSED', by: ['rider', 'driver'] },
      resume: { from: ['METER_PAUSED'], to: 'METER_RUNNING', by: ['rider', 'driver'] },
      complete: { from: ['METER_RUNNING', 'METER_PAUSED'], to: 'COMPLETED', by: ['rider', 'driver'] },
      cancel: { from: ['METER_RUNNING', 'METER_PAUSED'], to: 'CANCELLED', by: ['rider', 'driver'] },
    },
  },
  delivery: {
    initial: 'REQUESTED',
    terminal: ['DELIVERED', 'RETURNED', 'CANCELLED'],
    transitions: {
      accept: { from: ['REQUESTED'], to: 'ACCEPTED', by: ['driver'] },
      arrive: { from: ['ACCEPTED'], to: 'AT_PICKUP', by: ['driver'] },
      pickup: { from: ['AT_PICKUP'], to: 'PICKED_UP', by: ['driver'], guards: ['start-otp'] },
      depart: { from: ['PICKED_UP'], to: 'IN_TRANSIT', by: ['driver'] },
      'reach-drop': { from: ['IN_TRANSIT'], to: 'AT_DROP', by: ['driver'] },
      deliver: { from: ['AT_DROP'], to: 'DELIVERED', by: ['driver'], guards: ['drop-otp'] },
      return: { from: ['PICKED_UP', 'IN_TRANSIT', 'AT_DROP'], to: 'RETURNED', by: ['driver', 'ops'] },
      cancel: { from: ['REQUESTED', 'ACCEPTED', 'AT_PICKUP'], to: 'CANCELLED', by: ['rider', 'driver', 'ops', 'system'] },
    },
  },
});

export interface TransitionContext {
  actor: Actor;
  /** Guards the caller has already verified (e.g. the OTP matched). */
  satisfied?: Guard[];
  /** Category-level switches; a disabled guard is skipped (e.g. parcel without POD photo). */
  disabledGuards?: Guard[];
}

export type TransitionResult =
  | { ok: true; status: TripStatus }
  | { ok: false; reason: 'invalid-action' | 'wrong-state' | 'not-allowed'; missing?: never }
  | { ok: false; reason: 'guard'; missing: Guard[] };

export function transition(flow: TripFlow, status: TripStatus, action: TripAction, ctx: TransitionContext): TransitionResult {
  const t = MACHINES[flow].transitions[action];
  if (!t) return { ok: false, reason: 'invalid-action' };
  if (!t.from.includes(status)) return { ok: false, reason: 'wrong-state' };
  if (!t.by.includes(ctx.actor)) return { ok: false, reason: 'not-allowed' };
  const missing = (t.guards ?? []).filter((g) => !ctx.disabledGuards?.includes(g) && !ctx.satisfied?.includes(g));
  if (missing.length) return { ok: false, reason: 'guard', missing };
  return { ok: true, status: t.to };
}

/** Actions an actor may take now; used by clients to render buttons. */
export function availableActions(flow: TripFlow, status: TripStatus, actor: Actor): TripAction[] {
  return (Object.entries(MACHINES[flow].transitions) as [TripAction, Transition][])
    .filter(([, t]) => t.from.includes(status) && t.by.includes(actor))
    .map(([action]) => action);
}

export const isTerminal = (flow: TripFlow, status: TripStatus) => MACHINES[flow].terminal.includes(status);
