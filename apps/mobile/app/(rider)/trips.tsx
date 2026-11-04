import { getCategory } from '@thozhan/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { rpc, type Trip } from '../../src/api';
import { useI18n } from '../../src/i18n';
import { usePoll } from '../../src/usePoll';
import { Badge, C, Card, H1, P, Screen } from '../../src/ui';

export function TripList({ title }: { title: string }) {
  const { t, money } = useI18n();
  const [trips, setTrips] = useState<Trip[] | null>(null);
  usePoll(async () => setTrips(await rpc<Trip[]>('my_trips', { p_limit: 50 })), 15000);
  return (
    <Screen>
      <H1>{title}</H1>
      {trips === null ? <P muted>{t('m.loading')}</P> : null}
      {trips?.length === 0 ? <P muted>{t('m.trips.empty')}</P> : null}
      {trips?.map((trip) => {
        const c = getCategory(trip.category);
        const ended = trip.status === 'COMPLETED' || trip.status === 'DELIVERED';
        return (
          <Pressable key={trip.id} onPress={() => router.push(`/receipt/${trip.id}`)}>
            <Card>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 26 }}>{trip.flow === 'meter' ? '⏱️' : c.icon}</Text>
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

export default function Trips() {
  const { t } = useI18n();
  return <TripList title={t('m.trips.title')} />;
}
