import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { supabase } from '../src/api';
import { USING_DEV_BACKEND } from '../src/config';
import { useI18n } from '../src/i18n';
import { useSession } from '../src/session';
import { Button, C, Field, Gap, H1, Notice, P, Screen, Segmented } from '../src/ui';

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
    <Screen>
      <View style={{ alignItems: 'flex-end' }}>
        <View style={{ width: 170 }}>
          <Segmented
            value={locale}
            onChange={setLocale}
            options={[
              { value: 'ta', label: 'தமிழ்' },
              { value: 'en', label: 'English' },
            ]}
          />
        </View>
      </View>
      <Gap h={30} />
      <Text style={{ fontSize: 44, fontWeight: '800', color: C.brand }}>
        Thozhan<Text style={{ color: '#8bc34a' }}>↗</Text>
      </Text>
      <P muted>{t('app.tagline')}</P>
      <Gap h={16} />
      <H1>{t('m.login.title')}</H1>
      {!sent ? (
        <>
          <Field label={t('m.login.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="98765 43210" maxLength={14} autoFocus />
          <Button title={t('m.login.sendOtp')} onPress={send} loading={busy} />
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
          <Button title={t('m.login.verify')} onPress={verify} loading={busy} disabled={otp.trim().length !== 6} />
          <Button title={t('m.login.change')} kind="ghost" onPress={() => setSent(false)} />
        </>
      )}
      <Notice text={error} />
      {USING_DEV_BACKEND ? <Notice tone="warn" text={`${t('m.devBackend')} · ${t('m.login.devHint')}`} /> : null}
      <P small muted>
        {t('m.login.terms')}
      </P>
    </Screen>
  );
}
