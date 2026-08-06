'use server';

import { revalidatePath } from 'next/cache';

import { requireModule } from '@/lib/auth';
import { db } from '@/lib/db';
import { pad2 } from '@/lib/prayer';

/** Resolve the signed-in cleaner's shift for today, creating one if needed. */
async function myShift(tenantId: string, userId: string, cleanerName: string) {
  const client = db();
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await client
    .from('shifts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .eq('shift_date', today)
    .maybeSingle();

  if (existing) return existing;

  const { data: site } = await client.from('sites').select('id').eq('tenant_id', tenantId).order('name').limit(1).maybeSingle();
  if (!site) return null;

  const { data: created } = await client
    .from('shifts')
    .insert({
      tenant_id: tenantId,
      site_id: site.id,
      user_id: userId,
      cleaner_name: cleanerName,
      shift_date: today,
      selfie_status: 'pending',
      checklist_state: 'Not submitted',
      status: 'Not started',
      tone: 'grey',
    })
    .select('*')
    .maybeSingle();

  return created;
}

export async function clockInAction(formData: FormData) {
  const { session } = await requireModule('jk', ['cleaner']);
  const shift = await myShift(session.tenantId, session.userId, session.name);
  if (!shift) return;

  const lat = Number(formData.get('lat'));
  const lng = Number(formData.get('lng'));
  const now = new Date();

  await db()
    .from('shifts')
    .update({
      clock_in_at: `${pad2(now.getHours())}:${pad2(now.getMinutes())}`,
      clock_in_lat: Number.isFinite(lat) ? lat : null,
      clock_in_lng: Number.isFinite(lng) ? lng : null,
      status: 'On site',
      tone: 'warn',
    })
    .eq('id', shift.id)
    .eq('tenant_id', session.tenantId);

  await db().from('activity_events').insert({
    tenant_id: session.tenantId,
    module: 'jk',
    severity: 'info',
    title: `Clocked in at ${pad2(now.getHours())}:${pad2(now.getMinutes())}`,
    who: session.name,
    actor_id: session.userId,
  });

  revalidatePath('/jk/shift');
}

export async function submitSelfieAction() {
  const { session } = await requireModule('jk', ['cleaner']);
  const shift = await myShift(session.tenantId, session.userId, session.name);
  if (!shift) return;

  await db()
    .from('shifts')
    .update({ selfie_status: 'approved' })
    .eq('id', shift.id)
    .eq('tenant_id', session.tenantId);

  await db().from('activity_events').insert({
    tenant_id: session.tenantId,
    module: 'jk',
    severity: 'success',
    title: 'Uniform selfie approved',
    who: session.name,
    actor_id: session.userId,
  });

  revalidatePath('/jk/shift');
}

export async function submitChecklistAction(formData: FormData) {
  const { session } = await requireModule('jk', ['cleaner']);
  const shift = await myShift(session.tenantId, session.userId, session.name);
  if (!shift) return;

  const client = db();
  const templateId = String(formData.get('templateId') ?? '') || null;
  const prayer = String(formData.get('prayer') ?? '');

  const { data: items } = await client
    .from('checklist_items')
    .select('id, label')
    .eq('tenant_id', session.tenantId)
    .eq('template_id', templateId ?? '')
    .order('sort_order');

  const results: Record<string, boolean> = {};
  let flagged = 0;
  for (const item of items ?? []) {
    const passed = formData.get(`item:${item.id}`) === 'pass';
    results[item.label as string] = passed;
    if (!passed) flagged += 1;
  }

  await client.from('checklist_submissions').insert({
    tenant_id: session.tenantId,
    template_id: templateId,
    site_id: shift.site_id,
    user_id: session.userId,
    prayer,
    flagged_count: flagged,
    results,
  });

  await client
    .from('shifts')
    .update({
      checklist_state: flagged ? `Submitted · ${flagged} flag${flagged === 1 ? '' : 's'}` : 'Complete',
      status: 'Ready',
      tone: 'ok',
    })
    .eq('id', shift.id)
    .eq('tenant_id', session.tenantId);

  // A failed item opens a maintenance job automatically, exactly like the trigger rule says.
  if (flagged) {
    const failed = Object.entries(results)
      .filter(([, ok]) => !ok)
      .map(([label]) => label);
    const ref = `#${Math.floor(4400 + Math.random() * 500)}`;
    await client.from('maintenance_jobs').insert({
      tenant_id: session.tenantId,
      ref,
      fault: failed.join(', ').slice(0, 180),
      site_id: shift.site_id,
      site_label: shift.cleaner_name,
      owner: 'Unassigned',
      age_label: 'just now',
      sla_label: '48 h left',
      tone: 'ok',
      status: 'open',
    });
  }

  await client.from('activity_events').insert({
    tenant_id: session.tenantId,
    module: 'jk',
    severity: flagged ? 'medium' : 'success',
    title: `${prayer} readiness checklist submitted${flagged ? `, ${flagged} item flagged` : ''}`,
    who: session.name,
    actor_id: session.userId,
  });

  revalidatePath('/jk/shift');
}

export async function resetShiftAction() {
  const { session } = await requireModule('jk', ['cleaner']);
  const shift = await myShift(session.tenantId, session.userId, session.name);
  if (!shift) return;

  await db()
    .from('shifts')
    .update({
      clock_in_at: null,
      clock_in_lat: null,
      clock_in_lng: null,
      selfie_status: 'pending',
      checklist_state: 'Not submitted',
      status: 'Not started',
      tone: 'grey',
    })
    .eq('id', shift.id)
    .eq('tenant_id', session.tenantId);

  revalidatePath('/jk/shift');
}
