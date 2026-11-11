// Sign-in: choose Passenger or Driver partner, then the phone number and its OTP. The account
// type is tied to the number on first sign-in; changing it later is a support request.
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { AppError, rpc, supabase, type Me } from '../src/api';
import { USING_DEV_BACKEND } from '../src/config';
import { useI18n } from '../src/i18n';
import { modeOf, useSession } from '../src/session';
import { Button, C, Card, Field, H2, Icon, KeyboardSafe, Notice, P, Segmented, VehicleArt } from '../src/ui';

type Role = 'passenger' | 'driver';

const toE164 = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  return digits.length === 10 ? '+91' + digits : '+' + digits;
};

export default function Login() {
  const { t, locale, setLocale } = useI18n();
  const { refresh, setNotice } = useSession();
  const [role, setRole] = useState<Role | null>(null);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setError(null);
    if (!/^[6-9]\d{9}$/.test(phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, ''))) return setError(t('m.error.bad_phone'));
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
    const profile = await refresh();
    if (profile && role) {
      try {
        await rpc<Me>('set_account_type', { p_type: role });
        await refresh();
      } catch (err) {
        // The number already has the other account type: open that one and say why.
        if (err instanceof AppError && err.code === 'account_type_locked') {
          const actual = modeOf(profile) === 'driver' ? 'driver' : 'passenger';
          setNotice(t('m.login.typeLocked', { type: t(`m.role.${actual}`) }));
        }
      }
    }
    setBusy(false);
    router.replace('/');
  }

  const roleCard = (value: Role, art: string, title: string, body: string) => (
    <Pressable onPress={() => setRole(value)} accessibilityRole="button" accessibilityLabel={title}>
      <View style={styles.role}>
        <VehicleArt category={art} size={70} />
        <View style={{ flex: 1 }}>
          <Text style={styles.roleTitle}>{title}</Text>
          <Text style={styles.roleBody}>{body}</Text>
        </View>
        <Icon name="chevron-right" color={C.muted} />
      </View>
    </Pressable>
  );

  return (
    <KeyboardSafe>
      <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <View>
          <Image
            source={require('../assets/illustrations/hero-login.png')}
            style={{ width: '100%', height: 260 }}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
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
            {!role ? (
              <>
                <H2>{t('m.login.how')}</H2>
                <P small muted>
                  {t('m.login.howSub')}
                </P>
                {roleCard('passenger', 'parcel-auto', t('m.role.passenger'), t('m.login.passengerBody'))}
                {roleCard('driver', 'auto', t('m.role.driverPartner'), t('m.login.driverBody'))}
                <Notice tone="warn" text={t('m.login.oneType')} />
              </>
            ) : (
              <>
                <Pressable onPress={() => (sent ? setSent(false) : setRole(null))} accessibilityRole="button" style={styles.chosen}>
                  <Icon name="arrow-left" size={18} />
                  <Text style={styles.chosenText}>{role === 'driver' ? t('m.login.driverTitle') : t('m.login.passengerTitle')}</Text>
                </Pressable>
                {!sent ? (
                  <>
                    <Field
                      label={role === 'driver' ? t('m.login.registeredPhone') : t('m.login.phone')}
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      placeholder="98765 43210"
                      maxLength={14}
                      autoFocus
                    />
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
              </>
            )}
            <Notice text={error} />
            {USING_DEV_BACKEND && role ? <Notice tone="warn" text={t('m.login.devHint')} /> : null}
            <P small muted>
              {t('m.login.terms')}
            </P>
          </Card>
        </View>
      </ScrollView>
    </KeyboardSafe>
  );
}

const styles = {
  role: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 10, minHeight: 72 },
  roleTitle: { fontSize: 17, lineHeight: 25, fontWeight: '800', color: C.ink },
  roleBody: { fontSize: 13, lineHeight: 19, color: C.muted },
  chosen: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40 },
  chosenText: { fontSize: 18, lineHeight: 27, fontWeight: '800', color: C.ink },
} as const;
