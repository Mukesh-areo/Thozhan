import { Text } from 'react-native';
import { C } from './ui';

export const tabIcon =
  (glyph: string) =>
  ({ focused }: { focused: boolean }) => <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{glyph}</Text>;

export const TAB_OPTIONS = {
  headerShown: false,
  tabBarActiveTintColor: C.brand,
  tabBarInactiveTintColor: C.muted,
  tabBarLabelStyle: { fontSize: 12, fontWeight: '600' as const },
  tabBarStyle: { height: 62, paddingBottom: 8, paddingTop: 6 },
};
