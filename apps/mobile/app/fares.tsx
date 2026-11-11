// Every fare the app can quote, read from the same tariff rules the server bills with. Auto is
// the Government-notified tariff; the rest are proposed pilot fares (UX handoff §26).
import { CATEGORIES } from '@thozhan/shared';
import { calculateFare } from '@thozhan/tariff';
import { View } from 'react-native';
import { ruleFor, rupees } from '../src/fares';
import { useI18n } from '../src/i18n';
import { Badge, Card, H2, Header, Notice, P, Row, Screen, VehicleArt } from '../src/ui';

const SAMPLE_METERS = 5000;

export default function Fares() {
  const { t, money, km } = useI18n();
  return (
    <Screen>
      <Header title={t('m.fares.title')} />
      <P muted>{t('m.fares.intro')}</P>
      {CATEGORIES.map((c) => {
        const rule = ruleFor(c.id);
        if (!rule) return null;
        const government = rule.status === 'OFFICIAL';
        const sample = calculateFare(rule, { distanceMeters: SAMPLE_METERS, startedAt: Date.now(), ...(c.id.startsWith('parcel') ? { weightGrams: 1000 } : {}) });
        return (
          <Card key={c.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <VehicleArt category={c.id} size={56} />
              <View style={{ flex: 1, gap: 4 }}>
                <H2>{t(c.nameKey)}</H2>
                <Badge text={government ? t('m.fares.government') : t('m.fares.pilot')} tone={government ? 'ok' : 'warn'} />
              </View>
            </View>
            <Row label={t('m.fares.first', { km: km(rule.plain.baseDistanceMeters) })} value={`₹${rupees(rule.plain.baseFarePaise)}`} />
            <Row label={t('m.fares.after')} value={t('m.fares.perKm', { amount: rupees(rule.plain.perKmPaise) })} />
            <Row
              label={rule.waiting.freeMinutes ? t('m.fares.waitingAfter', { free: rule.waiting.freeMinutes }) : t('m.fares.waiting')}
              value={t('m.fares.perMin', { amount: rupees(rule.waiting.perMinutePaise) })}
            />
            {rule.night ? <Row label={t('m.fares.night')} value={`${rule.night.multiplierPermille / 1000}×`} /> : null}
            {rule.maxWeightGrams ? <Row label={t('m.fares.maxWeight')} value={`${rule.maxWeightGrams / 1000} kg`} /> : null}
            <Row label={t('m.fares.sample', { km: km(SAMPLE_METERS) })} value={money(sample.totalPaise)} strong />
            {government && rule.legalReference ? (
              <P small muted>
                {t('tariff.source', { reference: rule.legalReference })}
              </P>
            ) : null}
          </Card>
        );
      })}
      <Notice tone="warn" text={t('m.fares.pilotNote')} />
      <P small muted>
        {t('m.fares.fee')}
      </P>
    </Screen>
  );
}
