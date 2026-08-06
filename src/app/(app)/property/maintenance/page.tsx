import Link from 'next/link';
import { revalidatePath } from 'next/cache';

import { Dot, FilterChips, SectionCard, StatusPill } from '@/components/ui';
import { requireModule } from '@/lib/auth';
import { db } from '@/lib/db';
import { toneOf } from '@/lib/format';
import type { Tone } from '@/lib/types';

export const dynamic = 'force-dynamic';

const FILTERS = ['All faults', 'Electrical', 'Plumbing', 'General Maintenance', 'Other'];

const STAGES: { key: 'Logged' | 'Dispatched' | 'In progress' | 'Completed'; color: string }[] = [
  { key: 'Logged', color: '#DC3545' },
  { key: 'Dispatched', color: '#FFC107' },
  { key: 'In progress', color: '#007BFF' },
  { key: 'Completed', color: '#28A745' },
];

const CATEGORY_TONE: Record<string, Tone> = {
  Electrical: 'warn',
  Plumbing: 'info',
  'General Maintenance': 'grey',
  Other: 'purple',
};

/** Auto-dispatch rules — which contractor takes which category. */
const DISPATCH: Record<string, { team: string; initials: string; sla: string }> = {
  Electrical: { team: 'Volt Masters', initials: 'VM', sla: '4 h response' },
  Plumbing: { team: 'Cape Plumbing Co', initials: 'CP', sla: '4 h response' },
  'General Maintenance': { team: 'Handy Fix SA', initials: 'HF', sla: 'Next business day' },
  Other: { team: 'Unassigned', initials: '—', sla: 'Held for quote' },
};

async function advanceJobAction(formData: FormData) {
  'use server';
  const { session } = await requireModule('prop', ['admin']);
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const client = db();
  const { data: job } = await client
    .from('fault_jobs')
    .select('id, ref, stage, category')
    .eq('id', id)
    .eq('tenant_id', session.tenantId)
    .maybeSingle();
  if (!job) return;

  const order = STAGES.map((s) => s.key);
  const idx = order.indexOf(job.stage as (typeof order)[number]);
  const nextStage = order[Math.min(order.length - 1, idx + 1)];
  const rule = DISPATCH[job.category as string];

  const patch: Record<string, unknown> = { stage: nextStage };
  if (nextStage === 'Dispatched' && rule && rule.team !== 'Unassigned') {
    patch.team = rule.team;
    patch.team_initials = rule.initials;
    patch.sla_label = rule.sla;
    patch.tone = 'warn';
  }
  if (nextStage === 'In progress') {
    patch.sla_label = 'On site';
    patch.tone = 'info';
  }
  if (nextStage === 'Completed') {
    patch.sla_label = 'Signed off';
    patch.tone = 'ok';
  }

  await client.from('fault_jobs').update(patch).eq('id', id).eq('tenant_id', session.tenantId);

  await client.from('job_messages').insert({
    tenant_id: session.tenantId,
    job_id: id,
    direction: 'out',
    body: `${job.ref} moved to ${nextStage}.`,
    meta: `Head office · ${session.name}`,
  });

  await client.from('activity_events').insert({
    tenant_id: session.tenantId,
    module: 'prop',
    severity: nextStage === 'Completed' ? 'success' : 'info',
    title: `Job ${job.ref} → ${nextStage}${patch.team ? ` (${patch.team})` : ''}`,
    who: session.name,
    actor_id: session.userId,
  });

  revalidatePath('/property/maintenance');
}

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; job?: string }>;
}) {
  const { session } = await requireModule('prop', ['admin']);
  const sp = await searchParams;
  const filter = FILTERS.includes(sp.filter ?? '') ? (sp.filter as string) : 'All faults';
  const client = db();

  let query = client
    .from('fault_jobs')
    .select('id, ref, category, title, property_label, tenant_label, team, team_initials, stage, sla_label, tone')
    .eq('tenant_id', session.tenantId)
    .order('created_at', { ascending: false });
  if (filter !== 'All faults') query = query.eq('category', filter);

  const { data } = await query;
  const jobs = data ?? [];

  const threadJobId = sp.job && jobs.some((j) => j.id === sp.job) ? sp.job : jobs.find((j) => j.stage === 'In progress')?.id ?? jobs[0]?.id;
  const threadJob = jobs.find((j) => j.id === threadJobId);

  const { data: messages } = threadJobId
    ? await client
        .from('job_messages')
        .select('id, direction, body, meta')
        .eq('tenant_id', session.tenantId)
        .eq('job_id', threadJobId)
        .order('created_at')
    : { data: [] };

  return (
    <div className="page">
      <FilterChips options={FILTERS} active={filter} basePath="/property/maintenance" />

      <SectionCard title="Fault board" subtitle="Auto-dispatch by category, then drive to sign-off">
        <div className="board" style={{ gridTemplateColumns: `repeat(${STAGES.length}, minmax(0, 1fr))` }}>
          {STAGES.map((stage) => {
            const cards = jobs.filter((j) => j.stage === stage.key);
            return (
              <div className="board__col" key={stage.key}>
                <div className="board__head">
                  <Dot color={stage.color} />
                  <span>{stage.key}</span>
                  <div className="spacer" />
                  <span className="num muted">{cards.length}</span>
                </div>

                {cards.map((j) => (
                  <div className="board__card" key={j.id as string}>
                    <div className="row">
                      <span className={`pill tone-${CATEGORY_TONE[j.category as string] ?? 'grey'}`}>
                        {j.category as string}
                      </span>
                      <div className="spacer" />
                      <span className="num muted">{j.ref as string}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)', lineHeight: 1.4 }}>
                      {j.title as string}
                    </div>
                    <div className="muted">{j.property_label as string}</div>
                    <div className="row">
                      <span className="muted">{j.team as string}</span>
                      <div className="spacer" />
                      <StatusPill tone={toneOf(j.tone)}>{j.sla_label as string}</StatusPill>
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      <Link
                        href={`/property/maintenance?${filter !== 'All faults' ? `filter=${encodeURIComponent(filter)}&` : ''}job=${j.id}`}
                        className="btn btn--sm btn--ghost"
                        style={{ textAlign: 'center' }}
                      >
                        Thread
                      </Link>
                      {j.stage !== 'Completed' ? (
                        <form action={advanceJobAction} style={{ flex: 1 }}>
                          <input type="hidden" name="id" value={j.id as string} />
                          <button className="btn btn--sm" type="submit" style={{ width: '100%' }}>
                            {j.stage === 'Logged' ? 'Dispatch' : j.stage === 'Dispatched' ? 'Start' : 'Complete'}
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                ))}

                {!cards.length ? <div className="muted" style={{ padding: '10px 4px' }}>Nothing here.</div> : null}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {threadJob ? (
        <div className="grid grid--main">
          <SectionCard
            title={`WhatsApp thread — ${threadJob.ref as string}`}
            subtitle={`${threadJob.title as string} · ${threadJob.property_label as string}`}
          >
            <div className="wa">
              {(messages ?? []).map((m) => (
                <div
                  key={m.id as string}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: m.direction === 'in' ? 'flex-start' : 'flex-end',
                    gap: 3,
                  }}
                >
                  <div className={`wa__bubble wa__bubble--${m.direction === 'in' ? 'in' : 'out'}`}>{m.body as string}</div>
                  <span className="wa__meta">{m.meta as string}</span>
                </div>
              ))}
              {!(messages ?? []).length ? <div className="empty">No messages on this job yet.</div> : null}
            </div>
          </SectionCard>

          <div className="stack" style={{ gap: 18 }}>
            <SectionCard title="Job detail">
              <div className="grid grid--2" style={{ gap: 10 }}>
                <div className="tile">
                  <div className="tile__label">Tenant</div>
                  <div className="tile__value">{(threadJob.tenant_label as string) ?? '—'}</div>
                </div>
                <div className="tile">
                  <div className="tile__label">Team</div>
                  <div className="tile__value">{threadJob.team as string}</div>
                </div>
                <div className="tile">
                  <div className="tile__label">Stage</div>
                  <div className="tile__value">{threadJob.stage as string}</div>
                </div>
                <div className="tile">
                  <div className="tile__label">SLA</div>
                  <div className="tile__value">{threadJob.sla_label as string}</div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Dispatch rules">
              <div className="stack">
                {Object.entries(DISPATCH).map(([category, rule]) => (
                  <div className="row" key={category}>
                    <Dot color={category === 'Electrical' ? '#FFC107' : category === 'Plumbing' ? '#007BFF' : category === 'General Maintenance' ? '#28A745' : '#8494A7'} />
                    <div style={{ flex: 1 }}>
                      <div className="strong">{category}</div>
                      <div className="muted">
                        {rule.team} · {rule.sla}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      ) : null}
    </div>
  );
}
