import { router } from 'expo-router';
import { rpc } from './api';
import { USING_DEV_BACKEND, SUPABASE_URL } from './config';
import { useI18n } from './i18n';
import { useSession } from './session';
import { Badge, Button, Card, H1, H2, P, Screen, Segmented } from './ui';

export function AccountScreen() {
  const { t, locale, setLocale } = useI18n();
  const { me, mode, setMode, signOut, refresh } = useSession();
  const status = me?.driver?.status;

  function changeLocale(next: 'ta' | 'en') {
    setLocale(next);
    rpc('update_profile', { p_name: null, p_locale: next }).catch(() => {});
  }

  async function switchMode() {
    if (mode === 'driver') {
      setMode('rider');
      router.replace('/book');
      return;
    }
    await refresh();
    setMode('driver');
    router.replace(status === 'approved' ? '/drive' : '/driver-register');
  }

  return (
    <Screen>
      <H1>{t('m.tab.account')}</H1>
      <Card>
        <H2>{me?.name ?? '—'}</H2>
        <P muted>+{me?.phone}</P>
        {status ? <Badge text={t('m.account.driverStatus', { status: t(`m.reg.status.${status}`) })} tone={status === 'approved' ? 'ok' : 'warn'} /> : null}
      </Card>
      <Card>
        <P muted>{t('m.account.language')}</P>
        <Segmented
          value={locale}
          onChange={changeLocale}
          options={[
            { value: 'ta', label: 'தமிழ்' },
            { value: 'en', label: 'English' },
          ]}
        />
      </Card>
      <Button
        title={mode === 'driver' ? t('m.account.rideMode') : me?.driver ? t('m.account.driveMode') : t('m.account.becomeDriver')}
        kind="secondary"
        onPress={switchMode}
      />
      <Button
        title={t('m.signOut')}
        kind="ghost"
        onPress={async () => {
          await signOut();
          router.replace('/login');
        }}
      />
      {USING_DEV_BACKEND ? (
        <P small muted>
          {t('m.devBackend')}: {SUPABASE_URL}
        </P>
      ) : null}
    </Screen>
  );
}
