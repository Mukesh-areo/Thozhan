import type { ServiceType } from '@thozhan/tariff';

export type TripFlow = 'ride' | 'meter' | 'delivery';

/** Whether the service may operate at all, independent of the tariff status. */
export type LegalStatus = 'PERMITTED' | 'PILOT_APPROVAL_REQUIRED' | 'PENDING_CLARIFICATION';

export type LicenceClass = 'MCWG' | 'LMV-TR' | 'TRANS' | 'E-RICKSHAW';

export interface Category {
  id: string;
  service: ServiceType;
  /** i18n key for the display name. */
  nameKey: string;
  icon: string;
  seats: number;
  flows: TripFlow[];
  driver: { licence: LicenceClass[]; permit: string; badgeRequired: boolean };
  features: {
    startOtp: boolean;
    dropOtp: boolean;
    proofOfDelivery: boolean;
    ghatFare: boolean;
    womenRiderPreference: boolean;
  };
  parcel?: { maxWeightGrams: number; restrictedItemKeys: string[] };
  legalStatus: LegalStatus;
  /** Default flag state; zones can override in the catalog module. */
  enabledByDefault: boolean;
}

const PARCEL_RESTRICTED = ['parcel.restricted.cash', 'parcel.restricted.hazardous', 'parcel.restricted.liquor', 'parcel.restricted.medicines-rx', 'parcel.restricted.animals'];

const noParcelFeatures = { dropOtp: false, proofOfDelivery: false };

export const CATEGORIES: readonly Category[] = Object.freeze([
  {
    id: 'auto',
    service: 'auto',
    nameKey: 'category.auto',
    icon: '🛺',
    seats: 3,
    flows: ['ride', 'meter'],
    driver: { licence: ['TRANS', 'LMV-TR'], permit: 'contract-carriage-auto', badgeRequired: true },
    features: { startOtp: true, ...noParcelFeatures, ghatFare: true, womenRiderPreference: true },
    legalStatus: 'PILOT_APPROVAL_REQUIRED',
    enabledByDefault: true,
  },
  {
    id: 'bike',
    service: 'bike',
    nameKey: 'category.bike',
    icon: '🏍️',
    seats: 1,
    flows: ['ride'],
    driver: { licence: ['MCWG'], permit: 'bike-taxi', badgeRequired: false },
    features: { startOtp: true, ...noParcelFeatures, ghatFare: false, womenRiderPreference: true },
    legalStatus: 'PENDING_CLARIFICATION',
    enabledByDefault: false,
  },
  ...(['mini', 'sedan', 'suv'] as const).map((size) => ({
    id: `cab-${size}`,
    service: 'cab' as const,
    nameKey: `category.cab-${size}`,
    icon: size === 'suv' ? '🚙' : '🚗',
    seats: size === 'suv' ? 6 : 4,
    flows: ['ride'] as TripFlow[],
    driver: { licence: ['LMV-TR', 'TRANS'] as LicenceClass[], permit: 'contract-carriage-taxi', badgeRequired: true },
    features: { startOtp: true, ...noParcelFeatures, ghatFare: false, womenRiderPreference: true },
    legalStatus: 'PILOT_APPROVAL_REQUIRED' as const,
    enabledByDefault: false,
  })),
  {
    id: 'parcel-bike',
    service: 'parcel',
    nameKey: 'category.parcel-bike',
    icon: '📦',
    seats: 0,
    flows: ['delivery'],
    driver: { licence: ['MCWG'], permit: 'goods-two-wheeler', badgeRequired: false },
    features: { startOtp: true, dropOtp: true, proofOfDelivery: true, ghatFare: false, womenRiderPreference: false },
    parcel: { maxWeightGrams: 10000, restrictedItemKeys: PARCEL_RESTRICTED },
    legalStatus: 'PENDING_CLARIFICATION',
    enabledByDefault: false,
  },
  {
    id: 'parcel-auto',
    service: 'parcel',
    nameKey: 'category.parcel-auto',
    icon: '📦',
    seats: 0,
    flows: ['delivery'],
    driver: { licence: ['TRANS', 'LMV-TR'], permit: 'goods-carriage-three-wheeler', badgeRequired: true },
    features: { startOtp: true, dropOtp: true, proofOfDelivery: true, ghatFare: false, womenRiderPreference: false },
    parcel: { maxWeightGrams: 50000, restrictedItemKeys: PARCEL_RESTRICTED },
    legalStatus: 'PENDING_CLARIFICATION',
    enabledByDefault: false,
  },
]);

export function getCategory(id: string): Category {
  const category = CATEGORIES.find((c) => c.id === id);
  if (!category) throw new RangeError(`Unknown category ${id}`);
  return category;
}

/** Categories bookable under the given flags (e.g. zone overrides). */
export function enabledCategories(flags: Record<string, boolean> = {}): Category[] {
  return CATEGORIES.filter((c) => flags[c.id] ?? c.enabledByDefault);
}
