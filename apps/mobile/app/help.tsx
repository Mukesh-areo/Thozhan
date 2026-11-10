import { useI18n } from '../src/i18n';
import { Card, H2, Header, P, Screen } from '../src/ui';

export default function Help() {
  const { t } = useI18n();
  const items = [
    [t('m.help.fare'), t('m.book.estimateNote')],
    [t('m.help.overcharge'), t('m.help.overchargeBody')],
    [t('m.help.cancel'), t('m.help.cancelBody')],
    [t('m.help.parcel'), t('m.help.parcelBody')],
  ];
  return (
    <Screen>
      <Header title={t('m.profile.help')} />
      {items.map(([question, answer]) => (
        <Card key={question}>
          <H2>{question}</H2>
          <P muted>{answer}</P>
        </Card>
      ))}
    </Screen>
  );
}
