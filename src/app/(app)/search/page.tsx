import Link from 'next/link';

import { SectionCard } from '@/components/ui';
import { requireSession, roleIn } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Hit = { label: string; detail: string; href: string; kind: string };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await requireSession();
  const q = (await searchParams).q?.trim() ?? '';

  if (!q) {
    return (
      <div className="page">
        <SectionCard>
          <div className="empty">Type something into the search box above.</div>
        </SectionCard>
      </div>
    );
  }

  const client = db();
  const like = `%${q}%`;
  const hits: Hit[] = [];

  // Search is permission-aware: you only search what you can already reach.
  if (session.hasCrm) {
    const { data } = await client
      .from('contacts')
      .select('id, name, type, linked_to')
      .eq('tenant_id', session.tenantId)
      .ilike('name', like)
      .limit(8);
    for (const c of data ?? []) {
      hits.push({ label: c.name as string, detail: `${c.type} · ${c.linked_to ?? ''}`, href: `/contacts?id=${c.id}`, kind: 'Contact' });
    }
  }

  if (roleIn(session, 'fleet')) {
    const { data } = await client
      .from('vehicles')
      .select('plate, model, driver_name')
      .eq('tenant_id', session.tenantId)
      .or(`plate.ilike.${like},model.ilike.${like},driver_name.ilike.${like}`)
      .limit(8);
    for (const v of data ?? []) {
      hits.push({ label: v.plate as string, detail: `${v.model} · ${v.driver_name ?? ''}`, href: '/fleet/vehicles', kind: 'Vehicle' });
    }
  }

  if (roleIn(session, 'prop')) {
    const [props, jobs] = await Promise.all([
      client.from('properties').select('id, address, area').eq('tenant_id', session.tenantId).ilike('address', like).limit(8),
      client.from('fault_jobs').select('id, ref, title, property_label').eq('tenant_id', session.tenantId).or(`ref.ilike.${like},title.ilike.${like}`).limit(8),
    ]);
    for (const p of props.data ?? []) {
      hits.push({ label: p.address as string, detail: p.area as string, href: '/property/properties', kind: 'Property' });
    }
    for (const j of jobs.data ?? []) {
      hits.push({
        label: `${j.ref} — ${j.title}`,
        detail: j.property_label as string,
        href: `/property/maintenance?job=${j.id}`,
        kind: 'Fault job',
      });
    }
  }

  if (roleIn(session, 'jk')) {
    const { data } = await client
      .from('sites')
      .select('name, suburb')
      .eq('tenant_id', session.tenantId)
      .or(`name.ilike.${like},suburb.ilike.${like}`)
      .limit(8);
    for (const s of data ?? []) {
      hits.push({ label: s.name as string, detail: s.suburb as string, href: '/jk', kind: 'Site' });
    }
  }

  return (
    <div className="page">
      <SectionCard title={`Results for “${q}”`} subtitle={`${hits.length} match${hits.length === 1 ? '' : 'es'} in your workspace`}>
        <div className="stack">
          {hits.map((h, i) => (
            <Link href={h.href} key={i} className="row" style={{ color: 'inherit', padding: '10px 0', borderTop: i ? '1px solid var(--row)' : undefined }}>
              <span className="chip tone-grey">{h.kind}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="strong" style={{ display: 'block' }}>
                  {h.label}
                </span>
                <span className="muted">{h.detail}</span>
              </span>
              <span className="muted">Open →</span>
            </Link>
          ))}
          {!hits.length ? <div className="empty">Nothing matched.</div> : null}
        </div>
      </SectionCard>
    </div>
  );
}
