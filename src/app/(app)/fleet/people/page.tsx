import { Dot, SectionCard, StatusPill } from '@/components/ui';
import { requireModule } from '@/lib/auth';
import { db } from '@/lib/db';
import { toneOf } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function FleetPeoplePage() {
  const { session } = await requireModule('fleet', ['hr', 'fleet']);
  const t = session.tenantId;
  const client = db();

  const [driversRes, incidentsRes] = await Promise.all([
    client.from('drivers').select('id, name, code, licence_expiry, prdp_expiry, status, tone').eq('tenant_id', t).order('sort_order'),
    client
      .from('incidents')
      .select('id, title, detail, vehicle_plate, when_label, stage, sla_label, tone, dot_color')
      .eq('tenant_id', t)
      .order('created_at', { ascending: false }),
  ]);

  return (
    <div className="page">
      <SectionCard title="Driver licences" subtitle="Renewal notices fire 30 days before expiry" flush>
        <div className="table__scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Driver</th>
                <th>Code</th>
                <th>Licence expiry</th>
                <th>PrDP expiry</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(driversRes.data ?? []).map((d) => (
                <tr key={d.id as string}>
                  <td className="strong">{d.name as string}</td>
                  <td>{d.code as string}</td>
                  <td className="num">{d.licence_expiry as string}</td>
                  <td className="num">{d.prdp_expiry as string}</td>
                  <td>
                    <StatusPill tone={toneOf(d.tone)}>{d.status as string}</StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Incidents" subtitle="Accidents must be logged within 24 hours">
        <div className="stack" style={{ gap: 14 }}>
          {(incidentsRes.data ?? []).map((i) => (
            <div className="card" key={i.id as string} style={{ padding: 14 }}>
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <Dot color={i.dot_color as string} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                    <span className="strong">{i.title as string}</span>
                    <span className="muted">{i.when_label as string}</span>
                    <div className="spacer" />
                    <StatusPill tone={toneOf(i.tone)}>{i.stage as string}</StatusPill>
                  </div>
                  <div className="feed__detail">{i.detail as string}</div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    {i.vehicle_plate as string} · {i.sla_label as string}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!(incidentsRes.data ?? []).length ? <div className="empty">No incidents logged.</div> : null}
        </div>
      </SectionCard>
    </div>
  );
}
