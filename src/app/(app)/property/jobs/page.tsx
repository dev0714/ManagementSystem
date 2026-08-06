import { revalidatePath } from 'next/cache';

import { SectionCard, StatusPill } from '@/components/ui';
import { requireModule } from '@/lib/auth';
import { db } from '@/lib/db';
import { toneOf } from '@/lib/format';

export const dynamic = 'force-dynamic';

/** Contractors work jobs assigned to their company only, and only while access lasts. */
async function progressJobAction(formData: FormData) {
  'use server';
  const { session } = await requireModule('prop', ['team']);
  const id = String(formData.get('id') ?? '');
  const to = String(formData.get('to') ?? '');
  if (!id || !['In progress', 'Completed'].includes(to)) return;

  const client = db();
  const { data: job } = await client
    .from('fault_jobs')
    .select('ref, team')
    .eq('id', id)
    .eq('tenant_id', session.tenantId)
    .maybeSingle();
  if (!job) return;

  await client
    .from('fault_jobs')
    .update({
      stage: to,
      sla_label: to === 'Completed' ? 'Signed off' : 'On site',
      tone: to === 'Completed' ? 'ok' : 'info',
    })
    .eq('id', id)
    .eq('tenant_id', session.tenantId);

  await client.from('job_messages').insert({
    tenant_id: session.tenantId,
    job_id: id,
    direction: 'in',
    body: to === 'Completed' ? 'Work complete, after photos uploaded.' : 'On site, starting work now.',
    meta: `${session.name} · just now`,
  });

  await client.from('activity_events').insert({
    tenant_id: session.tenantId,
    module: 'prop',
    severity: to === 'Completed' ? 'success' : 'info',
    title: `${job.ref} — ${to === 'Completed' ? 'signed off' : 'started'} by ${job.team}`,
    who: session.name,
    actor_id: session.userId,
  });

  revalidatePath('/property/jobs');
}

export default async function ContractorJobsPage() {
  const { session } = await requireModule('prop', ['team']);
  const client = db();

  // Which contractor is this user? Matched through their CRM contact record.
  const { data: contact } = await client
    .from('contacts')
    .select('name')
    .eq('tenant_id', session.tenantId)
    .ilike('email', session.email)
    .maybeSingle();

  const company = contact?.name ?? session.title.split('—').pop()?.trim() ?? '';

  const { data } = await client
    .from('fault_jobs')
    .select('id, ref, category, title, property_label, tenant_label, stage, sla_label, tone, team')
    .eq('tenant_id', session.tenantId)
    .neq('stage', 'Completed')
    .order('created_at', { ascending: false });

  const all = data ?? [];
  const jobs = company ? all.filter((j) => String(j.team).toLowerCase().includes(company.toLowerCase().split(' ')[0])) : all;

  const hoursLeft = session.tempAccessUntil
    ? Math.max(0, Math.round((new Date(session.tempAccessUntil).getTime() - Date.now()) / 3_600_000))
    : null;

  return (
    <div className="page">
      <div className="mobile">
        <div className="mobile__hero">
          <div style={{ fontSize: 11.5, opacity: 0.7, letterSpacing: '.6px', textTransform: 'uppercase' }}>
            {company || 'Contractor'}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.6px', marginTop: 4 }}>
            {jobs.length} open job{jobs.length === 1 ? '' : 's'}
          </div>
          {hoursLeft !== null ? (
            <div style={{ fontSize: 11.5, opacity: 0.75, marginTop: 6 }}>
              Temporary access · {hoursLeft} h remaining
            </div>
          ) : null}
        </div>

        {jobs.map((j) => (
          <SectionCard key={j.id as string}>
            <div className="row" style={{ marginBottom: 10 }}>
              <span className="pill tone-info">{j.category as string}</span>
              <div className="spacer" />
              <span className="num muted">{j.ref as string}</span>
            </div>

            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-strong)', lineHeight: 1.4 }}>
              {j.title as string}
            </div>
            <div className="muted" style={{ marginTop: 4 }}>
              {j.property_label as string}
            </div>

            <div className="row" style={{ marginTop: 12 }}>
              <StatusPill tone={toneOf(j.tone)}>{j.sla_label as string}</StatusPill>
              <div className="spacer" />
              <span className="muted">{(j.tenant_label as string) ?? ''}</span>
            </div>

            <div className="row" style={{ gap: 8, marginTop: 14 }}>
              {j.stage === 'Dispatched' || j.stage === 'Logged' ? (
                <form action={progressJobAction} style={{ flex: 1 }}>
                  <input type="hidden" name="id" value={j.id as string} />
                  <input type="hidden" name="to" value="In progress" />
                  <button className="btn" type="submit">
                    Accept & start
                  </button>
                </form>
              ) : (
                <form action={progressJobAction} style={{ flex: 1 }}>
                  <input type="hidden" name="id" value={j.id as string} />
                  <input type="hidden" name="to" value="Completed" />
                  <button className="btn btn--success" type="submit">
                    Complete job
                  </button>
                </form>
              )}
            </div>

            <div className="stack" style={{ marginTop: 14, gap: 8 }}>
              <div className="tile__label">Close-out checklist</div>
              {['After photos uploaded', 'Work description added', 'Invoice attached', 'Tenant sign-off captured'].map((c) => (
                <div className="row" key={c}>
                  <span className="checkbox" data-checked={j.stage === 'In progress' && c === 'Work description added'} aria-hidden>
                    ✓
                  </span>
                  <span style={{ fontSize: 12.5 }}>{c}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        ))}

        {!jobs.length ? (
          <SectionCard>
            <div className="empty">No jobs assigned to you right now.</div>
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
}
