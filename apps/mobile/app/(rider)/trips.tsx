import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { rpc, type Trip } from '../../src/api';
import { useI18n } from '../../src/i18n';
import { usePoll } from '../../src/usePoll';
import { Badge, C, Card, Header, Icon, P, Screen, VehicleArt } from '../../src/ui';

export default function Trips() {
  const { t, money } = useI18n();
  const [trips, setTrips] = useState<Trip[] | null>(null);
  usePoll(async () => setTrips(await rpc<Trip[]>('my_trips', { p_limit: 50 })), 15000);
  return (
    <Screen>
      <Header title={t('m.profile.rides')} />
      {trips === null ? <P muted>{t('m.loading')}</P> : null}
      {trips?.length === 0 ? <P muted>{t('m.trips.empty')}</P> : null}
      {trips?.map((trip) => {
        const ended = trip.status === 'COMPLETED' || trip.status === 'DELIVERED';
        return (
          <Pressable key={trip.id} onPress={() => router.push(`/receipt/${trip.id}`)} accessibilityRole="button">
            <Card>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                {trip.flow === 'meter' ? <Icon name="clock" size={30} color={C.brand} /> : <VehicleArt category={trip.category} size={56} />}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink, lineHeight: 22 }}>
                    {trip.flow === 'meter' ? t('m.trips.meter') : `${trip.pickup?.name ?? ''} → ${trip.dropoff?.name ?? ''}`}
                  </Text>
                  <P small muted>
                    {new Date(trip.createdAt).toLocaleString()} · {trip.code}
                  </P>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: C.ink }}>{trip.totalPaise != null ? money(trip.totalPaise) : '—'}</Text>
                  <Badge text={t(`trip.status.${trip.status}`)} tone={ended ? 'ok' : trip.status === 'CANCELLED' ? 'muted' : 'warn'} />
                </View>
              </View>
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}
