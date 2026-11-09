import { Redirect, Tabs } from 'expo-router';
import { useI18n } from '../../src/i18n';
import { useSession } from '../../src/session';
import { TAB_OPTIONS, tabIcon } from '../../src/tabs';

export default function RiderTabs() {
  const { t } = useI18n();
  const { ready, session } = useSession();
  if (ready && !session) return <Redirect href="/login" />;
  return (
    <Tabs screenOptions={TAB_OPTIONS}>
      <Tabs.Screen name="book" options={{ title: t('m.tab.book'), tabBarIcon: tabIcon('🛺') }} />
      <Tabs.Screen name="meter" options={{ title: t('m.tab.meter'), tabBarIcon: tabIcon('⏱️') }} />
      <Tabs.Screen name="trips" options={{ title: t('m.tab.trips'), tabBarIcon: tabIcon('🧾') }} />
      <Tabs.Screen name="account" options={{ title: t('m.tab.account'), tabBarIcon: tabIcon('👤') }} />
    </Tabs>
  );
}
