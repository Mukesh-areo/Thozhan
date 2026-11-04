// Receipt for a meter run that has not uploaded yet (no internet at the end of the trip).
import { router, useLocalSearchParams } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { useI18n } from '../../src/i18n';
import { meterStore, syncMeter } from '../../src/meter-store';
import { Button, Card, FareLines, H1, Notice, P, Row, Screen } from '../../src/ui';

export default function MeterReceipt() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const { t, km } = useI18n();
  const state = useSyncExternalStore(meterStore.subscribe, meterStore.get);
  const run = state.outbox.find((o) => o.clientKey === key);
  const uploaded = state.synced[key];

  if (uploaded) router.replace(`/receipt/${uploaded}`);
  if (!run) return <Screen>{<P muted>{t('m.loading')}</P>}</Screen>;

  return (
    <Screen>
      <H1>{t('m.receipt.title')}</H1>
      <Notice tone="warn" text={t('m.receipt.offline')} />
      <Card>
        {run.vehicleNumber ? <Row label={t('meter.vehicleNumber')} value={run.vehicleNumber.toUpperCase()} /> : null}
        <Row label={t('m.receipt.distance')} value={`${km(run.snapshot.distanceMeters, 2)} ${t('ui.unit.km')}`} />
        <Row label={t('m.receipt.waiting')} value={`${Math.floor(run.snapshot.waitingSeconds / 60)} ${t('ui.unit.min')}`} />
      </Card>
      {run.fare ? (
        <Card>
          <FareLines fare={run.fare} flags={run.snapshot.flags} />
        </Card>
      ) : null}
      <Button title={t('m.meter.sync')} onPress={() => syncMeter(key).catch(() => {})} />
      <Button title={t('m.close')} kind="ghost" onPress={() => router.replace('/meter')} />
    </Screen>
  );
}
