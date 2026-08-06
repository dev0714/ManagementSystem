-- ============ JK MASJID OPS ============
create table "ManagementSystem".sites (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  name       text not null,
  suburb     text not null,
  lat        double precision,
  lng        double precision,
  geofence_m int not null default 120,
  manager_id uuid references "ManagementSystem".users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table "ManagementSystem".prayer_times (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  name      text not null,
  hour      int  not null,
  minute    int  not null,
  sort_order int not null default 0
);

create table "ManagementSystem".shifts (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  site_id       uuid not null references "ManagementSystem".sites(id) on delete cascade,
  user_id       uuid references "ManagementSystem".users(id) on delete set null,
  cleaner_name  text not null,
  shift_date    date not null default current_date,
  starts_at     text not null default '04:30',
  clock_in_at   text,
  clock_in_lat  double precision,
  clock_in_lng  double precision,
  selfie_status text not null default 'pending' check (selfie_status in ('pending','approved','rejected')),
  checklist_state text not null default 'Not submitted',
  status        text not null default 'On site',
  tone          text not null default 'ok',
  created_at    timestamptz not null default now(),
  unique (site_id, shift_date, cleaner_name)
);

create table "ManagementSystem".checklist_templates (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  module     text not null check (module in ('jk','fleet','prop')),
  name       text not null,
  scope      text not null default '',
  sort_order int not null default 0
);

create table "ManagementSystem".checklist_items (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  template_id uuid not null references "ManagementSystem".checklist_templates(id) on delete cascade,
  label       text not null,
  kind        text not null default 'Pass / fail',
  required    boolean not null default true,
  sort_order  int not null default 0
);

create table "ManagementSystem".checklist_submissions (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  template_id  uuid references "ManagementSystem".checklist_templates(id) on delete set null,
  site_id      uuid references "ManagementSystem".sites(id) on delete cascade,
  vehicle_id   uuid,
  user_id      uuid references "ManagementSystem".users(id) on delete set null,
  prayer       text,
  submitted_at timestamptz not null default now(),
  due_at       timestamptz,
  flagged_count int not null default 0,
  results      jsonb not null default '{}'::jsonb
);

create table "ManagementSystem".maintenance_jobs (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  ref        text not null,
  fault      text not null,
  site_id    uuid references "ManagementSystem".sites(id) on delete set null,
  site_label text,
  owner      text not null default 'Unassigned',
  repeat_flag text,
  age_label  text,
  sla_label  text,
  tone       text not null default 'ok',
  status     text not null default 'open',
  created_at timestamptz not null default now()
);

create table "ManagementSystem".stock_items (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  name       text not null,
  level_pct  int not null default 100,
  note       text not null default '',
  sort_order int not null default 0
);

create table "ManagementSystem".asset_reviews (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  name       text not null,
  site_label text not null,
  fails      text not null,
  sort_order int not null default 0
);

create table "ManagementSystem".prayer_compliance (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  prayer     text not null,
  on_time_pct int not null,
  late_pct   int not null,
  sort_order int not null default 0
);

-- ============ FLEET ============
create table "ManagementSystem".vehicles (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  icon         text not null default '🚐',
  plate        text not null,
  model        text not null,
  vehicle_group text not null default 'Cars',
  driver_name  text,
  driver_id    uuid references "ManagementSystem".users(id) on delete set null,
  odometer_label text not null default '0 km',
  service_label  text not null default '',
  service_pct    int not null default 0,
  disc_expiry    text not null default '',
  disc_tone      text not null default 'ok',
  inspection     text not null default 'Submitted',
  wash           text not null default '',
  status         text not null default 'On road',
  tone           text not null default 'ok',
  created_at   timestamptz not null default now(),
  unique (tenant_id, plate)
);

create table "ManagementSystem".driver_logs (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  vehicle_id uuid references "ManagementSystem".vehicles(id) on delete cascade,
  user_id    uuid references "ManagementSystem".users(id) on delete set null,
  kind       text not null check (kind in ('start','end')),
  odometer   int not null default 0,
  slips      jsonb not null default '[]'::jsonb,
  note       text,
  logged_at  timestamptz not null default now()
);

create table "ManagementSystem".expense_claims (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  driver_name text not null,
  user_id     uuid references "ManagementSystem".users(id) on delete set null,
  vehicle_plate text not null,
  km          int not null default 0,
  fuel        numeric(12,2) not null default 0,
  toll        numeric(12,2) not null default 0,
  status      text not null default 'Ready',
  tone        text not null default 'ok',
  period_label text not null default '',
  created_at  timestamptz not null default now()
);

create table "ManagementSystem".incidents (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  title      text not null,
  detail     text not null default '',
  vehicle_plate text,
  when_label text not null default '',
  stage      text not null default 'Logged',
  sla_label  text not null default '',
  tone       text not null default 'info',
  dot_color  text not null default '#007BFF',
  created_at timestamptz not null default now()
);

create table "ManagementSystem".drivers (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  name       text not null,
  code       text not null default 'B',
  licence_expiry text not null default '',
  prdp_expiry    text not null default '—',
  status     text not null default 'Valid',
  tone       text not null default 'ok',
  sort_order int not null default 0
);

create table "ManagementSystem".fleet_events (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  title      text not null,
  detail     text not null default '',
  when_label text not null default '',
  day_of_month int,
  color      text not null default '#007BFF',
  sort_order int not null default 0
);

create table "ManagementSystem".expiries (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  item       text not null,
  who        text not null,
  due_label  text not null,
  status     text not null,
  tone       text not null default 'info',
  sort_order int not null default 0
);

create table "ManagementSystem".claim_history (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  month      text not null,
  fuel_k     int not null,
  toll_k     int not null,
  sort_order int not null default 0
);

-- ============ PROPERTY ============
create table "ManagementSystem".properties (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  icon       text not null default '🏠',
  address    text not null,
  area       text not null,
  province   text not null default 'Western Cape',
  city       text not null default 'Cape Town',
  suburb     text not null default '',
  rent       numeric(12,2) not null default 0,
  lease_label text not null default '',
  occupancy  text not null default 'Occupied' check (occupancy in ('Occupied','Vacant')),
  status     text not null default 'Occupied',
  tone       text not null default 'ok',
  created_at timestamptz not null default now()
);

create table "ManagementSystem".property_tenants (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  contact_id  uuid references "ManagementSystem".contacts(id) on delete set null,
  user_id     uuid references "ManagementSystem".users(id) on delete set null,
  property_id uuid references "ManagementSystem".properties(id) on delete set null,
  name        text not null,
  initials    text not null,
  phone       text,
  property_label text not null default '',
  area        text not null default '',
  lease_end   text not null default '',
  account     text not null default 'Up to date',
  tone        text not null default 'ok',
  since_label text not null default '',
  fields      jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

create table "ManagementSystem".documents (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  module      text not null check (module in ('jk','fleet','prop','crm')),
  owner_type  text not null,
  owner_id    uuid,
  name        text not null,
  linked_to   text not null default '',
  uploaded_label text not null default '',
  expires_label  text not null default '—',
  status      text not null default 'Filed',
  tone        text not null default 'info',
  url         text,
  sort_order  int not null default 0
);

create table "ManagementSystem".leases (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  property_id uuid references "ManagementSystem".properties(id) on delete set null,
  property_tenant_id uuid references "ManagementSystem".property_tenants(id) on delete set null,
  tenant_name text not null,
  property_label text not null,
  starts_label text not null default '',
  ends_label   text not null default '',
  rent        numeric(12,2) not null default 0,
  status      text not null default 'Active',
  tone        text not null default 'ok',
  created_at  timestamptz not null default now()
);

create table "ManagementSystem".invoices (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  property_tenant_id uuid references "ManagementSystem".property_tenants(id) on delete set null,
  tenant_name text not null,
  property_label text not null,
  amount      numeric(12,2) not null default 0,
  due_label   text not null default '',
  method      text not null default 'Direct debit',
  status      text not null default 'Scheduled',
  tone        text not null default 'info',
  needs_chase boolean not null default false,
  created_at  timestamptz not null default now()
);

create table "ManagementSystem".fault_jobs (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  ref         text not null,
  category    text not null check (category in ('Electrical','Plumbing','General Maintenance','Other')),
  title       text not null,
  property_id uuid references "ManagementSystem".properties(id) on delete set null,
  property_label text not null default '',
  tenant_label text,
  team        text not null default 'Unassigned',
  team_initials text not null default '—',
  stage       text not null default 'Logged' check (stage in ('Logged','Dispatched','In progress','Completed')),
  sla_label   text not null default 'New',
  tone        text not null default 'bad',
  logged_by_user_id uuid references "ManagementSystem".users(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (tenant_id, ref)
);

create table "ManagementSystem".job_messages (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  job_id     uuid not null references "ManagementSystem".fault_jobs(id) on delete cascade,
  direction  text not null check (direction in ('in','out')),
  body       text not null,
  meta       text not null default '',
  created_at timestamptz not null default now()
);

create table "ManagementSystem".onboarding_applications (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  applicant   text not null,
  property_label text not null default '',
  current_step int not null default 0,
  data        jsonb not null default '{}'::jsonb,
  status      text not null default 'In progress',
  created_at  timestamptz not null default now()
);

create table "ManagementSystem".collection_history (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  month      text not null,
  pct        int not null,
  sort_order int not null default 0
);

create table "ManagementSystem".kpis (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  board      text not null,
  label      text not null,
  value      text not null,
  delta      text not null default '',
  tone       text not null default 'info',
  sort_order int not null default 0
);
create index kpis_board_idx on "ManagementSystem".kpis(tenant_id, board, sort_order);
