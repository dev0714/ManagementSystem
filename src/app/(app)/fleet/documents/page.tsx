import { SectionCard, StatusPill } from '@/components/ui';
import { AddRecord, RowActions } from '@/components/ui/Crud';
import { requireModule } from '@/lib/auth';
import { db } from '@/lib/db';
import { toneOf } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function FleetDocumentsPage() {
  const { session } = await requireModule('fleet', ['fleet', 'hr']);

  const { data } = await db()
    .from('documents')
    .select('id, name, linked_to, uploaded_label, expires_label, status, tone, url, sort_order')
    .eq('tenant_id', session.tenantId)
    .eq('module', 'fleet')
    .order('sort_order');

  const docs = data ?? [];

  return (
    <div className="page">
      <AddRecord resource="fleet_document" tenantId={session.tenantId} label="document" />

      <SectionCard title="Document library" subtitle={`${docs.length} files · discs, licences, insurance and reports`} flush>
        <div className="table__scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Linked to</th>
                <th>Uploaded</th>
                <th>Expires</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id as string}>
                  <td className="strong">📄 {d.name as string}</td>
                  <td>{d.linked_to as string}</td>
                  <td className="num">{d.uploaded_label as string}</td>
                  <td className="num">{d.expires_label as string}</td>
                  <td>
                    <StatusPill tone={toneOf(d.tone)}>{d.status as string}</StatusPill>
                  </td>
                  <td>
                    <RowActions
                      resource="fleet_document"
                      tenantId={session.tenantId}
                      id={d.id as string}
                      name={d.name as string}
                      values={d as unknown as Record<string, unknown>}
                    />
                  </td>
                </tr>
              ))}
              {!docs.length ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty">No documents uploaded yet.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
