import { redirect } from 'next/navigation';

import { Countdown } from '@/components/ui/Countdown';
import { Dot, FlagCard, KpiRow, ProgressBar, SectionCard, StatusPill } from '@/components/ui';
import { requireModule } from '@/lib/auth';
import { db } from '@/lib/db';
import { relative, toneOf } from '@/lib/format';
import { nextPrayer, pad2, prayerTimes, statusOf } from '@/lib/prayer';
import { kpis } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function JkDashboardPage() {
  const { session, role } = await requireModule('jk');
  if (role === 'cleaner') redirect('/jk/shift');
  if (role === 'repairs') redirect('/jk/repairs');

  const isManager = role === 'manager';
  const t = session.tenantId;
  const client = db();

  const [board, times, sitesRes, shiftsRes, alertsRes, assetsRes] = await Promise.all([
    kpis(t, isManager ? 'jk_manager' : 'jk'),
    prayerTimes(t),
    client.from('sites').select('id, name, suburb, manager_id').eq('tenant_id', t).order('name'),
    client.from('shifts').select('site_id, cleaner_name, clock_in_at, selfie_status, checklist_state, status, tone').eq('tenant_id', t),
    client
      .from('alerts')
      .select('severity, title, detail, created_at, recipients')
      .eq('tenant_id', t)
      .eq('module', 'jk')
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(4),
    client.from('asset_reviews').select('name, site_label, fails').eq('tenant_id', t).order('sort_order'),
  ]);

  const next = nextPrayer(times);
  const allSites = sitesRes.data ?? [];
  // A site manager only sees the sites they are responsible for.
  const sites = isManager ? allSites.filter((s) => s.manager_id === session.userId) : allSites;
  const shifts = shiftsRes.data ?? [];
  const shiftFor = (siteId: string) => shifts.find((s) => s.site_id === siteId);

  const ready = sites.filter((s) => shiftFor(s.id)?.tone === 'ok').length;
  const inProgress = sites.filter((s) => shiftFor(s.id)?.tone === 'warn').length;
  const overdue = sites.filter((s) => shiftFor(s.id)?.tone === 'bad').length;
  const readyPct = sites.length ? Math.round((ready / sites.length) * 100) : 0;

  const quickActions = [
    { icon: '🕌', label: 'Add venue', href: '/jk/operations' },
    { icon: '📝', label: 'Edit checklist', href: '/jk/operations' },
    { icon: '👤', label: 'Add cleaner', href: '/admin/users' },
    { icon: '📦', label: 'Approve POs', href: '/jk/operations' },
  ];

  return (
    <div className="page">
      <KpiRow kpis={board} columns={4} />

      <div className="grid grid--main">
        <div className="stack" style={{ gap: 18 }}>
          {next ? (
            <SectionCard>
              <div className="row" style={{ flexWrap: 'wrap', gap: 18 }}>
                <div>
                  <div className="kpi__label">Next prayer</div>
                  <div className="kpi__value" style={{ marginBottom: 0 }}>
                    {next.prayer.name} · {pad2(next.prayer.hour)}:{pad2(next.prayer.minute)}
                  </div>
                </div>
                <div className="spacer" />
                <div style={{ textAlign: 'right' }}>
                  <div className="kpi__label">Checklist deadline (T−15)</div>
                  <div className="kpi__value" style={{ marginBottom: 0, color: 'var(--primary-deep)' }}>
                    <Countdown targetEpochMs={next.targetEpochMs} offsetSeconds={900} />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <div className="row" style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>Site readiness</span>
                  <div className="spacer" />
                  <span className="num strong">
                    {ready} of {sites.length} confirmed
                  </span>
                </div>
                <ProgressBar pct={readyPct} color="#28A745" />
                <div className="row" style={{ gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                  <span className="row" style={{ gap: 6 }}>
                    <Dot color="#28A745" /> <span className="muted">{ready} ready</span>
                  </span>
                  <span className="row" style={{ gap: 6 }}>
                    <Dot color="#FFC107" /> <span className="muted">{inProgress} in progress</span>
                  </span>
                  <span className="row" style={{ gap: 6 }}>
                    <Dot color="#DC3545" /> <span className="muted">{overdue} overdue</span>
                  </span>
                </div>
              </div>
            </SectionCard>
          ) : null}

          <SectionCard title={isManager ? 'My cleaners' : 'Site readiness'} flush>
            <div className="table__scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>{isManager ? 'Cleaner' : 'Site'}</th>
                    <th>Clock-in</th>
                    <th>Selfie</th>
                    <th>Checklist</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sites.map((s) => {
                    const sh = shiftFor(s.id);
                    return (
                      <tr key={s.id}>
                        <td className="strong">{isManager ? sh?.cleaner_name ?? '—' : `${s.name} — ${s.suburb}`}</td>
                        <td className="num">{sh?.clock_in_at ?? '—'}</td>
                        <td
                          style={{
                            fontWeight: 600,
                            color: sh?.selfie_status === 'approved' ? '#15803D' : '#C0392B',
                          }}
                        >
                          {sh ? (sh.selfie_status === 'approved' ? 'Approved' : 'Rejected') : '—'}
                        </td>
                        <td>{sh?.checklist_state ?? '—'}</td>
                        <td>
                          <StatusPill tone={toneOf(sh?.tone)}>{sh?.status ?? 'No shift'}</StatusPill>
                        </td>
                      </tr>
                    );
                  })}
                  {!sites.length ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty">No sites assigned to you.</div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <div className="stack" style={{ gap: 18 }}>
          <SectionCard title="Prayer times today">
            <div className="stack">
              {times.map((p) => {
                const st = next ? statusOf(p, next.prayer.name) : 'Upcoming';
                const tone = st === 'Done' ? 'ok' : st === 'Due' ? 'warn' : 'grey';
                return (
                  <div className="row" key={p.name}>
                    <Dot color={st === 'Done' ? '#28A745' : st === 'Due' ? '#FFC107' : '#D6DEE8'} />
                    <span className="strong">{p.name}</span>
                    <div className="spacer" />
                    <span className="num muted">
                      {pad2(p.hour)}:{pad2(p.minute)}
                    </span>
                    <StatusPill tone={tone}>{st}</StatusPill>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="Red flags">
            <div className="stack">
              {(alertsRes.data ?? []).map((a, i) => (
                <FlagCard
                  key={i}
                  tone={a.severity === 'CRITICAL' ? 'bad' : 'warn'}
                  title={a.title as string}
                  when={relative(a.created_at as string)}
                  detail={a.detail as string}
                />
              ))}
              {!(alertsRes.data ?? []).length ? <div className="empty">No open alerts.</div> : null}
            </div>
          </SectionCard>

          {!isManager ? (
            <>
              <SectionCard title="Assets under review" subtitle="Repeat failures in the last 30 days">
                <div className="stack">
                  {(assetsRes.data ?? []).map((a, i) => (
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
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
