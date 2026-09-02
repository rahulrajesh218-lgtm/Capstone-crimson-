-- Harden XP awards against mass-created tasks, rapid completions, and fake study sessions.
-- Limits are intentionally generous for normal student use and enforced server-side.

create or replace function public.protect_task_creation_time()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    new.created_at := old.created_at;
    new.user_id := old.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_task_creation_time_trigger on public.tasks;
create trigger protect_task_creation_time_trigger
  before insert or update on public.tasks
  for each row execute function public.protect_task_creation_time();

create or replace function public.award_task_xp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  due_at timestamptz;
  completions_today integer;
  completions_last_hour integer;
  assignment_xp_today integer;
begin
  if not (
    (coalesce(old.progress, 0) < 100 and coalesce(new.progress, 0) >= 100)
    or (old.status is distinct from 'completed' and new.status = 'completed')
  ) then
    return new;
  end if;

  -- A newly created task cannot immediately earn XP.
  if now() < new.created_at + interval '15 minutes' then
    return new;
  end if;

  -- Serialize awards for this user so simultaneous requests cannot bypass caps.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

  select count(*) into completions_today
  from public.xp_events
  where user_id = new.user_id and event_type = 'assignment_completed' and occurred_on = current_date;

  select count(*) into completions_last_hour
  from public.xp_events
  where user_id = new.user_id and event_type = 'assignment_completed' and created_at >= now() - interval '1 hour';

  select coalesce(sum(xp), 0) into assignment_xp_today
  from public.xp_events
  where user_id = new.user_id and event_type in ('assignment_completed', 'assignment_early') and occurred_on = current_date;

  -- At most 4 rewarded assignments/hour, 8/day, and 200 assignment XP/day.
  if completions_last_hour >= 4 or completions_today >= 8 or assignment_xp_today + 20 > 200 then
    return new;
  end if;

  insert into public.xp_events(user_id, event_key, event_type, xp, occurred_on, metadata)
  values (new.user_id, 'assignment-completed:' || new.id, 'assignment_completed', 20, current_date,
    jsonb_build_object('task_id', new.id, 'task_age_minutes', floor(extract(epoch from (now() - new.created_at)) / 60)))
  on conflict (user_id, event_key) do nothing;

  begin
    due_at := (split_part(new.due, '|', 1) || ' ' || coalesce(nullif(split_part(new.due, '|', 2), ''), '23:59'))::timestamptz;
    if now() < due_at and assignment_xp_today + 25 <= 200 then
      insert into public.xp_events(user_id, event_key, event_type, xp, occurred_on, metadata)
      values (new.user_id, 'assignment-early:' || new.id, 'assignment_early', 5, current_date, jsonb_build_object('task_id', new.id))
      on conflict (user_id, event_key) do nothing;
    end if;
  exception when others then
    null;
  end;

  return new;
end;
$$;

create or replace function public.protect_study_session_creation_time()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    new.created_at := old.created_at;
    new.user_id := old.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_study_session_creation_time_trigger on public.study_sessions;
create trigger protect_study_session_creation_time_trigger
  before insert or update on public.study_sessions
  for each row execute function public.protect_study_session_creation_time();

create or replace function public.award_study_session_xp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rewarded_today integer;
begin
  if old.completed_at is not null or new.completed_at is null then
    return new;
  end if;

  -- The session must have existed for its full declared duration.
  if now() < new.created_at + make_interval(mins => new.duration_minutes) then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 1));
  select count(*) into rewarded_today
  from public.xp_events
  where user_id = new.user_id and event_type = 'study_session_completed' and occurred_on = current_date;

  -- Six rewarded sessions (60 XP) is a generous daily ceiling.
  if rewarded_today >= 6 then
    return new;
  end if;

  insert into public.xp_events(user_id, event_key, event_type, xp, occurred_on, metadata)
  values (new.user_id, 'study-session:' || new.id, 'study_session_completed', 10, current_date,
    jsonb_build_object('study_session_id', new.id, 'duration_minutes', new.duration_minutes))
  on conflict (user_id, event_key) do nothing;
  return new;
end;
$$;
