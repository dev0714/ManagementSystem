import { revalidatePath } from 'next/cache';

import { Dot, KpiRow, SectionCard, StatusPill, WhatsAppPreview } from '@/components/ui';
import { requireModule } from '@/lib/auth';
import { db } from '@/lib/db';
import { toneOf, zar } from '@/lib/format';
import { kpis } from '@/lib/queries';

export const dynamic = 'force-dynamic';

const LADDER: [string, string, string][] = [
  ['25th — invoice issued', 'Email + WhatsApp with one-click payment link.', '#007BFF'],
  ['1st — due date', 'Direct debit collected, receipt sent automatically.', '#007BFF'],
  ['Day 3 overdue', 'Friendly WhatsApp reminder with payment link.', '#FFC107'],
  ['Day 7 overdue', 'Penalty fee applied, formal email + WhatsApp notice.', '#DC3545'],
  ['Day 14 overdue', 'Escalated to admin for letter of demand.', '#DC3545'],
];

async function sendReminderAction(formData: FormData) {
  'use server';
  const { session } = await requireModule('prop', ['admin']);
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const client = db();
  const { data: inv } = await client
    .from('invoices')
    .select('tenant_name, amount, property_label')
    .eq('id', id)
    .eq('tenant_id', session.tenantId)
    .maybeSingle();
  if (!inv) return;

  await client.from('activity_events').insert({
    tenant_id: session.tenantId,
    module: 'prop',
    severity: 'medium',
    title: `Overdue reminder sent to ${inv.tenant_name}`,
    detail: `${zar(Number(inv.amount))} for ${inv.property_label}`,
    who: session.name,
    actor_id: session.userId,
  });

  revalidatePath('/property/invoicing');
}

async function markPaidAction(formData: FormData) {
  'use server';
  const { session } = await requireModule('prop', ['admin']);
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const client = db();
  await client
    .from('invoices')
    .update({ status: 'Paid', tone: 'ok', needs_chase: false })
    .eq('id', id)
    .eq('tenant_id', session.tenantId);

  const { data: inv } = await client
    .from('invoices')
    .select('tenant_name, amount')
    .eq('id', id)
    .eq('tenant_id', session.tenantId)
    .maybeSingle();

  await client.from('activity_events').insert({
    tenant_id: session.tenantId,
    module: 'prop',
    severity: 'success',
    title: `${inv?.tenant_name ?? 'Tenant'} paid ${zar(Number(inv?.amount ?? 0))}`,
    who: session.name,
    actor_id: session.userId,
  });

  revalidatePath('/property/invoicing');
}

export default async function InvoicingPage() {
  const { session } = await requireModule('prop', ['admin']);

  const [board, invoicesRes] = await Promise.all([
    kpis(session.tenantId, 'prop_invoicing'),
    db()
      .from('invoices')
      .select('id, tenant_name, property_label, amount, due_label, method, status, tone, needs_chase')
      .eq('tenant_id', session.tenantId)
      .order('created_at'),
  ]);

  const invoices = invoicesRes.data ?? [];
  const chase = invoices.find((i) => i.needs_chase);

  const waMessage = chase
    ? `Good morning ${String(chase.tenant_name).split(' ')[0]} 👋\nYour rent of ${zar(Number(chase.amount))} for ${chase.property_label} is ${chase.status}.\nPay now: pay.cellularciti.co.za/inv-${String(chase.id).slice(0, 4)}\nReply HELP to arrange a payment plan.`
    : null;

  return (
    <div className="page">
      <KpiRow kpis={board} columns={4} />

      <SectionCard title="Invoicing run" subtitle="Issued on the 25th, collected on the 1st" flush>
        <div className="table__scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Property</th>
                <th>Amount</th>
                <th>Due</th>
                <th>Method</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id as string}>
                  <td className="strong">{i.tenant_name as string}</td>
                  <td>{i.property_label as string}</td>
                  <td className="num strong">{zar(Number(i.amount))}</td>
                  <td className="num">{i.due_label as string}</td>
                  <td>{i.method as string}</td>
                  <td>
                    <StatusPill tone={toneOf(i.tone)}>{i.status as string}</StatusPill>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                      {i.needs_chase ? (
                        <form action={sendReminderAction}>
                          <input type="hidden" name="id" value={i.id as string} />
                          <button className="btn btn--sm btn--wa" type="submit">
                            Send reminder
                          </button>
                        </form>
                      ) : null}
                      {i.status !== 'Paid' ? (
                        <form action={markPaidAction}>
                          <input type="hidden" name="id" value={i.id as string} />
                          <button className="btn btn--sm btn--ghost" type="submit">
                            Mark paid
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!invoices.length ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty">No invoices raised.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="grid grid--main">
        <SectionCard title="Reminder ladder">
          <div className="stack" style={{ gap: 14 }}>
            {LADDER.map(([when, what, color]) => (
              <div className="row" style={{ alignItems: 'flex-start' }} key={when}>
                <Dot color={color} />
                <div>
                  <div className="strong">{when}</div>
                  <div className="feed__detail">{what}</div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Next message out">
          {waMessage ? (
            <WhatsAppPreview body={waMessage} title="Queued for WhatsApp" />
          ) : (
            <div className="empty">Nothing overdue — no reminders queued.</div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
