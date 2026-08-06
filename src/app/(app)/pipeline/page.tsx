import { Avatar, Dot, KpiRow, SectionCard, SourceBadge } from '@/components/ui';
import { AddRecord, RowActions } from '@/components/ui/Crud';
import { requireCrm } from '@/lib/auth';
import { db } from '@/lib/db';
import { zar, zarCompact } from '@/lib/format';
import { kpis } from '@/lib/queries';
import type { SourceSlug } from '@/lib/types';

export const dynamic = 'force-dynamic';

const STAGES: { key: string; name: string; color: string }[] = [
  { key: 'enquiry', name: 'New enquiry', color: '#8494A7' },
  { key: 'qualified', name: 'Qualified', color: '#007BFF' },
  { key: 'proposal', name: 'Proposal', color: '#FFC107' },
  { key: 'contract', name: 'Contract', color: '#6B21A8' },
  { key: 'won', name: 'Won', color: '#28A745' },
];

export default async function PipelinePage() {
  const session = await requireCrm();

  const [board, deals] = await Promise.all([
    kpis(session.tenantId, 'pipeline'),
    db()
      .from('deals')
      .select('id, title, client, stage, value, owner_initials, source_module, age_label')
      .eq('tenant_id', session.tenantId)
      .order('value', { ascending: false }),
  ]);

  const rows = deals.data ?? [];

  return (
    <div className="page">
      <KpiRow kpis={board} columns={4} />

      <AddRecord resource="deal" tenantId={session.tenantId} />

      <SectionCard title="Pipeline board" subtitle="New business across the group">
        <div className="board" style={{ gridTemplateColumns: `repeat(${STAGES.length}, minmax(0, 1fr))` }}>
          {STAGES.map((stage) => {
            const cards = rows.filter((d) => d.stage === stage.key);
            const total = cards.reduce((s, d) => s + Number(d.value), 0);
            return (
              <div className="board__col" key={stage.key}>
                <div className="board__head">
                  <Dot color={stage.color} />
                  <span>{stage.name}</span>
                  <div className="spacer" />
                  <span className="num" style={{ color: 'var(--text-meta)', fontWeight: 700 }}>
                    {zarCompact(total)}
                  </span>
                </div>

                {cards.map((d) => (
                  <div className="board__card" key={d.id}>
                    <div className="row">
                      <SourceBadge source={(d.source_module ?? 'crm') as SourceSlug} />
                      <div className="spacer" />
                      <span className="muted">{d.age_label}</span>
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-strong)', lineHeight: 1.4 }}>
                      {d.title}
                    </div>
                    <div className="muted">{d.client}</div>
                    <div className="row">
                      <span className="num" style={{ color: 'var(--primary-deep)', fontWeight: 700 }}>
                        {zar(Number(d.value))}
                      </span>
                      <div className="spacer" />
                      <Avatar initials={d.owner_initials as string} size="sm" />
                    </div>
                    <RowActions
                      resource="deal"
                      tenantId={session.tenantId}
                      id={d.id as string}
                      name={d.title as string}
                      values={d as unknown as Record<string, unknown>}
                    />
                  </div>
                ))}

                {!cards.length ? <div className="muted" style={{ padding: '10px 4px' }}>Nothing here.</div> : null}
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
