import { revalidatePath } from 'next/cache';

import { KpiRow, SectionCard, StatusPill } from '@/components/ui';
import { AddRecord, RowActions } from '@/components/ui/Crud';
import { requireModule } from '@/lib/auth';
import { db } from '@/lib/db';
import { toneOf, zar } from '@/lib/format';
import { kpis } from '@/lib/queries';

export const dynamic = 'force-dynamic';

async function decideClaimAction(formData: FormData) {
  'use server';
  const { session } = await requireModule('fleet', ['line', 'fleet']);
  const id = String(formData.get('id') ?? '');
  const decision = String(formData.get('decision') ?? '');
  if (!id || !['approve', 'hold'].includes(decision)) return;

  const approved = decision === 'approve';
  await db()
    .from('expense_claims')
    .update({ status: approved ? 'Approved' : 'Held', tone: approved ? 'info' : 'bad' })
    .eq('id', id)
    .eq('tenant_id', session.tenantId);

  const { data: claim } = await db()
    .from('expense_claims')
    .select('driver_name')
    .eq('id', id)
    .eq('tenant_id', session.tenantId)
    .maybeSingle();

  await db().from('activity_events').insert({
    tenant_id: session.tenantId,
    module: 'fleet',
    severity: approved ? 'success' : 'medium',
    title: `Expense claim ${approved ? 'approved' : 'held'} — ${claim?.driver_name ?? ''}`,
    who: session.name,
    actor_id: session.userId,
  });

  revalidatePath('/fleet/claims');
}

export default async function ClaimsPage() {
  const { session } = await requireModule('fleet', ['line', 'fleet']);

  const [board, claimsRes] = await Promise.all([
    kpis(session.tenantId, 'fleet_claims'),
    db()
      .from('expense_claims')
      .select('id, driver_name, vehicle_plate, km, fuel, toll, status, tone, period_label')
      .eq('tenant_id', session.tenantId)
      .order('created_at'),
  ]);

  const claims = claimsRes.data ?? [];

  return (
    <div className="page">
      <KpiRow kpis={board} columns={4} />

      <AddRecord resource="claim" tenantId={session.tenantId} label="expense claim" />

      <SectionCard
        title="Expense claims"
        subtitle={claims[0]?.period_label ? `Week ${claims[0].period_label}` : 'This week'}
        flush
      >
        <div className="table__scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Driver</th>
                <th>Vehicle</th>
                <th>Km</th>
                <th>Fuel</th>
                <th>Toll</th>
                <th>Total</th>
                <th>Status</th>
                <th />
                <th />
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => {
                const total = Number(c.fuel) + Number(c.toll);
                const decided = c.status === 'Approved' || c.status === 'Held';
                return (
                  <tr key={c.id as string}>
                    <td className="strong">{c.driver_name as string}</td>
                    <td className="num">{c.vehicle_plate as string}</td>
                    <td className="num">{c.km as number}</td>
                    <td className="num">{zar(Number(c.fuel))}</td>
                    <td className="num">{zar(Number(c.toll))}</td>
                    <td className="num strong">{zar(total)}</td>
                    <td>
                      <StatusPill tone={toneOf(c.tone)}>{c.status as string}</StatusPill>
                    </td>
                    <td>
                      {decided ? (
                        <span className="muted">Decided</span>
                      ) : (
                        <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                          <form action={decideClaimAction}>
                            <input type="hidden" name="id" value={c.id as string} />
                            <input type="hidden" name="decision" value="approve" />
                            <button className="btn btn--sm btn--success" type="submit">
                              Approve
                            </button>
                          </form>
                          <form action={decideClaimAction}>
                            <input type="hidden" name="id" value={c.id as string} />
                            <input type="hidden" name="decision" value="hold" />
                            <button className="btn btn--sm btn--ghost" type="submit">
                              Hold
                            </button>
                          </form>
                        </div>
                      )}
                    </td>
                    <td>
                      <RowActions
                        resource="claim"
                        tenantId={session.tenantId}
                        id={c.id as string}
                        name={c.driver_name as string}
                        values={c as unknown as Record<string, unknown>}
                      />
                    </td>
                  </tr>
                );
              })}
              {!claims.length ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty">No claims submitted this week.</div>
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
