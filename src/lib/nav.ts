import type { ModuleRole, ModuleSlug, Session } from './types';

export type NavItem = { href: string; icon: string; label: string; badge?: string };
export type NavGroup = { title: string; items: NavItem[] };

const MODULE_META: Record<ModuleSlug, { icon: string; label: string }> = {
  jk: { icon: '🕌', label: 'Masjid Ops' },
  fleet: { icon: '🚐', label: 'Fleet' },
  prop: { icon: '🏠', label: 'Property' },
};

/**
 * The landing route for a given module role. This is also the single source of
 * truth for "where does this person belong", used by the sidebar and by the
 * server-side guards.
 */
export function moduleHome(module: ModuleSlug, role: ModuleRole): string {
  if (module === 'jk') {
    if (role === 'cleaner') return '/jk/shift';
    if (role === 'repairs') return '/jk/repairs';
    return '/jk';
  }
  if (module === 'fleet') {
    if (role === 'driver') return '/fleet/today';
    if (role === 'line') return '/fleet/claims';
    if (role === 'hr') return '/fleet/people';
    return '/fleet';
  }
  if (role === 'tenant') return '/property/portal';
  if (role === 'team') return '/property/jobs';
  return '/property';
}

/** Nav is derived from the session — never hardcoded, never trusted from the client. */
export function navFor(session: Session, openAlerts: number, openDeals: number): NavGroup[] {
  const groups: NavGroup[] = [];
  const crm: NavItem[] = [];

  if (session.isSuperAdmin) crm.push({ href: '/', icon: '◎', label: 'Group overview' });
  if (session.hasCrm) {
    crm.push({ href: '/contacts', icon: '👥', label: 'Contacts' });
    crm.push({ href: '/pipeline', icon: '📈', label: 'Pipeline', badge: openDeals ? String(openDeals) : undefined });
    crm.push({ href: '/activity', icon: '⏱', label: 'Activity' });
  }
  if (session.isSuperAdmin) crm.push({ href: '/admin/users', icon: '🔐', label: 'Users & access' });
  if (crm.length) groups.push({ title: 'CRM', items: crm });

  const ops: NavItem[] = session.modules.map(({ module, role }) => ({
    href: moduleHome(module, role),
    icon: MODULE_META[module].icon,
    label: MODULE_META[module].label,
    badge: module === 'jk' && role === 'hq' && openAlerts ? String(openAlerts) : undefined,
  }));
  if (ops.length) groups.push({ title: session.hasCrm ? 'Operations' : 'My workspace', items: ops });

  return groups;
}

/** Sub-navigation inside a module, again derived from the caller's role. */
export function moduleTabs(module: ModuleSlug, role: ModuleRole): { href: string; label: string }[] {
  if (module === 'jk') {
    if (role === 'cleaner') return [{ href: '/jk/shift', label: 'My shift' }];
    if (role === 'repairs') {
      return [
        { href: '/jk/repairs', label: 'Repair queue' },
        { href: '/jk/alerts', label: 'Alerts' },
        { href: '/jk/operations', label: 'Operational engine' },
      ];
    }
    if (role === 'manager') {
      return [
        { href: '/jk', label: 'My site' },
        { href: '/jk/alerts', label: 'My alerts' },
      ];
    }
    return [
      { href: '/jk', label: 'Dashboard' },
      { href: '/jk/alerts', label: 'Alerts' },
      { href: '/jk/operations', label: 'Operational engine' },
      { href: '/jk/repairs', label: 'Repairs' },
    ];
  }

  if (module === 'fleet') {
    if (role === 'driver') return [{ href: '/fleet/today', label: 'My day' }];
    if (role === 'line') {
      return [
        { href: '/fleet/claims', label: 'Expense claims' },
        { href: '/fleet/events', label: 'Events' },
        { href: '/fleet', label: 'Fleet overview' },
      ];
    }
    if (role === 'hr') {
      return [
        { href: '/fleet/people', label: 'Drivers & incidents' },
        { href: '/fleet/documents', label: 'Documents' },
        { href: '/fleet/events', label: 'Events' },
      ];
    }
    return [
      { href: '/fleet', label: 'Dashboard' },
      { href: '/fleet/vehicles', label: 'Vehicles' },
      { href: '/fleet/checklists', label: 'Checklists' },
      { href: '/fleet/events', label: 'Events' },
      { href: '/fleet/documents', label: 'Documents' },
      { href: '/fleet/claims', label: 'Expense claims' },
      { href: '/fleet/people', label: 'People' },
    ];
  }

  if (role === 'tenant') return [{ href: '/property/portal', label: 'My home' }];
  if (role === 'team') return [{ href: '/property/jobs', label: 'My jobs' }];
  return [
    { href: '/property', label: 'Dashboard' },
    { href: '/property/properties', label: 'Properties' },
    { href: '/property/tenants', label: 'Tenants' },
    { href: '/property/onboarding', label: 'Onboarding & lease' },
    { href: '/property/maintenance', label: 'Maintenance' },
    { href: '/property/invoicing', label: 'Invoicing' },
  ];
}
