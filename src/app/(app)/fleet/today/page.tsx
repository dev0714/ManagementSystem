import Link from 'next/link';

import { Clock } from '@/components/ui/Countdown';
import { SectionCard, StatusPill } from '@/components/ui';
import { requireModule } from '@/lib/auth';
import { db } from '@/lib/db';
import { hhmm, zar } from '@/lib/format';

import { logEndAction, logIncidentAction, logStartAction } from './actions';

export const dynamic = 'force-dynamic';

const VIEWS = ['start', 'end', 'tasks'] as const;
type View = (typeof VIEWS)[number];

export default async function DriverTodayPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { session } = await requireModule('fleet', ['driver']);
  const sp = await searchParams;
  const view: View = VIEWS.includes(sp.view as View) ? (sp.view as View) : 'start';

  const t = session.tenantId;
  const client = db();

  const { data: vehicle } = await client
    .from('vehicles')
    .select('id, plate, model, odometer_label, service_label, disc_expiry, wash, status')
    .eq('tenant_id', t)
    .eq('driver_id', session.userId)
    .maybeSingle();

  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const { data: logs } = vehicle
    ? await client
        .from('driver_logs')
        .select('id, kind, odometer, slips, logged_at')
        .eq('tenant_id', t)
        .eq('user_id', session.userId)
        .gte('logged_at', since.toISOString())
        .order('logged_at', { ascending: false })
    : { data: [] };

  const todayLogs = logs ?? [];
  const startLog = todayLogs.find((l) => l.kind === 'start');
  const endLog = todayLogs.find((l) => l.kind === 'end');

  const lastOdo = Number(String(vehicle?.odometer_label ?? '0').replace(/[^0-9]/g, '')) || 0;

  const tasks = [
    { icon: '🧼', title: 'Weekly car wash', detail: 'Wash and upload the receipt before end of shift.', due: 'Fri 08:00', tone: 'warn' as const },
    { icon: '📋', title: 'Monthly inspection form', detail: `14-point digital inspection for ${vehicle?.plate ?? 'your vehicle'}.`, due: 'Last working day', tone: 'info' as const },
    { icon: '🔧', title: 'Book service', detail: `Service due in ${vehicle?.service_label ?? '—'}.`, due: '30 days', tone: 'warn' as const },
    { icon: '🪪', title: 'Licence disc', detail: `Valid until ${vehicle?.disc_expiry ?? '—'}.`, due: 'Valid', tone: 'ok' as const },
  ];

  return (
    <div className="page">
      <div className="mobile">
        <div className="mobile__hero">
          <div className="row">
            <div>
              <div style={{ fontSize: 11.5, opacity: 0.7, letterSpacing: '.6px', textTransform: 'uppercase' }}>
                {vehicle?.plate ?? 'No vehicle assigned'}
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.8px', marginTop: 4 }}>
                <Clock />
              </div>
              <div style={{ fontSize: 11.5, opacity: 0.7, marginTop: 2 }}>{vehicle?.model ?? ''}</div>
            </div>
            <div className="spacer" />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11.5, opacity: 0.7 }}>Next up</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{startLog ? 'End of day · 17:00' : 'Start of day · 07:00'}</div>
            </div>
          </div>

          <div className="mobile__steps" style={{ marginTop: 18 }}>
            <Link
              href="/fleet/today?view=start"
              className="mobile__step"
              data-state={view === 'start' ? 'current' : startLog ? 'done' : 'todo'}
            >
              Start of day
            </Link>
            <Link
              href="/fleet/today?view=end"
              className="mobile__step"
              data-state={view === 'end' ? 'current' : endLog ? 'done' : 'todo'}
            >
              End of day
            </Link>
            <Link href="/fleet/today?view=tasks" className="mobile__step" data-state={view === 'tasks' ? 'current' : 'todo'}>
              Tasks
            </Link>
          </div>
        </div>

        {!vehicle ? (
          <SectionCard>
            <div className="empty">No vehicle is assigned to you. Speak to your fleet manager.</div>
          </SectionCard>
        ) : null}

        {vehicle && view === 'start' ? (
          startLog ? (
            <SectionCard title="Start of day logged">
              <div className="banner banner--ok" style={{ marginBottom: 14 }}>
                ✓ Opening odometer {Number(startLog.odometer).toLocaleString('en-ZA').replace(/,/g, ' ')} km recorded at{' '}
                {hhmm(startLog.logged_at as string)}
              </div>
              <p className="muted" style={{ margin: 0 }}>Have a safe day on the road.</p>
            </SectionCard>
          ) : (
            <SectionCard title="Start of day" subtitle="Opening odometer with photo proof">
              <form action={logStartAction} className="stack">
                <div>
                  <label className="label" htmlFor="odometer">
                    Opening odometer (km)
                  </label>
                  <input
                    id="odometer"
                    name="odometer"
                    type="number"
                    className="input"
                    defaultValue={lastOdo || undefined}
                    min={lastOdo}
                    required
                  />
                </div>
                <div
                  style={{
                    height: 120,
                    borderRadius: 14,
                    border: '1px dashed var(--control-border)',
                    background: 'var(--subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-meta)',
                    fontSize: 13,
                  }}
                >
                  📷 Odometer photo
                </div>
                <button type="submit" className="btn">
                  Log start of day
                </button>
              </form>
            </SectionCard>
          )
        ) : null}

        {vehicle && view === 'end' ? (
          endLog ? (
            <SectionCard title="End of day submitted">
              <div className="banner banner--ok" style={{ marginBottom: 14 }}>
                ✓ Closing km {Number(endLog.odometer).toLocaleString('en-ZA').replace(/,/g, ' ')} recorded
              </div>
              <div className="stack">
                {((endLog.slips as { label: string; amount: number }[]) ?? []).map((s, i) => (
                  <div className="row" key={i}>
                    <span className="muted">{s.label}</span>
                    <div className="spacer" />
                    <span className="num strong">{zar(s.amount)}</span>
                  </div>
                ))}
              </div>
              <p className="muted" style={{ marginTop: 12 }}>
                Sent to your line manager for the weekly claim summary.
              </p>
            </SectionCard>
          ) : (
            <SectionCard title="End of day" subtitle="Closing odometer and today's slips">
              <form action={logEndAction} className="stack">
                <div>
                  <label className="label" htmlFor="odo-end">
                    Closing odometer (km)
                  </label>
                  <input id="odo-end" name="odometer" type="number" className="input" min={lastOdo} required />
                </div>
                <div className="grid grid--3" style={{ gap: 10 }}>
                  <div>
                    <label className="label" htmlFor="fuel">
                      ⛽ Fuel
                    </label>
                    <input id="fuel" name="fuel" type="number" step="0.01" className="input" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="label" htmlFor="toll">
                      🛣 Toll
                    </label>
                    <input id="toll" name="toll" type="number" step="0.01" className="input" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="label" htmlFor="work">
                      🧾 Work slip
                    </label>
                    <input id="work" name="work" type="number" step="0.01" className="input" placeholder="0.00" />
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="note">
                    Notes
                  </label>
                  <input id="note" name="note" className="input" placeholder="Anything the workshop should know?" />
                </div>
                <button type="submit" className="btn">
                  Submit end of day
                </button>
              </form>
            </SectionCard>
          )
        ) : null}

        {vehicle && view === 'tasks' ? (
          <>
            <SectionCard title="My tasks">
              <div className="stack" style={{ gap: 12 }}>
                {tasks.map((t2) => (
                  <div className="row" key={t2.title} style={{ alignItems: 'flex-start' }}>
                    <span
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 11,
                        background: 'var(--row)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 17,
                        flex: 'none',
                      }}
                      aria-hidden
                    >
                      {t2.icon}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="strong">{t2.title}</div>
                      <div className="feed__detail">{t2.detail}</div>
                    </div>
                    <StatusPill tone={t2.tone}>{t2.due}</StatusPill>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Log an accident" subtitle="Goes to HR, the fleet manager and the insurer">
              <form action={logIncidentAction} className="stack">
                <div>
                  <label className="label" htmlFor="description">
                    What happened?
                  </label>
                  <input id="description" name="description" className="input" placeholder="Rear-end collision on the N2…" required />
                </div>
                <button type="submit" className="btn btn--danger">
                  Log accident
                </button>
              </form>
            </SectionCard>
          </>
        ) : null}
      </div>
    </div>
  );
}
