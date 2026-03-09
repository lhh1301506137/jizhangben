-- 恋爱记账本 MVP v3.0 - Supabase Schema & RLS Baseline
-- 执行顺序：
-- 1) 在 Supabase SQL Editor 执行本文件
-- 2) 在 Authentication 打开 Email/Password
-- 3) 关闭邮箱确认（MVP 阶段可选，便于登录）

create extension if not exists "pgcrypto";

-- =========================
-- Common helpers
-- =========================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.is_couple_member(target_couple_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.couples c
    where c.id = target_couple_id
      and c.status = 'active'
      and (c.user1_id = auth.uid() or c.user2_id = auth.uid())
  );
$$;

-- =========================
-- Profiles
-- =========================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

-- =========================
-- Couples
-- =========================
create table if not exists public.couple_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references auth.users(id) on delete cascade,
  inviter_name text not null,
  invite_code text not null unique,
  accept_pairing boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  user1_id uuid not null references auth.users(id) on delete cascade,
  user2_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'inactive')),
  anniversary date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint couples_distinct_users check (user1_id <> user2_id)
);

drop trigger if exists trg_couples_updated_at on public.couples;
create trigger trg_couples_updated_at
before update on public.couples
for each row execute function public.set_updated_at();

alter table public.couples enable row level security;
alter table public.couple_invites enable row level security;

drop policy if exists "couple_invites_select_active" on public.couple_invites;
create policy "couple_invites_select_active"
on public.couple_invites for select
using (is_active = true);

drop policy if exists "couple_invites_insert_own" on public.couple_invites;
create policy "couple_invites_insert_own"
on public.couple_invites for insert
with check (inviter_id = auth.uid());

drop policy if exists "couple_invites_update_own" on public.couple_invites;
create policy "couple_invites_update_own"
on public.couple_invites for update
using (inviter_id = auth.uid())
with check (inviter_id = auth.uid());

drop policy if exists "couple_invites_delete_own" on public.couple_invites;
create policy "couple_invites_delete_own"
on public.couple_invites for delete
using (inviter_id = auth.uid());

drop policy if exists "couples_member_rw" on public.couples;
create policy "couples_member_rw"
on public.couples for all
using (user1_id = auth.uid() or user2_id = auth.uid())
with check (user1_id = auth.uid() or user2_id = auth.uid());

-- =========================
-- Mood
-- =========================
create table if not exists public.mood_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  mood text not null,
  intensity int not null check (intensity between 1 and 5),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

drop trigger if exists trg_mood_entries_updated_at on public.mood_entries;
create trigger trg_mood_entries_updated_at
before update on public.mood_entries
for each row execute function public.set_updated_at();

alter table public.mood_entries enable row level security;

drop policy if exists "mood_entries_own_rw" on public.mood_entries;
create policy "mood_entries_own_rw"
on public.mood_entries for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- =========================
-- Personal accounting
-- =========================
create table if not exists public.personal_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  amount numeric(12,2) not null check (amount > 0),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_personal_transactions_updated_at on public.personal_transactions;
create trigger trg_personal_transactions_updated_at
before update on public.personal_transactions
for each row execute function public.set_updated_at();

alter table public.personal_transactions enable row level security;

drop policy if exists "personal_transactions_own_rw" on public.personal_transactions;
create policy "personal_transactions_own_rw"
on public.personal_transactions for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- =========================
-- Couple accounting
-- =========================
create table if not exists public.couple_accounts (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  balance numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (couple_id)
);

create table if not exists public.couple_permissions (
  id uuid primary key default gen_random_uuid(),
  couple_account_id uuid not null references public.couple_accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('always_approve', 'threshold', 'report_only')),
  threshold numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (couple_account_id, user_id)
);

create table if not exists public.couple_transactions (
  id uuid primary key default gen_random_uuid(),
  couple_account_id uuid not null references public.couple_accounts(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  approver_id uuid references auth.users(id) on delete set null,
  type text not null check (type in ('deposit', 'withdraw', 'transfer')),
  amount numeric(12,2) not null check (amount > 0),
  category text,
  description text not null,
  status text not null check (status in ('pending', 'approved', 'rejected', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_couple_accounts_updated_at on public.couple_accounts;
create trigger trg_couple_accounts_updated_at
before update on public.couple_accounts
for each row execute function public.set_updated_at();

drop trigger if exists trg_couple_permissions_updated_at on public.couple_permissions;
create trigger trg_couple_permissions_updated_at
before update on public.couple_permissions
for each row execute function public.set_updated_at();

drop trigger if exists trg_couple_transactions_updated_at on public.couple_transactions;
create trigger trg_couple_transactions_updated_at
before update on public.couple_transactions
for each row execute function public.set_updated_at();

alter table public.couple_accounts enable row level security;
alter table public.couple_permissions enable row level security;
alter table public.couple_transactions enable row level security;

drop policy if exists "couple_accounts_member_rw" on public.couple_accounts;
create policy "couple_accounts_member_rw"
on public.couple_accounts for all
using (public.is_couple_member(couple_id))
with check (public.is_couple_member(couple_id));

drop policy if exists "couple_permissions_member_rw" on public.couple_permissions;
create policy "couple_permissions_member_rw"
on public.couple_permissions for all
using (
  exists (
    select 1
    from public.couple_accounts ca
    where ca.id = couple_account_id
      and public.is_couple_member(ca.couple_id)
  )
)
with check (
  exists (
    select 1
    from public.couple_accounts ca
    where ca.id = couple_account_id
      and public.is_couple_member(ca.couple_id)
  )
);

drop policy if exists "couple_transactions_member_rw" on public.couple_transactions;
create policy "couple_transactions_member_rw"
on public.couple_transactions for all
using (
  exists (
    select 1
    from public.couple_accounts ca
    where ca.id = couple_account_id
      and public.is_couple_member(ca.couple_id)
  )
)
with check (
  exists (
    select 1
    from public.couple_accounts ca
    where ca.id = couple_account_id
      and public.is_couple_member(ca.couple_id)
  )
);

-- =========================
-- Messages (Realtime)
-- =========================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  entry_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

drop policy if exists "messages_member_rw" on public.messages;
create policy "messages_member_rw"
on public.messages for all
using (public.is_couple_member(couple_id))
with check (public.is_couple_member(couple_id) and sender_id = auth.uid());

-- =========================
-- Plans
-- =========================
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  type text not null default 'other' check (type in ('anniversary', 'travel', 'date', 'weekend', 'special', 'other')),
  plan_date date not null,
  plan_time text,
  location text,
  status text not null check (status in ('planned', 'in_progress', 'completed', 'cancelled')),
  reminders jsonb not null default '[]'::jsonb,
  is_shared boolean not null default true,
  participants jsonb not null default '[]'::jsonb,
  notes text,
  budget numeric(12,2),
  emoji text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plans add column if not exists type text default 'other';
alter table public.plans add column if not exists plan_time text;
alter table public.plans add column if not exists location text;
alter table public.plans add column if not exists reminders jsonb not null default '[]'::jsonb;
alter table public.plans add column if not exists is_shared boolean not null default true;
alter table public.plans add column if not exists participants jsonb not null default '[]'::jsonb;
alter table public.plans add column if not exists notes text;
alter table public.plans add column if not exists budget numeric(12,2);
alter table public.plans add column if not exists emoji text;

drop trigger if exists trg_plans_updated_at on public.plans;
create trigger trg_plans_updated_at
before update on public.plans
for each row execute function public.set_updated_at();

alter table public.plans enable row level security;

drop policy if exists "plans_member_rw" on public.plans;
create policy "plans_member_rw"
on public.plans for all
using (public.is_couple_member(couple_id))
with check (public.is_couple_member(couple_id));

-- =========================
-- Optional indexes
-- =========================
create index if not exists idx_mood_entries_user_date on public.mood_entries(user_id, entry_date desc);
create index if not exists idx_personal_transactions_user_date on public.personal_transactions(user_id, date desc);
create index if not exists idx_messages_couple_created on public.messages(couple_id, created_at desc);
create index if not exists idx_plans_couple_date on public.plans(couple_id, plan_date desc);
create index if not exists idx_couple_tx_account_created on public.couple_transactions(couple_account_id, created_at desc);
