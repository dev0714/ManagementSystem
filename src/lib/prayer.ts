import 'server-only';

import { db } from './db';

export type PrayerTime = { name: string; hour: number; minute: number };

export async function prayerTimes(tenantId: string): Promise<PrayerTime[]> {
  const { data } = await db()
    .from('prayer_times')
    .select('name, hour, minute')
    .eq('tenant_id', tenantId)
    .order('sort_order');
  return (data ?? []).map((p) => ({ name: p.name as string, hour: p.hour as number, minute: p.minute as number }));
}

/** Next prayer plus the absolute epoch of its call, rolling into tomorrow after Isha. */
export function nextPrayer(times: PrayerTime[], now = new Date()) {
  if (!times.length) return null;
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const found = times.find((p) => p.hour * 60 + p.minute > minutesNow);
  const prayer = found ?? times[0];

  const target = new Date(now);
  target.setHours(prayer.hour, prayer.minute, 0, 0);
  if (!found) target.setDate(target.getDate() + 1);

  return { prayer, targetEpochMs: target.getTime() };
}

export function statusOf(p: PrayerTime, nextName: string, now = new Date()) {
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  if (p.name === nextName) return 'Due' as const;
  return p.hour * 60 + p.minute < minutesNow ? ('Done' as const) : ('Upcoming' as const);
}

export const pad2 = (n: number) => String(n).padStart(2, '0');
