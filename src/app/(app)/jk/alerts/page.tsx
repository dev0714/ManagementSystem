import { FilterChips, SectionCard, StatusPill, WhatsAppPreview } from '@/components/ui';
import { requireModule } from '@/lib/auth';
import { db } from '@/lib/db';
import { relative, severityTone } from '@/lib/format';

export const dynamic = 'force-dynamic';

const FILTERS = ['All', 'Critical', 'High', 'Medium'];

export default async function JkAlertsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { session, role } = await requireModule('jk', ['hq', 'manager', 'repairs']);
  const sp = await searchParams;
  const filter = FILTERS.includes(sp.filter ?? '') ? (sp.filter as string) : 'All';

  let query = db()
    .from('alerts')
    .select('id, severity, title, detail, location, rule, recipients, primary_action, whatsapp_body, created_at')
    .eq('tenant_id', session.tenantId)
    .eq('module', 'jk')
    .is('resolved_at', null)
    .order('created_at', { ascending: false });

  if (filter !== 'All') query = query.eq('severity', filter.toUpperCase());

  const { data } = await query;

  // Managers and repairs staff only see alerts addressed to them.
  const alerts = (data ?? []).filter((a) => {
    const to = String(a.recipients ?? '');
    if (role === 'manager') return to.includes('Site Manager');
    if (role === 'repairs') return to.includes('Repairs');
    return true;
  });

  return (
    <div className="page">
      <FilterChips options={FILTERS} active={filter} basePath="/jk/alerts" />

      <div className="stack" style={{ gap: 18 }}>
        {alerts.map((a) => (
          <SectionCard key={a.id as string}>
            <div className="row" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
              <StatusPill tone={severityTone(a.severity as string)}>{a.severity as string}</StatusPill>
              <span className="card__title">{a.title as string}</span>
              <div className="spacer" />
              <span className="muted">{relative(a.created_at as string)}</span>
            </div>

            <p style={{ margin: '0 0 14px', fontSize: 13, lineHeight: 1.6, color: 'var(--text-muted)' }}>
              {a.detail as string}
            </p>

            <div className="grid grid--main" style={{ gap: 18 }}>
              <div className="grid grid--2" style={{ gap: 10, alignContent: 'start' }}>
                <div className="tile">
                  <div className="tile__label">Location</div>
                  <div className="tile__value">{a.location as string}</div>
                </div>
                <div className="tile">
                  <div className="tile__label">Rule</div>
                  <div className="tile__value">{a.rule as string}</div>
                </div>
                <div className="tile">
                  <div className="tile__label">Escalated to</div>
                  <div className="tile__value">{a.recipients as string}</div>
                </div>
                <div className="tile">
                  <div className="tile__label">Next step</div>
                  <div className="tile__value">{a.primary_action as string}</div>
                </div>
              </div>

              {a.whatsapp_body ? <WhatsAppPreview body={a.whatsapp_body as string} /> : null}
            </div>
          </SectionCard>
        ))}

        {!alerts.length ? (
          <SectionCard>
            <div className="empty">No {filter === 'All' ? '' : filter.toLowerCase()} alerts for you right now.</div>
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
}
