import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Dot, KpiRow, ProgressBar, SectionCard, SourceBadge, StatusPill } from '@/components/ui';
import { requireSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { SEVERITY_DOT, relative, zar } from '@/lib/format';
import { kpis } from '@/lib/queries';
import type { SourceSlug, Tone } from '@/lib/types';

export const dynamic = 'force-dynamic';

const MODULE_CARDS: { slug: 'jk' | 'fleet' | 'prop'; icon: string; name: string; bg: string; href: string }[] = [
  { slug: 'jk', icon: '🕌', name: 'Masjid Ops', bg: '#E8F5E9', href: '/jk' },
  { slug: 'fleet', icon: '🚐', name: 'Fleet', bg: '#EAF3FF', href: '/fleet' },
  { slug: 'prop', icon: '🏠', name: 'Property', bg: '#FFF3E0', href: '/property' },
];

export default async function GroupOverviewPage() {
  const session = await requireSession();
  // Only the super admin gets the group view; everyone else goes to their workspace.
  if (!session.isSuperAdmin) redirect(session.home);

  const t = session.tenantId;
  const client = db();

  const [board, feed, sites, vehicles, properties, tenantsCount, jobs, faults, users, deals] = await Promise.all([
    kpis(t, 'group'),
    client
      .from('alerts')
      .select('module, severity, title, detail, created_at')
      .eq('tenant_id', t)
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(8),
    client.from('sites').select('id', { count: 'exact', head: true }).eq('tenant_id', t),
    client.from('vehicles').select('id', { count: 'exact', head: true }).eq('tenant_id', t),
    client.from('properties').select('occupancy').eq('tenant_id', t),
    client.from('property_tenants').select('id', { count: 'exact', head: true }).eq('tenant_id', t),
    client.from('maintenance_jobs').select('id', { count: 'exact', head: true }).eq('tenant_id', t).eq('status', 'open'),
    client.from('fault_jobs').select('stage').eq('tenant_id', t),
    client.from('users').select('is_active, temp_access_until').eq('tenant_id', t),
    client.from('deals').select('stage, value').eq('tenant_id', t),
  ]);

  const propRows = properties.data ?? [];
  const occupied = propRows.filter((p) => p.occupancy === 'Occupied').length;
  const occupancyPct = propRows.length ? Math.round((occupied / propRows.length) * 100) : 0;
  const openFaults = (faults.data ?? []).filter((f) => f.stage !== 'Completed').length;

  const systemCards = [
    {
      ...MODULE_CARDS[0],
      sub: `${sites.count ?? 0} prayer facilities`,
      health: (jobs.count ?? 0) > 5 ? '1 overdue' : 'Healthy',
      tone: ((jobs.count ?? 0) > 5 ? 'bad' : 'ok') as Tone,
      stats: [
        ['Sites ready', `${Math.max(0, (sites.count ?? 0) - 1)}/${sites.count ?? 0}`],
        ['Open jobs', String(jobs.count ?? 0)],
      ],
    },
    {
      ...MODULE_CARDS[1],
      sub: `${vehicles.count ?? 0} vehicles`,
      health: 'SLA risk',
      tone: 'warn' as Tone,
      stats: [
        ['On road', String(vehicles.count ?? 0)],
        ['Expiring', '5'],
      ],
    },
    {
      ...MODULE_CARDS[2],
      sub: `${propRows.length} properties · ${tenantsCount.count ?? 0} tenants`,
      health: openFaults > 3 ? 'Attention' : 'Healthy',
      tone: (openFaults > 3 ? 'warn' : 'ok') as Tone,
      stats: [
        ['Occupancy', `${occupancyPct}%`],
        ['Faults', String(openFaults)],
      ],
    },
  ];

  const dealRows = deals.data ?? [];
  const won = dealRows.filter((d) => d.stage === 'won').reduce((s, d) => s + Number(d.value), 0);
  const openValue = dealRows.filter((d) => !['won', 'lost'].includes(d.stage)).reduce((s, d) => s + Number(d.value), 0);

  const money: [string, string, number, string][] = [
    ['Won this year', zar(won), 95, '#28A745'],
    ['Open pipeline', zar(openValue), 88, '#007BFF'],
    ['Portfolio rent roll', zar(propRows.length * 12000), 62, '#FFC107'],
  ];

  const userRows = users.data ?? [];
  const temps = userRows.filter((u) => u.temp_access_until).length;
  const accessStats: [string, string, string][] = [
    ['Active users', String(userRows.filter((u) => u.is_active).length), '#28A745'],
    ['Temporary contractor logins', String(temps), '#FFC107'],
    ['Modules in production', '3', '#007BFF'],
    ['Workspaces (tenants)', '1', '#8494A7'],
  ];

  return (
    <div className="page">
      <KpiRow kpis={board} columns={5} />

      <div className="grid grid--3">
        {systemCards.map((s) => (
          <div className="card" key={s.slug}>
            <div className="row" style={{ marginBottom: 14 }}>
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 11,
                  background: s.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 19,
                  flex: 'none',
                }}
                aria-hidden
              >
                {s.icon}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="card__title">{s.name}</div>
                <div className="card__sub">{s.sub}</div>
              </div>
              <StatusPill tone={s.tone}>{s.health}</StatusPill>
            </div>
            <div className="grid grid--2" style={{ gap: 10, marginBottom: 14 }}>
              {s.stats.map(([label, value]) => (
                <div className="tile" key={label}>
                  <div className="tile__label">{label}</div>
                  <div className="tile__value">{value}</div>
                </div>
              ))}
            </div>
            <Link href={s.href} className="btn btn--sm" style={{ display: 'inline-block', textDecoration: 'none' }}>
              Open {s.name}
            </Link>
          </div>
        ))}
      </div>

      <div className="grid grid--main">
        <SectionCard title="Group alert feed" subtitle="Live escalations from every module">
          <div className="feed">
            {(feed.data ?? []).map((a, i) => (
              <div className="feed__row" key={i}>
                <Dot color={SEVERITY_DOT[String(a.severity).toLowerCase()] ?? '#007BFF'} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 8, marginBottom: 3 }}>
                    <SourceBadge source={a.module as SourceSlug} />
                    <span className="feed__title">{a.title}</span>
                  </div>
                  <div className="feed__detail">{a.detail}</div>
                </div>
                <span className="feed__when">{relative(a.created_at as string)}</span>
              </div>
            ))}
            {!(feed.data ?? []).length ? <div className="empty">No open alerts. Everything is on track.</div> : null}
          </div>
        </SectionCard>

        <div className="stack" style={{ gap: 18 }}>
          <SectionCard title="Revenue & cost">
            <div className="stack" style={{ gap: 16 }}>
              {money.map(([label, value, pct, color]) => (
                <div key={label}>
                  <div className="row" style={{ marginBottom: 7 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-body)' }}>{label}</span>
                    <div className="spacer" />
                    <span className="num strong">{value}</span>
                  </div>
                  <ProgressBar pct={pct} color={color} />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Access & licences">
            <div className="stack">
              {accessStats.map(([label, value, color]) => (
                <div className="row" key={label}>
                  <Dot color={color} />
                  <span style={{ fontSize: 12.5 }}>{label}</span>
                  <div className="spacer" />
                  <span className="num strong">{value}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
