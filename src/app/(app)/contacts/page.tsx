import Link from 'next/link';

import { Avatar, Dot, FieldTile, FilterChips, SectionCard, StatusPill } from '@/components/ui';
import { AddRecord, RowActions } from '@/components/ui/Crud';
import { requireCrm } from '@/lib/auth';
import { db } from '@/lib/db';
import { relative, toneOf } from '@/lib/format';
import type { SourceSlug, Tone } from '@/lib/types';

export const dynamic = 'force-dynamic';

const FILTERS = ['All', 'Tenant', 'Client', 'Supplier', 'Prospect', 'Staff'];

const SOURCE_COLOR: Record<SourceSlug, string> = {
  jk: '#1B5E20',
  fleet: '#0060CC',
  prop: '#8A5A08',
  crm: '#6B21A8',
};

const TYPE_TONE: Record<string, Tone> = {
  Tenant: 'info',
  Supplier: 'grey',
  Client: 'ok',
  Prospect: 'purple',
  Staff: 'warn',
};

type ContactRow = {
  id: string;
  name: string;
  initials: string;
  type: string;
  phone: string | null;
  linked_to: string | null;
  status: string;
  tone: string;
  role_line: string | null;
};

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; id?: string }>;
}) {
  const session = await requireCrm();
  const sp = await searchParams;
  const filter = FILTERS.includes(sp.filter ?? '') ? (sp.filter as string) : 'All';
  const client = db();

  let query = client
    .from('contacts')
    .select('id, name, initials, type, phone, linked_to, status, tone, role_line')
    .eq('tenant_id', session.tenantId)
    .order('created_at');
  if (filter !== 'All') query = query.eq('type', filter);

  const { data } = await query;
  const contacts = (data ?? []) as ContactRow[];

  const selectedId = sp.id && contacts.some((c) => c.id === sp.id) ? sp.id : contacts[0]?.id;
  const selected = contacts.find((c) => c.id === selectedId) ?? null;

  const [fieldsRes, timelineRes] = selected
    ? await Promise.all([
        client
          .from('contact_fields')
          .select('id, label, value, sort_order, contact_id')
          .eq('tenant_id', session.tenantId)
          .eq('contact_id', selected.id)
          .order('sort_order'),
        client
          .from('activity_events')
          .select('module, title, who, occurred_at')
          .eq('tenant_id', session.tenantId)
          .eq('contact_id', selected.id)
          .order('occurred_at', { ascending: false })
          .limit(12),
      ])
    : [{ data: [] }, { data: [] }];

  const qs = (id: string) => `/contacts?${filter !== 'All' ? `filter=${encodeURIComponent(filter)}&` : ''}id=${id}`;

  return (
    <div className="page">
      <div className="grid grid--main">
        <div className="stack" style={{ gap: 16 }}>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <FilterChips options={FILTERS} active={filter} basePath="/contacts" />
            <div className="spacer" />
            <span className="muted">{contacts.length} contacts</span>
          </div>

          <AddRecord resource="contact" tenantId={session.tenantId} />

          <SectionCard flush>
            <div className="table__scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Contact</th>
                    <th>Type</th>
                    <th>Linked to</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c.id} data-selected={c.id === selectedId}>
                      <td>
                        <Link href={qs(c.id)} className="row" style={{ color: 'inherit' }}>
                          <Avatar initials={c.initials} />
                          <span>
                            <span className="strong" style={{ display: 'block' }}>
                              {c.name}
                            </span>
                            <span className="muted">{c.phone ?? '—'}</span>
                          </span>
                        </Link>
                      </td>
                      <td>
                        <span className={`chip tone-${TYPE_TONE[c.type] ?? 'grey'}`}>{c.type}</span>
                      </td>
                      <td>{c.linked_to ?? '—'}</td>
                      <td>
                        <StatusPill tone={toneOf(c.tone)}>{c.status}</StatusPill>
                      </td>
                      <td>
                        <RowActions
                          resource="contact"
                          tenantId={session.tenantId}
                          id={c.id}
                          name={c.name}
                          values={c as unknown as Record<string, unknown>}
                        />
                      </td>
                    </tr>
                  ))}
                  {!contacts.length ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty">No {filter === 'All' ? '' : filter.toLowerCase()} contacts yet.</div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        {selected ? (
          <div className="stack" style={{ gap: 18 }}>
            <SectionCard>
              <div className="row" style={{ marginBottom: 14 }}>
                <Avatar initials={selected.initials} size="lg" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-strong)' }}>{selected.name}</div>
                  <div className="card__sub">{selected.role_line}</div>
                </div>
                <StatusPill tone={toneOf(selected.tone)}>{selected.status}</StatusPill>
              </div>

              <div className="grid grid--2" style={{ gap: 10 }}>
                {(fieldsRes.data ?? []).map((f) => (
                  <FieldTile key={f.label as string} label={f.label as string} value={f.value as string} />
                ))}
              </div>

              <div style={{ marginTop: 14 }}>
                <AddRecord
                  resource="contact_field"
                  tenantId={session.tenantId}
                  label="detail field"
                  defaults={{ contact_id: selected.id }}
                />
              </div>
            </SectionCard>

            <SectionCard title="Cross-system timeline" subtitle="Every module writes here">
              <div className="timeline">
                {(timelineRes.data ?? []).map((e, i) => (
                  <div className="timeline__row" key={i}>
                    <Dot color={SOURCE_COLOR[e.module as SourceSlug] ?? '#8494A7'} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.5 }}>{e.title as string}</div>
                      <div className="muted" style={{ marginTop: 2 }}>
                        {(e.who as string) || relative(e.occurred_at as string)}
                      </div>
                    </div>
                  </div>
                ))}
                {!(timelineRes.data ?? []).length ? <div className="empty">Nothing logged for this contact yet.</div> : null}
              </div>
            </SectionCard>

            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <a
                className="btn btn--sm btn--wa"
                href={`https://wa.me/${(selected.phone ?? '').replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#fff' }}
              >
                WhatsApp
              </a>
              <button className="btn btn--sm btn--ghost" type="button">
                Log a call
              </button>
              <button className="btn btn--sm btn--ghost" type="button">
                Create task
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
