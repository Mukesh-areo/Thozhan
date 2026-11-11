import { useI18n } from '../src/i18n';
import { Card, Header, ListRow, P, Screen } from '../src/ui';

export default function Payment() {
  const { t } = useI18n();
  return (
    <Screen>
      <Header title={t('m.profile.payment')} />
      <Card>
        <ListRow icon="dollar-sign" title={t('m.payment.cash')} subtitle={t('m.payment.cashBody')} />
        <ListRow icon="smartphone" title={t('m.payment.upi')} subtitle={t('m.payment.upiBody')} divider={false} />
      </Card>
      <P muted>{t('m.book.estimateNote')}</P>
      <P muted>{t('m.payment.noCommission')}</P>
    </Screen>
  );
}
