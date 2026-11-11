// Privacy and data (UX handoff §24): what is kept, a copy of it, and asking for deletion.
import { useState } from 'react';
import { Share } from 'react-native';
import { rpc, type Ticket } from '../src/api';
import { errorText, useI18n } from '../src/i18n';
import { Button, Card, Field, H2, Header, Notice, P, Screen } from '../src/ui';

export default function Privacy() {
  const { t } = useI18n();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setError(null);
    setBusy('export');
    try {
      const data = await rpc('export_my_data');
      await Share.share({ title: t('m.privacy.download'), message: JSON.stringify(data, null, 2) });
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(null);
    }
  }

  async function erase() {
    setError(null);
    setBusy('delete');
    try {
      const ticket = await rpc<Ticket>('request_account_deletion', { p_reason: reason.trim() || null });
      setDone(t('m.privacy.requested', { code: ticket.code }));
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen>
      <Header title={t('m.privacy.title')} />
      <Card>
        <H2>{t('m.privacy.keep')}</H2>
        <P muted>{t('m.privacy.keepBody')}</P>
      </Card>
      <Card>
        <H2>{t('m.privacy.download')}</H2>
        <P muted>{t('m.privacy.downloadBody')}</P>
        <Button title={t('m.privacy.download')} kind="secondary" icon="download" onPress={download} loading={busy === 'export'} />
      </Card>
      <Card tone="danger">
        <H2>{t('m.privacy.delete')}</H2>
        <P muted>{t('m.privacy.deleteBody')}</P>
        {done ? (
          <Notice tone="ok" text={done} />
        ) : (
          <>
            <Field label={t('m.privacy.reason')} value={reason} onChangeText={setReason} maxLength={300} multiline />
            <Button title={t('m.privacy.delete')} kind="danger" onPress={erase} loading={busy === 'delete'} />
          </>
        )}
      </Card>
      <Notice text={error} />
    </Screen>
  );
}
