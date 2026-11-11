import { Tabs } from 'expo-router';
import { useI18n } from '../../../src/i18n';
import { tabIcon, useTabOptions } from '../../../src/tabs';

/** Passenger tabs from the UX handoff: Home, Trips, Meter, Account. */
export default function RiderTabs() {
  const { t } = useI18n();
  const options = useTabOptions();
  return (
    <Tabs screenOptions={options} backBehavior="history">
      <Tabs.Screen name="book" options={{ title: t('m.tab.home'), tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="trips" options={{ title: t('m.tab.trips'), tabBarIcon: tabIcon('list') }} />
      <Tabs.Screen name="meter" options={{ title: t('m.tab.meter'), tabBarIcon: tabIcon('clock') }} />
      <Tabs.Screen name="account" options={{ title: t('m.tab.account'), tabBarIcon: tabIcon('user') }} />
    </Tabs>
  );
}
