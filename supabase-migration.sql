-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- 1. Profiles table (auto-populated on sign-up)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill existing users
insert into public.profiles (id, email, display_name, avatar_url)
select id, email, raw_user_meta_data->>'full_name', raw_user_meta_data->>'avatar_url'
from auth.users
on conflict (id) do nothing;

-- 2. Readings table
create table public.readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  spread text not null,
  question text,
  cards jsonb not null,        -- [{cardId, position}]
  notes text,
  tags text[] default '{}',
  lang text not null default 'en',
  api_reading_text text,
  api_follow_ups jsonb         -- [{question, answer}]
);

alter table public.readings enable row level security;

create policy "Users can read own readings"
  on public.readings for select
  using (auth.uid() = user_id);

create policy "Users can insert own readings"
  on public.readings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own readings"
  on public.readings for update
  using (auth.uid() = user_id);

create policy "Users can delete own readings"
  on public.readings for delete
  using (auth.uid() = user_id);

create index readings_user_id_idx on public.readings (user_id);
create index readings_created_at_idx on public.readings (created_at desc);
