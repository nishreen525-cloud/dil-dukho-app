create extension if not exists pgcrypto;

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  relationship text not null,
  invite_email text not null,
  created_at timestamptz not null default now(),
  unique (owner_user_id, invite_email)
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text not null,
  role text not null check (role in ('owner', 'member')),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  family_member_id uuid unique references public.family_members (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.hurt_entries (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  person_id uuid not null references public.family_members (id) on delete cascade,
  happened_on date not null,
  title text not null,
  feeling text not null,
  intensity integer not null check (intensity between 1 and 5),
  details text not null,
  support_need text not null default '',
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.hurt_entries (id) on delete cascade,
  author_user_id uuid not null references auth.users (id) on delete cascade,
  author_member_id uuid references public.family_members (id) on delete cascade,
  emoji text not null default '💛',
  message text not null default '',
  accepted boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.family_members enable row level security;
alter table public.profiles enable row level security;
alter table public.hurt_entries enable row level security;
alter table public.support_messages enable row level security;

drop policy if exists "family_members_select" on public.family_members;
create policy "family_members_select"
on public.family_members for select
using (
  owner_user_id = auth.uid()
  or invite_email = lower(coalesce(auth.jwt() ->> 'email', ''))
  or id = (
    select p.family_member_id
    from public.profiles p
    where p.user_id = auth.uid()
  )
);

drop policy if exists "family_members_insert" on public.family_members;
create policy "family_members_insert"
on public.family_members for insert
with check (owner_user_id = auth.uid());

drop policy if exists "family_members_update" on public.family_members;
create policy "family_members_update"
on public.family_members for update
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (user_id = auth.uid());

drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own"
on public.profiles for insert
with check (user_id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "hurt_entries_select" on public.hurt_entries;
create policy "hurt_entries_select"
on public.hurt_entries for select
using (
  owner_user_id = auth.uid()
  or (
    person_id = (
      select p.family_member_id
      from public.profiles p
      where p.user_id = auth.uid()
    )
    and owner_user_id = (
      select p.owner_user_id
      from public.profiles p
      where p.user_id = auth.uid()
    )
  )
);

drop policy if exists "hurt_entries_insert_owner" on public.hurt_entries;
create policy "hurt_entries_insert_owner"
on public.hurt_entries for insert
with check (
  owner_user_id = auth.uid()
  and created_by = auth.uid()
);

drop policy if exists "support_messages_select" on public.support_messages;
create policy "support_messages_select"
on public.support_messages for select
using (
  exists (
    select 1
    from public.hurt_entries e
    where e.id = support_messages.entry_id
      and (
        e.owner_user_id = auth.uid()
        or (
          e.person_id = (
            select p.family_member_id
            from public.profiles p
            where p.user_id = auth.uid()
          )
          and e.owner_user_id = (
            select p.owner_user_id
            from public.profiles p
            where p.user_id = auth.uid()
          )
        )
      )
  )
);

drop policy if exists "support_messages_insert_member" on public.support_messages;
create policy "support_messages_insert_member"
on public.support_messages for insert
with check (
  author_user_id = auth.uid()
  and exists (
    select 1
    from public.hurt_entries e
    join public.profiles p on p.user_id = auth.uid()
    where e.id = support_messages.entry_id
      and p.role = 'member'
      and p.family_member_id = e.person_id
  )
);

drop policy if exists "support_messages_update_owner" on public.support_messages;
create policy "support_messages_update_owner"
on public.support_messages for update
using (
  exists (
    select 1
    from public.hurt_entries e
    where e.id = support_messages.entry_id
      and e.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.hurt_entries e
    where e.id = support_messages.entry_id
      and e.owner_user_id = auth.uid()
  )
);
