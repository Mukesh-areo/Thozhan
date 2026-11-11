// The Account tab. Passengers and drivers each have their own account type, chosen at login
// and tied to the number (UX handoff §1), so there is no switch here, only that type's pages.
import { router } from 'expo-router';
import { View } from 'react-native';
import { rpc } from './api';
import { USING_DEV_BACKEND, SUPABASE_URL } from './config';
import { useI18n } from './i18n';
import { useSession } from './session';
import { Badge, C, Card, Gap, H1, H2, Icon, ListRow, P, Screen, Segmented } from './ui';

export function AccountScreen() {
  const { t, locale, setLocale } = useI18n();
  const { me, mode, signOut } = useSession();
  const status = me?.driver?.status;
  const isDriver = mode === 'driver';

  function changeLocale(next: 'ta' | 'en') {
    setLocale(next);
    rpc('update_profile', { p_name: null, p_locale: next }).catch(() => {});
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
          {me?.rating ? (
            <View style={{ alignItems: 'flex-end' }}>
              <H2>{`★ ${me.rating.average.toFixed(1)}`}</H2>
              <P small muted>
                {t('m.rate.count', { count: me.rating.count })}
              </P>
            </View>
          ) : null}
        </View>
        <Badge text={isDriver ? t('m.role.driverPartner') : t('m.role.passenger')} tone="muted" />
        {isDriver && status ? <Badge text={t('m.account.driverStatus', { status: t(`m.reg.status.${status}`) })} tone={status === 'approved' ? 'ok' : 'warn'} /> : null}
      </Card>
      <View>
        {isDriver ? (
          <>
            <ListRow icon="file-text" title={t('m.manage.documents')} onPress={() => router.push('/documents')} />
            <ListRow icon="shield" title={t('m.insurance.title')} onPress={() => router.push('/insurance')} />
          </>
        ) : (
          <>
            <ListRow icon="bookmark" title={t('m.account.saved')} onPress={() => router.push('/saved-places')} />
            <ListRow icon="credit-card" title={t('m.profile.payment')} onPress={() => router.push('/payment')} />
            <ListRow icon="umbrella" title={t('m.insurance.title')} onPress={() => router.push('/insurance')} />
            <ListRow icon="shield" title={t('m.safety.centre')} onPress={() => router.push('/safety')} />
            <ListRow icon="users" title={t('m.contacts.title')} onPress={() => router.push('/contacts')} />
          </>
        )}
        <ListRow icon="help-circle" title={t('m.help.title')} onPress={() => router.push('/help')} />
        <ListRow icon="lock" title={t('m.privacy.title')} onPress={() => router.push('/privacy')} />
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
      <P small muted>
        {t('m.account.typeFixed')}
      </P>
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
