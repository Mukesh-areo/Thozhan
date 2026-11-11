import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { FareBreakdown } from '@thozhan/tariff';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

/** A failure with a short code; screens show it with the i18n key `m.error.<code>`. */
export class AppError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

const toCode = (message: string | undefined) => (message && /^[a-z_]+$/.test(message) ? message : 'network');

export async function rpc<T = unknown>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new AppError(toCode(error.message));
  return data as T;
}

export async function invoke<T = unknown>(name: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body: body as Record<string, unknown> });
  if (error) {
    let code = 'network';
    try {
      const context = (error as { context?: Response }).context;
      code = toCode(((await context?.json()) as { error?: string })?.error);
    } catch {
      // keep 'network'
    }
    throw new AppError(code);
  }
  return data as T;
}

// ---------------------------------------------------------------- shapes returned by the API

export interface Place {
  name: string;
  lat: number;
  lon: number;
}

export interface Trip {
  id: string;
  code: string;
  flow: 'ride' | 'meter' | 'delivery';
  category: string;
  status: string;
  pickup: Place | null;
  dropoff: Place | null;
  estimateMeters: number | null;
  quote: FareBreakdown | null;
  parcel: ParcelInfo | null;
  options: TripOptions;
  startOtp: string | null;
  dropOtp: string | null;
  vehicleNumber: string | null;
  terrain: 'plain' | 'ghat';
  distanceMeters: number | null;
  waitingSeconds: number | null;
  fare: FareBreakdown | null;
  totalPaise: number | null;
  fareFlags: string[];
  paidVia: 'cash' | 'upi' | null;
  proof: { pickupPhoto: boolean; deliveryPhoto: boolean };
  myRating: { stars: number; tags: string[] } | null;
  createdAt: string;
  acceptedAt: string | null;
  arrivedAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  cancelReason: string | null;
  cancelDetail: string | null;
  rider: { name: string; rating: Rating | null } | null;
  driver: {
    name: string;
    vehicleNumber: string;
    vehicle: string;
    lat: number | null;
    lon: number | null;
    locationAt: string | null;
    rating: Rating | null;
  } | null;
}

export interface Rating {
  average: number;
  count: number;
}

export interface ParcelInfo {
  receiverName: string;
  receiverPhone?: string;
  weightGrams: number;
  item?: string | null;
  category?: string;
  declaredValue?: number | null;
  dimensionsCm?: [number, number, number] | null;
  packages?: number;
  loadingHelp?: boolean;
  fragile?: boolean;
  prohibitedAck?: boolean;
}

/** What the passenger asked for at booking; drivers see it on the offer. */
export interface TripOptions {
  pickupNote?: string;
  safety?: { onePassenger: boolean; helmet: boolean; noLuggage: boolean; conditions: boolean };
  cab?: { passengers: number; luggage: 'none' | 'small' | 'large'; ac: boolean; assistance: boolean; pet: boolean };
}

export interface Me {
  id: string;
  phone: string;
  name: string | null;
  locale: 'ta' | 'en';
  staffRole: 'admin' | 'gov' | 'support' | 'reviewer' | null;
  accountType: 'passenger' | 'driver' | null;
  rating: Rating | null;
  driver: {
    status: 'pending' | 'approved' | 'rejected' | 'suspended';
    vehicle: string;
    vehicleNumber: string;
    licenceNumber: string;
    documents: Record<string, string>;
    reviewNote: string | null;
    reviewedAt: string | null;
    createdAt: string;
    documentExpiry: Record<string, string>;
    expiredDocuments: string[];
    requiredDocuments: string[];
    online: boolean;
  } | null;
}

export interface Ticket {
  id: string;
  code: string;
  category: string;
  status: 'open' | 'answered' | 'closed';
  body: string;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
  trip: { id: string; code: string } | null;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
}

export interface Performance {
  rating: Rating | null;
  offers: number;
  accepted: number;
  completed: number;
  cancelledByDriver: number;
  compliments: Record<string, number>;
}

export interface Offer {
  id: string;
  expiresAt: string;
  pickupMeters: number;
  trip: Trip;
}

export interface Inbox {
  trip: Trip | null;
  offers: Offer[];
  today: { trips: number; earningsPaise: number };
  balancePaise: number;
}

export interface Ledger {
  balancePaise: number;
  entries: { day: string; kind: 'fee' | 'payment' | 'waiver'; amountPaise: number; ref: string | null }[];
  days: { day: string; trips: number; earningsPaise: number }[];
}
