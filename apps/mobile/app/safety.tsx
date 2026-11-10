import { Linking } from 'react-native';
import { useI18n } from '../src/i18n';
import { Button, C, Card, H2, Header, Icon, P, Screen, type IconName } from '../src/ui';

export default function Safety() {
  const { t } = useI18n();
  const items: [IconName, string, string][] = [
    ['lock', t('m.safety.otp'), t('m.safety.otpBody')],
    ['share-2', t('m.safety.share'), t('m.safety.shareBody')],
    ['alert-triangle', t('m.safety.sos'), t('m.safety.sosBody')],
  ];
  return (
    <Screen>
      <Header title={t('m.profile.safety')} />
      {items.map(([icon, title, body]) => (
        <Card key={title}>
          <Icon name={icon} color={C.brand} />
          <H2>{title}</H2>
          <P muted>{body}</P>
        </Card>
      ))}
      <Button title={t('m.trip.call112')} kind="danger" icon="phone" onPress={() => Linking.openURL('tel:112')} />
    </Screen>
  );
}
