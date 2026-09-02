-- Zentaskra in-app notification state and per-user preferences.
-- Notification content is derived from a user's own tasks/schedule; this stores only state.

create table if not exists public.notification_states (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_read boolean not null default false,
  dismissed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  browser_enabled boolean not null default false,
  due_today boolean not null default true,
  due_tomorrow boolean not null default true,
  overdue boolean not null default true,
  class_reminders boolean not null default true,
  class_reminder_minutes integer not null default 10 check (class_reminder_minutes between 1 and 120),
  updated_at timestamptz not null default now()
);

create index if not exists notification_states_user_updated_idx
  on public.notification_states(user_id, updated_at desc);

alter table public.notification_states enable row level security;
alter table public.notification_preferences enable row level security;

drop policy if exists "Users can read own notification states" on public.notification_states;
create policy "Users can read own notification states" on public.notification_states
  for select using (auth.uid() = user_id);

drop policy if exists "Users can create own notification states" on public.notification_states;
create policy "Users can create own notification states" on public.notification_states
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own notification states" on public.notification_states;
create policy "Users can update own notification states" on public.notification_states
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own notification states" on public.notification_states;
create policy "Users can delete own notification states" on public.notification_states
  for delete using (auth.uid() = user_id);

drop policy if exists "Users can read own notification preferences" on public.notification_preferences;
create policy "Users can read own notification preferences" on public.notification_preferences
  for select using (auth.uid() = user_id);

drop policy if exists "Users can create own notification preferences" on public.notification_preferences;
create policy "Users can create own notification preferences" on public.notification_preferences
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own notification preferences" on public.notification_preferences;
create policy "Users can update own notification preferences" on public.notification_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
