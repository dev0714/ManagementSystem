import { Dot, SectionCard, SourceBadge, StatusPill } from '@/components/ui';
import { AddRecord, RowActions } from '@/components/ui/Crud';
import { requireCrm } from '@/lib/auth';
import { db } from '@/lib/db';
import { SEVERITY_DOT, relative, toneOf } from '@/lib/format';
import type { SourceSlug } from '@/lib/types';

import { toggleTaskAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function ActivityPage() {
  const session = await requireCrm();
  const client = db();

  const [events, tasks] = await Promise.all([
    client
      .from('activity_events')
      .select('id, module, severity, title, who, occurred_at')
      .eq('tenant_id', session.tenantId)
      .is('contact_id', null)
      .order('occurred_at', { ascending: false })
      .limit(20),
    client
      .from('tasks')
      .select('id, title, meta, due_label, tone, is_done')
      .eq('tenant_id', session.tenantId)
      .order('is_done')
      .order('sort_order'),
  ]);

  return (
    <div className="page">
      <div className="grid grid--main-wide">
        <SectionCard title="Unified feed" subtitle="Everything the group did today">
          <div className="feed">
            {(events.data ?? []).map((e) => (
              <div className="feed__row" key={e.id as string}>
                <Dot color={SEVERITY_DOT[String(e.severity)] ?? '#007BFF'} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 8, marginBottom: 3 }}>
                    <SourceBadge source={e.module as SourceSlug} />
                    <span className="feed__title">{e.title as string}</span>
                  </div>
                  <div className="muted">{e.who as string}</div>
                </div>
                <span className="feed__when">{relative(e.occurred_at as string)}</span>
              </div>
            ))}
            {!(events.data ?? []).length ? <div className="empty">Nothing has happened yet today.</div> : null}
          </div>
        </SectionCard>

        <SectionCard title="My tasks" subtitle="Tick to complete">
          <div style={{ marginBottom: 14 }}>
            <AddRecord resource="task" tenantId={session.tenantId} />
          </div>
          <div className="stack">
            {(tasks.data ?? []).map((t) => (
              <div key={t.id as string}>
              <form action={toggleTaskAction}>
                <input type="hidden" name="id" value={t.id as string} />
                <input type="hidden" name="done" value={String(t.is_done)} />
                <button
                  type="submit"
                  className="checkrow"
                  data-checked={t.is_done ? 'true' : 'false'}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="checkbox" data-checked={t.is_done ? 'true' : 'false'} aria-hidden>
                    ✓
                  </span>
                  <span style={{ flex: 1, textAlign: 'left' }}>
                    <span
                      style={{
                        display: 'block',
                        fontWeight: 600,
                        color: 'var(--text-strong)',
                        textDecoration: t.is_done ? 'line-through' : 'none',
                      }}
                    >
                      {t.title as string}
                    </span>
                    <span className="muted">{t.meta as string}</span>
                  </span>
                  <StatusPill tone={toneOf(t.tone)}>{t.due_label as string}</StatusPill>
                </button>
              </form>
              <div style={{ padding: '6px 0 0 34px' }}>
                <RowActions
                  resource="task"
                  tenantId={session.tenantId}
                  id={t.id as string}
                  name={t.title as string}
                  values={t as unknown as Record<string, unknown>}
                />
              </div>
              </div>
            ))}
            {!(tasks.data ?? []).length ? <div className="empty">No tasks assigned.</div> : null}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
