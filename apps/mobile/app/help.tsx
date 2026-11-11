// Help and complaints (UX handoff §22): common answers, your tickets with their replies, and a
// new ticket. Opened with ?category= (and ?trip=&code=) from a receipt, safety or insurance.
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { rpc, type Ticket } from '../src/api';
import { errorText, useI18n } from '../src/i18n';
import { useSession } from '../src/session';
import { Badge, Button, Card, Chip, Field, H2, Header, Notice, P, Screen } from '../src/ui';

const PASSENGER = ['fare', 'safety', 'driver_behaviour', 'lost_item', 'parcel_damage', 'parcel_missing', 'payment', 'insurance', 'app_problem', 'other'];
const DRIVER = ['fare', 'safety', 'passenger_behaviour', 'payment', 'documents', 'account_review', 'insurance', 'app_problem', 'other'];

export default function Help() {
  const { t } = useI18n();
  const { mode } = useSession();
  const params = useLocalSearchParams<{ category?: string; trip?: string; code?: string }>();
  const categories = mode === 'driver' ? DRIVER : PASSENGER;
  const [category, setCategory] = useState(params.category && categories.includes(params.category) ? params.category : '');
  const [body, setBody] = useState('');
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const load = useCallback(() => rpc<Ticket[]>('my_tickets').then(setTickets, () => setTickets([])), []);
  useEffect(() => {
    load();
  }, [load]);

  async function send() {
    setError(null);
    setSent(null);
    if (!category) return setError(t('m.error.pick_category'));
    if (body.trim().length < 10) return setError(t('m.error.describe_more'));
    setBusy(true);
    try {
      const ticket = await rpc<Ticket>('create_ticket', { p_category: category, p_body: body.trim(), p_trip: params.trip ?? null });
      setSent(t('m.help.sent', { code: ticket.code }));
      setBody('');
      load();
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(false);
    }
  }

  const faq = [
    [t('m.help.fare'), t('m.book.estimateNote')],
    [t('m.help.overcharge'), t('m.help.overchargeBody')],
    [t('m.help.cancel'), t('m.help.cancelBody')],
    [t('m.help.parcel'), t('m.help.parcelBody')],
  ];

  return (
    <Screen>
      <Header title={t('m.help.title')} />
      <Card>
        <H2>{t('m.help.new')}</H2>
        {params.code ? (
          <P small muted>
            {t('m.help.aboutTrip', { code: params.code })}
          </P>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {categories.map((c) => (
            <Chip key={c} label={t(`m.ticket.${c}`)} on={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>
        <Field label={t('m.help.what')} value={body} onChangeText={setBody} multiline maxLength={2000} placeholder={t('m.help.whatHint')} />
        <Notice text={error} />
        <Notice tone="ok" text={sent} />
        <Button title={t('m.help.send')} onPress={send} loading={busy} />
      </Card>
      {tickets && tickets.length > 0 ? <H2>{t('m.help.mine')}</H2> : null}
      {tickets?.map((k) => (
        <Card key={k.id}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <H2>{t(`m.ticket.${k.category}`)}</H2>
            <Badge text={t(`m.ticket.status.${k.status}`)} tone={k.status === 'open' ? 'warn' : 'ok'} />
          </View>
          <P small muted>
            {k.code} · {new Date(k.createdAt).toLocaleDateString()}
            {k.trip ? ` · ${k.trip.code}` : ''}
          </P>
          <P>{k.body}</P>
          {k.reply ? <Notice tone="ok" text={`${t('m.help.reply')}: ${k.reply}`} /> : null}
        </Card>
      ))}
      <H2>{t('m.help.faq')}</H2>
      {faq.map(([question, answer]) => (
        <Card key={question}>
          <H2>{question}</H2>
          <P muted>{answer}</P>
        </Card>
      ))}
    </Screen>
  );
}
