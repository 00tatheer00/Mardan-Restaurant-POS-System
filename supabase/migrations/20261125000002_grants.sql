-- New Supabase projects don't auto-grant public tables to API roles. RLS still decides which rows each user sees.
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant execute on functions to authenticated, service_role;

-- profiles: clients never see/write pin_hash or lockout columns
revoke all on profiles from anon, authenticated;
grant select (id, full_name, username, role, is_active, branch_id, created_at, updated_at, created_by) on profiles to authenticated;
grant update (full_name, username, role, is_active) on profiles to authenticated;
