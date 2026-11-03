import en from '../locales/en.json' with { type: 'json' };
import ta from '../locales/ta.json' with { type: 'json' };

export type Locale = 'ta' | 'en';
export type MessageKey = keyof typeof en;

export const LOCALES: readonly Locale[] = ['ta', 'en'];
export const CATALOGS: Readonly<Record<Locale, Record<string, string>>> = Object.freeze({ en, ta });

const INTL_LOCALE: Record<Locale, string> = { ta: 'ta-IN', en: 'en-IN' };

/** Tamil first: any Tamil device locale gets Tamil, everything else English. */
export function pickLocale(preferred: readonly string[] = []): Locale {
  return preferred.some((l) => l.toLowerCase().startsWith('ta')) ? 'ta' : preferred.length ? 'en' : 'ta';
}

/**
 * Translate a key, filling {placeholders}. Falls back to English, then to the key,
 * so a missing string is visible rather than blank.
 */
export function t(locale: Locale, key: string, params: Record<string, string | number> = {}): string {
  const template = CATALOGS[locale][key] ?? CATALOGS.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

/** ₹ amount from paise; paise are shown only when present. */
export function formatMoney(paise: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export function formatKm(meters: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], { maximumFractionDigits: 1 }).format(meters / 1000);
}

/** Keys present in one catalogue but not the other. CI fails on any. */
export function missingKeys(): { ta: string[]; en: string[] } {
  const enKeys = Object.keys(CATALOGS.en);
  const taKeys = Object.keys(CATALOGS.ta);
  return { ta: enKeys.filter((k) => !(k in CATALOGS.ta)), en: taKeys.filter((k) => !(k in CATALOGS.en)) };
}
