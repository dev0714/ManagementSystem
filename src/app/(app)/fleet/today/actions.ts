'use server';

import { revalidatePath } from 'next/cache';

import { requireModule } from '@/lib/auth';
import { db } from '@/lib/db';

async function myVehicle(tenantId: string, userId: string) {
  const { data } = await db()
    .from('vehicles')
    .select('id, plate, odometer_label')
    .eq('tenant_id', tenantId)
    .eq('driver_id', userId)
    .maybeSingle();
  return data;
}

export async function logStartAction(formData: FormData) {
  const { session } = await requireModule('fleet', ['driver']);
  const vehicle = await myVehicle(session.tenantId, session.userId);
  if (!vehicle) return;

  const odometer = Number(formData.get('odometer'));
  if (!Number.isFinite(odometer) || odometer <= 0) return;

  await db().from('driver_logs').insert({
    tenant_id: session.tenantId,
    vehicle_id: vehicle.id,
    user_id: session.userId,
    kind: 'start',
    odometer,
  });

  await db()
    .from('vehicles')
    .update({ odometer_label: `${odometer.toLocaleString('en-ZA').replace(/,/g, ' ')} km` })
    .eq('id', vehicle.id)
    .eq('tenant_id', session.tenantId);

  await db().from('activity_events').insert({
    tenant_id: session.tenantId,
    module: 'fleet',
    severity: 'info',
    title: `Start of day log submitted — ${odometer.toLocaleString('en-ZA').replace(/,/g, ' ')} km`,
    who: `${vehicle.plate} · ${session.name}`,
    actor_id: session.userId,
  });

  revalidatePath('/fleet/today');
}

export async function logEndAction(formData: FormData) {
  const { session } = await requireModule('fleet', ['driver']);
  const vehicle = await myVehicle(session.tenantId, session.userId);
  if (!vehicle) return;

  const odometer = Number(formData.get('odometer'));
  if (!Number.isFinite(odometer) || odometer <= 0) return;

  const slips = [
    { label: 'Fuel', amount: Number(formData.get('fuel')) || 0 },
    { label: 'Toll', amount: Number(formData.get('toll')) || 0 },
    { label: 'Work slip', amount: Number(formData.get('work')) || 0 },
  ].filter((s) => s.amount > 0);

  await db().from('driver_logs').insert({
    tenant_id: session.tenantId,
    vehicle_id: vehicle.id,
    user_id: session.userId,
    kind: 'end',
    odometer,
    slips,
    note: String(formData.get('note') ?? '') || null,
  });

  await db()
    .from('vehicles')
    .update({ odometer_label: `${odometer.toLocaleString('en-ZA').replace(/,/g, ' ')} km` })
    .eq('id', vehicle.id)
    .eq('tenant_id', session.tenantId);

  const total = slips.reduce((s, x) => s + x.amount, 0);
  await db().from('activity_events').insert({
    tenant_id: session.tenantId,
    module: 'fleet',
    severity: 'info',
    title: `End of day log submitted — ${slips.length} slip${slips.length === 1 ? '' : 's'}, R ${total.toFixed(2)}`,
    who: `${vehicle.plate} · ${session.name}`,
    actor_id: session.userId,
  });

  revalidatePath('/fleet/today');
}

export async function logIncidentAction(formData: FormData) {
  const { session } = await requireModule('fleet', ['driver']);
  const vehicle = await myVehicle(session.tenantId, session.userId);
  const description = String(formData.get('description') ?? '').trim();
  if (!description) return;

  await db().from('incidents').insert({
    tenant_id: session.tenantId,
    title: description.slice(0, 120),
    detail: `Reported by ${session.name}${vehicle ? ` on ${vehicle.plate}` : ''}.`,
    vehicle_plate: vehicle?.plate ?? null,
    when_label: 'Just now',
    stage: 'Logged',
    sla_label: 'To HR, fleet manager and insurer within 24 h',
    tone: 'bad',
    dot_color: '#DC3545',
  });

  await db().from('activity_events').insert({
    tenant_id: session.tenantId,
    module: 'fleet',
    severity: 'critical',
    title: 'Accident logged by driver',
    who: `${vehicle?.plate ?? ''} · ${session.name}`,
    actor_id: session.userId,
  });

  revalidatePath('/fleet/today');
}
