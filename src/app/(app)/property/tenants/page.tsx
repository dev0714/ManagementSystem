import Link from 'next/link';

import { Avatar, FieldTile, SectionCard, StatusPill } from '@/components/ui';
import { AddRecord, RowActions } from '@/components/ui/Crud';
import { requireModule } from '@/lib/auth';
import { db } from '@/lib/db';
import { toneOf } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function TenantsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { session } = await requireModule('prop', ['admin']);
  const sp = await searchParams;
  const client = db();

  const { data } = await client
    .from('property_tenants')
    .select('id, name, initials, phone, property_id, property_label, area, lease_end, account, tone, since_label, fields')
    .eq('tenant_id', session.tenantId)
    .order('name');

  const tenants = data ?? [];
  const selectedId = sp.id && tenants.some((t) => t.id === sp.id) ? sp.id : tenants[0]?.id;
  const selected = tenants.find((t) => t.id === selectedId);

  const { data: docs } = selected
    ? await client
        .from('documents')
        .select('name, status, tone')
        .eq('tenant_id', session.tenantId)
        .eq('owner_type', 'property_tenant')
        .eq('owner_id', selected.id as string)
        .order('sort_order')
    : { data: [] };

  return (
    <div className="page">
      <AddRecord resource="property_tenant" tenantId={session.tenantId} label="tenant" />

      <div className="grid grid--main">
        <SectionCard title="Tenants" subtitle={`${tenants.length} in this workspace`} flush>
          <div className="table__scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Property</th>
                  <th>Lease ends</th>
                  <th>Account</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id as string} data-selected={t.id === selectedId}>
                    <td>
                      <Link href={`/property/tenants?id=${t.id}`} className="row" style={{ color: 'inherit' }}>
                        <Avatar initials={t.initials as string} />
                        <span>
                          <span className="strong" style={{ display: 'block' }}>
                            {t.name as string}
                          </span>
                          <span className="muted">{t.phone as string}</span>
                        </span>
                      </Link>
                    </td>
                    <td>{t.property_label as string}</td>
                    <td className="num">{t.lease_end as string}</td>
                    <td>
                      <StatusPill tone={toneOf(t.tone)}>{t.account as string}</StatusPill>
                    </td>
                    <td>
                      <RowActions
                        resource="property_tenant"
                        tenantId={session.tenantId}
                        id={t.id as string}
                        name={t.name as string}
                        values={t as unknown as Record<string, unknown>}
                      />
                    </td>
                  </tr>
                ))}
                {!tenants.length ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty">No tenants yet.</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {selected ? (
          <div className="stack" style={{ gap: 18 }}>
            <SectionCard>
              <div className="row" style={{ marginBottom: 14 }}>
                <Avatar initials={selected.initials as string} size="lg" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-strong)' }}>{selected.name as string}</div>
                  <div className="card__sub">
                    {selected.property_label as string} · tenant since {selected.since_label as string}
                  </div>
                </div>
                <StatusPill tone={toneOf(selected.tone)}>{selected.account as string}</StatusPill>
              </div>

              <div className="grid grid--2" style={{ gap: 10 }}>
                {((selected.fields as [string, string][]) ?? []).map(([label, value]) => (
                  <FieldTile key={label} label={label} value={value} />
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Document library">
              <div className="stack">
                {(docs ?? []).map((d, i) => (
                  <div className="row" key={i}>
                    <span style={{ flex: 1 }}>📄 {d.name as string}</span>
                    <StatusPill tone={toneOf(d.tone)}>{d.status as string}</StatusPill>
                  </div>
                ))}
                {!(docs ?? []).length ? <div className="empty">No documents on file.</div> : null}
              </div>
            </SectionCard>
          </div>
        ) : null}
      </div>
    </div>
  );
}
