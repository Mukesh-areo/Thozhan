import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable } from 'react-native';
import type { Place } from './api';
import { useBooking } from './booking';
import { useI18n } from './i18n';
import { C } from './ui';

/** The heart at the end of a place row; saved places are kept on this phone. */
export function FavouriteButton({ place }: { place: Place }) {
  const { t } = useI18n();
  const { isFavourite, toggleFavourite } = useBooking();
  const on = isFavourite(place);
  return (
    <Pressable
      onPress={() => toggleFavourite(place)}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={t('m.book.savePlace')}
      accessibilityState={{ selected: on }}
    >
      <MaterialCommunityIcons name={on ? 'heart' : 'heart-outline'} size={26} color={on ? C.brand : '#7c8983'} />
    </Pressable>
  );
}
