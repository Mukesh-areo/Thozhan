// The passenger's live trip: status, driver, OTPs, map, and the safety actions.
import * as Clipboard from 'expo-clipboard';
import { availableActions, getCategory, type TripStatus } from '@thozhan/shared';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, Share, Text, View } from 'react-native';
import { rpc, type Trip } from './api';
import { SHARE_BASE_URL } from './config';
import { errorText, useI18n } from './i18n';
import { currentFix } from './location';
import { MapView } from './MapView';
import { Badge, Button, C, Card, FareLines, H2, Icon, Notice, P, RouteStops, Row, Sheet, useTopInset, VehicleArt } from './ui';

/** Asks yes/no; Alert.alert has no buttons on web. */
export function confirm(title: string, yes: string, no: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(title));
  return new Promise((resolve) =>
    Alert.alert(title, undefined, [
      { text: no, style: 'cancel', onPress: () => resolve(false) },
      { text: yes, onPress: () => resolve(true) },
    ]),
  );
}

export function ActiveTrip({ trip, onChange }: { trip: Trip; onChange(trip: Trip | null): void }) {
  const { t, money, km } = useI18n();
  const top = useTopInset();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const category = getCategory(trip.category);
  const name = trip.driver?.name || t('m.drive.rider');
  const canCancel = availableActions(trip.flow, trip.status as TripStatus, 'rider').includes('cancel');
  const searching = trip.status === 'REQUESTED';
  const headline = searching
    ? t('m.trip.searching')
    : trip.status === 'ACCEPTED'
      ? t('m.trip.onTheWay', { name })
      : trip.status === 'ARRIVED' || trip.status === 'AT_PICKUP'
        ? t('m.trip.arrived', { name })
        : t(`trip.status.${trip.status}`);
  const showStartOtp = ['REQUESTED', 'ACCEPTED', 'ARRIVED', 'AT_PICKUP'].includes(trip.status);

  async function cancel() {
    if (!(await confirm(t('m.trip.cancelConfirm'), t('m.yes'), t('m.no')))) return;
    setBusy('cancel');
    try {
      await rpc('trip_action', { p_trip: trip.id, p_action: 'cancel' });
      onChange(null);
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(null);
    }
  }

  async function sos() {
    if (!(await confirm(t('m.trip.sosConfirm'), t('m.trip.sos'), t('m.cancel')))) return;
    setBusy('sos');
    try {
      const fix = await currentFix();
      await rpc('report_incident', {
        p_kind: 'sos',
        p_trip: trip.id,
        p_lat: fix?.lat ?? trip.driver?.lat ?? null,
        p_lon: fix?.lon ?? trip.driver?.lon ?? null,
      });
      setNotice(t('m.trip.sosSent'));
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(null);
    }
  }

  async function share() {
    setBusy('share');
    try {
      const token = await rpc<string>('create_share_link', { p_trip: trip.id });
      const message = t('m.trip.shareText', { code: trip.code, vehicle: trip.vehicleNumber ?? t(category.nameKey), url: SHARE_BASE_URL + token });
      // Browsers without the share sheet (most desktops) get the link on the clipboard instead.
      const shared = await Share.share({ message }).then(
        () => true,
        () => false,
      );
      if (!shared) {
        await Clipboard.setStringAsync(message);
        setNotice(t('m.trip.linkCopied'));
      }
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(null);
    }
  }

  const markers = [
    ...(trip.pickup ? [{ ...trip.pickup, kind: 'pickup' as const }] : []),
    ...(trip.dropoff ? [{ ...trip.dropoff, kind: 'drop' as const }] : []),
    ...(trip.driver?.lat != null && trip.driver.lon != null ? [{ lat: trip.driver.lat, lon: trip.driver.lon, kind: 'driver' as const, emoji: getCategory(trip.driver.vehicle).icon }] : []),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1, minHeight: 200 }}>
        <MapView fill route markers={markers} />
        <Pressable onPress={sos} disabled={busy === 'sos'} accessibilityRole="button" style={{ position: 'absolute', top, right: 16, minHeight: 44, borderRadius: 22, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.danger }}>
          <Icon name="alert-triangle" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 15, lineHeight: 22, fontWeight: '800' }}>{t('m.trip.sos')}</Text>
        </Pressable>
      </View>
      <Sheet>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Badge text={`${t(category.nameKey)} · ${trip.code}`} tone="muted" />
          <H2>{headline}</H2>
        </View>
        {searching ? <ActivityIndicator color={C.brand} size="large" /> : <VehicleArt category={trip.category} />}
      </View>
      {searching ? <P muted>{t('m.trip.searchingNote')}</P> : null}

      {trip.driver ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="user" color={C.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <H2>{trip.driver.name}</H2>
              <Text style={{ fontSize: 18, fontWeight: '800', letterSpacing: 1, color: C.ink }}>{trip.driver.vehicleNumber}</Text>
            </View>
          </View>
        </Card>
      ) : null}

      {showStartOtp && trip.startOtp ? (
        <Card tone="brand">
          <Text style={{ color: '#d5e4dc', fontSize: 14, lineHeight: 21 }}>{t('m.trip.otpTitle')}</Text>
          <Text style={{ color: '#fff', fontSize: 40, fontWeight: '800', letterSpacing: 10 }}>{trip.startOtp}</Text>
          <Text style={{ color: '#d5e4dc', fontSize: 14, lineHeight: 21 }}>{t('m.trip.otpHint')}</Text>
        </Card>
      ) : null}
      {trip.flow === 'delivery' && trip.dropOtp ? (
        <Card>
          <P muted>{t('ui.trip.dropOtp')}</P>
          <Text style={{ fontSize: 32, fontWeight: '800', letterSpacing: 8, color: C.ink }}>{trip.dropOtp}</Text>
          <P small muted>
            {t('m.trip.dropOtpHint')}
          </P>
        </Card>
      ) : null}

      <Card>
        <RouteStops pickup={trip.pickup?.name ?? '—'} drop={trip.dropoff?.name ?? '—'} pickupLabel={t('m.book.pickup')} dropLabel={t('m.book.drop')} />
        {trip.estimateMeters ? <Row label={t('m.receipt.distance')} value={`${km(trip.estimateMeters)} ${t('ui.unit.km')}`} /> : null}
        {trip.parcel ? <Row label={t('m.drive.receiver')} value={trip.parcel.receiverName} /> : null}
        {trip.quote ? <Row label={t('ui.trip.estimatedFare')} value={money(trip.quote.totalPaise)} strong /> : null}
      </Card>
      {trip.quote && searching ? (
        <Card>
          <FareLines fare={trip.quote} />
        </Card>
      ) : null}

      <Notice text={notice} tone="ok" />
      <Notice text={error} />
      {notice ? <Button title={t('m.trip.call112')} kind="danger" onPress={() => Linking.openURL('tel:112')} /> : null}
      {!searching ? <Button title={t('m.trip.share')} icon="share-2" kind="secondary" onPress={share} loading={busy === 'share'} /> : null}
      {canCancel ? <Button title={t('m.trip.cancel')} kind="ghost" onPress={cancel} loading={busy === 'cancel'} /> : null}
      </Sheet>
    </View>
  );
}
