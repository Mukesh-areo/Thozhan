import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppError, rpc, supabase, type Me } from './api';
import { useI18n } from './i18n';

/** Which app this account sees. A number is a passenger or a driver account, never both. */
export type Mode = 'rider' | 'driver';

export const modeOf = (me: Me | null): Mode => (me?.accountType === 'driver' || (!me?.accountType && me?.driver) ? 'driver' : 'rider');

interface SessionState {
  ready: boolean;
  session: Session | null;
  me: Me | null;
  mode: Mode;
  /** Shown once on the home screen, e.g. when the number already belongs to the other account type. */
  notice: string | null;
  setNotice(text: string | null): void;
  refresh(): Promise<Me | null>;
  signOut(): Promise<void>;
}

const Context = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { locale, setLocale } = useI18n();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  const signOut = useCallback(async () => {
    await supabase.auth.signOut().catch(() => {});
    setMe(null);
    setSession(null);
    setNotice(null);
  }, []);

  return <Context.Provider value={{ ready, session, me, mode: modeOf(me), notice, setNotice, refresh, signOut }}>{children}</Context.Provider>;
}

export function useSession(): SessionState {
  const value = useContext(Context);
  if (!value) throw new Error('useSession outside SessionProvider');
  return value;
}
