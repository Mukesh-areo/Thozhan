import * as ImagePicker from 'expo-image-picker';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { CATEGORIES } from '@thozhan/shared';
import { Pressable, Text, View } from 'react-native';
import { rpc, supabase, type Me } from '../src/api';
import { errorText, useI18n } from '../src/i18n';
import { useSession } from '../src/session';
import { Badge, Button, C, Card, Field, H1, H2, Icon, Notice, P, Screen, VehicleArt } from '../src/ui';

const DOCS = ['licence', 'rc', 'permit', 'insurance'] as const;
const VEHICLES = CATEGORIES.filter((c) => c.flows.includes('ride'));
type Doc = (typeof DOCS)[number];

export default function DriverRegister() {
  const { t } = useI18n();
  const { me, refresh, setMode } = useSession();
  const driver = me?.driver ?? null;
  const [vehicleType, setVehicleType] = useState(driver?.vehicle ?? 'auto');
  const [vehicle, setVehicle] = useState(driver?.vehicleNumber ?? '');
  const [licence, setLicence] = useState(driver?.licenceNumber ?? '');
  const [docs, setDocs] = useState<Partial<Record<Doc, string>>>(driver?.documents ?? {});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const editable = !driver || driver.status === 'rejected';

  async function pick(doc: Doc, camera: boolean) {
    setError(null);
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6 };
    if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) return setError(t('m.error.forbidden'));
    const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.canceled ? null : result.assets[0];
    if (!asset || !me) return;
    setBusy(doc);
    try {
      const bytes = await (await fetch(asset.uri)).arrayBuffer();
      const path = `${me.id}/${doc}-${Date.now()}.jpg`;
      const { error: e } = await supabase.storage.from('driver-documents').upload(path, bytes, { contentType: asset.mimeType ?? 'image/jpeg', upsert: true });
      if (e) throw e;
      setDocs((d) => ({ ...d, [doc]: path }));
    } catch {
      setError(t('m.error.network'));
    } finally {
      setBusy(null);
    }
  }

  async function submit() {
    setError(null);
    setBusy('submit');
    try {
      await rpc<Me>('register_driver', { p_vehicle_number: vehicle, p_licence_number: licence, p_documents: docs, p_vehicle: vehicleType });
      await refresh();
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(null);
    }
  }

  if (driver?.status === 'approved') return <Redirect href="/drive" />;

  return (
    <Screen>
      <H1>{t('m.reg.title')}</H1>
      {driver ? (
        <Card tone={driver.status === 'rejected' ? 'danger' : 'warn'}>
          <Badge text={t(`m.reg.status.${driver.status}`)} tone={driver.status === 'rejected' ? 'danger' : 'warn'} />
          {driver.status === 'pending' ? <P>{t('m.reg.pendingBody')}</P> : null}
          {driver.reviewNote ? <P>{t('m.reg.note', { note: driver.reviewNote })}</P> : null}
          <Button title={t('m.earn.refresh')} kind="secondary" onPress={() => refresh()} />
        </Card>
      ) : (
        <P muted>{t('m.reg.sub')}</P>
      )}
      {editable ? (
        <>
          <Card>
            <H2>{t('m.reg.vehicleType')}</H2>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {VEHICLES.map((c) => {
                const on = c.id === vehicleType;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setVehicleType(c.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    style={{ width: '48%', alignItems: 'center', padding: 8, borderRadius: 14, borderWidth: 2, borderColor: on ? C.brand : C.line }}
                  >
                    <VehicleArt category={c.id} size={64} />
                    <Text style={{ fontSize: 14, lineHeight: 21, fontWeight: '600', color: C.ink }}>{t(c.nameKey)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
          <Card>
            <Field label={t('m.reg.vehicleNumber')} value={vehicle} onChangeText={setVehicle} autoCapitalize="characters" placeholder="TN 09 AB 1234" />
            <Field label={t('m.reg.licenceNumber')} value={licence} onChangeText={setLicence} autoCapitalize="characters" placeholder="TN09 20190012345" />
          </Card>
          {DOCS.map((doc) => (
            <Card key={doc}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Icon name="file-text" color={docs[doc] ? C.ok : C.muted} />
                  <View style={{ flex: 1 }}>
                    <H2>{t(`m.reg.doc.${doc}`)}</H2>
                  </View>
                </View>
                {docs[doc] ? <Badge text={`✓ ${t('m.reg.uploaded')}`} /> : null}
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button title={t('m.reg.camera')} icon="camera" kind="secondary" onPress={() => pick(doc, true)} loading={busy === doc} style={{ flex: 1 }} />
                <Button title={t('m.reg.gallery')} icon="image" kind="secondary" onPress={() => pick(doc, false)} disabled={busy === doc} style={{ flex: 1 }} />
              </View>
            </Card>
          ))}
          <Notice text={error} />
          <Button kind="lime" title={t('m.reg.submit')} onPress={submit} loading={busy === 'submit'} disabled={DOCS.some((d) => !docs[d])} />
        </>
      ) : (
        <Notice text={error} />
      )}
      <Button
        title={t('m.account.rideMode')}
        kind="ghost"
        onPress={() => {
          setMode('rider');
          router.replace('/book');
        }}
      />
    </Screen>
  );
}
