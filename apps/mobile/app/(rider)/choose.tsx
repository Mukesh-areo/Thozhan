// Route on the map and the vehicles with their fares; Continue opens the booking review.
import { CATEGORIES } from '@thozhan/shared';
import { getActiveRule } from '@thozhan/tariff';
import { Redirect, router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useBooking } from '../../src/booking';
import { quoteFor } from '../../src/fares';
import { useI18n } from '../../src/i18n';
import { MapView } from '../../src/MapView';
import { estimateMeters } from '../../src/places';
import { Badge, Button, C, Icon, Notice, P, RoundButton, Sheet, useTopInset, VehicleArt } from '../../src/ui';

/** Chennai traffic, roughly; a trip-length hint only. The fare never uses it. */
const AVERAGE_KMPH = 18;

export default function Choose() {
  const { t, money, km } = useI18n();
  const b = useBooking();
  const top = useTopInset();

  if (b.trip) return <Redirect href="/book" />;
  if (!b.pickup || !b.drop) return <Redirect href={b.flow === 'parcel' ? '/parcel' : '/book'} />;
  const { pickup, drop } = b;

  const flow = b.flow === 'parcel' ? 'delivery' : 'ride';
  const offered = CATEGORIES.filter((c) => c.flows.includes(flow));
  const meters = estimateMeters(pickup, drop);
  const minutes = Math.max(3, Math.round((meters / 1000 / AVERAGE_KMPH) * 60));
  const weightGrams = Math.round(Number(b.parcel.weightKg.replace(',', '.')) * 1000) || 0;
  // A parcel over a vehicle's limit has no fare, so that vehicle cannot be chosen for it.
  const fareFor = (id: string) => quoteFor(id, meters, weightGrams);
  const enabled = offered.filter((c) => b.flags[c.id]);
  const bookable = enabled.filter((c) => fareFor(c.id));
  const cat = bookable.find((c) => c.id === b.category) ?? bookable[0] ?? null;
  const ordered = [...enabled, ...offered.filter((c) => !b.flags[c.id])];
  const quote = cat ? fareFor(cat.id) : null;
  const tooShort = meters < 100;

  function next() {
    if (!cat) return;
    b.setCategory(cat.id);
    router.push('/review');
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
            <Notice text={tooShort ? t('m.book.samePlace') : null} />
            <Pressable onPress={() => router.push('/payment')} accessibilityRole="button" style={styles.pay}>
              <Icon name="credit-card" size={20} />
              <Text style={styles.payText}>{t('m.book.cash')}</Text>
              <Icon name="chevron-right" size={18} />
              <Text style={styles.km}>{t('m.book.approx', { km: km(meters) })}</Text>
            </Pressable>
            <Button
              kind="lime"
              title={cat ? t('m.book.continueWith', { service: t(cat.nameKey) }) + (quote ? ` · ${money(quote.totalPaise)}` : '') : t('m.book.comingSoon')}
              onPress={next}
              disabled={!b.loaded || !cat || tooShort}
            />
          </>
        }
      >
        <P small muted>
          {t('m.book.estimateNote')}
        </P>
        <Pressable onPress={() => router.push('/fares')} accessibilityRole="link" style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 14, lineHeight: 21, fontWeight: '700', color: C.brand }}>{t('m.fares.see')}</Text>
          <Icon name="chevron-right" size={18} color={C.brand} />
        </Pressable>
        <View style={{ gap: 4 }}>
          {ordered.map((c) => {
            const switchedOn = !!b.flags[c.id];
            const fare = switchedOn ? fareFor(c.id) : null;
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
                    <Text style={styles.detail}>{switchedOn ? t('m.book.tooHeavy') : t('m.book.awaitingApproval')}</Text>
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
