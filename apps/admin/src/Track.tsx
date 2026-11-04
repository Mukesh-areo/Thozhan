import { LangToggle } from './App.tsx';
import { rpc, usePoll, useI18n } from './lib.tsx';
import { LiveMap } from './LiveMap.tsx';

interface Shared {
  code: string;
  status: string;
  category: string;
  pickup: string;
  dropoff: string;
  vehicleNumber: string | null;
  driver: { name: string; lat: number | null; lon: number | null; locationAt: string | null } | null;
}

/** Public page behind a passenger's share link. Shows only what shared_trip returns. */
export function Track({ token }: { token: string }) {
  const { t } = useI18n();
  // Wrapped so 'not loaded yet' (null) differs from 'link expired' ({ v: null }).
  const [res, error] = usePoll(() => rpc<Shared | null>('shared_trip', { p_token: token }).then((v) => ({ v })), 5000);
  const trip = res?.v;
  const d = trip?.driver;
  return (
    <div className="track">
      <div className="row-between">
        <h2>{t('a.track.title')}</h2>
        <LangToggle />
      </div>
      {error ? <p className="warn">{error}</p> : null}
      {!res ? null : !trip ? (
        <p className="warn">{t('a.track.expired')}</p>
      ) : (
        <>
          <div className="card">
            <p className="badge">{t(`trip.status.${trip.status}`)}</p>
            <h3>
              {trip.pickup} → {trip.dropoff}
            </h3>
            <p className="muted">
              {t(`category.${trip.category}`)} · {trip.vehicleNumber ?? ''} {d?.name ? `· ${d.name}` : ''}
            </p>
          </div>
          {d?.lat != null && d.lon != null ? (
            <LiveMap pins={[{ lat: d.lat, lon: d.lon, kind: 'busy', label: trip.vehicleNumber ?? '' }]} fit height={420} />
          ) : null}
        </>
      )}
    </div>
  );
}
