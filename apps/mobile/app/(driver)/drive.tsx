import type { GpsFix } from '@thozhan/meter';
import { availableActions, getCategory, PLACES, type TripAction, type TripStatus } from '@thozhan/shared';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Switch, Text, View } from 'react-native';
import { confirm } from '../../src/ActiveTrip';
import { invoke, rpc, type Inbox, type Offer, type Trip } from '../../src/api';
import { POLL, USING_DEV_BACKEND } from '../../src/config';
import { errorText, useI18n } from '../../src/i18n';
import { currentFix, track, type Tracking } from '../../src/location';
import { MapView } from '../../src/MapView';
import { useSession } from '../../src/session';
import { usePoll } from '../../src/usePoll';
import { Badge, Button, C, Card, Field, H1, H2, Notice, P, Row, Screen } from '../../src/ui';

const ON_BOARD = ['IN_PROGRESS', 'PICKED_UP', 'IN_TRANSIT', 'AT_DROP'];
const FINISH: TripAction[] = ['complete', 'deliver', 'return'];
const DEMO_SPOT = { lat: PLACES[0]!.lat + 0.0007, lon: PLACES[0]!.lon };

export default function Drive() {
  const { t, money, km } = useI18n();
  const { me, refresh } = useSession();
  const [online, setOnline] = useState(!!me?.driver?.online);
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [otp, setOtp] = useState('');
  const tracking = useRef<Tracking | null>(null);
  const lastPing = useRef(0);
  const trip = inbox?.trip ?? null;
  const onBoard = !!trip && ON_BOARD.includes(trip.status);

  usePoll(async () => {
    try {
      setInbox(await rpc<Inbox>('driver_inbox'));
    } catch (e) {
      setError(errorText(t, e));
    }
  }, POLL.driver);

  // Location heartbeat while online: every fix on board (the server bills from this track),
  // every few seconds otherwise.
  const onBoardRef = useRef(onBoard);
  onBoardRef.current = onBoard;
  const ping = (fix: GpsFix) => {
    const gap = onBoardRef.current ? 1500 : POLL.ping;
    if (fix.timestamp - lastPing.current < gap) return;
    lastPing.current = fix.timestamp;
    rpc('driver_ping', { p_lat: fix.lat, p_lon: fix.lon, p_accuracy: fix.accuracyMeters, p_at: new Date(fix.timestamp).toISOString() }).catch(() => {});
  };
  useEffect(() => {
    if (!online) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    activateKeepAwakeAsync('drive').catch(() => {});
    if (demo) {
      timer = setInterval(() => ping({ ...DEMO_SPOT, accuracyMeters: 10, timestamp: Date.now() }), POLL.ping);
    } else {
      track(ping, { title: t('m.drive.online'), body: t('m.drive.waiting') }).then((tr) => {
        if (cancelled) tr?.stop();
        else tracking.current = tr;
      });
    }
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      tracking.current?.stop();
      tracking.current = null;
      deactivateKeepAwake('drive').catch(() => {});
    };
  }, [online, demo]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggle(next: boolean) {
    setError(null);
    setBusy('online');
    try {
      let at = next ? await currentFix() : null;
      let useDemo = false;
      if (next && !at) {
        if (!USING_DEV_BACKEND) throw Object.assign(new Error(), { code: 'location_denied' });
        useDemo = true;
        at = { ...DEMO_SPOT, accuracyMeters: 10, timestamp: Date.now() };
      }
      await rpc('driver_set_online', { p_online: next, p_lat: at?.lat ?? null, p_lon: at?.lon ?? null });
      setDemo(useDemo);
      setOnline(next);
      refresh();
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(null);
    }
  }

  async function accept(offer: Offer) {
    setBusy(offer.id);
    setError(null);
    try {
      await rpc('accept_offer', { p_offer: offer.id });
      setInbox(await rpc<Inbox>('driver_inbox'));
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(null);
    }
  }

  async function decline(offer: Offer) {
    await rpc('decline_offer', { p_offer: offer.id }).catch(() => {});
    setInbox(await rpc<Inbox>('driver_inbox'));
  }

  async function act(current: Trip, action: TripAction) {
    setError(null);
    if (action === 'cancel' && !(await confirm(t('m.trip.cancelConfirm'), t('m.yes'), t('m.no')))) return;
    setBusy(action);
    try {
      if (FINISH.includes(action)) {
        await invoke<Trip>('finish-trip', { tripId: current.id, action, otp: otp.trim() || undefined });
        setOtp('');
        router.push(`/receipt/${current.id}`);
      } else {
        await rpc<Trip>('trip_action', { p_trip: current.id, p_action: action, p_otp: otp.trim() || null });
        setOtp('');
      }
      setInbox(await rpc<Inbox>('driver_inbox'));
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(null);
    }
  }

  const navigateTo = (current: Trip) => {
    const target = ON_BOARD.includes(current.status) ? current.dropoff : current.pickup;
    if (target) Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lon}&travelmode=driving`);
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <H1>{online ? t('m.drive.online') : t('m.drive.offline')}</H1>
          <P muted>{me?.driver?.vehicleNumber}</P>
        </View>
        <Switch
          value={online}
          onValueChange={toggle}
          disabled={busy === 'online' || !!trip}
          accessibilityLabel={online ? t('m.drive.goOffline') : t('m.drive.goOnline')}
        />
      </View>
      {inbox ? (
        <Card>
          <P>{t('m.drive.today', { trips: inbox.today.trips, amount: money(inbox.today.earningsPaise) })}</P>
          {inbox.balancePaise > 0 ? <Row label={t('m.earn.balance')} value={money(inbox.balancePaise)} /> : null}
        </Card>
      ) : null}
      {demo ? <Notice tone="warn" text={t('m.drive.demoLocation')} /> : null}
      <Notice text={error} />

      {!online && !trip ? <Button title={t('m.drive.goOnline')} onPress={() => toggle(true)} loading={busy === 'online'} /> : null}
      {online && !trip && !inbox?.offers.length ? (
        <P muted center>
          {t('m.drive.waiting')}
        </P>
      ) : null}

      {!trip &&
        inbox?.offers.map((offer) => (
          <OfferCard key={offer.id} offer={offer} busy={busy === offer.id} onAccept={() => accept(offer)} onDecline={() => decline(offer)} />
        ))}

      {trip ? (
        <>
          <MapView
            markers={[
              ...(trip.pickup ? [{ ...trip.pickup, kind: 'pickup' as const }] : []),
              ...(trip.dropoff ? [{ ...trip.dropoff, kind: 'drop' as const }] : []),
              ...(trip.driver?.lat != null && trip.driver.lon != null ? [{ lat: trip.driver.lat, lon: trip.driver.lon, kind: 'driver' as const }] : []),
            ]}
            height={200}
          />
          <Card>
            <Badge text={`${getCategory(trip.category).icon} ${t(`trip.status.${trip.status}`)} · ${trip.code}`} tone="warn" />
            <Row label={t('m.drive.rider')} value={trip.rider?.name || '—'} />
            <Row label={t('m.book.pickup')} value={trip.pickup?.name ?? '—'} />
            <Row label={t('m.book.drop')} value={trip.dropoff?.name ?? '—'} />
            {trip.parcel ? <Row label={t('m.drive.receiver')} value={`${trip.parcel.receiverName} · ${trip.parcel.weightGrams / 1000} kg`} /> : null}
            {trip.quote ? <Row label={t('ui.trip.estimatedFare')} value={money(trip.quote.totalPaise)} strong /> : null}
            <Button title={`🧭 ${t('m.drive.navigate')}`} kind="secondary" onPress={() => navigateTo(trip)} />
          </Card>
          <TripActions trip={trip} otp={otp} setOtp={setOtp} busy={busy} onAct={(a) => act(trip, a)} />
        </>
      ) : null}
      {onBoard && trip?.estimateMeters ? (
        <P small muted center>
          {t('m.drive.tripKm', { km: km(trip.estimateMeters) })}
        </P>
      ) : null}
    </Screen>
  );
}

function OfferCard({ offer, busy, onAccept, onDecline }: { offer: Offer; busy: boolean; onAccept(): void; onDecline(): void }) {
  const { t, money, km } = useI18n();
  const [left, setLeft] = useState(() => Math.max(0, Math.round((Date.parse(offer.expiresAt) - Date.now()) / 1000)));
  useEffect(() => {
    const timer = setInterval(() => setLeft(Math.max(0, Math.round((Date.parse(offer.expiresAt) - Date.now()) / 1000))), 500);
    return () => clearInterval(timer);
  }, [offer.expiresAt]);
  const trip = offer.trip;
  return (
    <Card style={{ borderColor: C.brand, borderWidth: 2 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <H2>
          {getCategory(trip.category).icon} {t('m.drive.newRequest')}
        </H2>
        <Badge text={t('m.drive.expires', { s: left })} tone={left < 10 ? 'danger' : 'warn'} />
      </View>
      <Text style={{ fontSize: 30, fontWeight: '800', color: C.ink }}>{trip.quote ? money(trip.quote.totalPaise) : '—'}</Text>
      <Row label={t('m.book.pickup')} value={trip.pickup?.name ?? '—'} />
      <Row label={t('m.book.drop')} value={trip.dropoff?.name ?? '—'} />
      <P small muted>
        {t('m.drive.toPickup', { km: km(offer.pickupMeters) })} · {trip.estimateMeters ? t('m.drive.tripKm', { km: km(trip.estimateMeters) }) : ''}
      </P>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title={t('m.drive.decline')} kind="secondary" onPress={onDecline} style={{ flex: 1 }} />
        <Button title={t('m.drive.accept')} onPress={onAccept} loading={busy} style={{ flex: 2 }} />
      </View>
    </Card>
  );
}

function TripActions({
  trip,
  otp,
  setOtp,
  busy,
  onAct,
}: {
  trip: Trip;
  otp: string;
  setOtp(v: string): void;
  busy: string | null;
  onAct(a: TripAction): void;
}) {
  const { t } = useI18n();
  const actions = availableActions(trip.flow, trip.status as TripStatus, 'driver').filter((a) => a !== 'accept');
  const main = actions.filter((a) => a !== 'cancel' && a !== 'return');
  const needsStartOtp = main.includes('start') || main.includes('pickup');
  const needsDropOtp = main.includes('deliver');
  return (
    <Card>
      {needsStartOtp || needsDropOtp ? (
        <Field
          label={needsDropOtp ? t('m.drive.dropOtp') : t('m.drive.otp')}
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={4}
          placeholder="••••"
        />
      ) : null}
      {main.map((a) => (
        <Button
          key={a}
          title={t(`trip.action.${a}`)}
          onPress={() => onAct(a)}
          loading={busy === a}
          disabled={(needsStartOtp || needsDropOtp) && otp.trim().length !== 4}
        />
      ))}
      {actions.includes('return') ? (
        <Button title={t('trip.action.return')} kind="secondary" onPress={() => onAct('return')} loading={busy === 'return'} />
      ) : null}
      {actions.includes('cancel') ? <Button title={t('trip.action.cancel')} kind="ghost" onPress={() => onAct('cancel')} loading={busy === 'cancel'} /> : null}
    </Card>
  );
}
