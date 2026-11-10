// The Profile page: who you are, then one line for each thing you can open.
import { router } from 'expo-router';
import { View } from 'react-native';
import { rpc } from './api';
import { USING_DEV_BACKEND, SUPABASE_URL } from './config';
import { useI18n } from './i18n';
import { useSession } from './session';
import { Badge, C, Card, Gap, H1, H2, Icon, ListRow, P, Screen, Segmented } from './ui';

export function AccountScreen() {
  const { t, locale, setLocale } = useI18n();
  const { me, mode, setMode, signOut, refresh } = useSession();
  const status = me?.driver?.status;
  const isDriver = mode === 'driver';

  function changeLocale(next: 'ta' | 'en') {
    setLocale(next);
    rpc('update_profile', { p_name: null, p_locale: next }).catch(() => {});
  }

  async function switchMode() {
    if (isDriver) {
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
        <View style={styles.person}>
          <View style={styles.avatar}>
            <Icon name="user" size={26} color={C.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <H2>{me?.name ?? '—'}</H2>
            <P muted>+{me?.phone}</P>
          </View>
        </View>
        {status ? <Badge text={t('m.account.driverStatus', { status: t(`m.reg.status.${status}`) })} tone={status === 'approved' ? 'ok' : 'warn'} /> : null}
      </Card>
      <View>
        {isDriver ? null : (
          <>
            <ListRow icon="clock" title={t('m.profile.rides')} onPress={() => router.push('/trips')} />
            <ListRow icon="package" title={t('m.profile.parcel')} onPress={() => router.navigate('/parcel')} />
            <ListRow icon="credit-card" title={t('m.profile.payment')} onPress={() => router.push('/payment')} />
            <ListRow icon="shield" title={t('m.profile.safety')} onPress={() => router.push('/safety')} />
          </>
        )}
        <ListRow icon="help-circle" title={t('m.profile.help')} onPress={() => router.push('/help')} />
        <ListRow
          icon="repeat"
          title={isDriver ? t('m.account.rideMode') : me?.driver ? t('m.account.driveMode') : t('m.account.becomeDriver')}
          onPress={switchMode}
        />
        <ListRow
          icon="log-out"
          title={t('m.signOut')}
          divider={false}
          onPress={async () => {
            await signOut();
            router.replace('/login');
          }}
        />
      </View>
      <Gap h={2} />
      <P small muted>
        {t('m.account.language')}
      </P>
      <Segmented
        value={locale}
        onChange={changeLocale}
        options={[
          { value: 'ta', label: 'தமிழ்' },
          { value: 'en', label: 'English' },
        ]}
      />
      {USING_DEV_BACKEND ? (
        <P small muted>
          {t('m.devBackend')}: {SUPABASE_URL}
        </P>
      ) : null}
    </Screen>
  );
}

const styles = {
  person: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' },
} as const;
