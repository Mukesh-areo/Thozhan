// Route on the map, the vehicles with their Government-tariff fares, and the booking button.
import { CATEGORIES } from '@thozhan/shared';
import { calculateFare, getActiveRule } from '@thozhan/tariff';
import * as Crypto from 'expo-crypto';
import { Redirect, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { rpc, type Trip } from '../../src/api';
import { useBooking } from '../../src/booking';
import { errorText, useI18n } from '../../src/i18n';
import { MapView } from '../../src/MapView';
import { estimateMeters } from '../../src/places';
import { Badge, Button, C, Icon, Notice, P, RoundButton, Sheet, useTopInset, VehicleArt } from '../../src/ui';

/** Chennai traffic, roughly; a trip-length hint only. The fare never uses it. */
const AVERAGE_KMPH = 18;

export default function Choose() {
  const { t, money, km } = useI18n();
  const b = useBooking();
  const top = useTopInset();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientKey = useRef(Crypto.randomUUID());

  if (b.trip) return <Redirect href="/book" />;
  if (!b.pickup || !b.drop) return <Redirect href={b.flow === 'parcel' ? '/parcel' : '/book'} />;
  const { pickup, drop } = b;

  const flow = b.flow === 'parcel' ? 'delivery' : 'ride';
  const offered = CATEGORIES.filter((c) => c.flows.includes(flow));
  const meters = estimateMeters(pickup, drop);
  const minutes = Math.max(3, Math.round((meters / 1000 / AVERAGE_KMPH) * 60));
  const weightGrams = Math.round(Number(b.parcel.weightKg.replace(',', '.')) * 1000) || 0;
  // A parcel over a vehicle's limit has no fare, so that vehicle cannot be chosen for it.
  const quoteFor = (id: string) => {
    try {
      return calculateFare(getActiveRule(id), { distanceMeters: meters, startedAt: Date.now(), ...(id.startsWith('parcel') ? { weightGrams } : {}) });
    } catch {
      return null;
    }
  };
  const enabled = offered.filter((c) => b.flags[c.id]);
  const bookable = enabled.filter((c) => quoteFor(c.id));
  const cat = bookable.find((c) => c.id === b.category) ?? bookable[0] ?? null;
  const ordered = [...enabled, ...offered.filter((c) => !b.flags[c.id])];
  const quote = cat ? quoteFor(cat.id) : null;

  async function book() {
    if (!cat) return;
    setError(null);
    if (meters < 100) return setError(t('m.book.samePlace'));
    setBusy(true);
    try {
      const made = await rpc<Trip>('request_trip', {
        p_category: cat.id,
        p_pickup: pickup,
        p_dropoff: drop,
        p_estimate_meters: meters,
        p_quote: quote,
        p_parcel:
          b.flow === 'parcel'
            ? { receiverName: b.parcel.receiverName.trim(), receiverPhone: b.parcel.receiverPhone.replace(/\s/g, ''), weightGrams, item: b.parcel.item.trim() || null }
            : null,
        p_client_key: clientKey.current,
      });
      clientKey.current = Crypto.randomUUID();
      b.follow(made);
      b.reset();
      router.replace('/book');
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(false);
    }
  }

  const edit = (field: 'pickup' | 'drop') => router.push(`/search?field=${field}&next=back`);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1, minHeight: 200 }}>
        <MapView
          fill
          route
          markers={[
            { ...pickup, kind: 'pickup' },
            { ...drop, kind: 'drop' },
          ]}
        />
        <View style={[styles.chips, { top }]} pointerEvents="box-none">
          <Chip name={pickup.name} dot={C.brand} onPress={() => edit('pickup')} />
          <Chip name={drop.name} dot={C.danger} onPress={() => edit('drop')} />
        </View>
        <RoundButton icon="arrow-left" label={t('m.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/book'))} style={{ position: 'absolute', left: 16, bottom: 36 }} />
      </View>
      <Sheet
        maxHeight="66%"
        footer={
          <>
            <Notice text={error} />
            <Pressable onPress={() => router.push('/payment')} accessibilityRole="button" style={styles.pay}>
              <Icon name="credit-card" size={20} />
              <Text style={styles.payText}>{t('m.book.cash')}</Text>
              <Icon name="chevron-right" size={18} />
              <Text style={styles.km}>{t('m.book.approx', { km: km(meters) })}</Text>
            </Pressable>
            <Button
              kind="lime"
              title={cat ? t('m.book.confirm', { service: t(cat.nameKey) }) + (quote ? ` · ${money(quote.totalPaise)}` : '') : t('m.book.comingSoon')}
              onPress={book}
              loading={busy}
              disabled={!b.loaded || !cat}
            />
          </>
        }
      >
        <P small muted>
          {t('m.book.estimateNote')}
        </P>
        <View style={{ gap: 4 }}>
          {ordered.map((c) => {
            const switchedOn = !!b.flags[c.id];
            const fare = switchedOn ? quoteFor(c.id) : null;
            const available = !!fare;
            const on = c.id === cat?.id;
            return (
              <Pressable
                key={c.id}
                onPress={available ? () => b.setCategory(c.id) : undefined}
                disabled={!available}
                accessibilityRole="radio"
                accessibilityState={{ checked: on, disabled: !available }}
                style={[styles.vehicle, on && styles.vehicleOn, !available && { opacity: 0.5 }]}
              >
                <VehicleArt category={c.id} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.name}>{t(c.nameKey)}</Text>
                  {available ? (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.detail}>{t('m.book.tripTime', { minutes })}</Text>
                        {c.seats ? (
                          <>
                            <Icon name="user" size={13} color={C.muted} />
                            <Text style={styles.detail}>{c.seats}</Text>
                          </>
                        ) : null}
                      </View>
                      <Badge text={t(`tariff.status.${getActiveRule(c.id).status}`)} tone="muted" />
                    </>
                  ) : (
                    <Text style={styles.detail}>{switchedOn ? t('m.book.tooHeavy') : t('m.book.comingSoon')}</Text>
                  )}
                </View>
                {fare ? <Text style={styles.price}>{money(fare.totalPaise)}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
}

function Chip({ name, dot, onPress }: { name: string; dot: string; onPress(): void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.chip}>
      <View style={[styles.chipDot, { borderColor: dot }]} />
      <Text style={styles.chipText} numberOfLines={1}>
        {name}
      </Text>
      <Icon name="edit-2" size={14} color={C.muted} />
    </Pressable>
  );
}

const styles = {
  chips: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', gap: 8 },
  chip: { flex: 1, minHeight: 44, borderRadius: 14, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, boxShadow: '0px 4px 14px rgba(20, 32, 27, 0.14)' },
  chipDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 3, backgroundColor: '#fff' },
  chipText: { flex: 1, fontSize: 14, lineHeight: 21, fontWeight: '600', color: C.ink },
  vehicle: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 18, borderWidth: 2, borderColor: 'transparent' },
  vehicleOn: { borderColor: C.brand, backgroundColor: '#fbfdf8' },
  name: { fontSize: 17, lineHeight: 25, fontWeight: '700', color: C.ink },
  detail: { fontSize: 13, lineHeight: 19, color: C.muted },
  price: { fontSize: 20, lineHeight: 28, fontWeight: '800', color: C.ink },
  pay: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32 },
  payText: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: C.ink },
  km: { flex: 1, textAlign: 'right', fontSize: 13, lineHeight: 19, color: C.muted },
} as const;
