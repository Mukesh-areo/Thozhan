import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppError, rpc, supabase, type Me } from './api';
import { useI18n } from './i18n';

export type Mode = 'rider' | 'driver';
const MODE_KEY = 'thozhan-mode';

interface SessionState {
  ready: boolean;
  session: Session | null;
  me: Me | null;
  mode: Mode;
  setMode(mode: Mode): void;
  refresh(): Promise<Me | null>;
  signOut(): Promise<void>;
}

const Context = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { locale, setLocale } = useI18n();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [mode, setModeState] = useState<Mode>('rider');

  const refresh = useCallback(async () => {
    try {
      const profile = await rpc<Me>('sign_in_profile', { p_locale: locale });
      setMe(profile);
      return profile;
    } catch {
      return null;
    }
  }, [locale]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const saved = await AsyncStorage.getItem(MODE_KEY).catch(() => null);
      if (saved === 'driver' || saved === 'rider') setModeState(saved);
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      setSession(data.session);
      if (data.session) {
        try {
          const profile = await rpc<Me>('sign_in_profile', { p_locale: null });
          if (alive) {
            setMe(profile);
            setLocale(profile.locale);
          }
        } catch (e) {
          if (e instanceof AppError && e.code === 'not_signed_in') await supabase.auth.signOut().catch(() => {});
        }
      }
      setReady(true);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) setMe(null);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [setLocale]);

  const setMode = useCallback((next: Mode) => {
    setModeState(next);
    AsyncStorage.setItem(MODE_KEY, next).catch(() => {});
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut().catch(() => {});
    setMe(null);
    setSession(null);
  }, []);

  return <Context.Provider value={{ ready, session, me, mode, setMode, refresh, signOut }}>{children}</Context.Provider>;
}

export function useSession(): SessionState {
  const value = useContext(Context);
  if (!value) throw new Error('useSession outside SessionProvider');
  return value;
}
