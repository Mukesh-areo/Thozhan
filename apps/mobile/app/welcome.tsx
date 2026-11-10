import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { rpc, type Me } from '../src/api';
import { errorText, useI18n } from '../src/i18n';
import { useSession } from '../src/session';
import { C, Card, Field, H1, H2, Icon, Notice, Screen, VehicleArt } from '../src/ui';

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

  const option = (mode: 'rider' | 'driver', art: string, label: string) => (
    <Pressable onPress={() => choose(mode)} disabled={busy !== null} accessibilityRole="button">
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <VehicleArt category={art} size={84} />
        <Text style={{ flex: 1, fontSize: 17, lineHeight: 25, fontWeight: '700', color: C.ink }}>{label}</Text>
        {busy === mode ? <ActivityIndicator color={C.brand} /> : <Icon name="chevron-right" color={C.muted} />}
      </Card>
    </Pressable>
  );

  return (
    <Screen>
      <H1>{t('m.welcome.title')}</H1>
      <Field label={t('m.welcome.name')} value={name} onChangeText={setName} autoFocus autoCapitalize="words" />
      <View style={{ gap: 12 }}>
        <H2>{t('m.welcome.how')}</H2>
        {option('rider', 'parcel-auto', t('m.welcome.ride'))}
        {option('driver', 'auto', t('m.welcome.drive'))}
      </View>
      <Notice text={error} />
    </Screen>
  );
}
