create schema if not exists "ManagementSystem";

create extension if not exists pgcrypto with schema extensions;

-- ============ TENANCY & AUTH ============
create table "ManagementSystem".tenants (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  short_name    text not null,
  monogram      text not null default 'CC',
  tagline       text not null default 'OPERATIONS CRM',
  primary_color text not null default '#007BFF',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create table "ManagementSystem".users (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  email            text not null,
  password_hash    text not null,
  name             text not null,
  initials         text not null,
  title            text not null default '',
  scope_label      text not null default '',
  scope_tone       text not null default 'grey',
  is_super_admin   boolean not null default false,
  has_crm          boolean not null default false,
  home_route       text not null default '/',
  is_active        boolean not null default true,
  temp_access_until timestamptz,
  last_active_at   timestamptz,
  created_at       timestamptz not null default now(),
  unique (tenant_id, email)
);
create unique index users_email_lower_uq on "ManagementSystem".users (lower(email));

create table "ManagementSystem".user_modules (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  user_id   uuid not null references "ManagementSystem".users(id) on delete cascade,
  module    text not null check (module in ('jk','fleet','prop')),
  role      text not null,
  unique (user_id, module)
);

create table "ManagementSystem".sessions (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  user_id    uuid not null references "ManagementSystem".users(id) on delete cascade,
  token_hash text not null unique,
  user_agent text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index sessions_user_idx on "ManagementSystem".sessions(user_id);

-- ============ CRM ============
create table "ManagementSystem".contacts (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  name       text not null,
  initials   text not null,
  type       text not null check (type in ('Tenant','Client','Supplier','Prospect','Staff')),
  phone      text,
  whatsapp   text,
  email      text,
  linked_to  text,
  status     text not null default 'Active',
  tone       text not null default 'ok',
  role_line  text,
  owner_id   uuid references "ManagementSystem".users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index contacts_tenant_idx on "ManagementSystem".contacts(tenant_id);

create table "ManagementSystem".contact_fields (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  contact_id uuid not null references "ManagementSystem".contacts(id) on delete cascade,
  label      text not null,
  value      text not null,
  sort_order int not null default 0
);

create table "ManagementSystem".deals (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  title      text not null,
  client     text not null,
  contact_id uuid references "ManagementSystem".contacts(id) on delete set null,
  stage      text not null check (stage in ('enquiry','qualified','proposal','contract','won','lost')),
  value      numeric(14,2) not null default 0,
  owner_initials text not null default '',
  owner_id   uuid references "ManagementSystem".users(id) on delete set null,
  source_module text check (source_module in ('jk','fleet','prop','crm')),
  age_label  text,
  created_at timestamptz not null default now()
);

create table "ManagementSystem".activity_events (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  module     text not null default 'crm' check (module in ('jk','fleet','prop','crm')),
  severity   text not null default 'info' check (severity in ('info','low','medium','high','critical','success')),
  title      text not null,
  detail     text,
  who        text,
  contact_id uuid references "ManagementSystem".contacts(id) on delete set null,
  actor_id   uuid references "ManagementSystem".users(id) on delete set null,
  occurred_at timestamptz not null default now()
);
create index activity_tenant_idx on "ManagementSystem".activity_events(tenant_id, occurred_at desc);

create table "ManagementSystem".tasks (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  title      text not null,
  meta       text,
  due_label  text,
  tone       text not null default 'grey',
  is_done    boolean not null default false,
  assignee_id uuid references "ManagementSystem".users(id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table "ManagementSystem".alerts (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  module      text not null check (module in ('jk','fleet','prop','crm')),
  severity    text not null check (severity in ('CRITICAL','HIGH','MEDIUM','LOW')),
  title       text not null,
  detail      text not null default '',
  location    text,
  rule        text,
  recipients  text not null default '',
  primary_action text,
  whatsapp_body  text,
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);
create index alerts_tenant_idx on "ManagementSystem".alerts(tenant_id, created_at desc);

create table "ManagementSystem".trigger_rules (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references "ManagementSystem".tenants(id) on delete cascade,
  module     text not null check (module in ('jk','fleet','prop','crm')),
  name       text not null,
  description text not null default '',
  tone       text not null default 'info',
  sort_order int not null default 0
);
