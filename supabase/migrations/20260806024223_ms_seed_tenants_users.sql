set search_path = "ManagementSystem", extensions, public;

insert into tenants (slug, name, short_name, monogram, tagline, primary_color) values
  ('cellular-citi', 'Cellular Citi Group', 'Cellular Citi', 'CC', 'OPERATIONS CRM', '#007BFF'),
  ('atlas-group',   'Atlas Facilities Group', 'Atlas Group', 'AG', 'OPERATIONS CRM', '#007BFF')
on conflict (slug) do nothing;

with t as (select id from tenants where slug = 'cellular-citi')
insert into users (tenant_id, email, password_hash, name, initials, title, scope_label, scope_tone, is_super_admin, has_crm, home_route)
select t.id, v.email, crypt('Demo@1234', gen_salt('bf', 10)), v.name, v.initials, v.title, v.scope, v.tone, v.super, v.crm, v.home
from t, (values
  ('zaid@cellularciti.co.za',    'Zaid Hendricks',  'ZH', 'Group Super Admin',        'All systems',        'purple', true,  true,  '/'),
  ('aadil@cellularciti.co.za',   'Aadil Kader',     'AK', 'HQ Admin — Masjid Ops',    'Masjid Ops',         'ok',     false, true,  '/jk'),
  ('yusuf@cellularciti.co.za',   'Yusuf Ebrahim',   'YE', 'Site Manager — Athlone',   '4 sites',            'ok',     false, false, '/jk'),
  ('ridwaan@cellularciti.co.za', 'Ridwaan Peters',  'RP', 'Cleaner — Masjid Al-Noor', 'My shift',           'grey',   false, false, '/jk/shift'),
  ('kegan@cellularciti.co.za',   'Kegan Fortuin',   'KF', 'HQ Repairs',               'Repair queue',       'warn',   false, false, '/jk/repairs'),
  ('tania@cellularciti.co.za',   'Tania Naidoo',    'TN', 'Fleet Manager',            '14 vehicles',        'info',   false, true,  '/fleet'),
  ('marius@cellularciti.co.za',  'Marius Botha',    'MB', 'Driver — CA 418-772',      'My vehicle',         'grey',   false, false, '/fleet/today'),
  ('derek@cellularciti.co.za',   'Derek Solomons',  'DS', 'Line Manager — Sales',     'Claims',             'warn',   false, true,  '/fleet/claims'),
  ('rehana@cellularciti.co.za',  'Rehana Isaacs',   'RI', 'HR Officer',               'People',             'info',   false, true,  '/fleet/people'),
  ('lauren@cellularciti.co.za',  'Lauren Pillay',   'LP', 'Property Admin',           '24 properties',      'info',   false, true,  '/property'),
  ('naledi.m@outlook.com',       'Naledi Mahlangu', 'NM', 'Tenant — 18 Kloof St 4B',  'My home',            'grey',   false, false, '/property/portal'),
  ('sipho@capeplumbing.co.za',   'Sipho Ndlovu',    'SN', 'Contractor — Cape Plumbing','Temporary access',  'warn',   false, false, '/property/jobs')
) as v(email, name, initials, title, scope, tone, super, crm, home)
on conflict (tenant_id, email) do nothing;

update users set temp_access_until = now() + interval '41 hours' where email = 'sipho@capeplumbing.co.za';
update users set last_active_at = now() where last_active_at is null;

insert into user_modules (tenant_id, user_id, module, role)
select u.tenant_id, u.id, v.module, v.role
from users u
join (values
  ('zaid@cellularciti.co.za','jk','hq'),      ('zaid@cellularciti.co.za','fleet','fleet'), ('zaid@cellularciti.co.za','prop','admin'),
  ('aadil@cellularciti.co.za','jk','hq'),
  ('yusuf@cellularciti.co.za','jk','manager'),
  ('ridwaan@cellularciti.co.za','jk','cleaner'),
  ('kegan@cellularciti.co.za','jk','repairs'),
  ('tania@cellularciti.co.za','fleet','fleet'),
  ('marius@cellularciti.co.za','fleet','driver'),
  ('derek@cellularciti.co.za','fleet','line'),
  ('rehana@cellularciti.co.za','fleet','hr'),
  ('lauren@cellularciti.co.za','prop','admin'),
  ('naledi.m@outlook.com','prop','tenant'),
  ('sipho@capeplumbing.co.za','prop','team')
) as v(email, module, role) on v.email = u.email
on conflict (user_id, module) do nothing;

with t as (select id from tenants where slug = 'atlas-group')
insert into users (tenant_id, email, password_hash, name, initials, title, scope_label, scope_tone, is_super_admin, has_crm, home_route)
select t.id, v.email, crypt('Demo@1234', gen_salt('bf', 10)), v.name, v.initials, v.title, v.scope, v.tone, v.super, v.crm, v.home
from t, (values
  ('owner@atlasgroup.co.za',  'Nadia Petersen', 'NP', 'Group Super Admin',   'All systems',  'purple', true,  true,  '/'),
  ('fleet@atlasgroup.co.za',  'Bongani Zulu',   'BZ', 'Fleet Manager',       '6 vehicles',   'info',   false, true,  '/fleet'),
  ('props@atlasgroup.co.za',  'Ilse du Toit',   'ID', 'Property Admin',      '8 properties', 'info',   false, true,  '/property')
) as v(email, name, initials, title, scope, tone, super, crm, home)
on conflict (tenant_id, email) do nothing;

insert into user_modules (tenant_id, user_id, module, role)
select u.tenant_id, u.id, v.module, v.role
from users u
join (values
  ('owner@atlasgroup.co.za','fleet','fleet'), ('owner@atlasgroup.co.za','prop','admin'),
  ('fleet@atlasgroup.co.za','fleet','fleet'),
  ('props@atlasgroup.co.za','prop','admin')
) as v(email, module, role) on v.email = u.email
on conflict (user_id, module) do nothing;
