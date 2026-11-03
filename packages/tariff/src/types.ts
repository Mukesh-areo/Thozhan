// All money is integer paise. All distances are metres. All durations are seconds.

export type ServiceType = 'auto' | 'bike' | 'cab' | 'parcel';

/**
 * OFFICIAL: rates published by a competent authority (cite legalReference).
 * PENDING_APPROVAL: submitted or awaiting a notification; not billable.
 * ILLUSTRATIVE: placeholder values for demonstration only.
 */
export type TariffStatus = 'OFFICIAL' | 'PENDING_APPROVAL' | 'ILLUSTRATIVE';

export type Rounding = 'nearest-rupee' | 'ceil-rupee' | 'none';

export type Terrain = 'plain' | 'ghat';

export interface DistanceBand {
  baseDistanceMeters: number;
  baseFarePaise: number;
  perKmPaise: number;
}

export interface NightRule {
  /** Local IST wall-clock time, "HH:MM". The window may wrap past midnight. */
  start: string;
  end: string;
  /** 1500 = 1.5x */
  multiplierPermille: number;
  /** Which fare components the multiplier applies to. */
  appliesTo: 'distance' | 'distance+waiting' | 'distance+waiting+time';
  /** Night status is decided by the trip start time. */
  decidedBy: 'start';
}

export interface WeightSlab {
  /** Surcharge applies when weight is strictly above this. */
  aboveGrams: number;
  surchargePaise: number;
}

export interface Assumption {
  /** Stable code; clients translate it via i18n key `tariff.assumption.<code>`. */
  code: string;
  /** True once the authority has confirmed the interpretation in writing. */
  confirmed: boolean;
}

export interface TariffRule {
  id: string;
  version: number;
  jurisdiction: string;
  service: ServiceType;
  /** e.g. auto, bike, cab-mini, cab-sedan, cab-suv, parcel-bike, parcel-auto */
  category: string;
  status: TariffStatus;
  legalReference: string | null;
  /** ISO date (IST) from which the rule applies; null = not scheduled. */
  effectiveFrom: string | null;
  effectiveTo?: string | null;
  plain: DistanceBand;
  ghat?: DistanceBand;
  perRideMinutePaise?: number;
  minimumFarePaise?: number;
  bookingFeePaise?: number;
  waiting: {
    perMinutePaise: number;
    freeMinutes: number;
    minuteCounting: 'floor' | 'ceil';
  };
  night?: NightRule;
  maxWeightGrams?: number;
  weightSlabs?: WeightSlab[];
  rounding: Rounding;
  assumptions: Assumption[];
}

export interface FareInput {
  distanceMeters: number;
  waitingSeconds?: number;
  rideSeconds?: number;
  /** Trip start; Date, epoch ms or ISO string. */
  startedAt: Date | number | string;
  terrain?: Terrain;
  weightGrams?: number;
}

export type FareLineCode =
  | 'base'
  | 'distance'
  | 'ride_time'
  | 'waiting'
  | 'night'
  | 'weight'
  | 'booking_fee'
  | 'minimum_fare_topup'
  | 'rounding';

export interface FareLine {
  code: FareLineCode;
  amountPaise: number;
  /** Quantities behind the line, for receipts: e.g. { meters: 3200 } or { minutes: 6 }. */
  detail?: Record<string, number>;
}

export interface FareBreakdown {
  ruleId: string;
  ruleVersion: number;
  category: string;
  status: TariffStatus;
  legalReference: string | null;
  terrain: Terrain;
  night: boolean;
  lines: FareLine[];
  totalPaise: number;
  /** Unconfirmed interpretations used in this calculation. */
  assumptions: string[];
  /** OFFICIAL rule with every interpretation confirmed. Only then may the fare be billed. */
  verifiedForBilling: boolean;
}
