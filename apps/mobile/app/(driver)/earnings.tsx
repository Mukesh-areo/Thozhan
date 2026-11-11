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
  const since = (days: number) => {
    const from = Date.now() - days * 86_400_000;
    const rows = (ledger?.days ?? []).filter((d) => Date.parse(d.day) >= from);
    return { trips: rows.reduce((n, d) => n + d.trips, 0), paise: rows.reduce((n, d) => n + d.earningsPaise, 0) };
  };
  const week = since(7);
  const month = since(30);
  return (
    <Screen>
      <H1>{t('m.earn.title')}</H1>
      <P muted>{t('m.earn.plan')}</P>
      <Card tone="brand" style={{ paddingVertical: 20 }}>
        <Text style={{ color: '#d5e4dc', fontSize: 15, lineHeight: 22 }}>{t('m.earn.balance')}</Text>
        <Text style={{ fontSize: 44, lineHeight: 56, fontWeight: '800', color: '#fff' }}>{money(Math.max(0, due))}</Text>
        {due > 0 ? <Button kind="lime" title={t('m.earn.pay', { amount: money(due) })} onPress={pay} loading={busy} /> : <Text style={{ color: C.lime, fontSize: 15, lineHeight: 22, fontWeight: '700' }}>{t('m.earn.paid')}</Text>}
        {due >= 10000 ? <Text style={{ color: '#fff', fontSize: 13, lineHeight: 19 }}>{t('m.earn.blocked')}</Text> : null}
      </Card>
      <Notice text={error} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Card style={{ flex: 1 }}>
          <P small muted>
            {t('m.earn.week')}
          </P>
          <H2>{money(week.paise)}</H2>
          <P small muted>
            {t('m.earn.trips', { trips: week.trips })}
          </P>
        </Card>
        <Card style={{ flex: 1 }}>
          <P small muted>
            {t('m.earn.month')}
          </P>
          <H2>{money(month.paise)}</H2>
          <P small muted>
            {t('m.earn.trips', { trips: month.trips })}
          </P>
        </Card>
      </View>
      <P small muted>
        {t('m.earn.direct')}
      </P>
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
