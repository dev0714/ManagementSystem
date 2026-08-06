'use server';

import { revalidatePath } from 'next/cache';

import { requireCrm } from '@/lib/auth';
import { db } from '@/lib/db';

export async function toggleTaskAction(formData: FormData) {
  const session = await requireCrm();
  const id = String(formData.get('id') ?? '');
  const done = String(formData.get('done') ?? '') === 'true';
  if (!id) return;

  // Tenant filter in the mutation itself — an id from another workspace matches nothing.
  await db()
    .from('tasks')
    .update({ is_done: !done })
    .eq('id', id)
    .eq('tenant_id', session.tenantId);

  revalidatePath('/activity');
}
