import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { rpc, supabase, type Me } from '../src/api';
import { errorText, useI18n } from '../src/i18n';
import { useSession } from '../src/session';
import { Badge, Button, Card, Field, H1, H2, Notice, P, Screen } from '../src/ui';

const DOCS = ['licence', 'rc', 'permit', 'insurance'] as const;
type Doc = (typeof DOCS)[number];

export default function DriverRegister() {
  const { t } = useI18n();
  const { me, refresh, setMode } = useSession();
  const driver = me?.driver ?? null;
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
      await rpc<Me>('register_driver', { p_vehicle_number: vehicle, p_licence_number: licence, p_documents: docs });
      await refresh();
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(null);
    }
  }

  if (driver?.status === 'approved') {
    router.replace('/drive');
    return null;
  }

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
            <Field label={t('m.reg.vehicleNumber')} value={vehicle} onChangeText={setVehicle} autoCapitalize="characters" placeholder="TN 09 AB 1234" />
            <Field label={t('m.reg.licenceNumber')} value={licence} onChangeText={setLicence} autoCapitalize="characters" placeholder="TN09 20190012345" />
          </Card>
          {DOCS.map((doc) => (
            <Card key={doc}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <H2>{t(`m.reg.doc.${doc}`)}</H2>
                {docs[doc] ? <Badge text={`✓ ${t('m.reg.uploaded')}`} /> : null}
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button title={t('m.reg.camera')} kind="secondary" onPress={() => pick(doc, true)} loading={busy === doc} style={{ flex: 1 }} />
                <Button title={t('m.reg.gallery')} kind="secondary" onPress={() => pick(doc, false)} disabled={busy === doc} style={{ flex: 1 }} />
              </View>
            </Card>
          ))}
          <Notice text={error} />
          <Button title={t('m.reg.submit')} onPress={submit} loading={busy === 'submit'} disabled={DOCS.some((d) => !docs[d])} />
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
