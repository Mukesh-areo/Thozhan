// Send a parcel: banner, pickup and drop cards, and who receives it.
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { ActiveTrip } from '../../../src/ActiveTrip';
import { useBooking } from '../../../src/booking';
import { useI18n } from '../../../src/i18n';
import { useSession } from '../../../src/session';
import { Button, C, Card, Field, Icon, Notice, P } from '../../../src/ui';

export default function Parcel() {
  const { t } = useI18n();
  const { me } = useSession();
  const b = useBooking();
  const [error, setError] = useState<string | null>(null);
  if (b.trip) return <ActiveTrip trip={b.trip} onChange={b.setTrip} />;

  const search = (field: 'pickup' | 'drop') => {
    b.setFlow('parcel');
    router.push(`/search?field=${field}&next=back`);
  };

  function next() {
    setError(null);
    if (!b.parcel.receiverName.trim() || b.parcel.receiverPhone.replace(/\D/g, '').length < 10) return setError(t('m.error.receiver_required'));
    b.setFlow('parcel');
    b.setCategory('parcel-auto');
    router.push('/choose');
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      <View>
        <Image source={require('../../../assets/illustrations/hero-parcel.png')} style={styles.hero} resizeMode="cover" accessibilityIgnoresInvertColors />
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>{t('m.parcel.title')}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Card>
          <View style={styles.stop}>
            <Icon name="map-pin" color={C.brand} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{t('m.parcel.pickup')}</Text>
              <Text style={styles.address}>{b.pickup?.name ?? t('m.book.choosePlace')}</Text>
              {me?.name ? <P small>{`${me.name} (${me.phone?.replace(/^91/, '')})`}</P> : null}
            </View>
            <Pressable onPress={() => search('pickup')} accessibilityRole="button" accessibilityLabel={t('m.book.pickup')} hitSlop={10}>
              <Icon name="edit-2" size={18} />
            </Pressable>
          </View>
        </Card>
        <Pressable onPress={b.swap} accessibilityRole="button" style={styles.switch}>
          <Icon name="repeat" size={16} />
          <Text style={styles.switchText}>{t('m.parcel.switch')}</Text>
        </Pressable>
        <Card>
          <Pressable onPress={() => search('drop')} accessibilityRole="button" style={styles.stop}>
            <Icon name="map-pin" color={C.danger} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{t('m.parcel.drop')}</Text>
              <Text style={[styles.address, !b.drop && { color: C.muted }]}>{b.drop?.name ?? t('m.parcel.dropSearch')}</Text>
            </View>
            <Icon name={b.drop ? 'edit-2' : 'search'} size={18} />
          </Pressable>
        </Card>
        {b.drop ? (
          <Card>
            <Field label={t('m.book.receiverName')} value={b.parcel.receiverName} onChangeText={(receiverName) => b.setParcel({ receiverName })} autoCapitalize="words" />
            <Field label={t('m.book.receiverPhone')} value={b.parcel.receiverPhone} onChangeText={(receiverPhone) => b.setParcel({ receiverPhone })} keyboardType="phone-pad" maxLength={14} />
            <Field label={t('m.book.weight')} value={b.parcel.weightKg} onChangeText={(weightKg) => b.setParcel({ weightKg })} keyboardType="decimal-pad" />
            <Field label={t('m.book.item')} value={b.parcel.item} onChangeText={(item) => b.setParcel({ item })} />
          </Card>
        ) : null}
        <P small muted center>
          {t('m.parcel.sub')}
        </P>
        <P small muted center>
          {t('m.book.restricted')}
        </P>
        <Notice text={error} />
        {b.drop ? <Button kind="lime" title={t('m.parcel.continue')} onPress={next} /> : null}
      </View>
    </ScrollView>
  );
}

const styles = {
  hero: { width: '100%', height: 240 },
  heroText: { position: 'absolute', left: 18, right: 170, top: 36 },
  heroTitle: { fontSize: 22, lineHeight: 31, fontWeight: '800', color: '#fff' },
  body: { paddingHorizontal: 16, marginTop: -28, gap: 10 },
  stop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  label: { fontSize: 15, lineHeight: 22, fontWeight: '700', color: C.ink },
  address: { fontSize: 15, lineHeight: 23, color: C.muted },
  switch: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, minHeight: 40, marginVertical: -22, zIndex: 2, marginRight: 16, boxShadow: '0px 3px 12px rgba(20, 32, 27, 0.14)' },
  switchText: { fontSize: 14, lineHeight: 21, fontWeight: '600', color: C.ink },
} as const;
