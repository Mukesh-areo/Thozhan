// Trip and parcel history, with a filter. Each entry opens its receipt.
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { rpc, type Trip } from '../../../src/api';
import { useI18n } from '../../../src/i18n';
import { usePoll } from '../../../src/usePoll';
import { Badge, Button, C, Card, H1, Icon, Notice, P, Screen, Segmented, VehicleArt } from '../../../src/ui';

type Filter = 'all' | 'ride' | 'delivery' | 'meter';

export default function Trips() {
  const { t, money } = useI18n();
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const load = async () => {
    try {
      setTrips(await rpc<Trip[]>('my_trips', { p_limit: 100 }));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  };
  usePoll(load, 15000);
  const shown = trips?.filter((x) => filter === 'all' || x.flow === filter) ?? [];

  return (
    <Screen>
      <H1>{t('m.tab.trips')}</H1>
      <Segmented
        value={filter}
        onChange={(v) => setFilter(v as Filter)}
        options={[
          { value: 'all', label: t('m.trips.all') },
          { value: 'ride', label: t('m.trips.rides') },
          { value: 'delivery', label: t('m.trips.parcels') },
          { value: 'meter', label: t('m.tab.meter') },
        ]}
      />
      {failed ? (
        <>
          <Notice text={t('m.error.network')} />
          <Button title={t('m.retry')} kind="secondary" onPress={load} />
        </>
      ) : null}
      {trips === null && !failed ? <ActivityIndicator color={C.brand} /> : null}
      {trips && shown.length === 0 ? (
        <Card style={{ alignItems: 'center' }}>
          <Icon name="map" size={30} color={C.muted} />
          <P muted center>
            {t('m.trips.empty')}
          </P>
        </Card>
      ) : null}
      {shown.map((trip) => {
        const ended = trip.status === 'COMPLETED' || trip.status === 'DELIVERED';
        const title =
          trip.flow === 'meter' ? t('m.trips.meter') : `${trip.pickup?.name ?? ''} → ${trip.dropoff?.name ?? ''}`;
        return (
          <Pressable key={trip.id} onPress={() => router.push(`/receipt/${trip.id}`)} accessibilityRole="button" accessibilityLabel={title}>
            <Card>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                {trip.flow === 'meter' ? <Icon name="clock" size={30} color={C.brand} /> : <VehicleArt category={trip.category} size={56} />}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink, lineHeight: 22 }}>{title}</Text>
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
