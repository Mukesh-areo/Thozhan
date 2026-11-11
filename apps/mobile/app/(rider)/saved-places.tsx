// Saved places: the hearted landmarks, kept on this phone. Tap one to book from it.
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useBooking } from '../../src/booking';
import { useI18n } from '../../src/i18n';
import { C, Card, Header, Icon, ListRow, P, Screen } from '../../src/ui';

export default function SavedPlaces() {
  const { t } = useI18n();
  const b = useBooking();
  return (
    <Screen>
      <Header title={t('m.account.saved')} />
      {b.favourites.length === 0 ? (
        <Card style={{ alignItems: 'center' }}>
          <Icon name="heart" size={30} color={C.muted} />
          <P muted center>
            {t('m.saved.empty')}
          </P>
        </Card>
      ) : (
        <View>
          {b.favourites.map((place, i) => (
            <ListRow
              key={`${place.lat},${place.lon}`}
              icon="map-pin"
              title={place.name}
              divider={i < b.favourites.length - 1}
              onPress={() => {
                b.setDrop(place);
                router.dismissTo('/book');
              }}
              right={
                <Pressable onPress={() => b.toggleFavourite(place)} accessibilityRole="button" accessibilityLabel={t('m.saved.remove')} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="trash-2" size={20} color={C.danger} />
                </Pressable>
              }
            />
          ))}
        </View>
      )}
      <P small muted>
        {t('m.saved.note')}
      </P>
    </Screen>
  );
}
