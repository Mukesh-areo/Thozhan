// Fare helpers shared by the vehicle list, the booking review and the fare chart.
import { calculateFare, getActiveRule, type FareBreakdown, type TariffRule } from '@thozhan/tariff';

/** The fare for a trip of this length, or null when the vehicle cannot take it (e.g. too heavy). */
export function quoteFor(category: string, meters: number, weightGrams = 0): FareBreakdown | null {
  try {
    return calculateFare(getActiveRule(category), {
      distanceMeters: meters,
      startedAt: Date.now(),
      ...(category.startsWith('parcel') ? { weightGrams } : {}),
    });
  } catch {
    return null;
  }
}

export function ruleFor(category: string): TariffRule | null {
  try {
    return getActiveRule(category);
  } catch {
    return null;
  }
}

/** Auto uses the notified Government tariff; everything else is a proposed pilot fare. */
export const isGovernmentTariff = (category: string) => ruleFor(category)?.status === 'OFFICIAL';

/** Rupees, without trailing zeros: 1.5 → "1.50", 25 → "25". */
export const rupees = (paise: number) => (paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2));
