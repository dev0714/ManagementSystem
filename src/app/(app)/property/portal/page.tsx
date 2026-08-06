import { revalidatePath } from 'next/cache';

import { Dot, SectionCard, StatusPill } from '@/components/ui';
import { requireModule } from '@/lib/auth';
import { db } from '@/lib/db';
import { toneOf, zar } from '@/lib/format';

export const dynamic = 'force-dynamic';

const CATEGORIES: [string, string][] = [
  ['⚡', 'Electrical'],
  ['🚰', 'Plumbing'],
  ['🔧', 'General Maintenance'],
  ['✨', 'Other'],
];

const DISPATCH: Record<string, { team: string; initials: string; sla: string }> = {
  Electrical: { team: 'Volt Masters', initials: 'VM', sla: '4 h response' },
  Plumbing: { team: 'Cape Plumbing Co', initials: 'CP', sla: '4 h response' },
  'General Maintenance': { team: 'Handy Fix SA', initials: 'HF', sla: 'Next business day' },
  Other: { team: 'Unassigned', initials: '—', sla: 'Held for quote' },
};

async function logFaultAction(formData: FormData) {
  'use server';
  const { session } = await requireModule('prop', ['tenant']);
  const category = String(formData.get('category') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  if (!title || !DISPATCH[category]) return;

  const client = db();
  const { data: me } = await client
    .from('property_tenants')
    .select('id, name, property_id, property_label')
    .eq('tenant_id', session.tenantId)
    .eq('user_id', session.userId)
    .maybeSingle();

  const rule = DISPATCH[category];
  const dispatched = rule.team !== 'Unassigned';
  const ref = `MNT-${Math.floor(2300 + Math.random() * 400)}`;

  const { data: job } = await client
    .from('fault_jobs')
    .insert({
      tenant_id: session.tenantId,
      ref,
      category,
      title,
      property_id: me?.property_id ?? null,
      property_label: me?.property_label ?? '',
      tenant_label: me?.name ?? session.name,
      team: rule.team,
      team_initials: rule.initials,
      stage: dispatched ? 'Dispatched' : 'Logged',
      sla_label: rule.sla,
      tone: dispatched ? 'warn' : 'grey',
      logged_by_user_id: session.userId,
    })
    .select('id')
    .maybeSingle();

  if (job) {
    await client.from('job_messages').insert([
      { tenant_id: session.tenantId, job_id: job.id, direction: 'in', body: title, meta: `${session.name} · just now` },
      {
        tenant_id: session.tenantId,
        job_id: job.id,
        direction: 'out',
        body: dispatched
          ? `Thanks — job ${ref} logged. ${rule.team} has been dispatched (${rule.sla}).`
          : `Thanks — job ${ref} logged. Held for a quote before dispatch.`,
        meta: 'Head office · just now',
      },
    ]);
  }

  await client.from('activity_events').insert({
    tenant_id: session.tenantId,
    module: 'prop',
    severity: 'info',
    title: `Fault ${ref} logged — ${title}`,
    who: `${me?.property_label ?? ''} · ${session.name}`,
    actor_id: session.userId,
  });

  revalidatePath('/property/portal');
}

export default async function TenantPortalPage() {
  const { session } = await requireModule('prop', ['tenant']);
  const t = session.tenantId;
  const client = db();

  const { data: me } = await client
    .from('property_tenants')
    .select('id, name, initials, property_label, area, lease_end, account, tone')
    .eq('tenant_id', t)
    .eq('user_id', session.userId)
    .maybeSingle();

  const [jobsRes, invoicesRes, docsRes] = await Promise.all([
    client
      .from('fault_jobs')
      .select('id, ref, title, category, stage, sla_label, tone, team')
      .eq('tenant_id', t)
      .eq('logged_by_user_id', session.userId)
      .neq('stage', 'Completed')
      .order('created_at', { ascending: false }),
    me
      ? client
          .from('invoices')
          .select('id, amount, due_label, method, status, tone')
          .eq('tenant_id', t)
          .eq('property_tenant_id', me.id)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
    me
      ? client
          .from('documents')
          .select('name, status, tone')
          .eq('tenant_id', t)
          .eq('owner_type', 'property_tenant')
          .eq('owner_id', me.id)
          .order('sort_order')
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const nextInvoice = (invoicesRes.data ?? [])[0];

  return (
    <div className="page">
      <div className="mobile">
        <div className="mobile__hero">
          <div style={{ fontSize: 11.5, opacity: 0.7, letterSpacing: '.6px', textTransform: 'uppercase' }}>My home</div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.5px', marginTop: 4 }}>
            {me?.property_label ?? '—'}
          </div>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>{me?.area ?? ''}</div>
          <div className="row" style={{ marginTop: 16, gap: 10 }}>
            <StatusPill tone={toneOf(me?.tone)}>{me?.account ?? '—'}</StatusPill>
            <span style={{ fontSize: 11.5, opacity: 0.75 }}>Lease ends {me?.lease_end ?? '—'}</span>
          </div>
        </div>

        {nextInvoice ? (
          <SectionCard title="Rent" subtitle={`Due ${nextInvoice.due_label as string} · ${nextInvoice.method as string}`}>
            <div className="row" style={{ marginBottom: 14 }}>
              <span className="kpi__value" style={{ margin: 0 }}>
                {zar(Number(nextInvoice.amount))}
              </span>
              <div className="spacer" />
              <StatusPill tone={toneOf(nextInvoice.tone)}>{nextInvoice.status as string}</StatusPill>
            </div>
            <button className="btn" type="button" disabled={nextInvoice.status === 'Paid'}>
              {nextInvoice.status === 'Paid' ? 'Paid — thank you' : 'Pay now'}
            </button>
          </SectionCard>
        ) : null}

        <SectionCard title="Log a fault" subtitle="Dispatched automatically by category">
          <form action={logFaultAction} className="stack" style={{ gap: 12 }}>
            <div className="grid grid--4" style={{ gap: 8 }}>
              {CATEGORIES.map(([icon, label]) => (
                <label
                  key={label}
                  className="quickaction"
                  style={{ alignItems: 'center', textAlign: 'center', padding: '14px 6px', cursor: 'pointer' }}
                >
                  <input
                    type="radio"
                    name="category"
                    value={label}
                    defaultChecked={label === 'Plumbing'}
                    style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
                    required
                  />
                  <span style={{ fontSize: 20 }} aria-hidden>
                    {icon}
                  </span>
                  <span style={{ fontSize: 11.5 }}>{label === 'General Maintenance' ? 'General' : label}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="label" htmlFor="title">
                What is wrong?
              </label>
              <input id="title" name="title" className="input" placeholder="Water coming through the ceiling…" required />
            </div>

            <button type="submit" className="btn">
              Log the fault
            </button>
          </form>
        </SectionCard>

        <SectionCard title="Open jobs">
          <div className="stack">
            {(jobsRes.data ?? []).map((j) => (
              <div className="row" key={j.id as string} style={{ alignItems: 'flex-start' }}>
                <Dot color={j.stage === 'In progress' ? '#007BFF' : j.stage === 'Dispatched' ? '#FFC107' : '#DC3545'} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="strong">{j.title as string}</div>
                  <div className="muted">
                    {j.ref as string} · {j.team as string}
                  </div>
                </div>
                <StatusPill tone={toneOf(j.tone)}>{j.stage as string}</StatusPill>
              </div>
            ))}
            {!(jobsRes.data ?? []).length ? <div className="empty">Nothing outstanding.</div> : null}
          </div>
        </SectionCard>

        <SectionCard title="My documents">
          <div className="stack">
            {(docsRes.data ?? []).map((d, i) => (
              <div className="row" key={i}>
                <span style={{ flex: 1 }}>📄 {d.name as string}</span>
                <StatusPill tone={toneOf(d.tone)}>{d.status as string}</StatusPill>
              </div>
            ))}
            {!(docsRes.data ?? []).length ? <div className="empty">No documents yet.</div> : null}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
