import { router } from 'expo-router';
import { useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { supabase } from '../src/api';
import { USING_DEV_BACKEND } from '../src/config';
import { useI18n } from '../src/i18n';
import { useSession } from '../src/session';
import { Button, C, Card, Field, H2, Notice, P, Segmented } from '../src/ui';

const toE164 = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  return digits.length === 10 ? '+91' + digits : '+' + digits;
};

export default function Login() {
  const { t, locale, setLocale } = useI18n();
  const { refresh } = useSession();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setError(null);
    if (phone.replace(/\D/g, '').length !== 10) return setError(t('m.error.validation_failed'));
    setBusy(true);
    const { error: e } = await supabase.auth.signInWithOtp({ phone: toE164(phone) });
    setBusy(false);
    if (e) return setError(t('m.error.network'));
    setSent(true);
  }

  async function verify() {
    setError(null);
    setBusy(true);
    const { error: e } = await supabase.auth.verifyOtp({ phone: toE164(phone), token: otp.trim(), type: 'sms' });
    if (e) {
      setBusy(false);
      return setError(t('m.error.otp_expired'));
    }
    await refresh();
    setBusy(false);
    router.replace('/');
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      <View>
        <Image source={require('../assets/illustrations/hero-login.png')} style={{ width: '100%', height: 280 }} resizeMode="cover" accessibilityIgnoresInvertColors />
        <View style={{ position: 'absolute', top: 44, left: 18, right: 18, gap: 10 }}>
          <View style={{ alignSelf: 'flex-end', width: 170 }}>
            <Segmented
              value={locale}
              onChange={setLocale}
              options={[
                { value: 'ta', label: 'தமிழ்' },
                { value: 'en', label: 'English' },
              ]}
            />
          </View>
          <Text style={{ fontSize: 38, lineHeight: 50, fontWeight: '800', color: '#fff' }}>Thozhan</Text>
          <Text style={{ fontSize: 15, lineHeight: 22, color: '#d5e4dc', maxWidth: 160 }}>{t('app.tagline')}</Text>
        </View>
      </View>
      <View style={{ marginTop: -26, marginHorizontal: 16 }}>
      <Card style={{ gap: 14 }}>
      <H2>{t('m.login.title')}</H2>
      {!sent ? (
        <>
          <Field label={t('m.login.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="98765 43210" maxLength={14} autoFocus />
          <Button kind="lime" title={t('m.login.sendOtp')} onPress={send} loading={busy} />
        </>
      ) : (
        <>
          <Field
            label={t('m.login.otp', { phone: toE164(phone) })}
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            placeholder="••••••"
          />
          <Button kind="lime" title={t('m.login.verify')} onPress={verify} loading={busy} disabled={otp.trim().length !== 6} />
          <Button title={t('m.login.change')} kind="ghost" onPress={() => setSent(false)} />
        </>
      )}
      <Notice text={error} />
      {USING_DEV_BACKEND ? <Notice tone="warn" text={`${t('m.devBackend')} · ${t('m.login.devHint')}`} /> : null}
      <P small muted>
        {t('m.login.terms')}
      </P>
      </Card>
      </View>
    </ScrollView>
  );
}
