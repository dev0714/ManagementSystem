import { Dot, SectionCard } from '@/components/ui';
import { requireModule } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default async function FleetEventsPage() {
  const { session } = await requireModule('fleet', ['fleet', 'line', 'hr']);

  const { data } = await db()
    .from('fleet_events')
    .select('id, title, detail, when_label, day_of_month, color')
    .eq('tenant_id', session.tenantId)
    .order('sort_order');

  const events = data ?? [];

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  // Monday-first offset.
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();

  const dotsFor = (day: number) => events.filter((e) => e.day_of_month === day).map((e) => e.color as string);

  return (
    <div className="page">
      <div className="grid grid--main">
        <SectionCard
          title={now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          subtitle="Recurring fleet obligations"
        >
          <div className="calendar" style={{ marginBottom: 8 }}>
            {DAY_NAMES.map((d) => (
              <div key={d} className="chart__label" style={{ textAlign: 'center', padding: '4px 0' }}>
                {d}
              </div>
            ))}
          </div>
          <div className="calendar">
            {Array.from({ length: 42 }, (_, idx) => {
              const num = idx - offset + 1;
              const inMonth = num >= 1 && num <= daysInMonth;
              return (
                <div className="calendar__cell" key={idx} data-today={inMonth && num === today} data-out={!inMonth}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: inMonth && num === today ? 800 : 600,
                      color: !inMonth ? '#C3CDD8' : num === today ? 'var(--primary-deep)' : 'var(--text-body)',
                    }}
                  >
                    {inMonth ? num : ''}
                  </div>
                  <div className="row" style={{ gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                    {inMonth
                      ? dotsFor(num).map((c, i) => (
                          <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />
                        ))
                      : null}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Coming up">
          <div className="feed">
            {events.map((e) => (
              <div className="feed__row" key={e.id as string}>
                <Dot color={e.color as string} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="feed__title">{e.title as string}</div>
                  <div className="feed__detail">{e.detail as string}</div>
                </div>
                <span className="feed__when">{e.when_label as string}</span>
              </div>
            ))}
            {!events.length ? <div className="empty">Nothing scheduled.</div> : null}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
