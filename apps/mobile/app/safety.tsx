// Safety centre (UX handoff §19): emergency calls, trusted contacts, how trips are protected,
// and a way to report something that happened.
import { router } from 'expo-router';
import { Linking } from 'react-native';
import { useI18n } from '../src/i18n';
import { useSession } from '../src/session';
import { Button, C, Card, H2, Header, Icon, P, Screen, type IconName } from '../src/ui';

export default function Safety() {
  const { t } = useI18n();
  const { mode } = useSession();
  const driver = mode === 'driver';
  const items: [IconName, string, string][] = driver
    ? [
        ['lock', t('m.safety.otp'), t('m.safety.driverOtpBody')],
        ['eye-off', t('m.safety.privacy'), t('m.safety.driverPrivacyBody')],
        ['moon', t('m.safety.night'), t('m.safety.nightBody')],
      ]
    : [
        ['lock', t('m.safety.otp'), t('m.safety.otpBody')],
        ['check-square', t('m.safety.plate'), t('m.safety.plateBody')],
        ['share-2', t('m.safety.share'), t('m.safety.shareBody')],
      ];
  return (
    <Screen>
      <Header title={t('m.safety.centre')} />
      <Card tone="danger">
        <Icon name="alert-triangle" color={C.danger} />
        <H2>{t('m.safety.sos')}</H2>
        <P muted>{t('m.safety.sosBody')}</P>
        <Button title={t('m.trip.call112')} kind="danger" icon="phone" onPress={() => Linking.openURL('tel:112')} />
        <Button title={t('m.safety.women')} kind="secondary" icon="phone" onPress={() => Linking.openURL('tel:181')} />
      </Card>
      {!driver ? <Button title={t('m.contacts.title')} kind="secondary" icon="users" onPress={() => router.push('/contacts')} /> : null}
      {items.map(([icon, title, body]) => (
        <Card key={title}>
          <Icon name={icon} color={C.brand} />
          <H2>{title}</H2>
          <P muted>{body}</P>
        </Card>
      ))}
      <Button title={t('m.safety.report')} kind="secondary" icon="flag" onPress={() => router.push('/help?category=safety')} />
    </Screen>
  );
}
