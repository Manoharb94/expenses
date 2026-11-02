-- Goals table (shared by both of you). Run once in the Supabase SQL Editor.
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target numeric not null,
  saved numeric not null default 0,
  due date,
  created_at timestamptz default now()
);
alter table goals enable row level security;
drop policy if exists hh_g on goals;
create policy hh_g on goals for all
  using ((current_setting('request.headers', true)::json ->> 'x-household') = 'MANNFAMILY')
  with check ((current_setting('request.headers', true)::json ->> 'x-household') = 'MANNFAMILY');
grant select, insert, update, delete on goals to anon, authenticated;
