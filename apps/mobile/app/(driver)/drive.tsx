import type { GpsFix } from '@thozhan/meter';
import { availableActions, getCategory, PLACES, type TripAction, type TripStatus } from '@thozhan/shared';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, Pressable, Switch, Text, View } from 'react-native';
import { CancelReasons } from '../../src/CancelReasons';
import { daysUntil, photoUpload } from '../../src/documents';
import { invoke, rpc, type Inbox, type Offer, type Trip } from '../../src/api';
import { POLL, USING_DEV_BACKEND } from '../../src/config';
import { errorText, useI18n } from '../../src/i18n';
import { currentFix, track, type Tracking } from '../../src/location';
import type { MapMarker } from '../../src/map-html';
import { MapView } from '../../src/MapView';
import { useSession } from '../../src/session';
import { usePoll } from '../../src/usePoll';
import {
  Badge,
  Button,
  C,
  Card,
  Field,
  H2,
  Icon,
  KeyboardSafe,
  ListRow,
  Notice,
  P,
  RouteStops,
  Row,
  Sheet,
  Toggle,
  useTopInset,
  VehicleArt,
} from '../../src/ui';

const ON_BOARD = ['IN_PROGRESS', 'PICKED_UP', 'IN_TRANSIT', 'AT_DROP'];
const FINISH: TripAction[] = ['complete', 'deliver', 'return'];
const DEMO_SPOT = { lat: PLACES[0]!.lat + 0.0007, lon: PLACES[0]!.lon };

export default function Drive() {
  const { t, money, km } = useI18n();
  const { me, refresh, notice, setNotice } = useSession();
  const top = useTopInset();
  const [here, setHere] = useState<{ lat: number; lon: number } | null>(null);
  const [online, setOnline] = useState(!!me?.driver?.online);
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [otp, setOtp] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  const tracking = useRef<Tracking | null>(null);
  const lastPing = useRef(0);
  const lastFixAt = useRef(0);
  const trip = inbox?.trip ?? null;
  const onBoard = !!trip && ON_BOARD.includes(trip.status);

  usePoll(async () => {
    try {
      setInbox(await rpc<Inbox>('driver_inbox'));
    } catch (e) {
      setError(errorText(t, e));
    }
  }, POLL.driver);

  // Operations can suspend a driver at any time; the layout then shows why. A trip in
  // progress is finished first, so the passenger is never left stranded.
  usePoll(async () => {
    if (!trip) await refresh();
  }, 10000);

  // Location heartbeat while online: every fix on board (the server bills from this track),
  // every few seconds otherwise.
  const onBoardRef = useRef(onBoard);
  onBoardRef.current = onBoard;
  const ping = (fix: GpsFix) => {
    lastFixAt.current = Date.now();
    const gap = onBoardRef.current ? 1500 : POLL.ping;
    if (fix.timestamp - lastPing.current < gap) return;
    lastPing.current = fix.timestamp;
    setError((e) => (e === t('m.error.location_denied') ? null : e));
    setHere({ lat: fix.lat, lon: fix.lon });
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
    // Online with no location coming in means no ride offers (the server needs a fix from the
    // last 2 minutes), e.g. after a reload on a device without GPS. On the local test server we
    // carry on from the demo spot; otherwise we tell the driver.
    lastFixAt.current = Date.now();
    const watchdog = demo
      ? null
      : setInterval(() => {
          if (Date.now() - lastFixAt.current < 15000) return;
          if (USING_DEV_BACKEND) setDemo(true);
          else setError(t('m.error.location_denied'));
        }, 5000);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      if (watchdog) clearInterval(watchdog);
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
    if (action === 'cancel') return setCancelling(true);
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

  const focus = trip ?? inbox?.offers[0]?.trip ?? null;
  const emoji = getCategory(me?.driver?.vehicle ?? 'auto').icon;
  const markers: MapMarker[] = focus
    ? [
        ...(focus.pickup ? [{ ...focus.pickup, kind: 'pickup' as const }] : []),
        ...(focus.dropoff ? [{ ...focus.dropoff, kind: 'drop' as const }] : []),
        ...(focus.driver?.lat != null && focus.driver.lon != null ? [{ lat: focus.driver.lat, lon: focus.driver.lon, kind: 'driver' as const, emoji }] : []),
      ]
    : [{ ...(here ?? DEMO_SPOT), kind: 'driver', emoji }];

  async function proof(current: Trip, stage: 'pickup' | 'delivery') {
    if (!me) return;
    setError(null);
    setBusy(`proof-${stage}`);
    try {
      const result = await photoUpload(me.id, `parcel/${current.id}-${stage}`, true);
      if (!result) return;
      if ('error' in result) return setError(t(`m.error.${result.error}`));
      await rpc<Trip>('set_parcel_proof', { p_trip: current.id, p_stage: stage, p_path: result.path });
      setInbox(await rpc<Inbox>('driver_inbox'));
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(null);
    }
  }

  async function notFound(current: Trip) {
    setError(null);
    setBusy('no_show');
    try {
      await rpc<Trip>('cancel_trip', { p_trip: current.id, p_reason: 'no_show' });
      setInbox(await rpc<Inbox>('driver_inbox'));
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(null);
    }
  }

  const waitedLong = !!trip?.arrivedAt && ['ARRIVED', 'AT_PICKUP'].includes(trip.status) && now - Date.parse(trip.arrivedAt) >= 5 * 60_000;
  const driverInfo = me?.driver;
  const expired = driverInfo?.expiredDocuments ?? [];
  const expiringSoon = Object.entries(driverInfo?.documentExpiry ?? {}).filter(([, d]) => daysUntil(d) >= 0 && daysUntil(d) <= 30);

  // One live offer at a time: the server never offers a driver a second trip while one is open.
  const offer = !trip ? inbox?.offers[0] : undefined;
  let footer: ReactNode = undefined;
  if (trip && cancelling)
    footer = (
      <CancelReasons
        trip={trip}
        role="driver"
        onCancelled={() => {
          setCancelling(false);
          rpc<Inbox>('driver_inbox')
            .then(setInbox)
            .catch(() => {});
        }}
        onClose={() => setCancelling(false)}
      />
    );
  else if (trip) footer = <TripActions trip={trip} otp={otp} setOtp={setOtp} busy={busy} onAct={(a) => act(trip, a)} onProof={(stage) => proof(trip, stage)} />;
  else if (offer) footer = <OfferActions key={offer.id} offer={offer} busy={busy === offer.id} onAccept={() => accept(offer)} onDecline={() => decline(offer)} />;
  else if (!online) footer = <Button kind="lime" title={t('m.drive.goOnline')} onPress={() => toggle(true)} loading={busy === 'online'} />;

  return (
    <KeyboardSafe>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={{ flex: 1, minHeight: 170 }}>
          <MapView fill route={!!focus} markers={markers} />
          <View style={[styles.status, { top }]}>
            <View style={[styles.dot, { backgroundColor: online ? C.ok : '#9aa5a0' }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle} accessibilityRole="header">
                {online ? t('m.drive.online') : t('m.drive.offline')}
              </Text>
              <Text style={styles.statusSub} numberOfLines={1}>
                {me?.driver ? `${t(`category.${me.driver.vehicle}`)} · ${me.driver.vehicleNumber}` : ''}
              </Text>
            </View>
            <Switch
              value={online}
              onValueChange={toggle}
              disabled={busy === 'online' || !!trip}
              trackColor={{ true: C.brand }}
              accessibilityLabel={online ? t('m.drive.goOffline') : t('m.drive.goOnline')}
            />
          </View>
        </View>
        <Sheet maxHeight="68%" footer={footer}>
          {offer ? <OfferCard key={offer.id} offer={offer} /> : null}
          {inbox && !trip ? (
            <View style={styles.today}>
              <Icon name="trending-up" color={C.brand} />
              <View style={{ flex: 1 }}>
                <P>{t('m.drive.today', { trips: inbox.today.trips, amount: money(inbox.today.earningsPaise) })}</P>
                {inbox.balancePaise > 0 ? <Row label={t('m.earn.balance')} value={money(inbox.balancePaise)} /> : null}
              </View>
            </View>
          ) : null}
          {!trip && expired.length ? (
            <Card tone="danger">
              <H2>{t('m.docs.expiredTitle')}</H2>
              <P>{t('m.docs.expiredBody', { docs: expired.map((d) => t(`m.reg.doc.${d}`)).join(', ') })}</P>
              <Button title={t('m.docs.renew')} kind="secondary" onPress={() => router.push('/documents')} />
            </Card>
          ) : null}
          {!trip && !expired.length && expiringSoon.length ? (
            <Notice tone="warn" text={t('m.docs.expiringSoon', { docs: expiringSoon.map(([d]) => t(`m.reg.doc.${d}`)).join(', ') })} />
          ) : null}
          {notice ? (
            <Pressable onPress={() => setNotice(null)} accessibilityRole="button" accessibilityHint={t('m.dismiss')}>
              <Notice text={notice} tone="warn" />
            </Pressable>
          ) : null}
          {demo ? <Notice tone="warn" text={t('m.drive.demoLocation')} /> : null}
          <Notice text={error} />

          {online && !trip && !inbox?.offers.length ? (
            <View style={styles.waiting}>
              <ActivityIndicator color={C.brand} />
              <P muted>{t('m.drive.waiting')}</P>
            </View>
          ) : null}

          {!trip && !online ? (
            <View>
              <ListRow icon="file-text" title={t('m.manage.documents')} onPress={() => router.push('/documents')} />
              <ListRow icon="umbrella" title={t('m.insurance.title')} onPress={() => router.push('/insurance')} />
              <ListRow icon="shield" title={t('m.safety.centre')} onPress={() => router.push('/safety')} divider={false} />
            </View>
          ) : null}


          {trip ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Badge text={`${t(`trip.status.${trip.status}`)} · ${trip.code}`} tone="warn" />
                  <H2>{trip.rider?.name || '—'}</H2>
                </View>
                <VehicleArt category={trip.category} />
              </View>
              <RouteStops pickup={trip.pickup?.name ?? '—'} drop={trip.dropoff?.name ?? '—'} pickupLabel={t('m.book.pickup')} dropLabel={t('m.book.drop')} />
              <TripDetails trip={trip} />
              {trip.quote ? <Row label={t('ui.trip.estimatedFare')} value={money(trip.quote.totalPaise)} strong /> : null}
              {onBoard && trip.estimateMeters ? (
                <P small muted>
                  {t('m.drive.tripKm', { km: km(trip.estimateMeters) })}
                </P>
              ) : null}
              <Button title={t('m.drive.navigate')} icon="navigation" kind="secondary" onPress={() => navigateTo(trip)} />
              {['ARRIVED', 'AT_PICKUP'].includes(trip.status) && !cancelling ? (
                waitedLong ? (
                  <Button title={t('m.drive.notFound')} kind="secondary" icon="user-x" onPress={() => notFound(trip)} loading={busy === 'no_show'} />
                ) : (
                  <P small muted>
                    {t('m.drive.waitFirst')}
                  </P>
                )
              ) : null}
            </>
          ) : null}
        </Sheet>
      </View>
    </KeyboardSafe>
  );
}

function OfferCard({ offer }: { offer: Offer }) {
  const { t, money, km } = useI18n();
  const [left, setLeft] = useState(() => Math.max(0, Math.round((Date.parse(offer.expiresAt) - Date.now()) / 1000)));
  useEffect(() => {
    const timer = setInterval(() => setLeft(Math.max(0, Math.round((Date.parse(offer.expiresAt) - Date.now()) / 1000))), 500);
    return () => clearInterval(timer);
  }, [offer.expiresAt]);
  const trip = offer.trip;
  return (
    <Card style={{ borderColor: C.brand, borderWidth: 2 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <H2>{t('m.drive.newRequest')}</H2>
        <Badge text={t('m.drive.expires', { s: left })} tone={left < 10 ? 'danger' : 'warn'} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <VehicleArt category={trip.category} size={64} />
        <View style={{ flex: 1 }}>
          <Text style={styles.category}>{t(getCategory(trip.category).nameKey)}</Text>
          <Text style={{ fontSize: 30, lineHeight: 40, fontWeight: '800', color: C.ink }}>{trip.quote?.totalPaise != null ? money(trip.quote.totalPaise) : '—'}</Text>
        </View>
      </View>
      <RouteStops pickup={trip.pickup?.name ?? '—'} drop={trip.dropoff?.name ?? '—'} pickupLabel={t('m.book.pickup')} dropLabel={t('m.book.drop')} />
      <P small muted>
        {t('m.drive.toPickup', { km: km(offer.pickupMeters) })} · {trip.estimateMeters ? t('m.drive.tripKm', { km: km(trip.estimateMeters) }) : ''}
      </P>
      <TripDetails trip={trip} />
    </Card>
  );
}

/** Accept / decline for the live offer, kept in the sheet footer. Bike and scooter offers need the helmet check first. */
function OfferActions({ offer, busy, onAccept, onDecline }: { offer: Offer; busy: boolean; onAccept(): void; onDecline(): void }) {
  const { t } = useI18n();
  const twoWheeler = offer.trip.category === 'bike' || offer.trip.category === 'scooter';
  const [helmet, setHelmet] = useState(false);
  return (
    <View style={{ gap: 10 }}>
      {twoWheeler ? <Toggle label={t('m.drive.helmetCheck')} value={helmet} onChange={setHelmet} /> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title={t('m.drive.decline')} kind="secondary" onPress={onDecline} style={{ flex: 1 }} />
        <Button title={t('m.drive.accept')} kind="lime" onPress={onAccept} loading={busy} disabled={twoWheeler && !helmet} style={{ flex: 1.3 }} />
      </View>
    </View>
  );
}

function TripActions({
  trip,
  otp,
  setOtp,
  busy,
  onAct,
  onProof,
}: {
  trip: Trip;
  otp: string;
  setOtp(v: string): void;
  busy: string | null;
  onAct(a: TripAction): void;
  onProof(stage: 'pickup' | 'delivery'): void;
}) {
  const { t } = useI18n();
  const actions = availableActions(trip.flow, trip.status as TripStatus, 'driver').filter((a) => a !== 'accept');
  const main = actions.filter((a) => a !== 'cancel' && a !== 'return');
  const needsStartOtp = main.includes('start') || main.includes('pickup');
  const needsDropOtp = main.includes('deliver');
  const proofStage =
    main.includes('pickup') && !trip.proof?.pickupPhoto ? 'pickup' : main.includes('deliver') && !trip.proof?.deliveryPhoto ? 'delivery' : null;
  return (
    <>
      {proofStage ? (
        <Button
          title={proofStage === 'pickup' ? t('m.drive.photoPickup') : t('m.drive.photoDelivery')}
          icon="camera"
          kind="secondary"
          onPress={() => onProof(proofStage)}
          loading={busy === `proof-${proofStage}`}
        />
      ) : null}
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
          kind="lime"
          title={t(`trip.action.${a}`)}
          onPress={() => onAct(a)}
          loading={busy === a}
          disabled={((needsStartOtp || needsDropOtp) && otp.trim().length !== 4) || ((a === 'pickup' || a === 'deliver') && !!proofStage)}
        />
      ))}
      {actions.includes('return') ? (
        <Button title={t('trip.action.return')} kind="secondary" onPress={() => onAct('return')} loading={busy === 'return'} />
      ) : null}
      {actions.includes('cancel') ? <Button title={t('trip.action.cancel')} kind="ghost" onPress={() => onAct('cancel')} loading={busy === 'cancel'} /> : null}
    </>
  );
}

/** What the passenger asked for: pickup note, cab preferences, parcel details, and payment. */
function TripDetails({ trip }: { trip: Trip }) {
  const { t } = useI18n();
  const cab = trip.options?.cab;
  const p = trip.parcel;
  const lines: [string, string][] = [];
  if (trip.rider?.rating) lines.push([t('m.drive.riderRating'), `★ ${trip.rider.rating.average.toFixed(1)} (${trip.rider.rating.count})`]);
  if (trip.options?.pickupNote) lines.push([t('m.review.pickupNote'), trip.options.pickupNote]);
  if (cab) {
    const extras = [cab.ac && t('m.review.ac'), cab.assistance && t('m.review.assistance'), cab.pet && t('m.review.pet')].filter(Boolean).join(', ');
    lines.push([t('m.review.passengers'), String(cab.passengers)]);
    lines.push([t('m.review.luggage'), t(`m.review.luggage.${cab.luggage}`)]);
    if (extras) lines.push([t('m.drive.requests'), extras]);
  }
  if (p) {
    lines.push([t('m.drive.receiver'), p.receiverName]);
    lines.push([
      t('m.parcel.item'),
      `${p.category ? t(`m.parcel.item.${p.category}`) : (p.item ?? '—')} · ${p.weightGrams / 1000} kg${p.packages && p.packages > 1 ? ` · ×${p.packages}` : ''}`,
    ]);
    const flags = [p.fragile && t('m.parcel.fragile'), p.loadingHelp && t('m.parcel.loadingHelp')].filter(Boolean).join(', ');
    if (flags) lines.push([t('m.drive.requests'), flags]);
    lines.push([t('m.parcel.proof'), t('m.parcel.proofValue')]);
  }
  lines.push([t('m.review.payment'), t('m.drive.payDirect')]);
  return (
    <View>
      {lines.map(([label, value]) => (
        <Row key={label} label={label} value={value} />
      ))}
    </View>
  );
}

const styles = {
  status: {
    position: 'absolute',
    left: 16,
    right: 16,
    minHeight: 64,
    borderRadius: 20,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    boxShadow: '0px 4px 18px rgba(20, 32, 27, 0.14)',
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  statusTitle: { fontSize: 18, lineHeight: 27, fontWeight: '800', color: C.ink },
  statusSub: { fontSize: 13, lineHeight: 19, color: C.muted },
  today: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: C.brandSoft, borderRadius: 16, padding: 14 },
  waiting: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 44 },
  category: { fontSize: 15, lineHeight: 22, fontWeight: '700', color: C.muted },
} as const;
