'use client';

import { usePathname } from 'next/navigation';

import { StatusPill } from '@/components/ui';
import type { Session } from '@/lib/types';

const TITLES: [string, string, string][] = [
  ['/contacts', 'Contacts', 'Tenants, clients, suppliers and staff'],
  ['/pipeline', 'Pipeline', 'New business across the group'],
  ['/activity', 'Activity', 'Live feed and my tasks'],
  ['/admin/users', 'Users & access', 'Who can see what'],
  ['/jk/shift', 'My shift', 'Clock in, uniform and readiness'],
  ['/jk/alerts', 'Masjid Ops — Alerts', 'Escalations and WhatsApp messages'],
  ['/jk/operations', 'Masjid Ops — Operational engine', 'Compliance, stock and SLA'],
  ['/jk/repairs', 'Masjid Ops — Repairs', 'Repair queue and assets under review'],
  ['/jk', 'Masjid Ops — JK Management', 'Prayer facility readiness'],
  ['/fleet/today', 'My day', 'Logs, slips and tasks'],
  ['/fleet/vehicles', 'Fleet — Vehicles', 'The whole fleet at a glance'],
  ['/fleet/checklists', 'Fleet — Checklists', 'Templates drivers complete'],
  ['/fleet/events', 'Fleet — Events', 'Calendar and what is coming up'],
  ['/fleet/documents', 'Fleet — Documents', 'Discs, licences and reports'],
  ['/fleet/claims', 'Fleet — Expense claims', 'Weekly claim approvals'],
  ['/fleet/people', 'Fleet — Drivers & incidents', 'Licences, PrDPs and accidents'],
  ['/fleet', 'Fleet Management', 'Vehicles, logs and compliance'],
  ['/property/portal', 'My home', 'Pay rent, log faults, view documents'],
  ['/property/jobs', 'My jobs', 'Dispatched maintenance work'],
  ['/property/properties', 'Property — Properties', 'Every unit under management'],
  ['/property/tenants', 'Property — Tenants', 'Profiles and document libraries'],
  ['/property/onboarding', 'Property — Onboarding & lease', 'Capture once, generate the lease'],
  ['/property/maintenance', 'Property — Maintenance', 'Fault board and job threads'],
  ['/property/invoicing', 'Property — Invoicing', 'Billing run and the reminder ladder'],
  ['/property', 'Property Management', 'Properties, tenants and maintenance'],
];

function titleFor(pathname: string): [string, string] {
  if (pathname === '/') return ['Group overview', 'Every system, one screen'];
  const hit = TITLES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return hit ? [hit[1], hit[2]] : ['Workspace', ''];
}

export function TopBar({ session, alertCount }: { session: Session; alertCount: number }) {
  const pathname = usePathname();
  const [title, sub] = titleFor(pathname);

  return (
    <header className="topbar">
      <div>
        <div className="topbar__title">{title}</div>
        <div className="topbar__sub">{sub}</div>
      </div>

      <form className="topbar__search" action="/search" role="search">
        <span aria-hidden>🔍</span>
        <input name="q" placeholder="Search contacts, sites, vehicles, jobs…" aria-label="Search" />
      </form>

      <div className="spacer" />

      {alertCount > 0 ? (
        <div className="topbar__alerts">
          <span className="dot" />
          <span>
            {alertCount} live alert{alertCount === 1 ? '' : 's'}
          </span>
        </div>
      ) : null}

      <StatusPill tone={session.scopeTone}>{session.scope}</StatusPill>
    </header>
  );
}
