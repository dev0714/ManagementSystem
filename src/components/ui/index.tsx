import Link from 'next/link';
import type { ReactNode } from 'react';

import { SOURCE_LABEL } from '@/lib/format';
import type { Kpi, SourceSlug, Tone } from '@/lib/types';

export function StatusPill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`pill tone-${tone}`}>{children}</span>;
}

export function SourceBadge({ source }: { source: SourceSlug }) {
  return <span className={`chip src-${source}`}>{SOURCE_LABEL[source]}</span>;
}

export function Dot({ color }: { color: string }) {
  return <span className="dot" style={{ background: color }} />;
}

export function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <div className="card">
      <div className="kpi__label">{kpi.label}</div>
      <div className="kpi__value">{kpi.value}</div>
      <div className={`kpi__delta text-${kpi.tone}`}>{kpi.delta}</div>
    </div>
  );
}

export function KpiRow({ kpis, columns = 5 }: { kpis: Kpi[]; columns?: 4 | 5 }) {
  if (!kpis.length) return null;
  return (
    <div className={`grid grid--${columns}`}>
      {kpis.map((k) => (
        <KpiCard key={k.label} kpi={k} />
      ))}
    </div>
  );
}

export function SectionCard({
  title,
  subtitle,
  action,
  flush,
  children,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={flush ? 'card card--flush' : 'card'}>
      {title ? (
        <div className={flush ? 'card__head card__pad' : 'card__head'} style={flush ? { marginBottom: 0 } : undefined}>
          <div>
            <div className="card__title">{title}</div>
            {subtitle ? <div className="card__sub">{subtitle}</div> : null}
          </div>
          <div className="spacer" />
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="empty">{message}</div>;
}

export function ProgressBar({ pct, color }: { pct: number; color: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="bar">
      <div className="bar__fill" style={{ width: `${clamped}%`, background: color }} />
    </div>
  );
}

export function Avatar({ initials, size = 'md' }: { initials: string; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'sm' ? 'avatar avatar--sm' : size === 'lg' ? 'avatar avatar--lg' : 'avatar';
  return <span className={cls}>{initials}</span>;
}

/** Link-driven filter chips — filtering happens in the server component via searchParams. */
export function FilterChips({
  options,
  active,
  basePath,
  param = 'filter',
}: {
  options: string[];
  active: string;
  basePath: string;
  param?: string;
}) {
  return (
    <div className="chipnav">
      {options.map((o) => (
        <Link
          key={o}
          href={o === options[0] ? basePath : `${basePath}?${param}=${encodeURIComponent(o)}`}
          data-active={o === active}
        >
          {o}
        </Link>
      ))}
    </div>
  );
}

export function FlagCard({ tone, title, when, detail }: { tone: 'bad' | 'warn'; title: string; when: string; detail: string }) {
  return (
    <div className={`flag flag--${tone}`}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <Dot color={tone === 'bad' ? '#DC3545' : '#FFC107'} />
        <div style={{ flex: 1 }}>
          <div className="row">
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-strong)' }}>{title}</span>
            <div className="spacer" />
            <span className="muted">{when}</span>
          </div>
          <div className="feed__detail">{detail}</div>
        </div>
      </div>
    </div>
  );
}

export function FieldTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="tile">
      <div className="tile__label">{label}</div>
      <div className="tile__value">{value}</div>
    </div>
  );
}

export function WhatsAppPreview({ body, title = 'Message sent on WhatsApp' }: { body: string; title?: string }) {
  return (
    <div>
      <div className="tile__label" style={{ marginBottom: 8 }}>
        {title}
      </div>
      <div className="wa">
        <div className="wa__bubble wa__bubble--out">{body}</div>
      </div>
    </div>
  );
}
