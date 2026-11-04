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
  parcel: { receiverName: string; receiverPhone?: string; weightGrams: number; item?: string } | null;
  startOtp: string | null;
  dropOtp: string | null;
  vehicleNumber: string | null;
  terrain: 'plain' | 'ghat';
  distanceMeters: number | null;
  waitingSeconds: number | null;
  fare: FareBreakdown | null;
  totalPaise: number | null;
  fareFlags: string[];
  createdAt: string;
  acceptedAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  cancelReason: string | null;
  rider: { name: string } | null;
  driver: { name: string; vehicleNumber: string; vehicle: string; lat: number | null; lon: number | null; locationAt: string | null } | null;
}

export interface Me {
  id: string;
  phone: string;
  name: string | null;
  locale: 'ta' | 'en';
  staffRole: 'admin' | 'gov' | null;
  driver: {
    status: 'pending' | 'approved' | 'rejected' | 'suspended';
    vehicle: string;
    vehicleNumber: string;
    licenceNumber: string;
    documents: Record<string, string>;
    reviewNote: string | null;
    online: boolean;
  } | null;
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
