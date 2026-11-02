-- Goals tables (shared by both of you). Run once in the Supabase SQL Editor.
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target numeric not null,
  saved numeric not null default 0,
  due date,
  created_at timestamptz default now()
);
create table if not exists goal_entries (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals(id) on delete cascade,
  amount numeric not null,
  note text,
  created_at timestamptz default now()
);
alter table goals enable row level security;
alter table goal_entries enable row level security;
drop policy if exists hh_g on goals;
create policy hh_g on goals for all
  using ((current_setting('request.headers', true)::json ->> 'x-household') = 'MANNFAMILY')
  with check ((current_setting('request.headers', true)::json ->> 'x-household') = 'MANNFAMILY');
drop policy if exists hh_ge on goal_entries;
create policy hh_ge on goal_entries for all
  using ((current_setting('request.headers', true)::json ->> 'x-household') = 'MANNFAMILY')
  with check ((current_setting('request.headers', true)::json ->> 'x-household') = 'MANNFAMILY');
grant select, insert, update, delete on goals to anon, authenticated;
grant select, insert, update, delete on goal_entries to anon, authenticated;
-- makes the new tables visible to the app right away
notify pgrst, 'reload schema';
