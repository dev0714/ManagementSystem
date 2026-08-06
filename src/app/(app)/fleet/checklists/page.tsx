import Link from 'next/link';

import { SectionCard, StatusPill } from '@/components/ui';
import { AddRecord, RowActions } from '@/components/ui/Crud';
import { requireModule } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function FleetChecklistsPage({ searchParams }: { searchParams: Promise<{ tpl?: string }> }) {
  const { session } = await requireModule('fleet', ['fleet']);
  const sp = await searchParams;
  const client = db();

  const { data: templates } = await client
    .from('checklist_templates')
    .select('id, name, scope')
    .eq('tenant_id', session.tenantId)
    .eq('module', 'fleet')
    .order('sort_order');

  const list = templates ?? [];
  const activeId = sp.tpl && list.some((t) => t.id === sp.tpl) ? sp.tpl : list[0]?.id;
  const active = list.find((t) => t.id === activeId);

  const { data: items } = activeId
    ? await client
        .from('checklist_items')
        .select('id, label, kind, required, sort_order, template_id')
        .eq('tenant_id', session.tenantId)
        .eq('template_id', activeId)
        .order('sort_order')
    : { data: [] };

  return (
    <div className="page">
      <div className="grid" style={{ gridTemplateColumns: '260px 1fr', alignItems: 'start' }}>
        <SectionCard title="Templates">
          <div style={{ marginBottom: 12 }}>
            <AddRecord resource="checklist_template_fleet" tenantId={session.tenantId} label="template" />
          </div>
          <div className="stack" style={{ gap: 4 }}>
            {list.map((t) => (
              <Link
                key={t.id as string}
                href={`/fleet/checklists?tpl=${t.id}`}
                className="navitem"
                data-active={t.id === activeId}
                style={{
                  color: t.id === activeId ? 'var(--primary-deep)' : 'var(--text-muted)',
                  background: t.id === activeId ? '#EAF3FF' : 'transparent',
                }}
              >
                <span style={{ flex: 1 }}>{t.name as string}</span>
              </Link>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title={(active?.name as string) ?? 'Checklist'}
          subtitle={`Applies to ${(active?.scope as string) ?? '—'} · ${(items ?? []).length} items`}
          action={
            activeId ? (
              <AddRecord
                resource="checklist_item_fleet"
                tenantId={session.tenantId}
                label="item"
                defaults={{ template_id: activeId, kind: 'Pass / fail', required: true }}
              />
            ) : null
          }
          flush
        >
          <div className="table__scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Response type</th>
                  <th>Requirement</th>
                <th />
                </tr>
              </thead>
              <tbody>
                {(items ?? []).map((i) => (
                  <tr key={i.id as string}>
                    <td className="strong">{i.label as string}</td>
                    <td>
                      <span className="pill tone-grey">{i.kind as string}</span>
                    </td>
                    <td>
                      <StatusPill tone={i.required ? 'info' : 'grey'}>{i.required ? 'Required' : 'Optional'}</StatusPill>
                    </td>
                    <td>
                      <RowActions
                        resource="checklist_item_fleet"
                        tenantId={session.tenantId}
                        id={i.id as string}
                        name={i.label as string}
                        values={i as unknown as Record<string, unknown>}
                      />
                    </td>
                  </tr>
                ))}
                {!(items ?? []).length ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty">This template has no items yet.</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
