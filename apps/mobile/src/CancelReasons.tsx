// Cancelling asks why first (UX handoff §11, §17). The reason is stored on the trip so support
// can see it, and "passenger not found" is only offered to a driver who has waited 5 minutes.
import { useState } from 'react';
import { View } from 'react-native';
import { rpc, type Trip } from './api';
import { errorText, useI18n } from './i18n';
import { Button, Card, Chip, H2, Notice } from './ui';

const RIDER = ['changed_plans', 'driver_late', 'wrong_pickup', 'safety', 'other'];
const DRIVER = ['vehicle_issue', 'wrong_pickup', 'safety', 'other'];

export function CancelReasons({
  trip,
  role,
  onCancelled,
  onClose,
}: {
  trip: Trip;
  role: 'rider' | 'driver';
  onCancelled(trip: Trip): void;
  onClose(): void;
}) {
  const { t } = useI18n();
  const [reason, setReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    if (!reason) return setError(t('m.cancel.pick'));
    setBusy(true);
    setError(null);
    try {
      onCancelled(await rpc<Trip>('cancel_trip', { p_trip: trip.id, p_reason: reason }));
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <H2>{t('m.cancel.why')}</H2>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(role === 'rider' ? RIDER : DRIVER).map((r) => (
          <Chip key={r} label={t(`m.cancel.${r}`)} on={reason === r} onPress={() => setReason(r)} />
        ))}
      </View>
      {role === 'rider' && trip.status !== 'REQUESTED' ? <Notice tone="warn" text={t('m.cancel.afterAccept')} /> : null}
      <Notice text={error} />
      <Button title={t('m.trip.cancel')} kind="danger" onPress={go} loading={busy} />
      <Button title={t('m.cancel.keep')} kind="ghost" onPress={onClose} />
    </Card>
  );
}
