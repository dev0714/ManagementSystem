import { redirect } from 'next/navigation';

import { Dot, FlagCard, KpiRow, SectionCard, StatusPill } from '@/components/ui';
import { requireModule } from '@/lib/auth';
import { db } from '@/lib/db';
import { SEVERITY_DOT, relative, toneOf } from '@/lib/format';
import { kpis } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function PropertyDashboardPage() {
  const { session, role } = await requireModule('prop');
  if (role === 'tenant') redirect('/property/portal');
  if (role === 'team') redirect('/property/jobs');

  const t = session.tenantId;
  const client = db();

  const [board, chart, alerts, leases, activity] = await Promise.all([
    kpis(t, 'prop'),
    client.from('collection_history').select('month, pct').eq('tenant_id', t).order('sort_order'),
    client
      .from('alerts')
      .select('severity, title, detail, created_at')
      .eq('tenant_id', t)
      .eq('module', 'prop')
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(4),
    client.from('leases').select('tenant_name, property_label, ends_label, status, tone').eq('tenant_id', t).order('created_at'),
    client
      .from('activity_events')
      .select('id, severity, title, who, occurred_at')
      .eq('tenant_id', t)
      .eq('module', 'prop')
      .order('occurred_at', { ascending: false })
      .limit(8),
  ]);

  const collectLegend: [string, string][] = [
    ['Paid 79%', '#28A745'],
    ['Debit order pending 9%', '#FFC107'],
    ['Overdue 7%', '#DC3545'],
    ['Not yet due 5%', '#E3E8EF'],
  ];

  const quickActions = [
    { icon: '🏠', label: 'Add property', href: '/property/properties' },
    { icon: '👤', label: 'Onboard tenant', href: '/property/onboarding' },
    { icon: '🔧', label: 'Log maintenance', href: '/property/maintenance' },
    { icon: '📄', label: 'Run invoices', href: '/property/invoicing' },
  ];

  return (
    <div className="page">
      <KpiRow kpis={board} columns={5} />

      <div className="grid grid--main">
        <SectionCard title="Rent collection" subtitle="Percentage collected each month">
          <div className="chart">
            {(chart.data ?? []).map((c) => (
              <div className="chart__col" key={c.month as string}>
                <span className="num muted">{c.pct as number}%</span>
                <div className="chart__stack">
                  <div
                    style={{
                      height: `${c.pct as number}%`,
                      borderRadius: '6px 6px 0 0',
                      background: (c.pct as number) >= 95 ? '#28A745' : '#007BFF',
                    }}
                  />
                </div>
                <span className="chart__label">{c.month as string}</span>
              </div>
            ))}
          </div>
          <div className="row" style={{ gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            {collectLegend.map(([label, color]) => (
              <span className="row" style={{ gap: 6 }} key={label}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                <span className="muted">{label}</span>
              </span>
            ))}
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
            {!(alerts.data ?? []).length ? <div className="empty">No open property alerts.</div> : null}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid--main">
        <SectionCard title="Expiring leases" subtitle="Renewal offers go out 60 days before the end date" flush>
          <div className="table__scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Property</th>
                  <th>Lease ends</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(leases.data ?? []).map((l, i) => (
                  <tr key={i}>
                    <td className="strong">{l.tenant_name as string}</td>
                    <td>{l.property_label as string}</td>
                    <td className="num">{l.ends_label as string}</td>
                    <td>
                      <StatusPill tone={toneOf(l.tone)}>{l.status as string}</StatusPill>
                    </td>
                  </tr>
                ))}
                {!(leases.data ?? []).length ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty">No leases due for renewal.</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <div className="stack" style={{ gap: 18 }}>
          <SectionCard title="Recent activity">
            <div className="feed">
              {(activity.data ?? []).map((a) => (
                <div className="feed__row" key={a.id as string}>
                  <Dot color={SEVERITY_DOT[String(a.severity)] ?? '#007BFF'} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, lineHeight: 1.5 }}>{a.title as string}</div>
                    <div className="muted">{a.who as string}</div>
                  </div>
                  <span className="feed__when">{relative(a.occurred_at as string)}</span>
                </div>
              ))}
              {!(activity.data ?? []).length ? <div className="empty">No activity yet.</div> : null}
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
