-- Per-device Web Push subscriptions and duplicate-safe delivery tracking.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  timezone text not null default 'UTC',
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create table if not exists public.push_deliveries (
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  event_key text not null,
  delivered_at timestamptz not null default now(),
  primary key (subscription_id, event_key)
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
create index if not exists push_deliveries_time_idx on public.push_deliveries(delivered_at);

alter table public.push_subscriptions enable row level security;
alter table public.push_deliveries enable row level security;

create policy "Users can read own push subscriptions" on public.push_subscriptions
  for select using (auth.uid() = user_id);
create policy "Users can add own push subscriptions" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "Users can update own push subscriptions" on public.push_subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own push subscriptions" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- Delivery records are server-only. Users do not need direct access to endpoint keys or delivery internals.
revoke all on public.push_deliveries from anon, authenticated;

alter table public.notification_preferences
  add column if not exists push_enabled boolean not null default false;

