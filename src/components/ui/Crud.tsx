import { getResource } from '@/lib/crud';
import { db } from '@/lib/db';

import { DeleteRecordButton, RecordForm, type RefOption } from './RecordForm';

/** Load the options for any `ref` fields the resource declares. */
async function refOptions(resourceKey: string, tenantId: string): Promise<Record<string, RefOption[]>> {
  const resource = getResource(resourceKey);
  if (!resource) return {};

  const out: Record<string, RefOption[]> = {};
  for (const field of resource.fields) {
    if (field.type !== 'ref') continue;
    const { data } = await db()
      .from(field.table)
      .select(`id, ${field.labelColumn}`)
      .eq('tenant_id', tenantId)
      .order(field.labelColumn)
      .limit(200);
    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    out[field.name] = rows.map((r) => ({
      id: r.id as string,
      label: String(r[field.labelColumn] ?? ''),
    }));
  }
  return out;
}

/** Collapsible "＋ Add …" panel. Native <details>, so it works without JS. */
export async function AddRecord({
  resource,
  tenantId,
  label,
  defaults = {},
}: {
  resource: string;
  tenantId: string;
  label?: string;
  defaults?: Record<string, unknown>;
}) {
  const def = getResource(resource);
  if (!def) return null;
  const refs = await refOptions(resource, tenantId);

  return (
    <details className="card" style={{ padding: 0 }}>
      <summary
        style={{
          cursor: 'pointer',
          listStyle: 'none',
          padding: '13px 18px',
          fontWeight: 700,
          fontSize: 13.5,
          color: 'var(--primary-deep)',
        }}
      >
        ＋ Add {label ?? def.label}
      </summary>
      <div style={{ padding: '4px 18px 18px', borderTop: '1px solid var(--row)' }}>
        <RecordForm
          resource={resource}
          fields={def.fields as never}
          values={defaults}
          refs={refs}
          submitLabel={`Add ${label ?? def.label}`}
        />
      </div>
    </details>
  );
}

/** Per-row Edit (collapsible) + Delete. */
export async function RowActions({
  resource,
  tenantId,
  id,
  values,
  name,
}: {
  resource: string;
  tenantId: string;
  id: string;
  values: Record<string, unknown>;
  name: string;
}) {
  const def = getResource(resource);
  if (!def) return null;
  const refs = await refOptions(resource, tenantId);

  return (
    <details>
      <summary
        style={{
          cursor: 'pointer',
          listStyle: 'none',
          fontSize: 12.5,
          fontWeight: 600,
          color: 'var(--primary-deep)',
          whiteSpace: 'nowrap',
        }}
      >
        Edit
      </summary>
      <div
        className="card"
        style={{ marginTop: 10, padding: 16, minWidth: 320, maxWidth: 620, position: 'relative', zIndex: 5 }}
      >
        <RecordForm
          resource={resource}
          fields={def.fields as never}
          values={values}
          refs={refs}
          id={id}
          submitLabel="Save changes"
        />
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--row)' }}>
          <DeleteRecordButton resource={resource} id={id} name={name} />
        </div>
      </div>
    </details>
  );
}
