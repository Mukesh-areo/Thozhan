// Documents centre (UX handoff §14): each required paper, its validity, and renewing it with a
// new photo and date. An expired paper stops the driver going online until it is renewed.
import { useState } from 'react';
import { View } from 'react-native';
import { rpc, type Me } from '../src/api';
import { daysUntil, expires, futureDate, photoUpload } from '../src/documents';
import { errorText, useI18n } from '../src/i18n';
import { useSession } from '../src/session';
import { Badge, Button, Card, Field, H2, Header, Notice, P, Screen } from '../src/ui';

export default function Documents() {
  const { t } = useI18n();
  const { me, refresh } = useSession();
  const d = me?.driver;
  const [open, setOpen] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [path, setPath] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  if (!d) {
    return (
      <Screen>
        <Header title={t('m.manage.documents')} />
        <P muted>{t('m.docs.none')}</P>
      </Screen>
    );
  }

  async function photo(doc: string) {
    if (!me) return;
    setError(null);
    setBusy('photo');
    const result = await photoUpload(me.id, doc, true);
    setBusy(null);
    if (!result) return;
    if ('error' in result) return setError(t(`m.error.${result.error}`));
    setPath(result.path);
  }

  async function save(doc: string) {
    setError(null);
    if (!path) return setError(t('m.docs.photoFirst'));
    const expiry = expires(doc) ? futureDate(date) : null;
    if (expires(doc) && !expiry) return setError(t('m.reg.badExpiry', { doc: t(`m.reg.doc.${doc}`) }));
    setBusy('save');
    try {
      await rpc<Me>('renew_document', { p_doc: doc, p_path: path, p_expiry: expiry });
      await refresh();
      setSaved(t('m.docs.saved', { doc: t(`m.reg.doc.${doc}`) }));
      setOpen(null);
      setPath(null);
      setDate('');
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen>
      <Header title={t('m.manage.documents')} />
      <P muted>{t('m.reg.private')}</P>
      <Notice tone="ok" text={saved} />
      {d.requiredDocuments.map((doc) => {
        const until = d.documentExpiry[doc];
        const left = until ? daysUntil(until) : null;
        const missing = !d.documents[doc];
        const expired = d.expiredDocuments.includes(doc) || (left !== null && left < 0);
        const tone = missing || expired ? 'danger' : left !== null && left <= 30 ? 'warn' : 'ok';
        const label = missing ? t('m.docs.missing') : expired ? t('m.docs.expired') : until ? t('m.docs.validTill', { date: until }) : t('m.docs.onFile');
        return (
          <Card key={doc}>
            {/* Wraps so a long paper name and its badge never run past the card on a narrow phone. */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <H2>{t(`m.reg.doc.${doc}`)}</H2>
              <Badge text={label} tone={tone} />
            </View>
            {left !== null && left >= 0 && left <= 30 ? (
              <P small muted>
                {t('m.docs.daysLeft', { days: left })}
              </P>
            ) : null}
            {open === doc ? (
              <>
                <Button title={path ? `✓ ${t('m.reg.uploaded')}` : t('m.reg.camera')} icon="camera" kind="secondary" onPress={() => photo(doc)} loading={busy === 'photo'} />
                {expires(doc) ? (
                  <Field label={t('m.reg.validTill')} value={date} onChangeText={setDate} placeholder="2027-03-31" keyboardType="numbers-and-punctuation" maxLength={10} hint={t('m.reg.dateHint')} />
                ) : null}
                <Notice text={error} />
                <Button title={t('m.docs.submit')} onPress={() => save(doc)} loading={busy === 'save'} />
                <Button
                  title={t('m.cancel')}
                  kind="ghost"
                  onPress={() => {
                    setOpen(null);
                    setPath(null);
                    setError(null);
                  }}
                />
              </>
            ) : (
              <Button
                title={t('m.docs.renew')}
                kind={tone === 'ok' ? 'ghost' : 'secondary'}
                onPress={() => {
                  setOpen(doc);
                  setPath(null);
                  setDate('');
                  setError(null);
                  setSaved(null);
                }}
              />
            )}
          </Card>
        );
      })}
      <P small muted>
        {t('m.docs.reviewNote')}
      </P>
    </Screen>
  );
}
