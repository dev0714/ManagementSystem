grant usage on schema "ManagementSystem" to anon, authenticated, service_role;
grant all on all tables in schema "ManagementSystem" to service_role;
grant all on all sequences in schema "ManagementSystem" to service_role;
grant all on all functions in schema "ManagementSystem" to service_role;
alter default privileges in schema "ManagementSystem" grant all on tables to service_role;
alter default privileges in schema "ManagementSystem" grant all on sequences to service_role;

-- anon / authenticated get schema usage only; RLS with zero policies denies everything.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'ManagementSystem' loop
    execute format('alter table %I.%I enable row level security', 'ManagementSystem', t.tablename);
    execute format('alter table %I.%I force row level security', 'ManagementSystem', t.tablename);
    execute format('revoke all on %I.%I from anon, authenticated', 'ManagementSystem', t.tablename);
  end loop;
end $$;

-- expose the schema to PostgREST
alter role authenticator set pgrst.db_schemas = 'public, graphql_public, ManagementSystem';
notify pgrst, 'reload config';
