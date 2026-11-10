import { CATEGORIES, getCategory } from '@thozhan/shared';
import { calculateFare, getActiveRule, type FareBreakdown, type Terrain } from '@thozhan/tariff';
import { useState } from 'react';
import { downloadCsv, rpc, supabase, usePoll, useI18n, type Trip } from './lib.tsx';
import { LiveMap, type Pin } from './LiveMap.tsx';

// ---------------------------------------------------------------- shared bits

function Counter({ label, value, tone }: { label: string; value: string | number; tone?: 'warn' | 'danger' }) {
  return (
    <div className={`card counter ${tone ?? ''}`}>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function Err({ text }: { text: string | null }) {
  return text ? <p className="warn">{text}</p> : null;
}

const when = (iso: string, locale: string) =>
  new Date(iso).toLocaleString(locale === 'ta' ? 'ta-IN' : 'en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

/** Runs an admin action, shows its error with alert(), and reloads on success. */
function useAction(reload: () => void) {
  const { err } = useI18n();
  const [busy, setBusy] = useState(false);
  return [
    busy,
    async (fn: () => Promise<unknown>) => {
      setBusy(true);
      try {
        await fn();
        reload();
      } catch (e) {
        alert(err(e));
      } finally {
        setBusy(false);
      }
    },
  ] as const;
}

function TripTable({ trips }: { trips: Trip[] }) {
  const { t, money, locale } = useI18n();
  if (!trips.length) return <p className="muted">{t('a.none')}</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {['code', 'service', 'route', 'status', 'driver', 'rider', 'fare', 'flags', 'when'].map((c) => (
              <th key={c}>{t(`a.col.${c}`)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trips.map((trip) => (
            <tr key={trip.id}>
              <td className="mono">{trip.code}</td>
              <td>{t(`category.${trip.category}`)}</td>
              <td>{trip.pickup ? `${trip.pickup.name} → ${trip.dropoff?.name ?? '—'}` : '—'}</td>
              <td>
                <span className={`badge s-${trip.status}`}>{t(`trip.status.${trip.status}`)}</span>
              </td>
              <td>{trip.driver ? `${trip.driver.name} · ${trip.driver.vehicleNumber}` : (trip.vehicleNumber ?? '—')}</td>
              <td>{trip.rider ? `${trip.rider.name || '—'} ${trip.rider.phone ?? ''}` : '—'}</td>
              <td>{trip.totalPaise != null ? money(trip.totalPaise) : trip.quote ? `~${money(trip.quote.totalPaise)}` : '—'}</td>
              <td>
                {trip.fareFlags.map((f) => (
                  <span key={f} className="badge danger">
                    {t(`meter.flag.${f}`)}
                  </span>
                ))}
              </td>
              <td className="nowrap">{when(trip.createdAt, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------- overview

interface Overview {
  counts: Record<string, number>;
  openTrips: Trip[];
  drivers: { id: string; name: string; vehicleNumber: string; lat: number | null; lon: number | null; busy: boolean }[];
}

export function Overview() {
  const { t, money } = useI18n();
  const [data, error] = usePoll(() => rpc<Overview>('admin_overview'), 5000);
  const [sos] = usePoll(() => rpc<Incident[]>('admin_incidents', { p_status: 'open' }), 5000);
  if (!data) return <Err text={error} />;
  const c = data.counts;
  const pins: Pin[] = [
    ...data.drivers
      .filter((d) => d.lat != null && d.lon != null)
      .map((d) => ({ lat: d.lat!, lon: d.lon!, kind: d.busy ? 'busy' : 'driver', label: `${d.name} · ${d.vehicleNumber}` }) as Pin),
    ...data.openTrips
      .filter((x) => x.status === 'REQUESTED' && x.pickup)
      .map((x) => ({ lat: x.pickup!.lat, lon: x.pickup!.lon, kind: 'pickup', label: `${x.code} · ${x.pickup!.name}` }) as Pin),
    ...(sos ?? [])
      .filter((i) => i.kind === 'sos' && i.lat != null)
      .map((i) => ({ lat: i.lat!, lon: i.lon!, kind: 'sos', label: `SOS · ${i.reporter.name ?? ''}` }) as Pin),
  ];
  return (
    <>
      <h1>{t('a.nav.overview')}</h1>
      <Err text={error} />
      {c.sosOpen ? (
        <a className="sos-banner" href="#incidents">
          🚨 {t('a.sosBanner', { n: c.sosOpen })}
        </a>
      ) : null}
      <div className="counters">
        <Counter label={t('a.count.driversOnline')} value={c.driversOnline ?? 0} />
        <Counter label={t('a.count.tripsOpen')} value={c.tripsOpen ?? 0} />
        <Counter label={t('a.count.tripsToday')} value={c.tripsToday ?? 0} />
        <Counter label={t('a.count.completedToday')} value={c.completedToday ?? 0} />
        <Counter label={t('a.count.driversPending')} value={c.driversPending ?? 0} tone={c.driversPending ? 'warn' : undefined} />
        <Counter label={t('a.count.incidentsOpen')} value={c.incidentsOpen ?? 0} tone={c.incidentsOpen ? 'danger' : undefined} />
        <Counter label={t('a.count.feesOutstanding')} value={money(c.feesOutstandingPaise ?? 0)} />
      </div>
      <h2>{t('a.liveMap')}</h2>
      <LiveMap pins={pins} />
      <h2>{t('a.openTrips')}</h2>
      <TripTable trips={data.openTrips} />
    </>
  );
}

// ---------------------------------------------------------------- drivers

interface Driver {
  id: string;
  name: string | null;
  phone: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  vehicle: string;
  vehicleNumber: string;
  licenceNumber: string;
  documents: Record<string, string>;
  reviewNote: string | null;
  online: boolean;
  trips: number;
  /** Null for reviewers, who do not see fees. */
  balancePaise: number | null;
}

async function openDocument(path: string) {
  const { data, error } = await supabase.storage.from('driver-documents').createSignedUrl(path, 300);
  if (error || !data) return alert(error?.message ?? 'error');
  open(data.signedUrl, '_blank', 'noopener');
}

export function Drivers() {
  const { t, money } = useI18n();
  const [filter, setFilter] = useState<'pending' | null>('pending');
  const [list, error, reload] = usePoll(() => rpc<Driver[]>('admin_drivers', { p_status: filter }), 15000, [filter]);
  const [busy, act] = useAction(reload);

  function review(d: Driver, status: Driver['status']) {
    const note = status === 'approved' ? null : prompt(t('a.drivers.notePrompt'));
    if (status !== 'approved' && !note) return;
    act(() => rpc('admin_review_driver', { p_driver: d.id, p_status: status, p_note: note }));
  }

  return (
    <>
      <h1>{t('a.nav.drivers')}</h1>
      <div className="seg">
        <button className={filter ? 'on' : ''} onClick={() => setFilter('pending')}>
          {t('a.drivers.pending')}
        </button>
        <button className={!filter ? 'on' : ''} onClick={() => setFilter(null)}>
          {t('a.drivers.all')}
        </button>
      </div>
      <p className="muted small">{t('a.drivers.checklist')}</p>
      <Err text={error} />
      {list && !list.length ? <p className="muted">{t('a.none')}</p> : null}
      <div className="cards">
        {list?.map((d) => (
          <div key={d.id} className="card">
            <div className="row-between">
              <h3>{d.name || d.phone}</h3>
              <span className={`badge d-${d.status}`}>{t(`m.reg.status.${d.status}`)}</span>
            </div>
            <p className="mono">
              {t(`category.${d.vehicle}`)} · {d.vehicleNumber} · {d.licenceNumber} · {d.phone}
            </p>
            <p className="muted small">
              {t('a.drivers.trips', { n: d.trips })}
              {d.balancePaise != null ? ` · ${t('a.fees.balance')} ${money(d.balancePaise)}` : ''}
              {d.online ? ' · 🟢' : ''}
            </p>
            {d.reviewNote ? <p className="small">“{d.reviewNote}”</p> : null}
            <div className="docs">
              <small>{t('a.drivers.docs')}:</small>
              {['licence', 'rc', 'permit', 'insurance'].map((k) =>
                d.documents?.[k] ? (
                  <button key={k} className="link" onClick={() => openDocument(d.documents[k]!)}>
                    {t(`m.reg.doc.${k}`)} ↗
                  </button>
                ) : (
                  <span key={k} className="badge danger">
                    {t(`m.reg.doc.${k}`)} ✕
                  </span>
                ),
              )}
            </div>
            <div className="actions">
              {d.status !== 'approved' ? (
                <button disabled={busy} onClick={() => review(d, 'approved')}>
                  {t(d.status === 'suspended' ? 'a.drivers.reinstate' : 'a.drivers.approve')}
                </button>
              ) : null}
              {d.status === 'pending' ? (
                <button disabled={busy} className="secondary" onClick={() => review(d, 'rejected')}>
                  {t('a.drivers.reject')}
                </button>
              ) : null}
              {d.status === 'approved' ? (
                <button disabled={busy} className="danger" onClick={() => review(d, 'suspended')}>
                  {t('a.drivers.suspend')}
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- trips

export function Trips() {
  const { t, locale } = useI18n();
  const [flow, setFlow] = useState<string | null>(null);
  const [trips, error] = usePoll(() => rpc<Trip[]>('admin_trips', { p_limit: 300, p_flow: flow }), 10000, [flow]);

  function exportCsv() {
    if (!trips) return;
    downloadCsv(`thozhan-trips-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['code', 'flow', 'category', 'status', 'pickup', 'dropoff', 'driver', 'vehicle', 'rider_phone', 'distance_m', 'fare_rupees', 'flags', 'created_at'],
      ...trips.map((x) => [
        x.code,
        x.flow,
        x.category,
        x.status,
        x.pickup?.name ?? '',
        x.dropoff?.name ?? '',
        x.driver?.name ?? '',
        x.driver?.vehicleNumber ?? x.vehicleNumber ?? '',
        x.rider?.phone ?? '',
        x.distanceMeters,
        x.totalPaise != null ? (x.totalPaise / 100).toFixed(2) : '',
        x.fareFlags.join(' '),
        when(x.createdAt, locale),
      ]),
    ]);
  }

  return (
    <>
      <div className="row-between">
        <h1>{t('a.nav.trips')}</h1>
        <button className="secondary" onClick={exportCsv} disabled={!trips?.length}>
          {t('a.trips.export')}
        </button>
      </div>
      <div className="seg">
        {[null, 'ride', 'delivery', 'meter'].map((f) => (
          <button key={f ?? 'all'} className={f === flow ? 'on' : ''} onClick={() => setFlow(f)}>
            {f ? t(`a.flow.${f}`) : t('a.trips.all')}
          </button>
        ))}
      </div>
      <Err text={error} />
      {trips ? <TripTable trips={trips} /> : null}
    </>
  );
}

// ---------------------------------------------------------------- incidents

interface Incident {
  id: string;
  kind: 'sos' | 'overcharge' | 'complaint';
  status: 'open' | 'resolved';
  message: string | null;
  askedPaise: number | null;
  lat: number | null;
  lon: number | null;
  createdAt: string;
  resolution: string | null;
  reporter: { name: string | null; phone: string };
  trip: Trip | null;
}

export function Incidents() {
  const { t, money, locale } = useI18n();
  const [status, setStatus] = useState<'open' | 'resolved'>('open');
  const [list, error, reload] = usePoll(() => rpc<Incident[]>('admin_incidents', { p_status: status }), 5000, [status]);
  const [busy, act] = useAction(reload);

  function resolve(i: Incident) {
    const note = prompt(t('a.inc.resolvePrompt'));
    if (note) act(() => rpc('admin_resolve_incident', { p_incident: i.id, p_resolution: note }));
  }

  return (
    <>
      <h1>{t('a.nav.incidents')}</h1>
      <div className="seg">
        {(['open', 'resolved'] as const).map((s) => (
          <button key={s} className={s === status ? 'on' : ''} onClick={() => setStatus(s)}>
            {t(`a.inc.${s}`)}
          </button>
        ))}
      </div>
      <Err text={error} />
      {list && !list.length ? <p className="muted">{t('a.none')}</p> : null}
      <div className="cards">
        {list?.map((i) => (
          <div key={i.id} className={`card ${i.kind === 'sos' && i.status === 'open' ? 'sos' : ''}`}>
            <div className="row-between">
              <span className={`badge ${i.kind === 'sos' ? 'danger' : 'warn'}`}>{t(`a.inc.kind.${i.kind}`)}</span>
              <small className="muted">{when(i.createdAt, locale)}</small>
            </div>
            <p>
              <strong>{i.reporter.name || '—'}</strong> <span className="mono">{i.reporter.phone}</span>
            </p>
            {i.trip ? (
              <p className="small">
                <span className="mono">{i.trip.code}</span> · {t(`category.${i.trip.category}`)} ·{' '}
                {i.trip.driver ? `${i.trip.driver.name} ${i.trip.driver.vehicleNumber}` : (i.trip.vehicleNumber ?? '')}
              </p>
            ) : null}
            {i.kind === 'overcharge' && i.askedPaise != null ? (
              <p className="warn">{t('a.inc.asked', { asked: money(i.askedPaise), fare: i.trip?.totalPaise != null ? money(i.trip.totalPaise) : '—' })}</p>
            ) : null}
            {i.message ? <p>“{i.message}”</p> : null}
            {i.lat != null && i.lon != null ? (
              <a
                className="small"
                href={`https://www.openstreetmap.org/?mlat=${i.lat}&mlon=${i.lon}#map=17/${i.lat}/${i.lon}`}
                target="_blank"
                rel="noreferrer"
              >
                {t('a.inc.location')} ↗
              </a>
            ) : null}
            {i.resolution ? <p className="muted small">✓ {i.resolution}</p> : null}
            {i.status === 'open' ? (
              <div className="actions">
                <button disabled={busy} onClick={() => resolve(i)}>
                  {t('a.inc.resolve')}
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- fees

type FeeDriver = Driver & { balancePaise: number };

export function Fees() {
  const { t, money } = useI18n();
  const [list, error, reload] = usePoll(() => rpc<FeeDriver[]>('admin_drivers', { p_status: null }), 15000);
  const [busy, act] = useAction(reload);
  const owing = (list ?? []).filter((d) => d.balancePaise > 0).sort((a, b) => b.balancePaise - a.balancePaise);

  function record(d: FeeDriver) {
    const rupees = Number(prompt(t('a.fees.amountPrompt'), String(d.balancePaise / 100)));
    if (!(rupees > 0)) return;
    const ref = prompt(t('a.fees.refPrompt'));
    if (ref) act(() => rpc('admin_record_payment', { p_driver: d.id, p_amount_paise: Math.round(rupees * 100), p_ref: ref }));
  }

  return (
    <>
      <h1>{t('a.nav.fees')}</h1>
      <Err text={error} />
      {list && !owing.length ? <p className="muted">{t('a.none')}</p> : null}
      {owing.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('a.col.driver')}</th>
                <th>{t('a.fees.balance')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {owing.map((d) => (
                <tr key={d.id}>
                  <td>
                    {d.name || '—'} <span className="mono">{d.vehicleNumber}</span> <span className="muted">{d.phone}</span>
                  </td>
                  <td>
                    <strong>{money(d.balancePaise)}</strong>
                  </td>
                  <td>
                    <button className="secondary" disabled={busy} onClick={() => record(d)}>
                      {t('a.fees.record')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------- services

export function Services() {
  const { t } = useI18n();
  const [flags, error, reload] = usePoll(() => rpc<Record<string, boolean>>('service_flags'), 30000);
  const [busy, act] = useAction(reload);
  return (
    <>
      <h1>{t('a.nav.services')}</h1>
      <p className="muted">{t('a.svc.note')}</p>
      <Err text={error} />
      <div className="cards">
        {CATEGORIES.map((c) => (
          <label key={c.id} className="card toggle">
            <span>
              <strong>{t(`category.${c.id}`)}</strong>
              <small className="muted">{t(`ui.legal.${c.legalStatus}`)}</small>
            </span>
            <input
              type="checkbox"
              disabled={busy || !flags}
              checked={!!flags?.[c.id]}
              onChange={(e) => act(() => rpc('admin_set_flag', { p_category: c.id, p_enabled: e.target.checked }))}
            />
          </label>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- compliance

interface Report {
  byCategory: {
    category: string;
    flow: string;
    trips: number;
    completed: number;
    cancelled: number;
    noDriver: number;
    avgFarePaise: number | null;
    avgMeters: number | null;
  }[];
  overcharge: { reports: number; avgAskedAbovePct: number | null };
  sos: number;
  complaints: number;
  meterFlags: Record<string, number>;
  daily: { day: string; trips: number; meterTrips: number }[];
  drivers: { approved: number; pending: number };
}

export function Compliance() {
  const { t, money, km } = useI18n();
  const [days, setDays] = useState(30);
  const [r, error] = usePoll(() => rpc<Report>('compliance_report', { p_days: days }), 60000, [days]);
  const max = Math.max(1, ...(r?.daily.map((d) => d.trips) ?? []));
  return (
    <>
      <h1>{t('a.nav.compliance')}</h1>
      <p className="muted">{t('a.comp.note')}</p>
      <div className="seg">
        {[7, 30, 90].map((n) => (
          <button key={n} className={n === days ? 'on' : ''} onClick={() => setDays(n)}>
            {t('a.comp.days', { n })}
          </button>
        ))}
      </div>
      <Err text={error} />
      {r ? (
        <>
          <div className="counters">
            <Counter label={t('a.comp.trips')} value={r.byCategory.reduce((s, c) => s + c.trips, 0)} />
            <Counter label={t('a.comp.overcharge')} value={r.overcharge.reports} tone={r.overcharge.reports ? 'warn' : undefined} />
            <Counter label={t('a.comp.avgAbove')} value={r.overcharge.avgAskedAbovePct != null ? `${r.overcharge.avgAskedAbovePct}%` : '—'} />
            <Counter label={t('a.comp.sos')} value={r.sos} tone={r.sos ? 'danger' : undefined} />
            <Counter label={t('a.comp.complaints')} value={r.complaints} />
          </div>
          <p className="muted">{t('a.comp.drivers', r.drivers)}</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('a.col.service')}</th>
                  <th>{t('a.comp.trips')}</th>
                  <th>{t('a.comp.completed')}</th>
                  <th>{t('a.comp.cancelled')}</th>
                  <th>{t('a.comp.noDriver')}</th>
                  <th>{t('a.comp.avgFare')}</th>
                  <th>{t('a.comp.avgKm')}</th>
                </tr>
              </thead>
              <tbody>
                {r.byCategory.map((c) => (
                  <tr key={c.category + c.flow}>
                    <td>
                      {t(`category.${c.category}`)} <span className="muted small">{t(`a.flow.${c.flow}`)}</span>
                    </td>
                    <td>{c.trips}</td>
                    <td>{c.completed}</td>
                    <td>{c.cancelled}</td>
                    <td>{c.noDriver}</td>
                    <td>{c.avgFarePaise != null ? money(c.avgFarePaise) : '—'}</td>
                    <td>{c.avgMeters != null ? `${km(c.avgMeters)} ${t('ui.unit.km')}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {Object.keys(r.meterFlags).length ? (
            <>
              <h2>{t('a.comp.meterFlags')}</h2>
              <p>
                {Object.entries(r.meterFlags).map(([f, n]) => (
                  <span key={f} className="badge warn">
                    {t(`meter.flag.${f}`)}: {n}
                  </span>
                ))}
              </p>
            </>
          ) : null}
          <h2>{t('a.comp.daily')}</h2>
          <div className="bars" role="img" aria-label={t('a.comp.daily')}>
            {r.daily.map((d) => (
              <div key={d.day} title={`${d.day}: ${d.trips}`}>
                <span style={{ height: `${(100 * d.trips) / max}%` }} />
                <small>{d.day.slice(5)}</small>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------- audit log

interface AuditEntry {
  id: number;
  at: string;
  action: string;
  target: string | null;
  targetName: string | null;
  detail: Record<string, unknown> | null;
  actor: { id: string; name: string | null; phone: string | null } | null;
}

interface AuditLog {
  actions: string[];
  total: number;
  entries: AuditEntry[];
}

const AUDIT_PAGE_SIZE = 500;
const AUDIT_EXPORT_LIMIT = 10000;

export function Audit() {
  const { t, money, locale, err } = useI18n();
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [exporting, setExporting] = useState(false);
  const filters = { p_action: action || null, p_from: from || null, p_to: to || null };
  const [log, error] = usePoll(() => rpc<AuditLog>('admin_audit_log', { ...filters, p_limit: AUDIT_PAGE_SIZE }), 30000, [action, from, to]);

  const actionName = (code: string) => {
    const key = `a.audit.action.${code}`;
    const name = t(key);
    return name === key ? code : name;
  };
  const roleName = (role: unknown) => t(`a.staff.role.${role ?? 'none'}`);
  const who = (r: AuditEntry) => (r.actor ? r.actor.name || r.actor.phone || r.actor.id : t('a.audit.system'));
  const target = (r: AuditEntry) => r.targetName ?? (r.action.startsWith('flag.') ? t(`category.${r.target}`) : r.target) ?? '—';
  function detail(r: AuditEntry) {
    const d = r.detail ?? {};
    if (r.action === 'staff.role') return `${roleName(d.from)} → ${roleName(d.to)}`;
    if (r.action === 'flag.set') return t(d.enabled ? 'a.audit.on' : 'a.audit.off');
    if (r.action === 'ledger.payment') return `${money(Number(d.amount))} · ${d.ref}`;
    if (r.action === 'payment.amount_mismatch') return money(Number(d.paid));
    return Object.values(d)
      .filter((v) => v != null)
      .join(' · ');
  }

  // The export covers everything the filters match, not only the rows on screen.
  async function exportCsv() {
    setExporting(true);
    try {
      const all = await rpc<AuditLog>('admin_audit_log', { ...filters, p_limit: AUDIT_EXPORT_LIMIT });
      downloadCsv(`thozhan-audit-${new Date().toISOString().slice(0, 10)}.csv`, [
        ['at', 'actor_id', 'actor_name', 'actor_phone', 'action', 'target', 'target_name', 'detail'],
        ...all.entries.map((r) => [
          r.at,
          r.actor?.id ?? '',
          r.actor?.name ?? '',
          r.actor?.phone ?? '',
          r.action,
          r.target,
          r.targetName,
          r.detail ? JSON.stringify(r.detail) : '',
        ]),
      ]);
    } catch (e) {
      alert(err(e));
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <div className="row-between">
        <h1>{t('a.nav.audit')}</h1>
        <button className="secondary" onClick={exportCsv} disabled={exporting || !log?.total}>
          {t('a.trips.export')}
        </button>
      </div>
      <p className="muted">{t('a.audit.note')}</p>
      <div className="filters">
        <label>
          {t('a.audit.filterAction')}
          <select value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">{t('a.audit.allActions')}</option>
            {log?.actions.map((a) => (
              <option key={a} value={a}>
                {actionName(a)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('a.audit.from')}
          <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          {t('a.audit.to')}
          <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </label>
        {action || from || to ? (
          <button className="ghost" onClick={() => (setAction(''), setFrom(''), setTo(''))}>
            {t('a.audit.clear')}
          </button>
        ) : null}
      </div>
      <Err text={error} />
      {log && !log.entries.length ? <p className="muted">{t('a.none')}</p> : null}
      {log?.entries.length ? (
        <>
          <p className="muted small">{t('a.audit.count', { shown: log.entries.length, total: log.total })}</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('a.col.when')}</th>
                  <th>{t('a.audit.col.who')}</th>
                  <th>{t('a.audit.col.action')}</th>
                  <th>{t('a.audit.col.target')}</th>
                  <th>{t('a.audit.col.detail')}</th>
                </tr>
              </thead>
              <tbody>
                {log.entries.map((r) => (
                  <tr key={r.id}>
                    <td className="nowrap">{when(r.at, locale)}</td>
                    <td>
                      {who(r)} {r.actor?.name && r.actor.phone ? <span className="muted mono">{r.actor.phone}</span> : null}
                    </td>
                    <td>
                      <span className="badge">{actionName(r.action)}</span>
                    </td>
                    <td>{target(r)}</td>
                    <td>{detail(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------- staff roles

export type StaffRole = 'admin' | 'support' | 'reviewer' | 'gov';
const STAFF_ROLES: StaffRole[] = ['admin', 'support', 'reviewer', 'gov'];

interface StaffMember {
  id: string;
  name: string | null;
  phone: string;
  role: StaffRole;
  self: boolean;
}

export function Staff() {
  const { t } = useI18n();
  const [staff, error, reload] = usePoll(() => rpc<StaffMember[]>('admin_staff'), 30000);
  const [busy, act] = useAction(reload);
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<StaffRole>('support');
  const roleName = (r: StaffRole) => t(`a.staff.role.${r}`);

  function assign(e: React.FormEvent) {
    e.preventDefault();
    act(async () => {
      const person = await rpc<{ id: string; name: string | null; phone: string }>('admin_find_person', { p_phone: phone });
      if (!confirm(t('a.staff.confirmAssign', { name: person.name || '—', phone: person.phone, role: roleName(role) }))) return;
      await rpc('admin_set_staff_role', { p_user: person.id, p_role: role });
      setPhone('');
    });
  }
  function change(m: StaffMember, next: StaffRole) {
    if (next !== m.role && confirm(t('a.staff.confirmChange', { name: m.name || m.phone, role: roleName(next) }))) {
      act(() => rpc('admin_set_staff_role', { p_user: m.id, p_role: next }));
    }
  }
  function remove(m: StaffMember) {
    if (confirm(t('a.staff.confirmRemove', { name: m.name || m.phone }))) {
      act(() => rpc('admin_set_staff_role', { p_user: m.id, p_role: null }));
    }
  }

  return (
    <>
      <h1>{t('a.nav.staff')}</h1>
      <p className="muted">{t('a.staff.note')}</p>
      <form className="filters" onSubmit={assign}>
        <label>
          {t('a.staff.phone')}
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="90000 00001" required />
        </label>
        <label>
          {t('a.staff.role')}
          <select value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {roleName(r)}
              </option>
            ))}
          </select>
        </label>
        <button disabled={busy}>{t('a.staff.assign')}</button>
      </form>
      <p className="muted small">{t('a.staff.signInFirst')}</p>
      <Err text={error} />
      {staff ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('a.staff.name')}</th>
                <th>{t('a.staff.phone')}</th>
                <th>{t('a.staff.role')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {staff.map((m) => (
                <tr key={m.id}>
                  <td>
                    {m.name || '—'} {m.self ? <span className="badge">{t('a.staff.you')}</span> : null}
                  </td>
                  <td className="mono">{m.phone}</td>
                  <td>
                    <select aria-label={t('a.staff.role')} value={m.role} disabled={busy || m.self} onChange={(e) => change(m, e.target.value as StaffRole)}>
                      {STAFF_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {roleName(r)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {m.self ? (
                      <small className="muted">{t('a.staff.ownAdmin')}</small>
                    ) : (
                      <button className="ghost" disabled={busy} onClick={() => remove(m)}>
                        {t('a.staff.remove')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------- fare check

export function FareCheck() {
  const { t, money, km } = useI18n();
  const [v, setV] = useState({ category: 'auto', km: '5', waiting: '0', ride: '15', start: '', terrain: 'plain' as Terrain, weight: '2' });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });

  let fare: FareBreakdown | null = null;
  let problem: string | null = null;
  try {
    const startedAt = v.start ? Date.parse(v.start + ':00+05:30') : Date.now();
    const rule = getActiveRule(v.category, new Date(startedAt));
    fare = calculateFare(rule, {
      distanceMeters: Math.round(Number(v.km) * 1000),
      waitingSeconds: Math.round(Number(v.waiting) * 60),
      rideSeconds: Math.round(Number(v.ride) * 60),
      startedAt,
      terrain: rule.ghat ? v.terrain : 'plain',
      weightGrams: getCategory(v.category).service === 'parcel' ? Math.round(Number(v.weight) * 1000) : undefined,
    });
  } catch (e) {
    problem = (e as Error).message;
  }

  return (
    <>
      <h1>{t('ui.verify.title')}</h1>
      <p className="muted">{t('ui.verify.sub')}</p>
      <div className="split">
        <div className="card form">
          <label>
            {t('ui.verify.category')}
            <select value={v.category} onChange={set('category')}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {t(`category.${c.id}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('ui.verify.distance')}
            <input type="number" min="0" step="0.1" value={v.km} onChange={set('km')} />
          </label>
          <label>
            {t('ui.verify.waiting')}
            <input type="number" min="0" value={v.waiting} onChange={set('waiting')} />
          </label>
          <label>
            {t('ui.verify.ride')}
            <input type="number" min="0" value={v.ride} onChange={set('ride')} />
          </label>
          <label>
            {t('ui.verify.start')}
            <input type="datetime-local" value={v.start} onChange={set('start')} />
          </label>
          <label>
            {t('ui.meter.terrain')}
            <select value={v.terrain} onChange={set('terrain')}>
              <option value="plain">{t('ui.meter.plain')}</option>
              <option value="ghat">{t('ui.meter.ghat')}</option>
            </select>
          </label>
          {getCategory(v.category).service === 'parcel' ? (
            <label>
              {t('ui.parcel.weightKg')}
              <input type="number" min="0" step="0.5" value={v.weight} onChange={set('weight')} />
            </label>
          ) : null}
        </div>
        <div className="card">
          {problem ? <p className="warn">{problem}</p> : null}
          {fare ? (
            <>
              <span className={`badge ${fare.status === 'OFFICIAL' ? 'ok' : 'warn'}`}>{t(`tariff.status.${fare.status}`)}</span>
              {fare.night ? <span className="badge warn">{t('ui.meter.night')}</span> : null}
              <table className="lines">
                <tbody>
                  {fare.lines.map((line, i) => (
                    <tr key={i}>
                      <td>{t(`fare.line.${line.code}`, { km: km(line.detail?.meters ?? 0, 2), minutes: line.detail?.minutes ?? 0 })}</td>
                      <td>{money(line.amountPaise)}</td>
                    </tr>
                  ))}
                  <tr className="total">
                    <td>{t('fare.total')}</td>
                    <td>{money(fare.totalPaise)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="muted small">
                {fare.ruleId} · v{fare.ruleVersion}
                {fare.legalReference ? ` · ${fare.legalReference}` : ''}
              </p>
              <p className="muted small">{t('ui.verify.note')}</p>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
