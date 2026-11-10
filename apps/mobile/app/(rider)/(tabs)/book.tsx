// Ride home: the map with the pickup point, and a sheet asking where to go.
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { ActiveTrip } from '../../../src/ActiveTrip';
import type { Place } from '../../../src/api';
import { useBooking } from '../../../src/booking';
import { FavouriteButton } from '../../../src/FavouriteButton';
import { useI18n } from '../../../src/i18n';
import { MapView } from '../../../src/MapView';
import { C, Icon, ListRow, Notice, Sheet, VehicleArt } from '../../../src/ui';

export default function Book() {
  const { t } = useI18n();
  const b = useBooking();
  if (b.trip) return <ActiveTrip trip={b.trip} onChange={b.setTrip} />;

  const openSearch = (field: 'pickup' | 'drop') => {
    b.setFlow('ride');
    b.setInfo(null);
    router.push(`/search?field=${field}&next=${field === 'drop' ? 'choose' : 'back'}`);
  };
  const goTo = (place: Place) => {
    b.setFlow('ride');
    b.setInfo(null);
    b.setDrop(place);
    router.push('/choose');
  };

  // Saved places first, then recent ones; a new passenger sees landmarks instead of an empty list.
  const seen = new Set<string>([b.pickup?.name ?? '']);
  const suggestions = [...b.favourites, ...b.recents, ...b.places]
    .filter((place) => {
      if (seen.has(place.name)) return false;
      seen.add(place.name);
      return true;
    })
    .slice(0, 3);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1, minHeight: 220 }}>
        <MapView fill markers={b.pickup ? [{ ...b.pickup, kind: 'pickup', label: t('m.book.pickupPoint') }] : []} />
        <Pressable onPress={() => openSearch('pickup')} accessibilityRole="button" style={styles.pill}>
          <View style={styles.pickupDot} />
          <Text style={styles.pillText} numberOfLines={1}>
            {b.pickup?.name ?? t('m.book.choosePlace')}
          </Text>
        </Pressable>
      </View>
      <Sheet>
        <Notice text={b.info} tone="warn" />
        <Pressable onPress={() => openSearch('drop')} accessibilityRole="button" style={styles.search}>
          <Icon name="search" size={24} />
          <Text style={styles.searchText}>{t('m.book.title')}</Text>
        </Pressable>
        <View>
          {suggestions.map((place, i) => (
            <ListRow
              key={place.name}
              icon={b.isFavourite(place) ? 'star' : 'clock'}
              title={place.name}
              onPress={() => goTo(place)}
              divider={i < suggestions.length - 1}
              right={<FavouriteButton place={place} />}
            />
          ))}
        </View>
        <Pressable onPress={() => router.navigate('/parcel')} accessibilityRole="button" style={styles.promo}>
          <View style={{ flex: 1 }}>
            <Text style={styles.promoTitle}>{t('m.parcel.title')}</Text>
            <Text style={styles.promoBody}>{t('m.parcel.sub')}</Text>
          </View>
          <VehicleArt category="parcel-auto" size={84} />
        </Pressable>
      </Sheet>
    </View>
  );
}

const styles = {
  pill: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 36,
    minHeight: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    boxShadow: '0px 4px 18px rgba(20, 32, 27, 0.14)',
  },
  pickupDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 4, borderColor: C.brand, backgroundColor: '#fff' },
  pillText: { flex: 1, fontSize: 16, lineHeight: 24, fontWeight: '600', color: C.ink },
  search: { minHeight: 60, borderRadius: 30, borderWidth: 2, borderColor: C.brandSoft, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20 },
  searchText: { flex: 1, fontSize: 18, lineHeight: 28, fontWeight: '700', color: C.ink },
  promo: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, backgroundColor: C.brandSoft, paddingLeft: 16, paddingRight: 8, paddingVertical: 10 },
  promoTitle: { fontSize: 15, lineHeight: 22, fontWeight: '800', color: C.brand },
  promoBody: { fontSize: 13, lineHeight: 19, color: C.muted },
} as const;
