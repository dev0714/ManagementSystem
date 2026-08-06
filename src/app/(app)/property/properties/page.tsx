import { FilterChips, SectionCard, StatusPill } from '@/components/ui';
import { requireModule } from '@/lib/auth';
import { db } from '@/lib/db';
import { toneOf, zar } from '@/lib/format';

export const dynamic = 'force-dynamic';

const FILTERS = ['All', 'Occupied', 'Vacant', 'Overdue'];

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { session } = await requireModule('prop', ['admin']);
  const sp = await searchParams;
  const filter = FILTERS.includes(sp.filter ?? '') ? (sp.filter as string) : 'All';
  const client = db();

  let query = client
    .from('properties')
    .select('id, icon, address, area, rent, lease_label, occupancy, status, tone')
    .eq('tenant_id', session.tenantId)
    .order('address');

  if (filter === 'Occupied' || filter === 'Vacant') query = query.eq('occupancy', filter);
  if (filter === 'Overdue') query = query.eq('status', 'Rent overdue');

  const [propsRes, tenantsRes, faultsRes] = await Promise.all([
    query,
    client.from('property_tenants').select('name, property_id').eq('tenant_id', session.tenantId),
    client.from('fault_jobs').select('property_id, stage').eq('tenant_id', session.tenantId).neq('stage', 'Completed'),
  ]);

  const properties = propsRes.data ?? [];
  const tenants = tenantsRes.data ?? [];
  const faults = faultsRes.data ?? [];

  return (
    <div className="page">
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <FilterChips options={FILTERS} active={filter} basePath="/property/properties" />
        <div className="spacer" />
        <span className="muted">{properties.length} properties</span>
      </div>

      <div className="grid grid--3">
        {properties.map((p) => {
          const tenant = tenants.find((t) => t.property_id === p.id);
          const openFaults = faults.filter((f) => f.property_id === p.id).length;
          return (
            <div className="card card--flush" key={p.id as string}>
              <div
                style={{
                  position: 'relative',
                  height: 110,
                  background: 'linear-gradient(120deg,#E8F1FB,#DCEBFA)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 36,
                }}
                aria-hidden
              >
                {p.icon as string}
                <span style={{ position: 'absolute', top: 12, right: 12 }}>
                  <StatusPill tone={toneOf(p.tone)}>{p.status as string}</StatusPill>
                </span>
              </div>

              <div className="card__pad">
                <div className="card__title">{p.address as string}</div>
                <div className="card__sub" style={{ marginBottom: 12 }}>
                  {p.area as string}
                </div>

                <div className="grid grid--2" style={{ gap: 10 }}>
                  <div className="tile">
                    <div className="tile__label">Tenant</div>
                    <div className="tile__value">{tenant?.name ?? 'Unoccupied'}</div>
                  </div>
                  <div className="tile">
                    <div className="tile__label">Monthly rent</div>
                    <div className="tile__value num">{zar(Number(p.rent))}</div>
                  </div>
                  <div className="tile">
                    <div className="tile__label">Lease</div>
                    <div className="tile__value">{p.lease_label as string}</div>
                  </div>
                  <div className="tile">
                    <div className="tile__label">Open faults</div>
                    <div className={`tile__value ${openFaults ? 'text-bad' : ''}`}>{openFaults || 'None'}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!properties.length ? (
        <SectionCard>
          <div className="empty">No properties match this filter.</div>
        </SectionCard>
      ) : null}
    </div>
  );
}
