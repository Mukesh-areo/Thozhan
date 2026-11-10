import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from './ui';

export const tabIcon =
  (name: ComponentProps<typeof Feather>['name']) =>
  ({ color }: { color?: ColorValue | null }) => <Feather name={name} size={23} color={color as string} />;

/** Sized for Tamil labels, and kept clear of the phone's gesture bar. */
export function useTabOptions() {
  const bottom = useSafeAreaInsets().bottom;
  return {
    headerShown: false,
    tabBarActiveTintColor: C.brand,
    tabBarInactiveTintColor: '#7c8983',
    tabBarLabelStyle: { fontSize: 12, lineHeight: 20, fontWeight: '700' as const },
    tabBarStyle: { height: 74 + bottom, paddingBottom: 10 + bottom, paddingTop: 8, borderTopColor: C.line },
  };
}
