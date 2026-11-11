// Review before confirming (UX handoff §3): the service and its full estimated price with the
// formula, payment, passenger cover, a pickup note, and the checks each vehicle needs:
// bike safety for two-wheelers, preferences for cabs, the packed-safely declaration for parcels.
import { getCategory } from '@thozhan/shared';
import * as Crypto from 'expo-crypto';
import { Redirect, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { rpc, type Trip, type TripOptions } from '../../src/api';
import { useBooking } from '../../src/booking';
import { isGovernmentTariff, quoteFor, ruleFor, rupees } from '../../src/fares';
import { errorText, useI18n } from '../../src/i18n';
import { estimateMeters } from '../../src/places';
import { Badge, Button, C, Card, FareLines, Field, H2, Header, Icon, Notice, P, RouteStops, Row, Screen, Segmented, Toggle, VehicleArt } from '../../src/ui';

export default function Review() {
  const { t, money, km } = useI18n();
  const b = useBooking();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientKey = useRef(Crypto.randomUUID());

  if (b.trip) return <Redirect href="/book" />;
  if (!b.pickup || !b.drop) return <Redirect href="/book" />;
  const { pickup, drop, options, parcel } = b;
  const category = getCategory(b.category);
  const meters = estimateMeters(pickup, drop);
  const weightGrams = Math.round(Number(parcel.weightKg.replace(',', '.')) * 1000) || 0;
  const quote = quoteFor(category.id, meters, weightGrams);
  const rule = ruleFor(category.id);
  const government = isGovernmentTariff(category.id);
  const twoWheeler = category.id === 'bike' || category.id === 'scooter';
  const cab = category.id.startsWith('cab-');
  const isParcel = category.flows.includes('delivery');
  const safety = options.safety ?? { onePassenger: false, helmet: false, noLuggage: false, conditions: false };
  const cabPrefs = options.cab ?? { passengers: 1, luggage: 'none' as const, ac: false, assistance: false, pet: false };
  const safetyDone = !twoWheeler || Object.values(safety).every(Boolean);

  async function confirm() {
    if (!quote) return;
    setError(null);
    if (!safetyDone) return setError(t('m.error.safety_checks_required'));
    setBusy(true);
    try {
      const sent: TripOptions = { pickupNote: options.pickupNote?.trim() || undefined };
      if (twoWheeler) sent.safety = safety;
      if (cab) sent.cab = cabPrefs;
      const dims = parcel.dimensions.map((d) => Math.round(Number(d))) as [number, number, number];
      const made = await rpc<Trip>('request_trip', {
        p_category: category.id,
        p_pickup: pickup,
        p_dropoff: drop,
        p_estimate_meters: meters,
        p_quote: quote,
        p_parcel: isParcel
          ? {
              receiverName: parcel.receiverName.trim(),
              receiverPhone: parcel.receiverPhone.replace(/\s/g, ''),
              weightGrams,
              item: parcel.item.trim() || null,
              category: parcel.category,
              declaredValue: Number(parcel.declaredValue) || null,
              dimensionsCm: dims.every((d) => d > 0) ? dims : null,
              packages: Math.max(1, Number(parcel.packages) || 1),
              loadingHelp: parcel.loadingHelp,
              fragile: parcel.fragile,
              prohibitedAck: parcel.prohibitedAck,
            }
          : null,
        p_client_key: clientKey.current,
        p_options: sent,
      });
      clientKey.current = Crypto.randomUUID();
      b.follow(made);
      b.reset();
      router.dismissTo('/book');
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(false);
    }
  }

  const check = (key: keyof typeof safety, label: string) => (
    <Toggle key={key} label={label} value={safety[key]} onChange={(v) => b.setOptions({ safety: { ...safety, [key]: v } })} />
  );

  return (
    <Screen>
      <Header title={t('m.review.title')} />
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <VehicleArt category={category.id} size={72} />
          <View style={{ flex: 1 }}>
            <H2>{t(category.nameKey)}</H2>
            <P small muted>
              {t('m.review.now')} · {t('m.book.approx', { km: km(meters) })}
            </P>
          </View>
          <Text style={{ fontSize: 26, lineHeight: 34, fontWeight: '800', color: C.ink }}>{quote ? money(quote.totalPaise) : '—'}</Text>
        </View>
        <RouteStops pickup={pickup.name} drop={drop.name} pickupLabel={t('m.book.pickup')} dropLabel={t('m.book.drop')} />
      </Card>

      {quote && rule ? (
        <Card>
          <H2>{t('m.review.fare')}</H2>
          <Badge text={government ? t('m.fares.government') : t('m.fares.pilot')} tone={government ? 'ok' : 'warn'} />
          <P small>
            {t(government ? 'm.fares.formulaAuto' : 'm.fares.formula', {
              base: rupees(rule.plain.baseFarePaise),
              km: km(rule.plain.baseDistanceMeters),
              perKm: rupees(rule.plain.perKmPaise),
              free: rule.waiting.freeMinutes,
              wait: rupees(rule.waiting.perMinutePaise),
            })}
          </P>
          <FareLines fare={quote} />
          {!government ? <P small muted>{t('m.fares.pilotNote')}</P> : null}
          {cab ? <P small muted>{t('m.review.tolls')}</P> : null}
          <P small muted>
            {t('m.review.noSurge')}
          </P>
        </Card>
      ) : null}

      {twoWheeler ? (
        <Card>
          <H2>{t('m.review.bikeSafety')}</H2>
          {check('onePassenger', t('m.review.onePassenger'))}
          {check('helmet', t('m.review.helmet'))}
          {check('noLuggage', t('m.review.noLuggage'))}
          {check('conditions', t('m.review.conditions'))}
          <Notice tone="warn" text={t('m.review.helmetRule')} />
        </Card>
      ) : null}

      {cab ? (
        <Card>
          <H2>{t('m.review.cabPrefs')}</H2>
          <P small muted>
            {t('m.review.passengers')}
          </P>
          <Segmented
            value={String(cabPrefs.passengers)}
            onChange={(v) => b.setOptions({ cab: { ...cabPrefs, passengers: Number(v) } })}
            options={Array.from({ length: category.seats }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
          />
          <P small muted>
            {t('m.review.luggage')}
          </P>
          <Segmented
            value={cabPrefs.luggage}
            onChange={(luggage) => b.setOptions({ cab: { ...cabPrefs, luggage } })}
            options={[
              { value: 'none', label: t('m.review.luggage.none') },
              { value: 'small', label: t('m.review.luggage.small') },
              { value: 'large', label: t('m.review.luggage.large') },
            ]}
          />
          <Toggle label={t('m.review.ac')} value={cabPrefs.ac} onChange={(ac) => b.setOptions({ cab: { ...cabPrefs, ac } })} />
          <Toggle label={t('m.review.assistance')} value={cabPrefs.assistance} onChange={(assistance) => b.setOptions({ cab: { ...cabPrefs, assistance } })} />
          <Toggle label={t('m.review.pet')} hint={t('m.review.petHint')} value={cabPrefs.pet} onChange={(pet) => b.setOptions({ cab: { ...cabPrefs, pet } })} />
        </Card>
      ) : null}

      {isParcel ? (
        <Card>
          <H2>{t('m.parcel.details')}</H2>
          <Row label={t('m.drive.receiver')} value={parcel.receiverName} />
          <Row label={t('m.parcel.item')} value={t(`m.parcel.item.${parcel.category}`)} />
          <Row label={t('m.book.weight')} value={`${parcel.weightKg} kg`} />
          <Row label={t('m.parcel.proof')} value={t('m.parcel.proofValue')} />
        </Card>
      ) : null}

      <Card>
        <Pressable onPress={() => router.push('/payment')} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}>
          <Icon name="credit-card" color={C.brand} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, lineHeight: 22, fontWeight: '700', color: C.ink }}>{t('m.review.payment')}</Text>
            <P small muted>
              {t('m.review.paymentBody')}
            </P>
          </View>
          <Icon name="chevron-right" color={C.muted} />
        </Pressable>
        {!isParcel ? (
          <Pressable onPress={() => router.push('/insurance')} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}>
            <Icon name="shield" color={C.brand} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, lineHeight: 22, fontWeight: '700', color: C.ink }}>{t('m.insurance.passengerCover')}</Text>
              <P small muted>
                {t('m.review.coverBody')}
              </P>
            </View>
            <Badge text={t('m.insurance.planned')} tone="warn" />
          </Pressable>
        ) : null}
      </Card>

      <Card>
        <Field
          label={t('m.review.pickupNote')}
          value={options.pickupNote ?? ''}
          onChangeText={(pickupNote) => b.setOptions({ pickupNote })}
          placeholder={t('m.review.pickupNoteHint')}
          maxLength={140}
        />
      </Card>

      <Notice text={error} />
      <Button
        kind="lime"
        title={quote ? t('m.review.confirm', { amount: money(quote.totalPaise) }) : t('m.book.tooHeavy')}
        onPress={confirm}
        loading={busy}
        disabled={!quote || !safetyDone}
      />
      <P small muted center>
        {t('m.review.finalFare')}
      </P>
    </Screen>
  );
}

