import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { rpc, type Trip } from '../../src/api';
import { errorText, useI18n } from '../../src/i18n';
import { Button, Card, FareLines, Field, H2, Notice, P, ReceiptHero, RouteStops, Row, Screen } from '../../src/ui';

const minutes = (s: number) => Math.floor(s / 60);

export default function Receipt() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, km, money } = useI18n();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [asked, setAsked] = useState('');
  const [complaint, setComplaint] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    rpc<Trip>('get_trip', { p_trip: id })
      .then(setTrip)
      .catch((e) => setError(errorText(t, e)));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function report(kind: 'overcharge' | 'complaint') {
    setError(null);
    setBusy(kind);
    try {
      await rpc('report_incident', {
        p_kind: kind,
        p_trip: id,
        p_asked_paise: kind === 'overcharge' ? Math.round(Number(asked) * 100) : null,
        p_message: kind === 'complaint' ? complaint.trim() : null,
      });
      setDone(kind === 'overcharge' ? t('m.receipt.reported') : t('m.receipt.complainSent'));
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(null);
    }
  }

  if (!trip)
    return (
      <Screen>
        <Notice text={error} />
        <P muted>{t('m.loading')}</P>
      </Screen>
    );
  // The API includes `rider` only in the driver's and staff views.
  const isRider = trip.rider === null;

  return (
    <Screen>
      <ReceiptHero title={t('m.receipt.title')} amount={trip.fare ? money(trip.fare.totalPaise) : null} code={trip.code} />
      <Card>
        {trip.flow === 'meter' ? <Row label={t('m.trips.meter')} value={trip.vehicleNumber ?? '—'} /> : null}
        {trip.pickup && trip.dropoff ? <RouteStops pickup={trip.pickup.name} drop={trip.dropoff.name} pickupLabel={t('m.book.pickup')} dropLabel={t('m.book.drop')} /> : null}
        {trip.driver ? <Row label={t('a.col.driver')} value={`${trip.driver.name} · ${trip.driver.vehicleNumber}`} /> : null}
        {trip.distanceMeters != null ? <Row label={t('m.receipt.distance')} value={`${km(trip.distanceMeters, 2)} ${t('ui.unit.km')}`} /> : null}
        {trip.waitingSeconds ? <Row label={t('m.receipt.waiting')} value={`${minutes(trip.waitingSeconds)} ${t('ui.unit.min')}`} /> : null}
        <Row label={t('a.col.status')} value={t(`trip.status.${trip.status}`)} />
      </Card>
      {trip.fare ? (
        <Card>
          <FareLines fare={trip.fare} flags={trip.fareFlags} />
        </Card>
      ) : null}

      {isRider && trip.fare ? (
        <Card>
          <H2>{t('m.receipt.asked')}</H2>
          <Field label={t('m.receipt.askedAmount')} value={asked} onChangeText={setAsked} keyboardType="number-pad" />
          <Button title={t('m.receipt.report')} kind="secondary" onPress={() => report('overcharge')} loading={busy === 'overcharge'} disabled={!asked} />
          <Field label={t('m.receipt.complain')} value={complaint} onChangeText={setComplaint} placeholder={t('m.receipt.complainPlaceholder')} multiline />
          <Button
            title={t('m.receipt.complain')}
            kind="ghost"
            onPress={() => report('complaint')}
            loading={busy === 'complaint'}
            disabled={complaint.trim().length < 5}
          />
        </Card>
      ) : null}
      <Notice text={done} tone="ok" />
      <Notice text={error} />
      <Button title={t('m.close')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
    </Screen>
  );
}
