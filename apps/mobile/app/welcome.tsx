import { router } from 'expo-router';
import { useState } from 'react';
import { rpc, type Me } from '../src/api';
import { errorText, useI18n } from '../src/i18n';
import { useSession } from '../src/session';
import { Button, Field, H1, H2, Notice, Screen } from '../src/ui';

export default function Welcome() {
  const { t, locale } = useI18n();
  const { me, refresh, setMode } = useSession();
  const [name, setName] = useState(me?.name ?? '');
  const [busy, setBusy] = useState<'rider' | 'driver' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(mode: 'rider' | 'driver') {
    setError(null);
    if (name.trim().length < 2) return setError(t('m.error.name_required'));
    setBusy(mode);
    try {
      await rpc<Me>('update_profile', { p_name: name.trim(), p_locale: locale });
      await refresh();
      setMode(mode);
      router.replace(mode === 'driver' ? '/driver-register' : '/book');
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen>
      <H1>{t('m.welcome.title')}</H1>
      <Field label={t('m.welcome.name')} value={name} onChangeText={setName} autoFocus autoCapitalize="words" />
      <H2>{t('m.welcome.how')}</H2>
      <Button title={`🙋  ${t('m.welcome.ride')}`} onPress={() => choose('rider')} loading={busy === 'rider'} />
      <Button title={`🛺  ${t('m.welcome.drive')}`} kind="secondary" onPress={() => choose('driver')} loading={busy === 'driver'} />
      <Notice text={error} />
    </Screen>
  );
}
