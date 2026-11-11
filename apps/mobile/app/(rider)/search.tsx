// Choosing a pickup or drop from the current location, saved places or the landmark list.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import type { Place } from '../../src/api';
import { useBooking } from '../../src/booking';
import { FavouriteButton } from '../../src/FavouriteButton';
import { useI18n } from '../../src/i18n';
import { currentFix } from '../../src/location';
import { C, Header, Icon, ListRow, Notice, P, Screen } from '../../src/ui';

export default function Search() {
  const { t } = useI18n();
  const { field = 'drop', next } = useLocalSearchParams<{ field?: string; next?: string }>();
  const b = useBooking();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isDrop = field === 'drop';

  function select(place: Place) {
    if (isDrop) b.setDrop(place);
    else b.setPickup(place);
    setText('');
    if (next === 'choose') router.replace('/choose');
    else router.back();
  }

  async function useMyLocation() {
    const fix = await currentFix();
    if (!fix) return setError(t('m.error.location_denied'));
    select({ name: t('m.book.myLocation'), lat: fix.lat, lon: fix.lon });
  }

  const query = text.trim().toLowerCase();
  const seen = new Set<string>();
  const matches = [...b.favourites, ...b.recents, ...b.places].filter((place) => {
    if (seen.has(place.name) || !place.name.toLowerCase().includes(query)) return false;
    seen.add(place.name);
    return true;
  });

  return (
    <Screen>
      <Header title={isDrop ? t('m.book.drop') : t('m.book.pickup')} />
      <View style={styles.box}>
        <Icon name="search" />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t('m.book.search')}
          placeholderTextColor="#7c8983"
          autoCorrect={false}
          style={styles.input}
          accessibilityLabel={t('m.book.search')}
        />
      </View>
      <Notice text={error} />
      <View>
        <ListRow icon="crosshair" title={t('m.book.myLocation')} onPress={useMyLocation} />
        {matches.map((place, i) => (
          <ListRow
            key={place.name}
            icon={b.isFavourite(place) ? 'star' : 'map-pin'}
            title={place.name}
            onPress={() => select(place)}
            divider={i < matches.length - 1}
            right={<FavouriteButton place={place} />}
          />
        ))}
      </View>
      {matches.length === 0 ? (
        <P muted center>
          {t('m.book.noMatch')}
        </P>
      ) : null}
    </Screen>
  );
}

const styles = {
  box: { minHeight: 56, borderRadius: 28, borderWidth: 2, borderColor: C.brandSoft, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18 },
  input: { flex: 1, fontSize: 16, minHeight: 50, color: C.ink },
} as const;
