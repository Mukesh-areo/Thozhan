import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { invoke, rpc, type Ledger } from '../../src/api';
import { errorText, useI18n } from '../../src/i18n';
import { usePoll } from '../../src/usePoll';
import { Button, C, Card, H1, H2, Notice, P, Row, Screen } from '../../src/ui';

export default function Earnings() {
  const { t, money } = useI18n();
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = async () => setLedger(await rpc<Ledger>('driver_ledger'));
  usePoll(load, 10000);

  async function pay() {
    setError(null);
    setBusy(true);
    try {
      const link = await invoke<{ url: string }>('fee-payment-link', {});
      await Linking.openURL(link.url);
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(false);
    }
  }

  const due = ledger?.balancePaise ?? 0;
  return (
    <Screen>
      <H1>{t('m.earn.title')}</H1>
      <P muted>{t('m.earn.plan')}</P>
      <Card tone={due > 0 ? 'warn' : undefined}>
        <P muted>{t('m.earn.balance')}</P>
        <Text style={{ fontSize: 40, fontWeight: '800', color: C.ink }}>{money(Math.max(0, due))}</Text>
        {due > 0 ? <Button title={t('m.earn.pay', { amount: money(due) })} onPress={pay} loading={busy} /> : <P>{t('m.earn.paid')}</P>}
        {due >= 10000 ? <P small>{t('m.earn.blocked')}</P> : null}
      </Card>
      <Notice text={error} />
      <Card>
        <H2>{t('m.earn.days')}</H2>
        {ledger?.days.length ? (
          ledger.days.map((d) => (
            <Row key={d.day} label={new Date(d.day).toLocaleDateString()} value={t('m.earn.dayLine', { trips: d.trips, amount: money(d.earningsPaise) })} />
          ))
        ) : (
          <P muted>{t('m.trips.empty')}</P>
        )}
      </Card>
      <Card>
        <H2>{t('m.earn.entries')}</H2>
        {ledger?.entries.map((e, i) => (
          <View key={i}>
            <Row label={`${new Date(e.day).toLocaleDateString()} · ${t(`m.earn.kind.${e.kind}`)}`} value={money(e.amountPaise)} />
          </View>
        ))}
        <Button title={t('m.earn.refresh')} kind="ghost" onPress={() => load().catch(() => {})} />
      </Card>
    </Screen>
  );
}
