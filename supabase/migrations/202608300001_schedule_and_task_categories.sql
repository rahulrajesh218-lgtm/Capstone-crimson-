-- Zentaskra Schedule / Calendar V1 and optional task categories.
-- Existing tasks remain valid because category_id is nullable.

create extension if not exists pgcrypto;

create table if not exists public.task_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  color text not null default 'indigo' check (color in ('indigo', 'emerald', 'amber', 'rose', 'sky', 'violet')),
  icon text not null default 'book' check (icon in ('book', 'user', 'target', 'users', 'folder')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

alter table public.tasks add column if not exists category_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tasks_category_owner_fkey'
  ) then
    alter table public.tasks
      add constraint tasks_category_owner_fkey
      foreign key (category_id)
      references public.task_categories (id)
      on delete set null;
  end if;
end $$;

create or replace function public.ensure_task_category_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.category_id is not null and not exists (
    select 1 from public.task_categories
    where id = new.category_id and user_id = new.user_id
  ) then
    raise exception 'Task category must belong to the task owner';
  end if;
  return new;
end;
$$;

drop trigger if exists ensure_task_category_owner_trigger on public.tasks;
create trigger ensure_task_category_owner_trigger
  before insert or update of category_id, user_id on public.tasks
  for each row execute function public.ensure_task_category_owner();

create index if not exists task_categories_user_id_idx on public.task_categories(user_id);
create index if not exists tasks_category_id_idx on public.tasks(category_id);

create table if not exists public.schedule_meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  course_code text,
  teacher text,
  room text,
  color text not null default 'indigo' check (color in ('indigo', 'emerald', 'amber', 'rose', 'sky', 'violet')),
  icon text not null default 'book',
  start_time time not null,
  end_time time not null,
  days text[] not null default '{}',
  rotation_days text[] not null default '{}',
  notes text,
  source text not null default 'manual' check (source in ('manual', 'blackbaud')),
  external_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  unique (user_id, source, external_id)
);

create index if not exists schedule_meetings_user_id_idx on public.schedule_meetings(user_id);
create index if not exists schedule_meetings_source_idx on public.schedule_meetings(user_id, source);

alter table public.task_categories enable row level security;
alter table public.schedule_meetings enable row level security;

drop policy if exists "Users can read own task categories" on public.task_categories;
create policy "Users can read own task categories" on public.task_categories
  for select using (auth.uid() = user_id);

drop policy if exists "Users can create own task categories" on public.task_categories;
create policy "Users can create own task categories" on public.task_categories
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own task categories" on public.task_categories;
create policy "Users can update own task categories" on public.task_categories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own task categories" on public.task_categories;
create policy "Users can delete own task categories" on public.task_categories
  for delete using (auth.uid() = user_id);

drop policy if exists "Users can read own schedule" on public.schedule_meetings;
create policy "Users can read own schedule" on public.schedule_meetings
  for select using (auth.uid() = user_id);

drop policy if exists "Users can create own schedule" on public.schedule_meetings;
create policy "Users can create own schedule" on public.schedule_meetings
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own schedule" on public.schedule_meetings;
create policy "Users can update own schedule" on public.schedule_meetings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own schedule" on public.schedule_meetings;
create policy "Users can delete own schedule" on public.schedule_meetings
  for delete using (auth.uid() = user_id);
