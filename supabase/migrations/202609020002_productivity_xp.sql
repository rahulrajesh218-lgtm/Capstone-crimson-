-- Server-awarded, idempotent productivity XP and persisted study sessions.

create table if not exists public.study_sessions (
  id bigint primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  day text not null check (day in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  subject text not null check (char_length(trim(subject)) between 1 and 120),
  topic text not null check (char_length(trim(topic)) between 1 and 240),
  start_time time not null,
  duration_minutes integer not null check (duration_minutes between 10 and 480),
  source_task_id bigint,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null,
  event_type text not null check (event_type in ('assignment_completed','assignment_early','study_session_completed','daily_goal','streak_milestone')),
  xp integer not null check (xp between 1 and 100),
  occurred_on date not null default current_date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, event_key)
);

create index if not exists study_sessions_user_day_idx on public.study_sessions(user_id, day, start_time);
create index if not exists xp_events_user_date_idx on public.xp_events(user_id, occurred_on desc);
create index if not exists xp_events_weekly_rank_idx on public.xp_events(occurred_on desc, user_id);

alter table public.study_sessions enable row level security;
alter table public.xp_events enable row level security;

create policy "Users can read own study sessions" on public.study_sessions for select using (auth.uid() = user_id);
create policy "Users can create own study sessions" on public.study_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own study sessions" on public.study_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own study sessions" on public.study_sessions for delete using (auth.uid() = user_id);
create policy "Users can read own XP events" on public.xp_events for select using (auth.uid() = user_id);

create or replace function public.award_task_xp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  due_at timestamptz;
begin
  if (coalesce(old.progress, 0) < 100 and coalesce(new.progress, 0) >= 100)
     or (old.status is distinct from 'completed' and new.status = 'completed') then
    insert into public.xp_events(user_id, event_key, event_type, xp, occurred_on, metadata)
    values (new.user_id, 'assignment-completed:' || new.id, 'assignment_completed', 20, current_date, jsonb_build_object('task_id', new.id))
    on conflict (user_id, event_key) do nothing;

    begin
      due_at := (split_part(new.due, '|', 1) || ' ' || coalesce(nullif(split_part(new.due, '|', 2), ''), '23:59'))::timestamptz;
      if now() < due_at then
        insert into public.xp_events(user_id, event_key, event_type, xp, occurred_on, metadata)
        values (new.user_id, 'assignment-early:' || new.id, 'assignment_early', 5, current_date, jsonb_build_object('task_id', new.id))
        on conflict (user_id, event_key) do nothing;
      end if;
    exception when others then
      null;
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists award_task_xp_trigger on public.tasks;
create trigger award_task_xp_trigger after update on public.tasks for each row execute function public.award_task_xp();

create or replace function public.award_study_session_xp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.completed_at is null and new.completed_at is not null then
    insert into public.xp_events(user_id, event_key, event_type, xp, occurred_on, metadata)
    values (new.user_id, 'study-session:' || new.id, 'study_session_completed', 10, current_date, jsonb_build_object('study_session_id', new.id))
    on conflict (user_id, event_key) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists award_study_session_xp_trigger on public.study_sessions;
create trigger award_study_session_xp_trigger after update on public.study_sessions for each row execute function public.award_study_session_xp();

revoke insert, update, delete on public.xp_events from anon, authenticated;
