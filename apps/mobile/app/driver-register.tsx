// Driver partner registration (UX handoff §13–§14): vehicle, numbers, then each required paper
// with a photo and, where it has one, its validity date. Review status shows here until approved.
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { CATEGORIES } from '@thozhan/shared';
import { Pressable, Text, View } from 'react-native';
import { rpc, type Me } from '../src/api';
import { expires, futureDate, photoUpload, requiredDocs, type Doc } from '../src/documents';
import { errorText, useI18n } from '../src/i18n';
import { useSession } from '../src/session';
import { Badge, Button, C, Card, Field, H1, H2, Icon, Notice, P, Screen, VehicleArt } from '../src/ui';

const VEHICLES = CATEGORIES.filter((c) => c.flows.includes('ride'));
// Same rule as register_driver(): a Tamil Nadu registration such as "TN 09 AB 1234".
const VEHICLE_NUMBER = /^TN ?[0-9]{1,2} ?[A-Z]{0,3} ?[0-9]{1,4}$/;

export default function DriverRegister() {
  const { t } = useI18n();
  const { me, refresh, signOut, notice, setNotice } = useSession();
  const driver = me?.driver ?? null;
  const [vehicleType, setVehicleType] = useState(driver?.vehicle ?? 'auto');
  const [vehicle, setVehicle] = useState(driver?.vehicleNumber ?? '');
  const [licence, setLicence] = useState(driver?.licenceNumber ?? '');
  const [docs, setDocs] = useState<Partial<Record<Doc, string>>>(driver?.documents ?? {});
  const [expiry, setExpiry] = useState<Partial<Record<Doc, string>>>(driver?.documentExpiry ?? {});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [docError, setDocError] = useState<{ doc: Doc; text: string } | null>(null);
  const editable = !driver || driver.status === 'rejected';
  const needed = requiredDocs(vehicleType);

  async function pick(doc: Doc, camera: boolean) {
    if (!me) return;
    setError(null);
    setDocError(null);
    setBusy(doc);
    const result = await photoUpload(me.id, doc, camera);
    setBusy(null);
    if (!result) return;
    if ('error' in result) return setDocError({ doc, text: t(`m.error.${result.error}`) });
    setDocs((d) => ({ ...d, [doc]: result.path }));
  }

  async function submit() {
    setError(null);
    const plate = vehicle.trim().toUpperCase().replace(/[\s-]+/g, ' ');
    if (!VEHICLE_NUMBER.test(plate)) return setError(t('m.error.bad_vehicle_number'));
    if (licence.trim().length < 6) return setError(t('m.error.bad_licence'));
    const missing = needed.find((d) => !docs[d]);
    if (missing) return setError(t('m.reg.missingDoc', { doc: t(`m.reg.doc.${missing}`) }));
    const dates: Record<string, string> = {};
    for (const d of needed.filter(expires)) {
      const ok = futureDate(expiry[d] ?? '');
      if (!ok) return setError(t('m.reg.badExpiry', { doc: t(`m.reg.doc.${d}`) }));
      dates[d] = ok;
    }
    setBusy('submit');
    try {
      const picked = Object.fromEntries(needed.map((d) => [d, docs[d]]));
      await rpc<Me>('register_driver', { p_vehicle_number: plate, p_licence_number: licence.trim().toUpperCase(), p_documents: picked, p_vehicle: vehicleType, p_expiry: dates });
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
      {notice ? (
        <Pressable onPress={() => setNotice(null)} accessibilityRole="button" accessibilityHint={t('m.dismiss')}>
          <Notice text={notice} tone="warn" />
        </Pressable>
      ) : null}
      {driver ? (
        <Card tone={driver.status === 'rejected' ? 'danger' : 'warn'}>
          <Badge text={t(`m.reg.status.${driver.status}`)} tone={driver.status === 'rejected' ? 'danger' : 'warn'} />
          {driver.status === 'pending' ? <P>{t('m.reg.pendingBody')}</P> : null}
          {driver.reviewNote ? <P>{t('m.reg.note', { note: driver.reviewNote })}</P> : null}
          <P small muted>
            {t('m.reg.submittedOn', { date: new Date(driver.createdAt).toLocaleDateString() })}
          </P>
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
            <Field label={t('m.reg.vehicleNumber')} value={vehicle} onChangeText={setVehicle} autoCapitalize="characters" placeholder="TN 09 AB 1234" maxLength={16} />
            <Field label={t('m.reg.licenceNumber')} value={licence} onChangeText={setLicence} autoCapitalize="characters" placeholder="TN09 20190012345" maxLength={20} />
          </Card>
          {needed.map((doc) => (
            <Card key={doc}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Icon name={doc === 'photo' ? 'user' : 'file-text'} color={docs[doc] ? C.ok : C.muted} />
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
              {docError?.doc === doc ? <Notice text={docError.text} /> : null}
              {expires(doc) ? (
                <Field
                  label={t('m.reg.validTill')}
                  value={expiry[doc] ?? ''}
                  onChangeText={(v) => setExpiry((e) => ({ ...e, [doc]: v }))}
                  placeholder="2027-03-31"
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                  hint={t('m.reg.dateHint')}
                />
              ) : null}
            </Card>
          ))}
          <P small muted>
            {t('m.reg.private')}
          </P>
          <Notice text={error} />
          <Button kind="lime" title={t('m.reg.submit')} onPress={submit} loading={busy === 'submit'} />
        </>
      ) : (
        <Notice text={error} />
      )}
      <Button title={t('m.help.title')} kind="secondary" icon="help-circle" onPress={() => router.push('/help?category=account_review')} />
      <Button
        title={t('m.signOut')}
        kind="ghost"
        onPress={async () => {
          await signOut();
          router.replace('/login');
        }}
      />
    </Screen>
  );
}
