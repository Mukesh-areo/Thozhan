import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import { Text, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from './ui';

export const tabIcon =
  (name: ComponentProps<typeof Feather>['name']) =>
  ({ color }: { color?: ColorValue | null }) => <Feather name={name} size={23} color={color as string} accessible={false} importantForAccessibility="no" accessibilityElementsHidden />;

/** Sized for Tamil labels (a long one shrinks a little rather than being cut off on a
 * 360 dp phone), and kept clear of the phone's gesture bar. */
export function useTabOptions() {
  const bottom = useSafeAreaInsets().bottom;
  return {
    headerShown: false,
    tabBarActiveTintColor: C.brand,
    tabBarInactiveTintColor: '#7c8983',
    tabBarLabel: ({ color, children }: { color: ColorValue; children: string }) => (
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ color, fontSize: 12, lineHeight: 20, fontWeight: '700', textAlign: 'center' }}>
        {children}
      </Text>
    ),
    tabBarStyle: { height: 74 + bottom, paddingBottom: 10 + bottom, paddingTop: 8, borderTopColor: C.line },
  };
}
