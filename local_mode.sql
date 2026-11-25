-- ============================================================================
-- Gharwise on-phone app (branch local-mode): the only things the server keeps.
--   * login: Supabase phone OTP (no new tables)
--   * lm_usage:   last opened, version, which features are on, payment COUNT (no amounts)
--   * lm_families / lm_family_members / lm_items: family sync, END-TO-END ENCRYPTED
--       (the server stores scrambled blobs; the key never leaves the phones)
--   * lm_mail:    bank emails from the Gmail script, ENCRYPTED in Gmail, deleted
--       as soon as the phone collects them
-- Safe to run more than once.
-- ============================================================================

create sequence if not exists lm_seq;

create table if not exists lm_users (
  user_id     uuid primary key references auth.users on delete cascade,
  mail_token  text unique,
  mail_last   timestamptz,            -- last time the Gmail script checked in
  mail_count  int not null default 0, -- encrypted emails received so far
  created_at  timestamptz not null default now()
);

create table if not exists lm_usage (
  user_id      uuid primary key references auth.users on delete cascade,
  first_seen   timestamptz not null default now(),
  last_seen    timestamptz,
  opens        int not null default 0,
  platform     text,
  app_version  text,
  sms_on       boolean,
  email_on     boolean,
  voice_on     boolean,
  family_on    boolean,
  family_size  int,
  lock_on      boolean,
  reminders_on boolean,
  payments     int
);

create table if not exists lm_families (
  id         uuid primary key default gen_random_uuid(),
  join_hash  text not null,           -- a one-way hash made on the phone from the family key
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists lm_family_members (
  family_id uuid not null references lm_families on delete cascade,
  user_id   uuid not null references auth.users on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);
create unique index if not exists lm_family_members_one on lm_family_members (user_id);

create table if not exists lm_items (
  seq        bigint not null default nextval('lm_seq'),
  family_id  uuid not null references lm_families on delete cascade,
  user_id    uuid not null references auth.users on delete cascade,
  item_id    text not null,
  iv         text,
  ct         text,                    -- encrypted payment: unreadable without the family key
  deleted    boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (family_id, user_id, item_id)
);
create index if not exists lm_items_seq on lm_items (family_id, seq);

create table if not exists lm_mail (
  id         bigint primary key default nextval('lm_seq'),
  user_id    uuid not null references auth.users on delete cascade,
  nonce      text not null,
  ct         text not null,           -- encrypted in the person's own Gmail script
  mac        text not null,
  created_at timestamptz not null default now()
);
create index if not exists lm_mail_user on lm_mail (user_id, id);

-- nobody reads these tables directly; only through the functions below
alter table lm_users enable row level security;
alter table lm_usage enable row level security;
alter table lm_families enable row level security;
alter table lm_family_members enable row level security;
alter table lm_items enable row level security;
alter table lm_mail enable row level security;

-- ---------- usage ----------
create or replace function lm_ping(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not logged in'; end if;
  insert into lm_users (user_id) values (auth.uid()) on conflict do nothing;
  insert into lm_usage as u (user_id, last_seen, opens, platform, app_version, sms_on, email_on, voice_on,
                             family_on, family_size, lock_on, reminders_on, payments)
  values (auth.uid(), now(), 1, left(p->>'platform', 20), left(p->>'app_version', 30),
          (p->>'sms_on')::boolean, (p->>'email_on')::boolean, (p->>'voice_on')::boolean,
          (p->>'family_on')::boolean, (p->>'family_size')::int, (p->>'lock_on')::boolean,
          (p->>'reminders_on')::boolean, (p->>'payments')::int)
  on conflict (user_id) do update set
    last_seen = now(),
    opens = u.opens + case when coalesce((p->>'open')::boolean, false) then 1 else 0 end,
    platform = excluded.platform, app_version = excluded.app_version,
    sms_on = excluded.sms_on, email_on = excluded.email_on, voice_on = excluded.voice_on,
    family_on = excluded.family_on, family_size = excluded.family_size,
    lock_on = excluded.lock_on, reminders_on = excluded.reminders_on, payments = excluded.payments;
end $$;

-- the website uses this to tell app users that their data is on their phone
create or replace function lm_is_app_user() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from lm_users where user_id = auth.uid());
$$;

-- ---------- family (end-to-end encrypted) ----------
create or replace function lm_family_create(p_join_hash text) returns uuid
language plpgsql security definer set search_path = public as $$
declare fid uuid;
begin
  if auth.uid() is null then raise exception 'not logged in'; end if;
  if length(coalesce(p_join_hash, '')) < 20 then raise exception 'bad family code'; end if;
  if exists (select 1 from lm_family_members where user_id = auth.uid()) then
    raise exception 'You are already in a family. Leave it first.';
  end if;
  insert into lm_users (user_id) values (auth.uid()) on conflict do nothing;
  insert into lm_families (join_hash, created_by) values (p_join_hash, auth.uid()) returning id into fid;
  insert into lm_family_members (family_id, user_id) values (fid, auth.uid());
  return fid;
end $$;

create or replace function lm_family_join(p_family uuid, p_join_hash text) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'not logged in'; end if;
  if not exists (select 1 from lm_families where id = p_family and join_hash = p_join_hash) then
    raise exception 'This family code is not valid. Ask for it again.';
  end if;
  if exists (select 1 from lm_family_members where user_id = auth.uid() and family_id <> p_family) then
    raise exception 'You are already in a family. Leave it first.';
  end if;
  insert into lm_users (user_id) values (auth.uid()) on conflict do nothing;
  insert into lm_family_members (family_id, user_id) values (p_family, auth.uid()) on conflict do nothing;
  select count(*) into n from lm_family_members where family_id = p_family;
  return n;
end $$;

create or replace function lm_family_leave() returns void
language plpgsql security definer set search_path = public as $$
declare fid uuid;
begin
  select family_id into fid from lm_family_members where user_id = auth.uid();
  if fid is null then return; end if;
  delete from lm_items where family_id = fid and user_id = auth.uid();
  delete from lm_family_members where family_id = fid and user_id = auth.uid();
  if not exists (select 1 from lm_family_members where family_id = fid) then delete from lm_families where id = fid; end if;
end $$;

create or replace function lm_family_info() returns jsonb
language sql security definer set search_path = public stable as $$
  select jsonb_build_object('family_id', m.family_id, 'members', (select count(*) from lm_family_members x where x.family_id = m.family_id))
  from lm_family_members m where m.user_id = auth.uid();
$$;

-- p_items: [{item_id, iv, ct, deleted}]
create or replace function lm_push(p_items jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare fid uuid; it jsonb;
begin
  select family_id into fid from lm_family_members where user_id = auth.uid();
  if fid is null then raise exception 'not in a family'; end if;
  if jsonb_array_length(p_items) > 500 then raise exception 'too many at once'; end if;
  for it in select * from jsonb_array_elements(p_items) loop
    insert into lm_items as i (family_id, user_id, item_id, iv, ct, deleted, seq, updated_at)
    values (fid, auth.uid(), left(it->>'item_id', 80),
            case when coalesce((it->>'deleted')::boolean, false) then null else it->>'iv' end,
            case when coalesce((it->>'deleted')::boolean, false) then null else left(it->>'ct', 20000) end,
            coalesce((it->>'deleted')::boolean, false), nextval('lm_seq'), now())
    on conflict (family_id, user_id, item_id) do update set
      iv = excluded.iv, ct = excluded.ct, deleted = excluded.deleted, seq = nextval('lm_seq'), updated_at = now();
  end loop;
  return currval('lm_seq');
end $$;

-- everything other family members changed after p_since
create or replace function lm_pull(p_since bigint) returns jsonb
language sql security definer set search_path = public stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('seq', i.seq, 'user', i.user_id, 'item_id', i.item_id, 'iv', i.iv, 'ct', i.ct, 'deleted', i.deleted) order by i.seq), '[]'::jsonb)
  from (select * from lm_items i
         where i.family_id = (select family_id from lm_family_members where user_id = auth.uid())
           and i.user_id <> auth.uid() and i.seq > coalesce(p_since, 0)
         order by i.seq limit 1000) i;
$$;

-- ---------- email (encrypted in the person's Gmail) ----------
create or replace function lm_mail_token() returns text
language plpgsql security definer set search_path = public as $$
declare t text;
begin
  if auth.uid() is null then raise exception 'not logged in'; end if;
  insert into lm_users (user_id) values (auth.uid()) on conflict do nothing;
  select mail_token into t from lm_users where user_id = auth.uid();
  if t is null then
    t := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
    update lm_users set mail_token = t, mail_last = null, mail_count = 0 where user_id = auth.uid();
  end if;
  return t;
end $$;

create or replace function lm_mail_off() returns void
language sql security definer set search_path = public as $$
  update lm_users set mail_token = null, mail_last = null, mail_count = 0 where user_id = auth.uid();
  delete from lm_mail where user_id = auth.uid();
$$;

-- called by the Gmail script (no login, it has the person's token). Items: [{n, c, m}] all encrypted.
create or replace function lm_mail_push(p_token text, p_items jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare uid uuid; it jsonb; n int := 0; waiting int;
begin
  select user_id into uid from lm_users where mail_token = p_token and length(p_token) > 30;
  if uid is null then raise exception 'unknown token'; end if;
  update lm_users set mail_last = now() where user_id = uid;
  if p_items is null or jsonb_array_length(p_items) = 0 then return 0; end if;
  if jsonb_array_length(p_items) > 100 then raise exception 'too many at once'; end if;
  select count(*) into waiting from lm_mail where user_id = uid;
  if waiting > 5000 then raise exception 'inbox full: open the Gharwise app'; end if;
  for it in select * from jsonb_array_elements(p_items) loop
    if length(coalesce(it->>'c', '')) between 10 and 12000 then
      insert into lm_mail (user_id, nonce, ct, mac) values (uid, left(it->>'n', 100), it->>'c', left(it->>'m', 100));
      n := n + 1;
    end if;
  end loop;
  update lm_users set mail_count = mail_count + n where user_id = uid;
  return n;
end $$;

create or replace function lm_mail_pull() returns jsonb
language sql security definer set search_path = public stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'n', nonce, 'c', ct, 'm', mac) order by id), '[]'::jsonb)
  from (select * from lm_mail where user_id = auth.uid() order by id limit 300) x;
$$;

create or replace function lm_mail_ack(p_ids bigint[]) returns void
language sql security definer set search_path = public as $$
  delete from lm_mail where user_id = auth.uid() and id = any(p_ids);
$$;

create or replace function lm_mail_status() returns jsonb
language sql security definer set search_path = public stable as $$
  select jsonb_build_object('on', mail_token is not null, 'last_run', mail_last, 'count', mail_count,
                            'waiting', (select count(*) from lm_mail m where m.user_id = u.user_id))
  from lm_users u where u.user_id = auth.uid();
$$;

-- ---------- your admin dashboard ----------
create or replace function admin_local_stats() returns jsonb
language plpgsql security definer set search_path = public, admin, auth stable as $$
declare r jsonb;
begin
  if not exists (select 1 from admin.admins a join auth.users u on lower(u.email) = lower(a.email) where u.id = auth.uid()) then
    raise exception 'not allowed';
  end if;
  select jsonb_build_object(
    'generated_at', now(),
    'users', (select count(*) from lm_usage),
    'active_1d', (select count(*) from lm_usage where last_seen > now() - interval '1 day'),
    'active_7d', (select count(*) from lm_usage where last_seen > now() - interval '7 days'),
    'active_30d', (select count(*) from lm_usage where last_seen > now() - interval '30 days'),
    'new_7d', (select count(*) from lm_usage where first_seen > now() - interval '7 days'),
    'sms_on', (select count(*) from lm_usage where sms_on),
    'email_on', (select count(*) from lm_usage where email_on),
    'voice_on', (select count(*) from lm_usage where voice_on),
    'family_on', (select count(*) from lm_usage where family_on),
    'families', (select count(*) from lm_families),
    'lock_on', (select count(*) from lm_usage where lock_on),
    'reminders_on', (select count(*) from lm_usage where reminders_on),
    'payments', (select coalesce(sum(payments), 0) from lm_usage),
    'platforms', (select coalesce(jsonb_object_agg(coalesce(platform, 'unknown'), n), '{}'::jsonb) from (select platform, count(*) n from lm_usage group by platform) p),
    'versions', (select coalesce(jsonb_object_agg(coalesce(app_version, 'unknown'), n), '{}'::jsonb) from (select app_version, count(*) n from lm_usage group by app_version) v),
    'list', (select coalesce(jsonb_agg(jsonb_build_object(
                'phone', au.phone, 'first_seen', u.first_seen, 'last_seen', u.last_seen, 'opens', u.opens,
                'platform', u.platform, 'version', u.app_version, 'sms', u.sms_on, 'email', u.email_on,
                'voice', u.voice_on, 'family', u.family_on, 'family_size', u.family_size,
                'lock', u.lock_on, 'reminders', u.reminders_on, 'payments', u.payments,
                'mail_last', lu.mail_last) order by u.last_seen desc nulls last), '[]'::jsonb)
             from lm_usage u join auth.users au on au.id = u.user_id left join lm_users lu on lu.user_id = u.user_id)
  ) into r;
  return r;
end $$;

revoke all on function lm_ping(jsonb), lm_is_app_user(), lm_family_create(text), lm_family_join(uuid, text), lm_family_leave(),
  lm_family_info(), lm_push(jsonb), lm_pull(bigint), lm_mail_token(), lm_mail_off(), lm_mail_push(text, jsonb),
  lm_mail_pull(), lm_mail_ack(bigint[]), lm_mail_status(), admin_local_stats() from public, anon;
grant execute on function lm_ping(jsonb), lm_is_app_user(), lm_family_create(text), lm_family_join(uuid, text), lm_family_leave(),
  lm_family_info(), lm_push(jsonb), lm_pull(bigint), lm_mail_token(), lm_mail_off(),
  lm_mail_pull(), lm_mail_ack(bigint[]), lm_mail_status(), admin_local_stats() to authenticated;
grant execute on function lm_mail_push(text, jsonb) to anon, authenticated;

-- ============================================================================
-- Part 2: mobile-number invites (family + groups) and Groups / Trips.
-- Still end-to-end encrypted: each phone has a key pair. An invite carries the family/group key
-- LOCKED with the invitee's public key, so only their phone can open it. The server never sees it.
-- ============================================================================
alter table lm_users add column if not exists pubkey text;
alter table lm_users add column if not exists pubkey_at timestamptz;

create table if not exists lm_groups (
  id         uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists lm_group_members (
  group_id  uuid not null references lm_groups on delete cascade,
  user_id   uuid not null references auth.users on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create table if not exists lm_group_items (
  seq        bigint not null default nextval('lm_seq'),
  group_id   uuid not null references lm_groups on delete cascade,
  item_id    text not null,
  user_id    uuid references auth.users on delete set null,   -- who changed it last
  iv         text,
  ct         text,                                            -- encrypted with the group key
  deleted    boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (group_id, item_id)
);
create index if not exists lm_group_items_seq on lm_group_items (group_id, seq);

create table if not exists lm_invites (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('family','group')),
  target     uuid not null,                 -- family id or group id
  from_user  uuid not null references auth.users on delete cascade,
  to_phone   text not null,                 -- digits, e.g. 919876543210
  sealed     text,                          -- the key, locked for the invitee's phone
  sealed_for text,                          -- which public key it was locked for
  created_at timestamptz not null default now(),
  unique (kind, target, to_phone)
);
alter table lm_groups enable row level security;
alter table lm_group_members enable row level security;
alter table lm_group_items enable row level security;
alter table lm_invites enable row level security;

create or replace function lm_my_phone() returns text
language sql security definer set search_path = public, auth stable as $$
  select regexp_replace(coalesce(phone, ''), '\D', '', 'g') from auth.users where id = auth.uid();
$$;

create or replace function lm_set_pubkey(p_key text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not logged in'; end if;
  if length(coalesce(p_key, '')) not between 40 and 400 then raise exception 'bad key'; end if;
  insert into lm_users (user_id, pubkey, pubkey_at) values (auth.uid(), p_key, now())
  on conflict (user_id) do update set pubkey = excluded.pubkey, pubkey_at = now() where lm_users.pubkey is distinct from excluded.pubkey;
end $$;

create or replace function lm_is_member(p_kind text, p_target uuid, p_user uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select case when p_kind = 'family' then exists (select 1 from lm_family_members where family_id = p_target and user_id = p_user)
              else exists (select 1 from lm_group_members where group_id = p_target and user_id = p_user) end;
$$;

-- invite by mobile number. Returns the invitee's public key (if they have the app) so the phone can lock the key for them.
create or replace function lm_invite(p_kind text, p_target uuid, p_phone text) returns jsonb
language plpgsql security definer set search_path = public, auth as $$
declare ph text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'); uid uuid; iid uuid; pk text;
begin
  if auth.uid() is null then raise exception 'not logged in'; end if;
  if length(ph) = 10 then ph := '91' || ph; end if;
  if ph !~ '^91[6-9][0-9]{9}$' then raise exception 'Enter a 10-digit mobile number'; end if;
  if not lm_is_member(p_kind, p_target, auth.uid()) then raise exception 'You are not in this %', p_kind; end if;
  select id into uid from auth.users where regexp_replace(coalesce(phone, ''), '\D', '', 'g') = ph limit 1;
  if uid = auth.uid() then raise exception 'That is your own number'; end if;
  if uid is not null and lm_is_member(p_kind, p_target, uid) then return jsonb_build_object('status', 'already'); end if;
  if (select count(*) from lm_invites where from_user = auth.uid() and created_at > now() - interval '1 day') > 50 then raise exception 'Too many invites today'; end if;
  insert into lm_invites (kind, target, from_user, to_phone) values (p_kind, p_target, auth.uid(), ph)
  on conflict (kind, target, to_phone) do update set from_user = excluded.from_user
  returning id into iid;
  select pubkey into pk from lm_users where user_id = uid;
  return jsonb_build_object('status', case when uid is null then 'waiting' else 'invited' end, 'id', iid, 'pubkey', pk);
end $$;

create or replace function lm_invite_seal(p_id uuid, p_sealed text, p_for text) returns void
language sql security definer set search_path = public as $$
  update lm_invites set sealed = left(p_sealed, 4000), sealed_for = left(p_for, 100)
   where id = p_id and lm_is_member(kind, target, auth.uid());
$$;

-- invites I (or my family/group) sent that are still open, with the invitee's current public key
create or replace function lm_invites_sent() returns jsonb
language sql security definer set search_path = public, auth stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'kind', i.kind, 'target', i.target, 'phone', i.to_phone, 'from_user', i.from_user, 'sealed_for', i.sealed_for,
           'pubkey', (select lu.pubkey from auth.users au join lm_users lu on lu.user_id = au.id
                       where regexp_replace(coalesce(au.phone, ''), '\D', '', 'g') = i.to_phone limit 1)) order by i.created_at), '[]'::jsonb)
  from lm_invites i where lm_is_member(i.kind, i.target, auth.uid());
$$;

-- invites waiting for me, locked for my current public key
create or replace function lm_invites_inbox() returns jsonb
language sql security definer set search_path = public stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'kind', i.kind, 'target', i.target, 'sealed', i.sealed, 'sealed_for', i.sealed_for, 'created_at', i.created_at)), '[]'::jsonb)
  from lm_invites i where i.to_phone = lm_my_phone() and i.sealed is not null;
$$;

create or replace function lm_invite_respond(p_id uuid, p_accept boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare i lm_invites%rowtype; n int;
begin
  select * into i from lm_invites where id = p_id and to_phone = lm_my_phone();
  if not found then raise exception 'This invite is no longer available'; end if;
  if p_accept then
    insert into lm_users (user_id) values (auth.uid()) on conflict do nothing;
    if i.kind = 'family' then
      if exists (select 1 from lm_family_members where user_id = auth.uid() and family_id <> i.target) then
        raise exception 'You are already in a family. Leave it first.';
      end if;
      if not exists (select 1 from lm_families where id = i.target) then raise exception 'That family no longer exists'; end if;
      insert into lm_family_members (family_id, user_id) values (i.target, auth.uid()) on conflict do nothing;
      select count(*) into n from lm_family_members where family_id = i.target;
    else
      if not exists (select 1 from lm_groups where id = i.target) then raise exception 'That group no longer exists'; end if;
      insert into lm_group_members (group_id, user_id) values (i.target, auth.uid()) on conflict do nothing;
      select count(*) into n from lm_group_members where group_id = i.target;
    end if;
  end if;
  delete from lm_invites where id = p_id;
  return jsonb_build_object('kind', i.kind, 'target', i.target, 'members', n);
end $$;

create or replace function lm_invite_cancel(p_id uuid) returns void
language sql security definer set search_path = public as $$
  delete from lm_invites where id = p_id and lm_is_member(kind, target, auth.uid());
$$;

-- ---------- groups / trips ----------
create or replace function lm_group_create() returns uuid
language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  if auth.uid() is null then raise exception 'not logged in'; end if;
  if (select count(*) from lm_groups where created_by = auth.uid() and created_at > now() - interval '1 day') > 30 then raise exception 'Too many groups today'; end if;
  insert into lm_users (user_id) values (auth.uid()) on conflict do nothing;
  insert into lm_groups (created_by) values (auth.uid()) returning id into gid;
  insert into lm_group_members (group_id, user_id) values (gid, auth.uid());
  return gid;
end $$;

create or replace function lm_group_leave(p_group uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from lm_group_members where group_id = p_group and user_id = auth.uid();
  if not exists (select 1 from lm_group_members where group_id = p_group) then delete from lm_groups where id = p_group; end if;
end $$;

create or replace function lm_group_delete(p_group uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from lm_groups where id = p_group and created_by = auth.uid()) then raise exception 'Only the person who made the group can delete it'; end if;
  delete from lm_invites where kind = 'group' and target = p_group;
  delete from lm_groups where id = p_group;
end $$;

-- my groups: who is in them and who is invited (no group content: that is encrypted)
create or replace function lm_groups_mine() returns jsonb
language sql security definer set search_path = public stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'created_by', g.created_by,
           'members', (select jsonb_agg(m.user_id) from lm_group_members m where m.group_id = g.id),
           'pending', (select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'phone', i.to_phone)), '[]'::jsonb) from lm_invites i where i.kind = 'group' and i.target = g.id))), '[]'::jsonb)
  from lm_groups g where exists (select 1 from lm_group_members m where m.group_id = g.id and m.user_id = auth.uid());
$$;

create or replace function lm_family_pending() returns jsonb
language sql security definer set search_path = public stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'phone', i.to_phone)), '[]'::jsonb)
  from lm_invites i where i.kind = 'family' and i.target = (select family_id from lm_family_members where user_id = auth.uid());
$$;

create or replace function lm_group_push(p_group uuid, p_items jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare it jsonb;
begin
  if not exists (select 1 from lm_group_members where group_id = p_group and user_id = auth.uid()) then raise exception 'not in this group'; end if;
  if jsonb_array_length(p_items) > 200 then raise exception 'too many at once'; end if;
  for it in select * from jsonb_array_elements(p_items) loop
    insert into lm_group_items as x (group_id, item_id, user_id, iv, ct, deleted, seq, updated_at)
    values (p_group, left(it->>'item_id', 100), auth.uid(),
            case when coalesce((it->>'deleted')::boolean, false) then null else it->>'iv' end,
            case when coalesce((it->>'deleted')::boolean, false) then null else left(it->>'ct', 400000) end,
            coalesce((it->>'deleted')::boolean, false), nextval('lm_seq'), now())
    on conflict (group_id, item_id) do update set user_id = auth.uid(), iv = excluded.iv, ct = excluded.ct,
      deleted = excluded.deleted, seq = nextval('lm_seq'), updated_at = now();
  end loop;
  return currval('lm_seq');
end $$;

create or replace function lm_group_pull(p_group uuid, p_since bigint) returns jsonb
language sql security definer set search_path = public stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('seq', x.seq, 'item_id', x.item_id, 'user', x.user_id, 'iv', x.iv, 'ct', x.ct, 'deleted', x.deleted) order by x.seq), '[]'::jsonb)
  from (select * from lm_group_items x
         where x.group_id = p_group and x.seq > coalesce(p_since, 0)
           and exists (select 1 from lm_group_members m where m.group_id = p_group and m.user_id = auth.uid())
         order by x.seq limit 500) x;
$$;

revoke all on function lm_my_phone(), lm_set_pubkey(text), lm_is_member(text, uuid, uuid), lm_invite(text, uuid, text), lm_invite_seal(uuid, text, text),
  lm_invites_sent(), lm_invites_inbox(), lm_invite_respond(uuid, boolean), lm_invite_cancel(uuid), lm_group_create(), lm_group_leave(uuid),
  lm_group_delete(uuid), lm_groups_mine(), lm_family_pending(), lm_group_push(uuid, jsonb), lm_group_pull(uuid, bigint) from public, anon;
grant execute on function lm_my_phone(), lm_set_pubkey(text), lm_invite(text, uuid, text), lm_invite_seal(uuid, text, text),
  lm_invites_sent(), lm_invites_inbox(), lm_invite_respond(uuid, boolean), lm_invite_cancel(uuid), lm_group_create(), lm_group_leave(uuid),
  lm_group_delete(uuid), lm_groups_mine(), lm_family_pending(), lm_group_push(uuid, jsonb), lm_group_pull(uuid, bigint) to authenticated;

-- ============================================================================
-- Part 3: push notifications for invites (Firebase), so people hear about an invite while the app is closed.
-- The notification text is general ("Someone invited you to a group"). Names stay encrypted; Google never sees them.
-- ============================================================================
create table if not exists lm_push (
  token      text primary key,
  user_id    uuid not null references auth.users on delete cascade,
  platform   text,
  updated_at timestamptz not null default now()
);
create index if not exists lm_push_user on lm_push (user_id);
alter table lm_push enable row level security;
alter table lm_invites add column if not exists notified_for text;

create or replace function lm_set_push(p_token text, p_platform text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not logged in'; end if;
  if length(coalesce(p_token, '')) not between 20 and 4096 then raise exception 'bad token'; end if;
  insert into lm_push (token, user_id, platform) values (p_token, auth.uid(), left(p_platform, 20))
  on conflict (token) do update set user_id = auth.uid(), platform = excluded.platform, updated_at = now();
  delete from lm_push where user_id = auth.uid() and token <> p_token and updated_at < now() - interval '60 days';
end $$;

create or replace function lm_drop_push(p_token text) returns void
language sql security definer set search_path = public as $$
  delete from lm_push where token = p_token and user_id = auth.uid();
$$;

-- called only by the lm-push Edge Function (service role): who to notify about this invite, once per locked copy
create or replace function lm_push_targets(p_invite uuid, p_caller uuid) returns jsonb
language plpgsql security definer set search_path = public, auth as $$
declare i lm_invites%rowtype; toks jsonb;
begin
  select * into i from lm_invites where id = p_invite;
  if not found or i.sealed is null then return jsonb_build_object('kind', null, 'tokens', '[]'::jsonb); end if;
  if not lm_is_member(i.kind, i.target, p_caller) then raise exception 'not allowed'; end if;
  if i.notified_for is not distinct from i.sealed_for then return jsonb_build_object('kind', i.kind, 'tokens', '[]'::jsonb); end if;
  update lm_invites set notified_for = sealed_for where id = p_invite;
  select coalesce(jsonb_agg(p.token), '[]'::jsonb) into toks
    from lm_push p join auth.users u on u.id = p.user_id
   where regexp_replace(coalesce(u.phone, ''), '\D', '', 'g') = i.to_phone;
  return jsonb_build_object('kind', i.kind, 'tokens', toks);
end $$;

create or replace function lm_push_forget(p_token text) returns void
language sql security definer set search_path = public as $$ delete from lm_push where token = p_token; $$;

revoke all on function lm_set_push(text, text), lm_drop_push(text), lm_push_targets(uuid, uuid), lm_push_forget(text) from public, anon, authenticated;
grant execute on function lm_set_push(text, text), lm_drop_push(text) to authenticated;
grant execute on function lm_push_targets(uuid, uuid), lm_push_forget(text) to service_role;
