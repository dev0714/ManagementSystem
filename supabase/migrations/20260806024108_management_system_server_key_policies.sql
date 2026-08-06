-- The live value of app_config.server_key is deliberately NOT committed.
-- Generate one, store it here, and put the same value in MS_SERVER_KEY:
--   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

-- Server-only shared secret. Requests must present it in the X-MS-Server-Key header.
create table if not exists "ManagementSystem".app_config (
  key   text primary key,
  value text not null
);
alter table "ManagementSystem".app_config enable row level security;
alter table "ManagementSystem".app_config force row level security;
revoke all on "ManagementSystem".app_config from anon, authenticated;
grant all on "ManagementSystem".app_config to service_role;

insert into "ManagementSystem".app_config(key, value)
values ('server_key', 'REPLACE_WITH_A_LONG_RANDOM_SECRET')
on conflict (key) do update set value = excluded.value;

create or replace function "ManagementSystem".is_server_request()
returns boolean
language sql
stable
security definer
set search_path = "ManagementSystem", pg_temp
as $$
  select coalesce(
    nullif(current_setting('request.headers', true), '')::json ->> 'x-ms-server-key',
    ''
  ) = (select value from "ManagementSystem".app_config where key = 'server_key');
$$;

revoke all on function "ManagementSystem".is_server_request() from public;
grant execute on function "ManagementSystem".is_server_request() to anon, authenticated, service_role;

do $$
declare t record;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'ManagementSystem' and tablename <> 'app_config'
  loop
    execute format('grant select, insert, update, delete on %I.%I to anon', 'ManagementSystem', t.tablename);
    execute format('drop policy if exists server_only on %I.%I', 'ManagementSystem', t.tablename);
    execute format(
      'create policy server_only on %I.%I for all to anon, authenticated
         using ("ManagementSystem".is_server_request())
         with check ("ManagementSystem".is_server_request())',
      'ManagementSystem', t.tablename);
  end loop;
end $$;
