import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatKm, formatMoney, pickLocale, t as translate, type Locale } from '@thozhan/i18n';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const KEY = 'thozhan-locale';

interface I18n {
  locale: Locale;
  setLocale(locale: Locale): void;
  t(key: string, params?: Record<string, string | number>): string;
  money(paise: number): string;
  km(meters: number, digits?: number): string;
}

const Context = createContext<I18n | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setState] = useState<Locale>(() => pickLocale([Intl.DateTimeFormat().resolvedOptions().locale]));
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((saved) => (saved === 'ta' || saved === 'en' ? setState(saved) : undefined))
      .catch(() => {});
  }, []);
  const setLocale = useCallback((next: Locale) => {
    setState(next);
    AsyncStorage.setItem(KEY, next).catch(() => {});
  }, []);
  const value = useMemo<I18n>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => translate(locale, key, params),
      money: (paise) => formatMoney(paise, locale),
      km: (meters, digits = 1) => formatKm(meters, locale, digits),
    }),
    [locale, setLocale],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useI18n(): I18n {
  const value = useContext(Context);
  if (!value) throw new Error('useI18n outside LocaleProvider');
  return value;
}

/** Message for an AppError code (or any thrown value). */
export function errorText(t: I18n['t'], e: unknown): string {
  const code = (e as { code?: string })?.code ?? 'network';
  const text = t(`m.error.${code}`);
  return text === `m.error.${code}` ? t('m.error.server_error') : text;
}
