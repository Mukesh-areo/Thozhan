import { Redirect, Tabs } from 'expo-router';
import { useI18n } from '../../src/i18n';
import { useSession } from '../../src/session';
import { tabIcon, useTabOptions } from '../../src/tabs';

export default function DriverTabs() {
  const { t } = useI18n();
  const { ready, session, me } = useSession();
  const options = useTabOptions();
  if (ready && !session) return <Redirect href="/login" />;
  if (ready && me && me.driver?.status !== 'approved') return <Redirect href="/driver-register" />;
  return (
    <Tabs screenOptions={options}>
      <Tabs.Screen name="drive" options={{ title: t('m.tab.drive'), tabBarIcon: tabIcon('navigation') }} />
      <Tabs.Screen name="earnings" options={{ title: t('m.tab.earnings'), tabBarIcon: tabIcon('credit-card') }} />
      <Tabs.Screen name="driver-account" options={{ title: t('m.tab.account'), tabBarIcon: tabIcon('user') }} />
    </Tabs>
  );
}
