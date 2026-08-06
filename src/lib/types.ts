export type ModuleSlug = 'jk' | 'fleet' | 'prop';
export type SourceSlug = ModuleSlug | 'crm';
export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'grey' | 'purple';

export type JkRole = 'cleaner' | 'manager' | 'hq' | 'repairs';
export type FleetRole = 'driver' | 'fleet' | 'line' | 'hr';
export type PropRole = 'admin' | 'tenant' | 'team';
export type ModuleRole = JkRole | FleetRole | PropRole;

export type Membership = { module: ModuleSlug; role: ModuleRole };

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  short_name: string;
  monogram: string;
  tagline: string;
  primary_color: string;
};

export type Session = {
  userId: string;
  tenantId: string;
  tenant: Tenant;
  name: string;
  initials: string;
  title: string;
  email: string;
  scope: string;
  scopeTone: Tone;
  isSuperAdmin: boolean;
  hasCrm: boolean;
  modules: Membership[];
  home: string;
  tempAccessUntil: string | null;
};

export type Kpi = { label: string; value: string; delta: string; tone: Tone };
