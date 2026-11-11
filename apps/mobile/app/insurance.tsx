// Ride insurance (UX handoff §21). No insurer, plan or premium is chosen yet, so the page says
// what cover is planned and how claims will work, without inventing a policy or a price.
import { router } from 'expo-router';
import { useI18n } from '../src/i18n';
import { useSession } from '../src/session';
import { Badge, Button, C, Card, H2, Header, Icon, Notice, P, Screen } from '../src/ui';

export default function Insurance() {
  const { t } = useI18n();
  const { mode } = useSession();
  const driver = mode === 'driver';
  const rows: [string, string][] = driver
    ? [
        [t('m.insurance.vehicle'), t('m.insurance.vehicleBody')],
        [t('m.insurance.accident'), t('m.insurance.accidentDriverBody')],
      ]
    : [
        [t('m.insurance.passengerCover'), t('m.insurance.passengerBody')],
        [t('m.insurance.parcelCover'), t('m.insurance.parcelBody')],
      ];
  return (
    <Screen>
      <Header title={t('m.insurance.title')} />
      <Card tone="brand">
        <Icon name="umbrella" color={C.brand} size={28} />
        <H2>{t('m.insurance.headline')}</H2>
        <Badge text={t('m.insurance.planned')} tone="warn" />
        <P muted>{t('m.insurance.intro')}</P>
      </Card>
      {rows.map(([title, body]) => (
        <Card key={title}>
          <H2>{title}</H2>
          <P muted>{body}</P>
        </Card>
      ))}
      <Card>
        <H2>{t('m.insurance.claimTitle')}</H2>
        <P muted>{t('m.insurance.claimBody')}</P>
      </Card>
      <Notice tone="warn" text={t('m.insurance.notice')} />
      <Button title={t('m.insurance.claim')} kind="secondary" icon="file-text" onPress={() => router.push('/help?category=insurance')} />
    </Screen>
  );
}
