import type { Session } from '@supabase/supabase-js';
import type { Locale } from '@thozhan/i18n';
import { useEffect, useMemo, useState } from 'react';
import { I18nContext, makeI18n, rpc, supabase, useI18n, USING_DEV_BACKEND } from './lib.tsx';
import { Audit, Compliance, Drivers, FareCheck, Fees, Incidents, Overview, Services, Staff, Trips, type StaffRole } from './pages.tsx';
import { Track } from './Track.tsx';

interface Me {
  phone: string;
  name: string | null;
  staffRole: StaffRole | null;
}

// Must match the require_staff checks in the database, which are what actually enforce this.
const PAGES = {
  overview: { component: Overview, roles: ['admin'] },
  drivers: { component: Drivers, roles: ['admin', 'reviewer'] },
  trips: { component: Trips, roles: ['admin', 'support'] },
  incidents: { component: Incidents, roles: ['admin', 'support'] },
  fees: { component: Fees, roles: ['admin'] },
  services: { component: Services, roles: ['admin'] },
  compliance: { component: Compliance, roles: ['admin', 'gov'] },
  farecheck: { component: FareCheck, roles: ['admin', 'gov'] },
  audit: { component: Audit, roles: ['admin'] },
  staff: { component: Staff, roles: ['admin'] },
} as const;
type Page = keyof typeof PAGES;

const savedLocale = (): Locale => (localStorage.getItem('thozhan.locale') === 'ta' ? 'ta' : 'en');

export function App() {
  const [locale, setLocale] = useState<Locale>(savedLocale);
  const i18n = useMemo(
    () =>
      makeI18n(locale, (l) => {
        localStorage.setItem('thozhan.locale', l);
        setLocale(l);
      }),
    [locale],
  );
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const track = location.pathname.match(/^\/track\/([\w-]+)/);
  return <I18nContext value={i18n}>{track ? <Track token={track[1]!} /> : <Console />}</I18nContext>;
}

function Console() {
  const { t } = useI18n();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [me, setMe] = useState<Me | null>(null);
  const [page, setPage] = useState<Page>(() => (location.hash.slice(1) as Page) || 'overview');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) return setMe(null);
    rpc<Me>('sign_in_profile', { p_locale: 'en' })
      .then(setMe)
      .catch((e) => {
        setMe(null);
        // The account behind this token is gone: back to the sign-in form.
        if (e instanceof Error && e.message === 'not_signed_in') supabase.auth.signOut();
      });
  }, [session]);
  useEffect(() => {
    const onHash = () => setPage((location.hash.slice(1) as Page) || 'overview');
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);

  if (session === undefined) return null;
  if (!session) return <Login />;
  if (!me) return null;
  if (!me.staffRole)
    return (
      <div className="center">
        <div className="card narrow">
          <h2>{t('a.login.title')}</h2>
          <p className="warn">{t('a.login.notStaff')}</p>
          <button onClick={() => supabase.auth.signOut()}>{t('a.signOut')}</button>
        </div>
      </div>
    );

  const allowed = (Object.keys(PAGES) as Page[]).filter((p) => (PAGES[p].roles as readonly string[]).includes(me.staffRole!));
  const current = allowed.includes(page) ? page : allowed[0]!;
  const Current = PAGES[current].component;
  return (
    <div className="shell">
      <aside>
        <div className="brand">
          <span className="logo">தோ</span>
          <div>
            <strong>{t(me.staffRole === 'gov' ? 'a.gov.title' : 'a.title')}</strong>
            <small>
              {me.phone} · {t(`a.staff.role.${me.staffRole}`)}
            </small>
          </div>
        </div>
        <nav>
          {allowed.map((p) => (
            <a key={p} href={`#${p}`} className={p === current ? 'on' : ''}>
              {t(`a.nav.${p}`)}
            </a>
          ))}
        </nav>
        <div className="aside-foot">
          <LangToggle />
          <button className="ghost" onClick={() => supabase.auth.signOut()}>
            {t('a.signOut')}
          </button>
        </div>
      </aside>
      <main>
        <Current />
      </main>
    </div>
  );
}

export function LangToggle() {
  const { locale, setLocale } = useI18n();
  return (
    <div className="seg">
      {(['ta', 'en'] as const).map((l) => (
        <button key={l} className={l === locale ? 'on' : ''} onClick={() => setLocale(l)}>
          {l === 'ta' ? 'தமிழ்' : 'English'}
        </button>
      ))}
    </div>
  );
}

const toE164 = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  return digits.length === 10 ? '+91' + digits : '+' + digits;
};

function Login() {
  const { t } = useI18n();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = sent
      ? await supabase.auth.verifyOtp({ phone: toE164(phone), token: otp.trim(), type: 'sms' })
      : await supabase.auth.signInWithOtp({ phone: toE164(phone) });
    setBusy(false);
    if (err) return setError(t(sent ? 'm.error.otp_expired' : 'm.error.network'));
    setSent(true);
  }

  return (
    <div className="center">
      <form className="card narrow" onSubmit={submit}>
        <div className="row-between">
          <h2>{t('a.login.title')}</h2>
          <LangToggle />
        </div>
        <label>
          {t('m.login.phone')}
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" disabled={sent} placeholder="90000 00001" autoFocus />
        </label>
        {sent ? (
          <label>
            {t('m.login.otp', { phone })}
            <input value={otp} onChange={(e) => setOtp(e.target.value)} inputMode="numeric" maxLength={6} autoFocus />
          </label>
        ) : null}
        {error ? <p className="warn">{error}</p> : null}
        <button disabled={busy}>{t(sent ? 'm.login.verify' : 'm.login.sendOtp')}</button>
        {sent ? (
          <button type="button" className="ghost" onClick={() => (setSent(false), setOtp(''))}>
            {t('m.login.change')}
          </button>
        ) : null}
        {USING_DEV_BACKEND ? <p className="muted small">{t('m.login.devHint')} · 90000 00001 – 90000 00004</p> : null}
      </form>
    </div>
  );
}
