import 'server-only';

import { db } from './db';
import { toneOf } from './format';
import type { Kpi } from './types';

/** Every query in the app goes through a tenant filter — no exceptions. */
export function scoped(table: string, tenantId: string) {
  return db().from(table).select('*').eq('tenant_id', tenantId);
}

export async function kpis(tenantId: string, board: string): Promise<Kpi[]> {
  const { data } = await db()
    .from('kpis')
    .select('label, value, delta, tone')
    .eq('tenant_id', tenantId)
    .eq('board', board)
    .order('sort_order');

  return (data ?? []).map((k) => ({
    label: k.label as string,
    value: k.value as string,
    delta: k.delta as string,
    tone: toneOf(k.tone),
  }));
}

export async function openAlertCount(tenantId: string): Promise<number> {
  const { count } = await db()
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .is('resolved_at', null);
  return count ?? 0;
}

export async function openDealCount(tenantId: string): Promise<number> {
  const { count } = await db()
    .from('deals')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .in('stage', ['enquiry', 'qualified', 'proposal', 'contract']);
  return count ?? 0;
}
