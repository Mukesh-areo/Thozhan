// Manage (UX handoff §15–§16): the driver's vehicle, papers, performance and tools. Incentives,
// referrals and training are not running in the pilot, so they say so rather than show numbers.
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { rpc, type Performance } from '../../src/api';
import { useI18n } from '../../src/i18n';
import { useSession } from '../../src/session';
import { Badge, Card, H1, H2, ListRow, P, Row, Screen, VehicleArt } from '../../src/ui';

export default function Manage() {
  const { t } = useI18n();
  const { me } = useSession();
  const d = me?.driver;
  const [perf, setPerf] = useState<Performance | null>(null);
  const load = useCallback(() => rpc<Performance>('driver_performance').then(setPerf, () => {}), []);
  useEffect(() => {
    load();
  }, [load]);
  const rate = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : '—');
  const compliments = Object.entries(perf?.compliments ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <Screen>
      <H1>{t('m.tab.manage')}</H1>
      {d ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <VehicleArt category={d.vehicle} size={64} />
            <View style={{ flex: 1 }}>
              <H2>{d.vehicleNumber}</H2>
              <P small muted>
                {t(`category.${d.vehicle}`)}
              </P>
            </View>
            <Badge text={t(`m.reg.status.${d.status}`)} tone={d.status === 'approved' ? 'ok' : 'warn'} />
          </View>
          <Row label={t('m.reg.licenceNumber')} value={d.licenceNumber} />
          <P small muted>
            {t('m.manage.vehicleChange')}
          </P>
        </Card>
      ) : null}

      <Card>
        <H2>{t('m.manage.performance')}</H2>
        <Row label={t('m.manage.rating')} value={perf?.rating ? `★ ${perf.rating.average.toFixed(1)} (${perf.rating.count})` : t('m.rate.new')} />
        <Row label={t('m.manage.acceptance')} value={perf ? rate(perf.accepted, perf.offers) : '—'} />
        <Row label={t('m.manage.completed')} value={perf ? String(perf.completed) : '—'} />
        <Row label={t('m.manage.cancelled')} value={perf ? String(perf.cancelledByDriver) : '—'} />
        {compliments.length ? (
          <P small muted>
            {compliments
              .slice(0, 4)
              .map(([tag, n]) => `${t(`m.rate.tag.${tag}`)} ×${n}`)
              .join(' · ')}
          </P>
        ) : null}
        <P small muted>
          {t('m.manage.last30')}
        </P>
      </Card>

      <View>
        <ListRow icon="file-text" title={t('m.manage.documents')} subtitle={d?.expiredDocuments.length ? t('m.docs.needsRenewal', { count: d.expiredDocuments.length }) : undefined} onPress={() => router.push('/documents')} />
        <ListRow icon="umbrella" title={t('m.insurance.title')} onPress={() => router.push('/insurance')} />
        <ListRow icon="shield" title={t('m.safety.toolkit')} onPress={() => router.push('/safety')} />
        <ListRow icon="alert-octagon" title={t('m.manage.incident')} onPress={() => router.push('/help?category=safety')} />
        <ListRow icon="user-check" title={t('m.manage.review')} onPress={() => router.push('/help?category=account_review')} />
        <ListRow icon="help-circle" title={t('m.help.title')} onPress={() => router.push('/help')} divider={false} />
      </View>

      <Card>
        <H2>{t('m.manage.services')}</H2>
        <P muted>{t('m.manage.servicesBody', { vehicle: d ? t(`category.${d.vehicle}`) : '—' })}</P>
      </Card>
      <Card>
        <H2>{t('m.manage.programmes')}</H2>
        <P muted>{t('m.manage.programmesBody')}</P>
        <Badge text={t('m.manage.notYet')} tone="muted" />
      </Card>
    </Screen>
  );
}
