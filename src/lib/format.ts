import type { SourceSlug, Tone } from './types';

/** ZAR with a space thousands separator, per the brand rules: R 12 400. */
export function zar(amount: number | string | null | undefined): string {
  const n = typeof amount === 'string' ? Number(amount) : amount ?? 0;
  if (!Number.isFinite(n)) return 'R 0';
  const rounded = Math.round(n);
  return `R ${rounded.toLocaleString('en-ZA').replace(/,/g, ' ')}`;
}

/** Compact money for board headers: R 1.42 m / R 420k. */
export function zarCompact(amount: number): string {
  if (amount >= 1_000_000) return `R ${(amount / 1_000_000).toFixed(2)} m`;
  if (amount >= 1_000) return `R ${Math.round(amount / 1_000)}k`;
  return zar(amount);
}

/** 31 Aug 2026 */
export function shortDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** 24-hour clock: 16:02 */
export function hhmm(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function relative(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60_000));
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} d`;
  return shortDate(d);
}

export const SOURCE_LABEL: Record<SourceSlug, string> = {
  jk: 'MASJID OPS',
  fleet: 'FLEET',
  prop: 'PROPERTY',
  crm: 'CRM',
};

export const SEVERITY_DOT: Record<string, string> = {
  critical: '#DC3545',
  high: '#DC3545',
  medium: '#FFC107',
  low: '#FFC107',
  success: '#28A745',
  info: '#007BFF',
};

export function severityTone(severity: string): Tone {
  const s = severity.toUpperCase();
  if (s === 'CRITICAL') return 'bad';
  if (s === 'HIGH') return 'warn';
  if (s === 'MEDIUM') return 'warn';
  return 'grey';
}

export function toneOf(value: unknown, fallback: Tone = 'grey'): Tone {
  const allowed: Tone[] = ['ok', 'warn', 'bad', 'info', 'grey', 'purple'];
  return allowed.includes(value as Tone) ? (value as Tone) : fallback;
}
