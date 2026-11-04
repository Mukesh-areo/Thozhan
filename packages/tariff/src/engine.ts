import type { FareBreakdown, FareInput, FareLine, NightRule, TariffRule } from './types.ts';

const IST_OFFSET_MINUTES = 330;

function toEpochMs(value: Date | number | string): number {
  const ms = value instanceof Date ? value.getTime() : typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(ms)) throw new RangeError(`Invalid startedAt: ${String(value)}`);
  return ms;
}

function parseClock(hhmm: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!match) throw new RangeError(`Invalid clock time: ${hhmm}`);
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Minutes since IST midnight for an instant, independent of the host time zone. */
export function istMinuteOfDay(at: Date | number | string): number {
  const minutes = Math.floor(toEpochMs(at) / 60000) + IST_OFFSET_MINUTES;
  return ((minutes % 1440) + 1440) % 1440;
}

export function isNight(rule: NightRule, at: Date | number | string): boolean {
  const m = istMinuteOfDay(at);
  const start = parseClock(rule.start);
  const end = parseClock(rule.end);
  return start <= end ? m >= start && m < end : m >= start || m < end;
}

function nonNegative(name: string, value: number | undefined): number {
  const v = value ?? 0;
  if (!Number.isFinite(v) || v < 0) throw new RangeError(`${name} must be a non-negative number`);
  return v;
}

export function calculateFare(rule: TariffRule, input: FareInput): FareBreakdown {
  const distanceMeters = nonNegative('distanceMeters', input.distanceMeters);
  const waitingSeconds = nonNegative('waitingSeconds', input.waitingSeconds);
  const rideSeconds = nonNegative('rideSeconds', input.rideSeconds);
  const terrain = input.terrain ?? 'plain';
  const band = terrain === 'ghat' ? rule.ghat : rule.plain;
  if (!band) throw new RangeError(`Tariff ${rule.id} has no ghat fare`);

  const lines: FareLine[] = [];
  const add = (line: FareLine) => {
    if (line.amountPaise !== 0) lines.push(line);
  };

  lines.push({ code: 'base', amountPaise: band.baseFarePaise, detail: { meters: band.baseDistanceMeters } });

  const extraMeters = Math.max(0, distanceMeters - band.baseDistanceMeters);
  const distancePaise = Math.round((extraMeters * band.perKmPaise) / 1000);
  add({ code: 'distance', amountPaise: distancePaise, detail: { meters: Math.round(extraMeters) } });

  const rideTimePaise = rule.perRideMinutePaise ? Math.round((rideSeconds / 60) * rule.perRideMinutePaise) : 0;
  add({ code: 'ride_time', amountPaise: rideTimePaise, detail: { seconds: Math.round(rideSeconds) } });

  const billableWaitMinutes = Math.max(0, waitingSeconds / 60 - rule.waiting.freeMinutes);
  const waitMinutes = rule.waiting.minuteCounting === 'ceil' ? Math.ceil(billableWaitMinutes) : Math.floor(billableWaitMinutes);
  const waitingPaise = waitMinutes * rule.waiting.perMinutePaise;
  add({ code: 'waiting', amountPaise: waitingPaise, detail: { minutes: waitMinutes } });

  const startedAt = toEpochMs(input.startedAt);
  const night = rule.night ? isNight(rule.night, startedAt) : false;
  if (night && rule.night) {
    const scope = rule.night.appliesTo;
    const multiplied =
      band.baseFarePaise +
      distancePaise +
      (scope !== 'distance' ? waitingPaise : 0) +
      (scope === 'distance+waiting+time' ? rideTimePaise : 0);
    add({
      code: 'night',
      amountPaise: Math.round((multiplied * (rule.night.multiplierPermille - 1000)) / 1000),
      detail: { permille: rule.night.multiplierPermille },
    });
  }

  if (rule.service === 'parcel' || input.weightGrams !== undefined) {
    const weight = nonNegative('weightGrams', input.weightGrams);
    if (rule.maxWeightGrams !== undefined && weight > rule.maxWeightGrams) {
      throw new RangeError(`Parcel weight ${weight} g exceeds ${rule.maxWeightGrams} g for ${rule.category}`);
    }
    const slab = (rule.weightSlabs ?? [])
      .filter((s) => weight > s.aboveGrams)
      .sort((a, b) => b.aboveGrams - a.aboveGrams)[0];
    if (slab) add({ code: 'weight', amountPaise: slab.surchargePaise, detail: { grams: weight } });
  }

  add({ code: 'booking_fee', amountPaise: rule.bookingFeePaise ?? 0 });

  let total = lines.reduce((sum, l) => sum + l.amountPaise, 0);
  if (rule.minimumFarePaise !== undefined && total < rule.minimumFarePaise) {
    add({ code: 'minimum_fare_topup', amountPaise: rule.minimumFarePaise - total });
    total = rule.minimumFarePaise;
  }

  const rounded =
    rule.rounding === 'nearest-rupee' ? Math.round(total / 100) * 100 : rule.rounding === 'ceil-rupee' ? Math.ceil(total / 100) * 100 : total;
  add({ code: 'rounding', amountPaise: rounded - total });

  const relevant = { night, ghat: terrain === 'ghat', waiting: waitMinutes > 0 };
  const assumptions = rule.assumptions.filter((a) => !a.confirmed && (!a.appliesWhen || relevant[a.appliesWhen])).map((a) => a.code);
  return {
    ruleId: rule.id,
    ruleVersion: rule.version,
    category: rule.category,
    status: rule.status,
    legalReference: rule.legalReference,
    terrain,
    night,
    lines,
    totalPaise: rounded,
    assumptions,
    verifiedForBilling: rule.status === 'OFFICIAL' && assumptions.length === 0,
  };
}
