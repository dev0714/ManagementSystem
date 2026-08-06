import type { ModuleRole, ModuleSlug } from './types';

/**
 * Registry of everything the UI is allowed to create, edit and delete.
 *
 * The client only ever sends a resource *key*. The table name, the writable
 * field list and the permission rule all come from here, server-side, so a
 * forged form cannot reach a table or column that is not listed below.
 */

/**
 * `nullable` marks a column that genuinely accepts NULL, which is what lets a
 * blank input clear it. Blank input on a non-nullable column means "leave
 * unchanged" on edit, and "use the column default" on create — writing NULL
 * would violate the NOT NULL constraints the schema relies on.
 */
export type Field =
  | { name: string; label: string; type: 'text' | 'textarea' | 'password'; required?: boolean; nullable?: boolean; placeholder?: string; wide?: boolean }
  | { name: string; label: string; type: 'number' | 'money'; required?: boolean; nullable?: boolean; placeholder?: string; wide?: boolean }
  | { name: string; label: string; type: 'select'; options: readonly string[]; required?: boolean; nullable?: boolean; wide?: boolean }
  | { name: string; label: string; type: 'bool'; wide?: boolean }
  | { name: string; label: string; type: 'ref'; table: string; labelColumn: string; required?: boolean; nullable?: boolean; wide?: boolean };

export type Permission =
  | { kind: 'crm' }
  | { kind: 'admin' }
  | { kind: 'module'; module: ModuleSlug; roles: ModuleRole[] };

export type Resource = {
  table: string;
  label: string;
  permission: Permission;
  fields: Field[];
  /** Columns written on insert but never exposed as form inputs. */
  defaults?: Record<string, unknown>;
  revalidate: string[];
  /** Human-readable column used in confirmations and the activity log. */
  titleColumn: string;
  /** Module recorded on the activity_events row written after each change. */
  activityModule?: ModuleSlug | 'crm';
};

const TONES = ['ok', 'warn', 'bad', 'info', 'grey', 'purple'] as const;

export const RESOURCES = {
  // ------------------------------------------------------------------ CRM
  contact: {
    table: 'contacts',
    label: 'contact',
    permission: { kind: 'crm' },
    titleColumn: 'name',
    activityModule: 'crm',
    revalidate: ['/contacts', '/search'],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'initials', label: 'Initials', type: 'text', required: true, placeholder: 'NM' },
      { name: 'type', label: 'Type', type: 'select', options: ['Tenant', 'Client', 'Supplier', 'Prospect', 'Staff'], required: true },
      { name: 'phone', label: 'Phone', type: 'text', nullable: true },
      { name: 'whatsapp', label: 'WhatsApp', type: 'text', nullable: true },
      { name: 'email', label: 'Email', type: 'text', nullable: true },
      { name: 'linked_to', label: 'Linked to', type: 'text', nullable: true },
      { name: 'status', label: 'Status', type: 'text', required: true },
      { name: 'tone', label: 'Status colour', type: 'select', options: TONES, required: true },
      { name: 'role_line', label: 'Role line', type: 'text', nullable: true, wide: true },
    ],
  },
  contact_field: {
    table: 'contact_fields',
    label: 'contact detail',
    permission: { kind: 'crm' },
    titleColumn: 'label',
    activityModule: 'crm',
    revalidate: ['/contacts'],
    fields: [
      { name: 'contact_id', label: 'Contact', type: 'ref', table: 'contacts', labelColumn: 'name', required: true },
      { name: 'label', label: 'Label', type: 'text', required: true },
      { name: 'value', label: 'Value', type: 'text', required: true },
      { name: 'sort_order', label: 'Order', type: 'number' },
    ],
  },
  deal: {
    table: 'deals',
    label: 'deal',
    permission: { kind: 'crm' },
    titleColumn: 'title',
    activityModule: 'crm',
    revalidate: ['/pipeline'],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, wide: true },
      { name: 'client', label: 'Client', type: 'text', required: true },
      { name: 'stage', label: 'Stage', type: 'select', options: ['enquiry', 'qualified', 'proposal', 'contract', 'won', 'lost'], required: true },
      { name: 'value', label: 'Value (ZAR)', type: 'money', required: true },
      { name: 'owner_initials', label: 'Owner initials', type: 'text' },
      { name: 'source_module', label: 'Source', type: 'select', options: ['crm', 'jk', 'fleet', 'prop'], nullable: true },
      { name: 'age_label', label: 'Age label', type: 'text', nullable: true, placeholder: '3 d' },
    ],
  },
  task: {
    table: 'tasks',
    label: 'task',
    permission: { kind: 'crm' },
    titleColumn: 'title',
    activityModule: 'crm',
    revalidate: ['/activity'],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, wide: true },
      { name: 'meta', label: 'Context', type: 'text', nullable: true, wide: true },
      { name: 'due_label', label: 'Due', type: 'text', nullable: true, placeholder: 'Today' },
      { name: 'tone', label: 'Due colour', type: 'select', options: TONES },
      { name: 'is_done', label: 'Done', type: 'bool' },
      { name: 'sort_order', label: 'Order', type: 'number' },
    ],
  },

  // ---------------------------------------------------------------- Admin
  user: {
    table: 'users',
    label: 'user',
    permission: { kind: 'admin' },
    titleColumn: 'name',
    activityModule: 'crm',
    revalidate: ['/admin/users'],
    fields: [
      { name: 'name', label: 'Full name', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'password', placeholder: 'Leave blank to keep unchanged' },
      { name: 'initials', label: 'Initials', type: 'text', required: true },
      { name: 'title', label: 'Job title', type: 'text', wide: true },
      { name: 'scope_label', label: 'Scope pill', type: 'text', placeholder: 'All systems' },
      { name: 'scope_tone', label: 'Scope colour', type: 'select', options: TONES },
      { name: 'home_route', label: 'Home route', type: 'text', placeholder: '/property' },
      { name: 'is_super_admin', label: 'Super admin', type: 'bool' },
      { name: 'has_crm', label: 'CRM access', type: 'bool' },
      { name: 'is_active', label: 'Active', type: 'bool' },
    ],
  },
  user_module: {
    table: 'user_modules',
    label: 'module access',
    permission: { kind: 'admin' },
    titleColumn: 'role',
    activityModule: 'crm',
    revalidate: ['/admin/users'],
    fields: [
      { name: 'user_id', label: 'User', type: 'ref', table: 'users', labelColumn: 'name', required: true },
      { name: 'module', label: 'Module', type: 'select', options: ['jk', 'fleet', 'prop'], required: true },
      {
        name: 'role',
        label: 'Role in that module',
        type: 'select',
        options: ['cleaner', 'manager', 'hq', 'repairs', 'driver', 'fleet', 'line', 'hr', 'admin', 'tenant', 'team'],
        required: true,
      },
    ],
  },

  // ------------------------------------------------------------ Masjid Ops
  site: {
    table: 'sites',
    label: 'site',
    permission: { kind: 'module', module: 'jk', roles: ['hq'] },
    titleColumn: 'name',
    activityModule: 'jk',
    revalidate: ['/jk', '/jk/operations', '/search'],
    fields: [
      { name: 'name', label: 'Site name', type: 'text', required: true },
      { name: 'suburb', label: 'Suburb', type: 'text', required: true },
      { name: 'lat', label: 'Latitude', type: 'number', nullable: true },
      { name: 'lng', label: 'Longitude', type: 'number', nullable: true },
      { name: 'geofence_m', label: 'Geofence (m)', type: 'number', placeholder: '120' },
    ],
  },
  jk_job: {
    table: 'maintenance_jobs',
    label: 'repair job',
    permission: { kind: 'module', module: 'jk', roles: ['hq', 'repairs'] },
    titleColumn: 'fault',
    activityModule: 'jk',
    revalidate: ['/jk', '/jk/repairs', '/jk/operations'],
    fields: [
      { name: 'ref', label: 'Reference', type: 'text', required: true, placeholder: '#4413' },
      { name: 'fault', label: 'Fault', type: 'text', required: true, wide: true },
      { name: 'site_label', label: 'Site', type: 'text', nullable: true },
      { name: 'owner', label: 'Owner', type: 'text', placeholder: 'Unassigned' },
      { name: 'repeat_flag', label: 'Repeat flag', type: 'text', nullable: true, placeholder: 'Repeat ×2' },
      { name: 'age_label', label: 'Age', type: 'text', nullable: true },
      { name: 'sla_label', label: 'SLA', type: 'text', nullable: true },
      { name: 'tone', label: 'SLA colour', type: 'select', options: TONES },
      { name: 'status', label: 'Status', type: 'select', options: ['open', 'closed'] },
    ],
  },
  stock_item: {
    table: 'stock_items',
    label: 'stock item',
    permission: { kind: 'module', module: 'jk', roles: ['hq', 'repairs'] },
    titleColumn: 'name',
    activityModule: 'jk',
    revalidate: ['/jk/operations'],
    fields: [
      { name: 'name', label: 'Item', type: 'text', required: true, wide: true },
      { name: 'level_pct', label: 'Level (%)', type: 'number', required: true },
      { name: 'note', label: 'Note', type: 'text', wide: true },
      { name: 'sort_order', label: 'Order', type: 'number' },
    ],
  },
  asset_review: {
    table: 'asset_reviews',
    label: 'asset under review',
    permission: { kind: 'module', module: 'jk', roles: ['hq', 'repairs'] },
    titleColumn: 'name',
    activityModule: 'jk',
    revalidate: ['/jk', '/jk/repairs'],
    fields: [
      { name: 'name', label: 'Asset', type: 'text', required: true, wide: true },
      { name: 'site_label', label: 'Site', type: 'text', required: true },
      { name: 'fails', label: 'Failures', type: 'text', placeholder: '3 fails / 30 d' },
      { name: 'sort_order', label: 'Order', type: 'number' },
    ],
  },

  // ----------------------------------------------------------------- Fleet
  vehicle: {
    table: 'vehicles',
    label: 'vehicle',
    permission: { kind: 'module', module: 'fleet', roles: ['fleet'] },
    titleColumn: 'plate',
    activityModule: 'fleet',
    revalidate: ['/fleet', '/fleet/vehicles', '/search'],
    fields: [
      { name: 'plate', label: 'Registration', type: 'text', required: true },
      { name: 'model', label: 'Make & model', type: 'text', required: true },
      { name: 'icon', label: 'Icon', type: 'select', options: ['🚗', '🚐', '🚚', '🚛'] },
      { name: 'vehicle_group', label: 'Group', type: 'select', options: ['Cars', 'Vans', 'Trucks', 'Trailers'], required: true },
      { name: 'driver_name', label: 'Driver', type: 'text', nullable: true },
      { name: 'odometer_label', label: 'Odometer', type: 'text', placeholder: '128 412 km' },
      { name: 'service_label', label: 'Service due in', type: 'text', placeholder: '840 km' },
      { name: 'service_pct', label: 'Service interval used (%)', type: 'number' },
      { name: 'disc_expiry', label: 'Disc expiry', type: 'text', placeholder: '31 Aug 2026' },
      { name: 'disc_tone', label: 'Disc colour', type: 'select', options: TONES },
      { name: 'inspection', label: 'Inspection', type: 'text' },
      { name: 'wash', label: 'Last wash', type: 'text' },
      { name: 'status', label: 'Status', type: 'text', required: true },
      { name: 'tone', label: 'Status colour', type: 'select', options: TONES },
    ],
  },
  driver: {
    table: 'drivers',
    label: 'driver',
    permission: { kind: 'module', module: 'fleet', roles: ['fleet', 'hr'] },
    titleColumn: 'name',
    activityModule: 'fleet',
    revalidate: ['/fleet/people'],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'code', label: 'Licence code', type: 'text', placeholder: 'EB + PrDP' },
      { name: 'licence_expiry', label: 'Licence expiry', type: 'text' },
      { name: 'prdp_expiry', label: 'PrDP expiry', type: 'text', placeholder: '—' },
      { name: 'status', label: 'Status', type: 'text' },
      { name: 'tone', label: 'Status colour', type: 'select', options: TONES },
      { name: 'sort_order', label: 'Order', type: 'number' },
    ],
  },
  incident: {
    table: 'incidents',
    label: 'incident',
    permission: { kind: 'module', module: 'fleet', roles: ['fleet', 'hr'] },
    titleColumn: 'title',
    activityModule: 'fleet',
    revalidate: ['/fleet/people'],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, wide: true },
      { name: 'detail', label: 'Detail', type: 'textarea', wide: true },
      { name: 'vehicle_plate', label: 'Vehicle', type: 'text', nullable: true },
      { name: 'when_label', label: 'When', type: 'text' },
      { name: 'stage', label: 'Stage', type: 'text' },
      { name: 'sla_label', label: 'SLA note', type: 'text' },
      { name: 'tone', label: 'Stage colour', type: 'select', options: TONES },
      { name: 'dot_color', label: 'Dot colour', type: 'select', options: ['#DC3545', '#FFC107', '#28A745', '#007BFF'] },
    ],
  },
  claim: {
    table: 'expense_claims',
    label: 'expense claim',
    permission: { kind: 'module', module: 'fleet', roles: ['fleet', 'line'] },
    titleColumn: 'driver_name',
    activityModule: 'fleet',
    revalidate: ['/fleet/claims'],
    fields: [
      { name: 'driver_name', label: 'Driver', type: 'text', required: true },
      { name: 'vehicle_plate', label: 'Vehicle', type: 'text', required: true },
      { name: 'km', label: 'Kilometres', type: 'number' },
      { name: 'fuel', label: 'Fuel (ZAR)', type: 'money' },
      { name: 'toll', label: 'Toll (ZAR)', type: 'money' },
      { name: 'period_label', label: 'Period', type: 'text', placeholder: '20 — 26 Jul' },
      { name: 'status', label: 'Status', type: 'text' },
      { name: 'tone', label: 'Status colour', type: 'select', options: TONES },
    ],
  },
  expiry: {
    table: 'expiries',
    label: 'expiry',
    permission: { kind: 'module', module: 'fleet', roles: ['fleet', 'hr'] },
    titleColumn: 'item',
    activityModule: 'fleet',
    revalidate: ['/fleet'],
    fields: [
      { name: 'item', label: 'Item', type: 'text', required: true },
      { name: 'who', label: 'Who / what', type: 'text', required: true },
      { name: 'due_label', label: 'Due', type: 'text', required: true },
      { name: 'status', label: 'Status', type: 'text' },
      { name: 'tone', label: 'Status colour', type: 'select', options: TONES },
      { name: 'sort_order', label: 'Order', type: 'number' },
    ],
  },
  fleet_event: {
    table: 'fleet_events',
    label: 'event',
    permission: { kind: 'module', module: 'fleet', roles: ['fleet'] },
    titleColumn: 'title',
    activityModule: 'fleet',
    revalidate: ['/fleet/events'],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, wide: true },
      { name: 'detail', label: 'Detail', type: 'text', wide: true },
      { name: 'when_label', label: 'When', type: 'text' },
      { name: 'day_of_month', label: 'Day of month', type: 'number', nullable: true },
      { name: 'color', label: 'Colour', type: 'select', options: ['#007BFF', '#28A745', '#FFC107', '#DC3545'] },
      { name: 'sort_order', label: 'Order', type: 'number' },
    ],
  },
  fleet_document: {
    table: 'documents',
    label: 'document',
    permission: { kind: 'module', module: 'fleet', roles: ['fleet', 'hr'] },
    titleColumn: 'name',
    activityModule: 'fleet',
    revalidate: ['/fleet/documents'],
    defaults: { module: 'fleet', owner_type: 'vehicle' },
    fields: [
      { name: 'name', label: 'File name', type: 'text', required: true, wide: true },
      { name: 'linked_to', label: 'Linked to', type: 'text', nullable: true },
      { name: 'uploaded_label', label: 'Uploaded', type: 'text' },
      { name: 'expires_label', label: 'Expires', type: 'text', placeholder: '—' },
      { name: 'status', label: 'Status', type: 'text' },
      { name: 'tone', label: 'Status colour', type: 'select', options: TONES },
      { name: 'url', label: 'Link', type: 'text', nullable: true, wide: true },
      { name: 'sort_order', label: 'Order', type: 'number' },
    ],
  },

  // -------------------------------------------------------------- Property
  property: {
    table: 'properties',
    label: 'property',
    permission: { kind: 'module', module: 'prop', roles: ['admin'] },
    titleColumn: 'address',
    activityModule: 'prop',
    revalidate: ['/property', '/property/properties', '/search'],
    fields: [
      { name: 'address', label: 'Address', type: 'text', required: true, wide: true },
      { name: 'area', label: 'Area', type: 'text', required: true },
      { name: 'icon', label: 'Icon', type: 'select', options: ['🏠', '🏢'] },
      { name: 'province', label: 'Province', type: 'text' },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'suburb', label: 'Suburb', type: 'text' },
      { name: 'rent', label: 'Monthly rent (ZAR)', type: 'money', required: true },
      { name: 'lease_label', label: 'Lease label', type: 'text', placeholder: 'Ends 31 Mar 2027' },
      { name: 'occupancy', label: 'Occupancy', type: 'select', options: ['Occupied', 'Vacant'], required: true },
      { name: 'status', label: 'Status', type: 'text', required: true },
      { name: 'tone', label: 'Status colour', type: 'select', options: TONES },
    ],
  },
  property_tenant: {
    table: 'property_tenants',
    label: 'tenant',
    permission: { kind: 'module', module: 'prop', roles: ['admin'] },
    titleColumn: 'name',
    activityModule: 'prop',
    revalidate: ['/property', '/property/tenants'],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'initials', label: 'Initials', type: 'text', required: true },
      { name: 'phone', label: 'Phone', type: 'text', nullable: true },
      { name: 'property_id', label: 'Property', type: 'ref', table: 'properties', labelColumn: 'address', nullable: true },
      { name: 'property_label', label: 'Property label', type: 'text', wide: true },
      { name: 'area', label: 'Area', type: 'text' },
      { name: 'lease_end', label: 'Lease ends', type: 'text' },
      { name: 'account', label: 'Account status', type: 'text' },
      { name: 'tone', label: 'Account colour', type: 'select', options: TONES },
      { name: 'since_label', label: 'Tenant since', type: 'text' },
    ],
  },
  lease: {
    table: 'leases',
    label: 'lease',
    permission: { kind: 'module', module: 'prop', roles: ['admin'] },
    titleColumn: 'tenant_name',
    activityModule: 'prop',
    revalidate: ['/property'],
    fields: [
      { name: 'tenant_name', label: 'Tenant', type: 'text', required: true },
      { name: 'property_label', label: 'Property', type: 'text', required: true, wide: true },
      { name: 'starts_label', label: 'Starts', type: 'text' },
      { name: 'ends_label', label: 'Ends', type: 'text' },
      { name: 'rent', label: 'Rent (ZAR)', type: 'money' },
      { name: 'status', label: 'Status', type: 'text' },
      { name: 'tone', label: 'Status colour', type: 'select', options: TONES },
    ],
  },
  invoice: {
    table: 'invoices',
    label: 'invoice',
    permission: { kind: 'module', module: 'prop', roles: ['admin'] },
    titleColumn: 'tenant_name',
    activityModule: 'prop',
    revalidate: ['/property', '/property/invoicing'],
    fields: [
      { name: 'tenant_name', label: 'Tenant', type: 'text', required: true },
      { name: 'property_label', label: 'Property', type: 'text', required: true },
      { name: 'amount', label: 'Amount (ZAR)', type: 'money', required: true },
      { name: 'due_label', label: 'Due', type: 'text', placeholder: '01 Sep' },
      { name: 'method', label: 'Method', type: 'select', options: ['Direct debit', 'EFT', 'Payment link', 'Cash'] },
      { name: 'status', label: 'Status', type: 'text' },
      { name: 'tone', label: 'Status colour', type: 'select', options: TONES },
      { name: 'needs_chase', label: 'Needs chasing', type: 'bool' },
    ],
  },
  fault: {
    table: 'fault_jobs',
    label: 'fault job',
    permission: { kind: 'module', module: 'prop', roles: ['admin'] },
    titleColumn: 'title',
    activityModule: 'prop',
    revalidate: ['/property', '/property/maintenance', '/property/jobs', '/search'],
    fields: [
      { name: 'ref', label: 'Reference', type: 'text', required: true, placeholder: 'MNT-2300' },
      { name: 'title', label: 'Fault', type: 'text', required: true, wide: true },
      { name: 'category', label: 'Category', type: 'select', options: ['Electrical', 'Plumbing', 'General Maintenance', 'Other'], required: true },
      { name: 'property_id', label: 'Property', type: 'ref', table: 'properties', labelColumn: 'address', nullable: true },
      { name: 'property_label', label: 'Property label', type: 'text', wide: true },
      { name: 'tenant_label', label: 'Tenant', type: 'text', nullable: true },
      { name: 'team', label: 'Team', type: 'text' },
      { name: 'team_initials', label: 'Team initials', type: 'text' },
      { name: 'stage', label: 'Stage', type: 'select', options: ['Logged', 'Dispatched', 'In progress', 'Completed'], required: true },
      { name: 'sla_label', label: 'SLA', type: 'text', nullable: true },
      { name: 'tone', label: 'SLA colour', type: 'select', options: TONES },
    ],
  },

  // ------------------------------------------ Checklist templates (shared)
  checklist_template_jk: {
    table: 'checklist_templates',
    label: 'checklist template',
    permission: { kind: 'module', module: 'jk', roles: ['hq'] },
    titleColumn: 'name',
    activityModule: 'jk',
    revalidate: ['/jk/operations'],
    defaults: { module: 'jk' },
    fields: [
      { name: 'name', label: 'Template name', type: 'text', required: true, wide: true },
      { name: 'scope', label: 'Applies to', type: 'text' },
      { name: 'sort_order', label: 'Order', type: 'number' },
    ],
  },
  checklist_template_fleet: {
    table: 'checklist_templates',
    label: 'checklist template',
    permission: { kind: 'module', module: 'fleet', roles: ['fleet'] },
    titleColumn: 'name',
    activityModule: 'fleet',
    revalidate: ['/fleet/checklists'],
    defaults: { module: 'fleet' },
    fields: [
      { name: 'name', label: 'Template name', type: 'text', required: true, wide: true },
      { name: 'scope', label: 'Applies to', type: 'text' },
      { name: 'sort_order', label: 'Order', type: 'number' },
    ],
  },
  checklist_item_jk: {
    table: 'checklist_items',
    label: 'checklist item',
    permission: { kind: 'module', module: 'jk', roles: ['hq'] },
    titleColumn: 'label',
    activityModule: 'jk',
    revalidate: ['/jk/operations', '/jk/shift'],
    fields: [
      { name: 'template_id', label: 'Template', type: 'ref', table: 'checklist_templates', labelColumn: 'name', required: true },
      { name: 'label', label: 'Item', type: 'text', required: true, wide: true },
      { name: 'kind', label: 'Response type', type: 'select', options: ['Pass / fail', 'Photo', 'Number', 'Text', 'Upload', 'Signature'] },
      { name: 'required', label: 'Required', type: 'bool' },
      { name: 'sort_order', label: 'Order', type: 'number' },
    ],
  },
  checklist_item_fleet: {
    table: 'checklist_items',
    label: 'checklist item',
    permission: { kind: 'module', module: 'fleet', roles: ['fleet'] },
    titleColumn: 'label',
    activityModule: 'fleet',
    revalidate: ['/fleet/checklists'],
    fields: [
      { name: 'template_id', label: 'Template', type: 'ref', table: 'checklist_templates', labelColumn: 'name', required: true },
      { name: 'label', label: 'Item', type: 'text', required: true, wide: true },
      { name: 'kind', label: 'Response type', type: 'select', options: ['Pass / fail', 'Photo', 'Number', 'Text', 'Upload', 'Signature'] },
      { name: 'required', label: 'Required', type: 'bool' },
      { name: 'sort_order', label: 'Order', type: 'number' },
    ],
  },
} as const satisfies Record<string, Resource>;

export type ResourceKey = keyof typeof RESOURCES;

export function getResource(key: string): Resource | null {
  return Object.prototype.hasOwnProperty.call(RESOURCES, key) ? (RESOURCES as Record<string, Resource>)[key] : null;
}
