// Send a parcel (UX handoff §7–§8): pickup and drop, who receives it, what it is, its size, and
// the packed-safely declaration. The vehicle and its price come next, on the vehicle list.
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { ActiveTrip } from '../../src/ActiveTrip';
import { PARCEL_ITEMS, useBooking } from '../../src/booking';
import { useI18n } from '../../src/i18n';
import { useSession } from '../../src/session';
import { Button, C, Card, Chip, Field, H2, Icon, KeyboardSafe, Notice, P, RoundButton, Toggle } from '../../src/ui';

const digitsOnly = (v: string) => v.replace(/[^0-9]/g, '');
const mobileOk = (v: string) => /^[6-9][0-9]{9}$/.test(digitsOnly(v).replace(/^91(?=[0-9]{10}$)/, ''));

export default function Parcel() {
  const { t } = useI18n();
  const { me } = useSession();
  const b = useBooking();
  const [error, setError] = useState<string | null>(null);
  if (b.trip) return <ActiveTrip trip={b.trip} onChange={b.setTrip} />;
  const p = b.parcel;

  const search = (field: 'pickup' | 'drop') => {
    b.setFlow('parcel');
    router.push(`/search?field=${field}&next=back`);
  };

  function next() {
    setError(null);
    if (!p.receiverName.trim() || !mobileOk(p.receiverPhone)) return setError(t('m.error.receiver_required'));
    const kg = Number(p.weightKg.replace(',', '.'));
    if (!(kg > 0 && kg <= 50)) return setError(t('m.error.bad_weight'));
    if (!p.prohibitedAck) return setError(t('m.error.prohibited_ack_required'));
    b.setFlow('parcel');
    b.setCategory(kg <= 5 ? 'parcel-bike' : 'parcel-auto');
    router.push('/choose');
  }

  return (
    <KeyboardSafe>
      <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <View>
          <Image source={require('../../assets/illustrations/hero-parcel.png')} style={styles.hero} resizeMode="cover" accessibilityIgnoresInvertColors />
          <RoundButton
            icon="arrow-left"
            label={t('m.back')}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/book'))}
            style={{ position: 'absolute', top: 40, left: 16 }}
          />
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
            <>
              <Card>
                <H2>{t('m.parcel.receiver')}</H2>
                <Field
                  label={t('m.book.receiverName')}
                  value={p.receiverName}
                  onChangeText={(receiverName) => b.setParcel({ receiverName })}
                  autoCapitalize="words"
                />
                <Field
                  label={t('m.book.receiverPhone')}
                  value={p.receiverPhone}
                  onChangeText={(receiverPhone) => b.setParcel({ receiverPhone })}
                  keyboardType="phone-pad"
                  maxLength={14}
                />
              </Card>
              <Card>
                <H2>{t('m.parcel.item')}</H2>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {PARCEL_ITEMS.map((item) => (
                    <Chip key={item} label={t(`m.parcel.item.${item}`)} on={p.category === item} onPress={() => b.setParcel({ category: item })} />
                  ))}
                </View>
                <Field label={t('m.book.item')} value={p.item} onChangeText={(item) => b.setParcel({ item })} placeholder={t('m.parcel.describeHint')} />
                <Field
                  label={t('m.book.weight')}
                  value={p.weightKg}
                  onChangeText={(weightKg) => b.setParcel({ weightKg })}
                  keyboardType="decimal-pad"
                  hint={t('m.parcel.weightHint')}
                />
                <Field
                  label={t('m.parcel.value')}
                  value={p.declaredValue}
                  onChangeText={(declaredValue) => b.setParcel({ declaredValue: digitsOnly(declaredValue) })}
                  keyboardType="number-pad"
                  hint={t('m.parcel.valueHint')}
                />
              </Card>
              <Card>
                <H2>{t('m.parcel.size')}</H2>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(['l', 'w', 'h'] as const).map((d, i) => (
                    <View key={d} style={{ flex: 1 }}>
                      <Field
                        label={t(`m.parcel.dim.${d}`)}
                        value={p.dimensions[i]}
                        onChangeText={(v) => {
                          const dims = [...p.dimensions] as [string, string, string];
                          dims[i] = digitsOnly(v);
                          b.setParcel({ dimensions: dims });
                        }}
                        keyboardType="number-pad"
                        maxLength={3}
                      />
                    </View>
                  ))}
                </View>
                <Field
                  label={t('m.parcel.packages')}
                  value={p.packages}
                  onChangeText={(packages) => b.setParcel({ packages: digitsOnly(packages) })}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Toggle label={t('m.parcel.fragile')} value={p.fragile} onChange={(fragile) => b.setParcel({ fragile })} />
                <Toggle
                  label={t('m.parcel.loadingHelp')}
                  hint={t('m.parcel.loadingHelpHint')}
                  value={p.loadingHelp}
                  onChange={(loadingHelp) => b.setParcel({ loadingHelp })}
                />
              </Card>
              <Card tone="warn">
                <P small>{t('m.book.restricted')}</P>
                <Toggle label={t('m.parcel.ack')} value={p.prohibitedAck} onChange={(prohibitedAck) => b.setParcel({ prohibitedAck })} />
              </Card>
            </>
          ) : null}
          <P small muted center>
            {t('m.parcel.sub')}
          </P>
          <Notice text={error} />
          {b.drop ? <Button kind="lime" title={t('m.parcel.continue')} onPress={next} /> : null}
        </View>
      </ScrollView>
    </KeyboardSafe>
  );
}

const styles = {
  hero: { width: '100%', height: 240 },
  heroText: { position: 'absolute', left: 18, right: 170, top: 100 },
  heroTitle: { fontSize: 22, lineHeight: 31, fontWeight: '800', color: '#fff' },
  body: { paddingHorizontal: 16, marginTop: -28, gap: 10 },
  stop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  label: { fontSize: 15, lineHeight: 22, fontWeight: '700', color: C.ink },
  address: { fontSize: 15, lineHeight: 23, color: C.muted },
  switch: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    minHeight: 40,
    marginVertical: -22,
    zIndex: 2,
    marginRight: 16,
    boxShadow: '0px 3px 12px rgba(20, 32, 27, 0.14)',
  },
  switchText: { fontSize: 14, lineHeight: 21, fontWeight: '600', color: C.ink },
} as const;
