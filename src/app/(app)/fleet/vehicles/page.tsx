import { FilterChips, ProgressBar, SectionCard, StatusPill } from '@/components/ui';
import { requireModule } from '@/lib/auth';
import { db } from '@/lib/db';
import { toneOf } from '@/lib/format';

export const dynamic = 'force-dynamic';

const FILTERS = ['All fleet', 'Cars', 'Vans', 'Trucks', 'Trailers'];

export default async function VehiclesPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { session } = await requireModule('fleet', ['fleet', 'line']);
  const sp = await searchParams;
  const filter = FILTERS.includes(sp.filter ?? '') ? (sp.filter as string) : 'All fleet';

  let query = db()
    .from('vehicles')
    .select(
      'id, icon, plate, model, vehicle_group, driver_name, odometer_label, service_label, service_pct, disc_expiry, disc_tone, inspection, wash, status, tone',
    )
    .eq('tenant_id', session.tenantId)
    .order('plate');

  if (filter !== 'All fleet') query = query.eq('vehicle_group', filter);

  const { data } = await query;
  const vehicles = data ?? [];

  return (
    <div className="page">
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <FilterChips options={FILTERS} active={filter} basePath="/fleet/vehicles" />
        <div className="spacer" />
        <span className="muted">{vehicles.length} vehicles</span>
      </div>

      <div className="grid grid--3">
        {vehicles.map((v) => {
          const pct = v.service_pct as number;
          const barColor = pct > 90 ? '#DC3545' : pct > 70 ? '#FFC107' : '#28A745';
          return (
            <div className="card" key={v.id as string}>
              <div className="row" style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 26 }} aria-hidden>
                  {v.icon as string}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="card__title num">{v.plate as string}</div>
                  <div className="card__sub">{v.model as string}</div>
                </div>
                <StatusPill tone={toneOf(v.tone)}>{v.status as string}</StatusPill>
              </div>

              <div className="grid grid--2" style={{ gap: 10, marginBottom: 12 }}>
                <div className="tile">
                  <div className="tile__label">Driver</div>
                  <div className="tile__value">{v.driver_name as string}</div>
                </div>
                <div className="tile">
                  <div className="tile__label">Odometer</div>
                  <div className="tile__value num">{v.odometer_label as string}</div>
                </div>
                <div className="tile">
                  <div className="tile__label">Licence disc</div>
                  <div className={`tile__value text-${v.disc_tone === 'bad' ? 'bad' : v.disc_tone === 'warn' ? 'warn' : 'info'}`}>
                    {v.disc_expiry as string}
                  </div>
                </div>
                <div className="tile">
                  <div className="tile__label">Inspection</div>
                  <div className="tile__value">{v.inspection as string}</div>
                </div>
              </div>

              <div className="row" style={{ marginBottom: 6 }}>
                <span className="tile__label">Service interval</span>
                <div className="spacer" />
                <span className="num strong">{v.service_label as string}</span>
              </div>
              <ProgressBar pct={pct} color={barColor} />

              <div className="muted" style={{ marginTop: 10 }}>
                Last wash: {v.wash as string}
              </div>
            </div>
          );
        })}
      </div>

      {!vehicles.length ? (
        <SectionCard>
          <div className="empty">No vehicles in this group.</div>
        </SectionCard>
      ) : null}
    </div>
  );
}
