import { Dot, KpiRow, ProgressBar, SectionCard, StatusPill } from '@/components/ui';
import { requireModule } from '@/lib/auth';
import { db } from '@/lib/db';
import { toneOf } from '@/lib/format';
import { kpis } from '@/lib/queries';

export const dynamic = 'force-dynamic';

const TONE_HEX: Record<string, string> = {
  ok: '#28A745',
  warn: '#FFC107',
  bad: '#DC3545',
  info: '#007BFF',
  grey: '#8494A7',
  purple: '#6B21A8',
};

export default async function JkOperationsPage() {
  const { session } = await requireModule('jk', ['hq', 'repairs']);
  const t = session.tenantId;
  const client = db();

  const [board, chart, stock, jobs, rules, template] = await Promise.all([
    kpis(t, 'jk_ops'),
    client.from('prayer_compliance').select('prayer, on_time_pct, late_pct').eq('tenant_id', t).order('sort_order'),
    client.from('stock_items').select('name, level_pct, note').eq('tenant_id', t).order('sort_order'),
    client
      .from('maintenance_jobs')
      .select('ref, fault, repeat_flag, site_label, owner, age_label, sla_label, tone')
      .eq('tenant_id', t)
      .eq('status', 'open')
      .order('created_at'),
    client.from('trigger_rules').select('name, description, tone').eq('tenant_id', t).eq('module', 'jk').order('sort_order'),
    client.from('checklist_templates').select('id, name, scope').eq('tenant_id', t).eq('module', 'jk').order('sort_order').limit(1).maybeSingle(),
  ]);

  const items = template.data
    ? (
        await client
          .from('checklist_items')
          .select('label, kind, required')
          .eq('tenant_id', t)
          .eq('template_id', template.data.id as string)
          .order('sort_order')
      ).data ?? []
    : [];

  const rows = chart.data ?? [];
  const maxBar = Math.max(100, ...rows.map((r) => (r.on_time_pct as number) + (r.late_pct as number)));

  return (
    <div className="page">
      <KpiRow kpis={board} columns={4} />

      <div className="grid grid--main">
        <SectionCard title="Compliance by prayer" subtitle="On time vs late, this month">
          <div className="chart">
            {rows.map((c) => (
              <div className="chart__col" key={c.prayer as string}>
                <span className="num muted">{c.on_time_pct as number}%</span>
                <div className="chart__stack">
                  <div
                    style={{
                      height: `${((c.late_pct as number) / maxBar) * 100}%`,
                      background: '#FFC107',
                      borderRadius: '5px 5px 0 0',
                    }}
                  />
                  <div
                    style={{
                      height: `${((c.on_time_pct as number) / maxBar) * 100}%`,
                      background: '#007BFF',
                      borderRadius: (c.late_pct as number) ? '0 0 5px 5px' : '5px',
                    }}
                  />
                </div>
                <span className="chart__label">{c.prayer as string}</span>
              </div>
            ))}
          </div>
          <div className="row" style={{ gap: 16, marginTop: 12 }}>
            <span className="row" style={{ gap: 6 }}>
              <Dot color="#007BFF" /> <span className="muted">On time</span>
            </span>
            <span className="row" style={{ gap: 6 }}>
              <Dot color="#FFC107" /> <span className="muted">Late</span>
            </span>
          </div>
        </SectionCard>

        <SectionCard title="Stock levels" subtitle="Reorder triggers at 15%">
          <div className="stack" style={{ gap: 14 }}>
            {(stock.data ?? []).map((s) => {
              const pct = s.level_pct as number;
              const color = pct < 15 ? '#DC3545' : pct < 35 ? '#FFC107' : '#28A745';
              return (
                <div key={s.name as string}>
                  <div className="row" style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>{s.name as string}</span>
                    <div className="spacer" />
                    <span className="num strong">{pct}%</span>
                  </div>
                  <ProgressBar pct={pct} color={color} />
                  <div className="muted" style={{ marginTop: 5 }}>
                    {s.note as string}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Maintenance & SLA" subtitle="48-hour repair SLA" flush>
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
              </tr>
            </thead>
            <tbody>
              {(jobs.data ?? []).map((j) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="grid grid--main">
        <SectionCard title={`Checklist template — ${template.data?.name ?? 'Salaah readiness'}`} subtitle={template.data?.scope as string}>
          <div className="stack">
            {items.map((i, idx) => (
              <div className="row" key={idx}>
                <span className="strong" style={{ flex: 1 }}>
                  {i.label as string}
                </span>
                <span className="pill tone-grey">{i.kind as string}</span>
                <StatusPill tone={i.required ? 'info' : 'grey'}>{i.required ? 'Required' : 'Optional'}</StatusPill>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Automation triggers" subtitle="What fires, and to whom">
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
      </div>
    </div>
  );
}
