import { Clock, Countdown } from '@/components/ui/Countdown';
import { SectionCard, StatusPill } from '@/components/ui';
import { requireModule } from '@/lib/auth';
import { db } from '@/lib/db';
import { nextPrayer, pad2, prayerTimes } from '@/lib/prayer';

import { ChecklistForm } from './ChecklistForm';
import { ClockInForm } from './ClockInForm';
import { resetShiftAction, submitSelfieAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function CleanerShiftPage() {
  const { session } = await requireModule('jk', ['cleaner']);
  const t = session.tenantId;
  const client = db();
  const today = new Date().toISOString().slice(0, 10);

  const [times, shiftRes, templateRes] = await Promise.all([
    prayerTimes(t),
    client
      .from('shifts')
      .select('id, site_id, clock_in_at, selfie_status, checklist_state, status, starts_at')
      .eq('tenant_id', t)
      .eq('user_id', session.userId)
      .eq('shift_date', today)
      .maybeSingle(),
    client
      .from('checklist_templates')
      .select('id, name')
      .eq('tenant_id', t)
      .eq('module', 'jk')
      .order('sort_order')
      .limit(1)
      .maybeSingle(),
  ]);

  const shift = shiftRes.data;
  const site = shift?.site_id
    ? (await client.from('sites').select('name, suburb, geofence_m').eq('id', shift.site_id).maybeSingle()).data
    : (await client.from('sites').select('name, suburb, geofence_m').eq('tenant_id', t).order('name').limit(1).maybeSingle()).data;

  const items = templateRes.data
    ? (
        await client
          .from('checklist_items')
          .select('id, label')
          .eq('tenant_id', t)
          .eq('template_id', templateRes.data.id as string)
          .order('sort_order')
      ).data ?? []
    : [];

  const next = nextPrayer(times);

  // Where in the flow is this cleaner right now?
  const step = !shift?.clock_in_at
    ? 0
    : shift.selfie_status !== 'approved'
      ? 1
      : shift.checklist_state === 'Not submitted'
        ? 2
        : 3;

  const stepState = (i: number) => (step > i ? 'done' : step === i ? 'current' : 'todo');

  return (
    <div className="page">
      <div className="mobile">
        <div className="mobile__hero">
          <div className="row">
            <div>
              <div style={{ fontSize: 11.5, opacity: 0.7, letterSpacing: '.6px', textTransform: 'uppercase' }}>
                {site?.name ?? 'Your site'} · {site?.suburb ?? ''}
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.8px', marginTop: 4 }}>
                <Clock />
              </div>
            </div>
            <div className="spacer" />
            {next ? (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11.5, opacity: 0.7 }}>
                  {next.prayer.name} · {pad2(next.prayer.hour)}:{pad2(next.prayer.minute)}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>
                  <Countdown targetEpochMs={next.targetEpochMs} offsetSeconds={900} />
                </div>
                <div style={{ fontSize: 10.5, opacity: 0.6 }}>until the T−15 deadline</div>
              </div>
            ) : null}
          </div>

          <div className="mobile__steps" style={{ marginTop: 18 }}>
            <span className="mobile__step" data-state={stepState(0)}>
              Clock in
            </span>
            <span className="mobile__step" data-state={stepState(1)}>
              Selfie
            </span>
            <span className="mobile__step" data-state={stepState(2)}>
              Checklist
            </span>
          </div>
        </div>

        {step === 0 ? (
          <SectionCard title="Clock in" subtitle={`Shift starts ${shift?.starts_at ?? '04:30'}`}>
            <ClockInForm siteName={site?.name ?? 'your site'} geofenceM={(site?.geofence_m as number) ?? 120} />
          </SectionCard>
        ) : null}

        {step === 1 ? (
          <SectionCard title="Uniform selfie" subtitle="Full uniform must be visible">
            <form action={submitSelfieAction} className="stack">
              <div
                style={{
                  height: 160,
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
                📷 Tap to take your selfie
              </div>
              <button type="submit" className="btn">
                Submit selfie
              </button>
              <p className="muted" style={{ margin: 0 }}>
                A rejected selfie adds a uniform warning to today&apos;s shift report.
              </p>
            </form>
          </SectionCard>
        ) : null}

        {step === 2 && templateRes.data ? (
          <SectionCard title={templateRes.data.name as string} subtitle={`For ${next?.prayer.name ?? 'the next prayer'}`}>
            <ChecklistForm
              items={items.map((i) => ({ id: i.id as string, label: i.label as string }))}
              templateId={templateRes.data.id as string}
              prayer={next?.prayer.name ?? ''}
            />
          </SectionCard>
        ) : null}

        {step === 3 ? (
          <SectionCard>
            <div className="banner banner--ok" style={{ marginBottom: 14 }}>
              ✓ Shift complete — {shift?.checklist_state}
            </div>
            <div className="stack">
              <div className="row">
                <span className="muted">Clocked in</span>
                <div className="spacer" />
                <span className="num strong">{shift?.clock_in_at}</span>
              </div>
              <div className="row">
                <span className="muted">Uniform selfie</span>
                <div className="spacer" />
                <StatusPill tone="ok">Approved</StatusPill>
              </div>
              <div className="row">
                <span className="muted">Checklist</span>
                <div className="spacer" />
                <StatusPill tone="ok">{shift?.checklist_state}</StatusPill>
              </div>
            </div>
            <form action={resetShiftAction} style={{ marginTop: 16 }}>
              <button type="submit" className="btn btn--ghost">
                Start the next prayer round
              </button>
            </form>
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
}
