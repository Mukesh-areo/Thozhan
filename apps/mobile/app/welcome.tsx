// First run after sign-in: the person's name and language. The account type was chosen on the
// sign-in screen, so a driver goes on to the driver application and a passenger to the home map.
import { router } from 'expo-router';
import { useState } from 'react';
import { rpc, type Me } from '../src/api';
import { errorText, useI18n } from '../src/i18n';
import { useSession } from '../src/session';
import { Badge, Button, Field, H1, Notice, P, Screen, Segmented } from '../src/ui';

export default function Welcome() {
  const { t, locale, setLocale } = useI18n();
  const { me, mode, refresh } = useSession();
  const [name, setName] = useState(me?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (name.trim().length < 2) return setError(t('m.error.name_required'));
    setBusy(true);
    try {
      await rpc<Me>('update_profile', { p_name: name.trim(), p_locale: locale });
      if (!me?.accountType) await rpc<Me>('set_account_type', { p_type: mode === 'driver' ? 'driver' : 'passenger' });
      await refresh();
      router.replace(mode === 'driver' ? '/driver-register' : '/book');
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <H1>{t('m.welcome.title')}</H1>
      <Badge text={t(mode === 'driver' ? 'm.role.driverPartner' : 'm.role.passenger')} tone="muted" />
      <Field label={t('m.welcome.name')} value={name} onChangeText={setName} autoFocus autoCapitalize="words" />
      <P small muted>
        {t('m.account.language')}
      </P>
      <Segmented
        value={locale}
        onChange={setLocale}
        options={[
          { value: 'ta', label: 'தமிழ்' },
          { value: 'en', label: 'English' },
        ]}
      />
      <P small muted>
        {t('m.welcome.typeNote')}
      </P>
      <Notice text={error} />
      <Button kind="lime" title={t('m.welcome.continue')} onPress={save} loading={busy} />
    </Screen>
  );
}
