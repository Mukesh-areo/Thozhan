import * as Speech from 'expo-speech';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Switch, Text, View } from 'react-native';
import { errorText, useI18n } from '../../src/i18n';
import { loadMeter, meterStore, startMeter, stopMeter, syncMeter, type Source } from '../../src/meter-store';
import { Badge, Button, C, Card, Field, H1, Notice, P, Row, Screen, Segmented } from '../../src/ui';

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function Meter() {
  const { t, money, km, locale } = useI18n();
  const state = useSyncExternalStore(meterStore.subscribe, meterStore.get);
  const [vehicle, setVehicle] = useState('');
  const [terrain, setTerrain] = useState<'plain' | 'ghat'>('plain');
  const [source, setSource] = useState<Source>('gps');
  const [voice, setVoice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const spoken = useRef(0);
  const notice = { title: t('meter.title'), body: t('m.meter.running') };

  useEffect(() => {
    loadMeter(notice);
    syncMeter().catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!state.run) return;
    activateKeepAwakeAsync('meter').catch(() => {});
    return () => {
      // Rejects when the lock was never granted (some browsers); nothing to release then.
      deactivateKeepAwake('meter').catch(() => {});
    };
  }, [state.run]);

  // Speak the fare each time it moves up by at least ₹10.
  const total = state.fare?.totalPaise ?? 0;
  useEffect(() => {
    if (!voice || !state.run || total < spoken.current + 1000) return;
    spoken.current = total;
    Speech.speak(t('m.meter.speak', { amount: money(total) }), { language: locale === 'ta' ? 'ta-IN' : 'en-IN' });
  }, [total, voice]); // eslint-disable-line react-hooks/exhaustive-deps

  async function start() {
    setError(null);
    setBusy(true);
    spoken.current = 0;
    const ok = await startMeter({ vehicleNumber: vehicle, terrain, source }, notice);
    setBusy(false);
    if (!ok) setError(t('m.error.location_denied'));
  }

  async function stop() {
    setBusy(true);
    try {
      const finished = await stopMeter();
      if (!finished) return;
      const trip = await syncMeter(finished.clientKey);
      router.push(trip ? `/receipt/${trip.id}` : `/meter-receipt/${finished.clientKey}`);
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(false);
    }
  }

  const snap = state.snapshot;
  if (state.run) {
    return (
      <Screen>
        <Badge text={`⏱️ ${t('m.meter.running')}${state.run.source === 'demo' ? ` · ${t('m.meter.demo')}` : ''}`} />
        <Card tone="brand" style={{ alignItems: 'center', paddingVertical: 28 }}>
          <Text style={{ color: '#d5e4dc', fontSize: 15 }}>{t('meter.liveFare')}</Text>
          <Text style={{ color: '#fff', fontSize: 64, fontWeight: '800' }}>{state.fare ? money(state.fare.totalPaise) : '—'}</Text>
          <Text style={{ color: C.lime, fontSize: 14 }}>{state.fare ? t(`tariff.status.${state.fare.status}`) : t('m.meter.waitingGps')}</Text>
        </Card>
        <Card>
          <Row label={t('meter.distance')} value={`${km(snap?.distanceMeters ?? 0, 2)} ${t('ui.unit.km')}`} />
          <Row label={t('meter.waiting')} value={clock(snap?.waitingSeconds ?? 0)} />
          <Row label={t('meter.elapsed')} value={clock(snap?.elapsedSeconds ?? 0)} />
          {state.run.vehicleNumber ? <Row label={t('meter.vehicleNumber')} value={state.run.vehicleNumber.toUpperCase()} /> : null}
          {state.fare?.night ? <Badge text={t('ui.meter.night')} tone="warn" /> : null}
          {snap?.flags.map((f) => <Badge key={f} text={t(`meter.flag.${f}`)} tone="danger" />)}
        </Card>
        <P small muted>
          {state.run.source === 'gps' ? (state.background ? t('m.meter.background') : t('m.meter.foregroundOnly')) : t('ui.meter.keepOpen')}
        </P>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Switch value={voice} onValueChange={setVoice} />
          <P>{t('m.meter.voice')}</P>
        </View>
        <Notice text={error} />
        <Button title={t('m.meter.stop')} kind="danger" onPress={stop} loading={busy} />
      </Screen>
    );
  }

  return (
    <Screen>
      <H1>{t('meter.title')}</H1>
      <P muted>{t('m.meter.sub')}</P>
      <Card>
        <Field label={t('m.meter.vehicle')} value={vehicle} onChangeText={setVehicle} autoCapitalize="characters" placeholder="TN 09 AB 1234" />
        <P small muted>
          {t('ui.meter.terrain')}
        </P>
        <Segmented<'plain' | 'ghat'>
          value={terrain}
          onChange={setTerrain}
          options={[
            { value: 'plain', label: t('ui.meter.plain') },
            { value: 'ghat', label: t('ui.meter.ghat') },
          ]}
        />
        <P small muted>
          {t('m.meter.source')}
        </P>
        <Segmented<Source>
          value={source}
          onChange={setSource}
          options={[
            { value: 'gps', label: t('m.meter.gps') },
            { value: 'demo', label: t('m.meter.demo') },
          ]}
        />
      </Card>
      <Card>
        <Row label={t('ui.go.minFare')} value={t('ui.go.minFareVal')} />
        <Row label={t('ui.go.perKm')} value={t('ui.go.perKmVal')} />
        <Row label={t('ui.go.waiting')} value={t('ui.go.waitingVal')} />
        <Row label={t('ui.go.night')} value={t('ui.go.nightVal')} />
      </Card>
      <Notice text={error} />
      <Button title={t('m.meter.start')} onPress={start} loading={busy} />
      {state.outbox.length ? (
        <Card tone="warn">
          <P>{t('m.meter.pending', { n: state.outbox.length })}</P>
          <Button title={t('m.meter.sync')} kind="secondary" onPress={() => syncMeter().catch(() => {})} />
        </Card>
      ) : null}
    </Screen>
  );
}
