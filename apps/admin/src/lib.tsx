import { createClient } from '@supabase/supabase-js';
import { formatKm, formatMoney, t as translate, type Locale } from '@thozhan/i18n';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

// With no VITE_SUPABASE_URL the dashboard uses the local dev backend on the same machine.
const DEV_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ0aG96aGFuLWRldiIsInJvbGUiOiJhbm9uIn0.rtK_i31JNT_MLElHe9BcDRvkZjLrhwQpmGfZBPxRzA4';
export const USING_DEV_BACKEND = !import.meta.env.VITE_SUPABASE_URL;
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? `http://${location.hostname}:54321`,
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? DEV_ANON_KEY,
);

export async function rpc<T = unknown>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(/^[a-z_]+$/.test(error.message) ? error.message : 'network');
  return data as T;
}

interface I18n {
  locale: Locale;
  setLocale(l: Locale): void;
  t(key: string, params?: Record<string, string | number>): string;
  money(paise: number): string;
  km(meters: number, digits?: number): string;
  err(e: unknown): string;
}
export const I18nContext = createContext<I18n | null>(null);
export const useI18n = () => useContext(I18nContext)!;

export function makeI18n(locale: Locale, setLocale: (l: Locale) => void): I18n {
  const t = (key: string, params?: Record<string, string | number>) => translate(locale, key, params);
  return {
    locale,
    setLocale,
    t,
    money: (p) => formatMoney(p, locale),
    km: (m, d = 1) => formatKm(m, locale, d),
    err: (e) => {
      const code = e instanceof Error ? e.message : 'network';
      const text = t(`m.error.${code}`);
      return text.startsWith('m.error.') ? t('m.error.server_error') : text;
    },
  };
}

/** Calls `fn` now and every `ms`; returns [data, error, reload]. */
export function usePoll<T>(fn: () => Promise<T>, ms: number, deps: unknown[] = []): [T | null, string | null, () => void] {
  const { err } = useI18n();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(fn);
  latest.current = fn;
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    const run = () =>
      latest
        .current()
        .then((d) => alive && (setData(d), setError(null)))
        .catch((e) => alive && setError(err(e)));
    run();
    const timer = setInterval(run, ms);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [ms, tick, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  return [data, error, () => setTick((n) => n + 1)];
}

export function downloadCsv(name: string, rows: (string | number | null)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

export interface Trip {
  id: string;
  code: string;
  flow: string;
  category: string;
  status: string;
  pickup: { name: string; lat: number; lon: number } | null;
  dropoff: { name: string; lat: number; lon: number } | null;
  totalPaise: number | null;
  quote: { totalPaise: number } | null;
  distanceMeters: number | null;
  fareFlags: string[];
  vehicleNumber: string | null;
  createdAt: string;
  rider: { name: string; phone: string | null } | null;
  driver: { name: string; phone: string | null; vehicleNumber: string; lat: number | null; lon: number | null } | null;
}
