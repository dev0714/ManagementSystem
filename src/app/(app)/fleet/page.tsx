import { redirect } from 'next/navigation';

import { Dot, FlagCard, KpiRow, SectionCard, StatusPill } from '@/components/ui';
import { AddRecord, RowActions } from '@/components/ui/Crud';
import { requireModule } from '@/lib/auth';
import { db } from '@/lib/db';
import { relative, toneOf } from '@/lib/format';
import { kpis } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function FleetDashboardPage() {
  const { session, role } = await requireModule('fleet');
  if (role === 'driver') redirect('/fleet/today');
  if (role === 'hr') redirect('/fleet/people');

  const t = session.tenantId;
  const client = db();

  const [board, expiries, alerts, chart, rules] = await Promise.all([
    kpis(t, 'fleet'),
    client.from('expiries').select('id, item, who, due_label, status, tone, sort_order').eq('tenant_id', t).order('sort_order'),
    client
      .from('alerts')
      .select('severity, title, detail, created_at')
      .eq('tenant_id', t)
      .eq('module', 'fleet')
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(4),
    client.from('claim_history').select('month, fuel_k, toll_k').eq('tenant_id', t).order('sort_order'),
    client.from('trigger_rules').select('name, description, tone').eq('tenant_id', t).eq('module', 'fleet').order('sort_order'),
  ]);

  const rows = chart.data ?? [];
  const maxTotal = Math.max(1, ...rows.map((r) => (r.fuel_k as number) + (r.toll_k as number)));

  const quickActions = [
    { icon: '🚗', label: 'Add vehicle', href: '/fleet/vehicles' },
    { icon: '📝', label: 'Edit checklist', href: '/fleet/checklists' },
    { icon: '📤', label: 'Upload disc', href: '/fleet/documents' },
    { icon: '🤝', label: 'Handover vehicle', href: '/fleet/checklists' },
  ];

  const TONE_HEX: Record<string, string> = { ok: '#28A745', warn: '#FFC107', bad: '#DC3545', info: '#007BFF', grey: '#8494A7' };

  return (
    <div className="page">
      <KpiRow kpis={board} columns={5} />

      <div className="grid grid--main">
        <SectionCard title="Fuel & toll claims" subtitle="Last six months, thousands of rand">
          <div className="chart">
            {rows.map((c) => (
              <div className="chart__col" key={c.month as string}>
                <span className="num muted">R {(c.fuel_k as number) + (c.toll_k as number)}k</span>
                <div className="chart__stack">
                  <div
                    style={{
                      height: `${((c.toll_k as number) / maxTotal) * 100}%`,
                      background: '#28A745',
                      borderRadius: '5px 5px 0 0',
                    }}
                  />
                  <div
                    style={{
                      height: `${((c.fuel_k as number) / maxTotal) * 100}%`,
                      background: '#007BFF',
                      borderRadius: '0 0 5px 5px',
                    }}
                  />
                </div>
                <span className="chart__label">{c.month as string}</span>
              </div>
            ))}
          </div>
          <div className="row" style={{ gap: 16, marginTop: 12 }}>
            <span className="row" style={{ gap: 6 }}>
              <Dot color="#007BFF" /> <span className="muted">Fuel</span>
            </span>
            <span className="row" style={{ gap: 6 }}>
              <Dot color="#28A745" /> <span className="muted">Toll</span>
            </span>
          </div>
        </SectionCard>

        <SectionCard title="Red flags">
          <div className="stack">
            {(alerts.data ?? []).map((a, i) => (
              <FlagCard
                key={i}
                tone={a.severity === 'CRITICAL' ? 'bad' : 'warn'}
                title={a.title as string}
                when={relative(a.created_at as string)}
                detail={a.detail as string}
              />
            ))}
            {!(alerts.data ?? []).length ? <div className="empty">No open fleet alerts.</div> : null}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid--main">
        <SectionCard
          title="Expiring in the next 30 days"
          action={<AddRecord resource="expiry" tenantId={session.tenantId} label="expiry" />}
          flush
        >
          <div className="table__scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Who / what</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(expiries.data ?? []).map((e, i) => (
                  <tr key={i}>
                    <td className="strong">{e.item as string}</td>
                    <td>{e.who as string}</td>
                    <td className="num">{e.due_label as string}</td>
                    <td>
                      <StatusPill tone={toneOf(e.tone)}>{e.status as string}</StatusPill>
                    </td>
                    <td>
                      <RowActions
                        resource="expiry"
                        tenantId={session.tenantId}
                        id={e.id as string}
                        name={e.item as string}
                        values={e as unknown as Record<string, unknown>}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <div className="stack" style={{ gap: 18 }}>
          <SectionCard title="Automation triggers">
            <div className="stack" style={{ gap: 14 }}>
              {(rules.data ?? []).map((r) => (
                <div className="row" style={{ alignItems: 'flex-start' }} key={r.name as string}>
                  <Dot color={TONE_HEX[String(r.tone)] ?? '#8494A7'} />
                  <div>
                    <div className="strong">{r.name as string}</div>
                    <div className="feed__detail">{r.description as string}</div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Quick actions">
            <div className="grid grid--2" style={{ gap: 10 }}>
              {quickActions.map((q) => (
                <a className="quickaction" href={q.href} key={q.label}>
                  <span style={{ fontSize: 18 }} aria-hidden>
                    {q.icon}
                  </span>
                  {q.label}
                </a>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
