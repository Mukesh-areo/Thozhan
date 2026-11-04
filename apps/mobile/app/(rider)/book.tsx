import { CATEGORIES, getCategory } from '@thozhan/shared';
import { calculateFare, getActiveRule } from '@thozhan/tariff';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { ActiveTrip } from '../../src/ActiveTrip';
import { rpc, type Place, type Trip } from '../../src/api';
import { POLL } from '../../src/config';
import { errorText, useI18n } from '../../src/i18n';
import { currentFix } from '../../src/location';
import { MapView } from '../../src/MapView';
import { estimateMeters, placesFor } from '../../src/places';
import { usePoll } from '../../src/usePoll';
import { Button, C, Card, Field, H1, H2, Notice, P, Screen } from '../../src/ui';

export default function Book() {
  const { t, money, km, locale } = useI18n();
  const places = useMemo(() => placesFor(locale), [locale]);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loaded, setLoaded] = useState(false);
  const lastTrip = useRef<string | null>(null);
  const [flags, setFlags] = useState<Record<string, boolean>>({ auto: true });
  const [pickup, setPickup] = useState<Place | null>(places[0] ?? null);
  const [drop, setDrop] = useState<Place | null>(null);
  const [picking, setPicking] = useState<'pickup' | 'drop' | null>(null);
  const [category, setCategory] = useState('auto');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [weightKg, setWeightKg] = useState('2');
  const [item, setItem] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const clientKey = useRef(Crypto.randomUUID());

  usePoll(async () => {
    const state = await rpc<{ trip: Trip | null }>('rider_state');
    setLoaded(true);
    if (state.trip) {
      lastTrip.current = state.trip.id;
      setTrip(state.trip);
      return;
    }
    setTrip(null);
    if (lastTrip.current) {
      // The trip just ended: show the receipt, or why it stopped.
      const ended = await rpc<Trip>('get_trip', { p_trip: lastTrip.current });
      lastTrip.current = null;
      if (ended.status === 'COMPLETED' || ended.status === 'DELIVERED') router.push(`/receipt/${ended.id}`);
      else setInfo(ended.cancelReason === 'no_driver' ? t('m.trip.noDriver') : t('m.trip.cancelled'));
    }
  }, POLL.rider);
  usePoll(async () => setFlags(await rpc<Record<string, boolean>>('service_flags')), 60000);

  const bookable = CATEGORIES.filter((c) => flags[c.id] && (c.flows.includes('ride') || c.flows.includes('delivery')));
  const cat = getCategory(bookable.some((c) => c.id === category) ? category : 'auto');
  const isParcel = cat.flows.includes('delivery');
  const meters = pickup && drop ? estimateMeters(pickup, drop) : null;
  const weightGrams = Math.round(Number(weightKg.replace(',', '.')) * 1000) || 0;
  const quoteFor = (id: string) =>
    meters ? calculateFare(getActiveRule(id), { distanceMeters: meters, startedAt: Date.now(), ...(id.startsWith('parcel') ? { weightGrams } : {}) }) : null;
  const quote = quoteFor(cat.id);

  async function book() {
    setError(null);
    setInfo(null);
    if (!pickup || !drop) return setError(t('m.error.bad_location'));
    if (meters !== null && meters < 100) return setError(t('m.book.samePlace'));
    setBusy(true);
    try {
      const made = await rpc<Trip>('request_trip', {
        p_category: cat.id,
        p_pickup: pickup,
        p_dropoff: drop,
        p_estimate_meters: meters,
        p_quote: quote,
        p_parcel: isParcel
          ? { receiverName: receiverName.trim(), receiverPhone: receiverPhone.replace(/\s/g, ''), weightGrams, item: item.trim() || null }
          : null,
        p_client_key: clientKey.current,
      });
      clientKey.current = Crypto.randomUUID();
      lastTrip.current = made.id;
      setTrip(made);
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(false);
    }
  }

  async function useMyLocation() {
    const fix = await currentFix();
    if (!fix) return setError(t('m.error.location_denied'));
    const here = { name: t('m.book.myLocation'), lat: fix.lat, lon: fix.lon };
    if (picking === 'drop') setDrop(here);
    else setPickup(here);
    setPicking(null);
  }

  if (trip) return <ActiveTrip trip={trip} onChange={setTrip} />;

  return (
    <Screen>
      <H1>{t('m.book.title')}</H1>
      <MapView markers={[...(pickup ? [{ ...pickup, kind: 'pickup' as const }] : []), ...(drop ? [{ ...drop, kind: 'drop' as const }] : [])]} height={190} />
      <Card>
        <PlaceButton label={t('m.book.pickup')} place={pickup} dot={C.brand} onPress={() => setPicking('pickup')} />
        <View style={{ height: 1, backgroundColor: C.line }} />
        <PlaceButton label={t('m.book.drop')} place={drop} dot={C.danger} onPress={() => setPicking('drop')} />
        {meters ? (
          <P small muted>
            {t('m.book.approx', { km: km(meters) })}
          </P>
        ) : null}
      </Card>

      <H2>{t('m.book.service')}</H2>
      {bookable.map((c) => {
        const q = quoteFor(c.id);
        const on = c.id === cat.id;
        return (
          <Pressable key={c.id} onPress={() => setCategory(c.id)} accessibilityRole="radio" accessibilityState={{ checked: on }}>
            <Card style={on ? { borderColor: C.brand, borderWidth: 2 } : {}}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 30 }}>{c.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink, lineHeight: 24 }}>{t(c.nameKey)}</Text>
                  <P small muted>
                    {t(`tariff.status.${getActiveRule(c.id).status}`)}
                  </P>
                </View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: C.ink }}>{q ? money(q.totalPaise) : '—'}</Text>
              </View>
            </Card>
          </Pressable>
        );
      })}

      {isParcel ? (
        <Card>
          <Field label={t('m.book.receiverName')} value={receiverName} onChangeText={setReceiverName} autoCapitalize="words" />
          <Field label={t('m.book.receiverPhone')} value={receiverPhone} onChangeText={setReceiverPhone} keyboardType="phone-pad" maxLength={14} />
          <Field label={t('m.book.weight')} value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" />
          <Field label={t('m.book.item')} value={item} onChangeText={setItem} />
          <P small muted>
            {t('m.book.restricted')}
          </P>
        </Card>
      ) : null}

      <P small muted>
        {t('m.book.estimateNote')} {t('m.book.payDriver')}
      </P>
      <Notice text={error} />
      <Notice text={info} tone="warn" />
      <Button
        title={t('m.book.confirm', { service: t(cat.nameKey) }) + (quote ? ` · ${money(quote.totalPaise)}` : '')}
        onPress={book}
        loading={busy}
        disabled={!loaded || !drop}
      />

      <Modal visible={picking !== null} animationType="slide" onRequestClose={() => setPicking(null)}>
        <Screen>
          <H1>{picking === 'drop' ? t('m.book.drop') : t('m.book.pickup')}</H1>
          <Button title={`📍 ${t('m.book.myLocation')}`} kind="secondary" onPress={useMyLocation} />
          {places.map((p) => (
            <Pressable
              key={p.name}
              onPress={() => {
                if (picking === 'drop') setDrop(p);
                else setPickup(p);
                setPicking(null);
              }}
            >
              <Card>
                <Text style={{ fontSize: 16, color: C.ink, lineHeight: 24 }}>{p.name}</Text>
              </Card>
            </Pressable>
          ))}
          <Button title={t('m.close')} kind="ghost" onPress={() => setPicking(null)} />
        </Screen>
      </Modal>
    </Screen>
  );
}

function PlaceButton({ label, place, dot, onPress }: { label: string; place: Place | null; dot: string; onPress(): void }) {
  const { t } = useI18n();
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }} accessibilityRole="button">
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: dot }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, color: C.muted, lineHeight: 18 }}>{label}</Text>
        <Text style={{ fontSize: 16, color: place ? C.ink : C.muted, fontWeight: '600', lineHeight: 24 }}>{place?.name ?? t('m.book.choosePlace')}</Text>
      </View>
    </Pressable>
  );
}
