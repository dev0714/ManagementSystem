'use server';

import { revalidatePath } from 'next/cache';

import { getSession, hashPassword, roleIn } from '@/lib/auth';
import { getResource, type Field, type Permission, type Resource } from '@/lib/crud';
import { db } from '@/lib/db';
import type { Session } from '@/lib/types';

function allowed(session: Session, permission: Permission): boolean {
  if (permission.kind === 'admin') return session.isSuperAdmin;
  if (permission.kind === 'crm') return session.hasCrm || session.isSuperAdmin;
  const role = roleIn(session, permission.module);
  return role !== null && permission.roles.includes(role);
}

const BLANK = Symbol('blank');

/**
 * Turn form input into a column value.
 *
 * A blank input returns the BLANK sentinel rather than null, because the two
 * mean different things: NULL is only safe on columns declared `nullable`.
 * On everything else blank means "use the column default" (insert) or "leave
 * it alone" (update) — writing NULL there would break the NOT NULL
 * constraints the schema depends on.
 */
function coerce(field: Field, raw: FormDataEntryValue | null): unknown | typeof BLANK {
  if (field.type === 'bool') return raw !== null;

  const value = typeof raw === 'string' ? raw.trim() : '';
  if (value === '') return BLANK;

  if (field.type === 'number' || field.type === 'money') {
    const n = Number(value);
    return Number.isFinite(n) ? n : BLANK;
  }
  return value;
}

async function authorise(key: string): Promise<{ session: Session; resource: Resource } | { error: string }> {
  const session = await getSession();
  if (!session) return { error: 'Your session has expired. Sign in again.' };

  const resource = getResource(key);
  if (!resource) return { error: 'Unknown record type.' };
  if (!allowed(session, resource.permission)) return { error: 'You do not have permission to change that.' };

  return { session, resource };
}

function done(resource: Resource) {
  for (const path of resource.revalidate) revalidatePath(path);
}

export type CrudState = { error?: string; ok?: string };

/**
 * Create or update one record. `id` present means update.
 *
 * Only columns declared in the resource's field list are written, and every
 * statement is filtered by the session's tenant, so neither the table nor the
 * workspace can be influenced by the submitted form.
 */
export async function saveRecord(_prev: CrudState, formData: FormData): Promise<CrudState> {
  const key = String(formData.get('__resource') ?? '');
  const auth = await authorise(key);
  if ('error' in auth) return { error: auth.error };
  const { session, resource } = auth;

  const id = String(formData.get('__id') ?? '');
  const isUpdate = id !== '';

  const values: Record<string, unknown> = {};
  for (const field of resource.fields) {
    if (field.type === 'password') continue; // handled below
    const value = coerce(field, formData.get(field.name));
    const required = 'required' in field && field.required;

    if (value === BLANK) {
      if (required) return { error: `${field.label} is required.` };
      // Only a genuinely nullable column can be cleared; otherwise fall through
      // to the column default on insert, or leave the value untouched on update.
      if ('nullable' in field && field.nullable) values[field.name] = null;
      continue;
    }

    values[field.name] = value;
  }

  // Passwords are hashed here and never stored or echoed in the clear.
  const passwordField = resource.fields.find((f) => f.type === 'password');
  if (passwordField) {
    const plain = String(formData.get(passwordField.name) ?? '').trim();
    if (plain) {
      if (plain.length < 8) return { error: 'Password must be at least 8 characters.' };
      values.password_hash = await hashPassword(plain);
    } else if (!isUpdate) {
      return { error: 'Set a password for the new user.' };
    }
  }

  const client = db();
  const title = String(values[resource.titleColumn] ?? '').slice(0, 120);

  if (isUpdate) {
    const { error } = await client
      .from(resource.table)
      .update(values)
      .eq('id', id)
      .eq('tenant_id', session.tenantId);
    if (error) return { error: friendly(error.message) };
  } else {
    const { error } = await client
      .from(resource.table)
      .insert({ ...resource.defaults, ...values, tenant_id: session.tenantId });
    if (error) return { error: friendly(error.message) };
  }

  if (resource.activityModule) {
    await client.from('activity_events').insert({
      tenant_id: session.tenantId,
      module: resource.activityModule,
      severity: 'info',
      title: `${isUpdate ? 'Updated' : 'Added'} ${resource.label} — ${title}`,
      who: session.name,
      actor_id: session.userId,
    });
  }

  done(resource);
  return { ok: `${isUpdate ? 'Saved' : 'Added'} ${resource.label}.` };
}

export async function deleteRecord(_prev: CrudState, formData: FormData): Promise<CrudState> {
  const key = String(formData.get('__resource') ?? '');
  const auth = await authorise(key);
  if ('error' in auth) return { error: auth.error };
  const { session, resource } = auth;

  const id = String(formData.get('__id') ?? '');
  if (!id) return { error: 'Nothing to delete.' };

  const client = db();
  const { data: existing } = await client
    .from(resource.table)
    .select(resource.titleColumn)
    .eq('id', id)
    .eq('tenant_id', session.tenantId)
    .maybeSingle();

  if (!existing) return { error: 'That record is not in your workspace.' };

  // Guard against a super admin deleting the account they are signed in with.
  if (resource.table === 'users' && id === session.userId) {
    return { error: 'You cannot delete the account you are signed in with.' };
  }

  const { error } = await client.from(resource.table).delete().eq('id', id).eq('tenant_id', session.tenantId);
  if (error) return { error: friendly(error.message) };

  if (resource.activityModule) {
    await client.from('activity_events').insert({
      tenant_id: session.tenantId,
      module: resource.activityModule,
      severity: 'medium',
      title: `Deleted ${resource.label} — ${String((existing as unknown as Record<string, unknown>)[resource.titleColumn] ?? '')}`.slice(0, 160),
      who: session.name,
      actor_id: session.userId,
    });
  }

  done(resource);
  return { ok: `Deleted ${resource.label}.` };
}

/** Postgres errors are precise but unfriendly; translate the common ones. */
function friendly(message: string): string {
  if (message.includes('duplicate key')) return 'That already exists — the value must be unique.';
  if (message.includes('violates foreign key')) return 'Pick a valid linked record first.';
  if (message.includes('violates check constraint')) return 'One of the values is not an allowed option.';
  if (message.includes('null value in column')) {
    const column = message.match(/column "([^"]+)"/)?.[1];
    return column ? `${column.replace(/_/g, ' ')} is required.` : 'A required value is missing.';
  }
  return message;
}
