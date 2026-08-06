import { revalidatePath } from 'next/cache';

import { SectionCard, StatusPill } from '@/components/ui';
import { requireModule } from '@/lib/auth';
import { db } from '@/lib/db';
import { toneOf } from '@/lib/format';

export const dynamic = 'force-dynamic';

async function claimJobAction(formData: FormData) {
  'use server';
  const { session } = await requireModule('jk', ['hq', 'repairs']);
  const ref = String(formData.get('ref') ?? '');
  if (!ref) return;

  await db()
    .from('maintenance_jobs')
    .update({ owner: session.name })
    .eq('tenant_id', session.tenantId)
    .eq('ref', ref);

  await db().from('activity_events').insert({
    tenant_id: session.tenantId,
    module: 'jk',
    severity: 'info',
    title: `Repair job ${ref} accepted`,
    who: session.name,
    actor_id: session.userId,
  });

  revalidatePath('/jk/repairs');
}

async function closeJobAction(formData: FormData) {
  'use server';
  const { session } = await requireModule('jk', ['hq', 'repairs']);
  const ref = String(formData.get('ref') ?? '');
  if (!ref) return;

  await db()
    .from('maintenance_jobs')
    .update({ status: 'closed', sla_label: 'Signed off', tone: 'ok' })
    .eq('tenant_id', session.tenantId)
    .eq('ref', ref);

  await db().from('activity_events').insert({
    tenant_id: session.tenantId,
    module: 'jk',
    severity: 'success',
    title: `Repair job ${ref} signed off`,
    who: session.name,
    actor_id: session.userId,
  });

  revalidatePath('/jk/repairs');
}

export default async function JkRepairsPage() {
  const { session } = await requireModule('jk', ['hq', 'repairs']);
  const t = session.tenantId;
  const client = db();

  const [openJobs, closedJobs, assets] = await Promise.all([
    client
      .from('maintenance_jobs')
      .select('ref, fault, repeat_flag, site_label, owner, age_label, sla_label, tone')
      .eq('tenant_id', t)
      .eq('status', 'open')
      .order('created_at'),
    client
      .from('maintenance_jobs')
      .select('ref, fault, site_label, owner')
      .eq('tenant_id', t)
      .eq('status', 'closed')
      .order('created_at', { ascending: false })
      .limit(8),
    client.from('asset_reviews').select('name, site_label, fails').eq('tenant_id', t).order('sort_order'),
  ]);

  return (
    <div className="page">
      <SectionCard title="Repair queue" subtitle="48-hour SLA from the moment a job opens" flush>
        <div className="table__scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Fault</th>
                <th>Site</th>
                <th>Owner</th>
                <th>Age</th>
                <th>SLA</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(openJobs.data ?? []).map((j) => (
                <tr key={j.ref as string}>
                  <td className="strong num">{j.ref as string}</td>
                  <td>
                    {j.fault as string}
                    {j.repeat_flag ? (
                      <span className="pill tone-bad" style={{ marginLeft: 8 }}>
                        {j.repeat_flag as string}
                      </span>
                    ) : null}
                  </td>
                  <td>{j.site_label as string}</td>
                  <td>{j.owner as string}</td>
                  <td className="num">{j.age_label as string}</td>
                  <td>
                    <StatusPill tone={toneOf(j.tone)}>{j.sla_label as string}</StatusPill>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                      {j.owner === 'Unassigned' ? (
                        <form action={claimJobAction}>
                          <input type="hidden" name="ref" value={j.ref as string} />
                          <button className="btn btn--sm" type="submit">
                            Accept
                          </button>
                        </form>
                      ) : null}
                      <form action={closeJobAction}>
                        <input type="hidden" name="ref" value={j.ref as string} />
                        <button className="btn btn--sm btn--ghost" type="submit">
                          Sign off
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {!(openJobs.data ?? []).length ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty">The repair queue is clear.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="grid grid--main">
        <SectionCard title="Recently signed off">
          <div className="stack">
            {(closedJobs.data ?? []).map((j) => (
              <div className="row" key={j.ref as string}>
                <span className="num strong">{j.ref as string}</span>
                <span style={{ flex: 1 }}>{j.fault as string}</span>
                <span className="muted">{j.site_label as string}</span>
                <StatusPill tone="ok">Closed</StatusPill>
              </div>
            ))}
            {!(closedJobs.data ?? []).length ? <div className="empty">Nothing signed off yet.</div> : null}
          </div>
        </SectionCard>

        <SectionCard title="Assets under review" subtitle="Three failures in 30 days triggers a review">
          <div className="stack">
            {(assets.data ?? []).map((a, i) => (
              <div className="row" key={i}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="strong">{a.name as string}</div>
                  <div className="muted">{a.site_label as string}</div>
                </div>
                <StatusPill tone="warn">{a.fails as string}</StatusPill>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
