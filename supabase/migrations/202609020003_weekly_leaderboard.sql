-- Privacy-safe public names and server-computed leaderboard.

create table if not exists public.public_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 3 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists public_profiles_display_name_unique on public.public_profiles(lower(display_name));
alter table public.public_profiles enable row level security;

create policy "Signed-in users can read public profiles" on public.public_profiles for select to authenticated using (true);
create policy "Users can create own public profile" on public.public_profiles for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own public profile" on public.public_profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.ensure_public_profile()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  result text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select display_name into result from public.public_profiles where user_id = auth.uid();
  if result is null then
    result := 'Student ' || upper(substr(md5(auth.uid()::text || clock_timestamp()::text), 1, 6));
    insert into public.public_profiles(user_id, display_name) values (auth.uid(), result)
    on conflict (user_id) do update set display_name = excluded.display_name
    returning display_name into result;
  end if;
  return result;
end;
$$;

create or replace function public.get_leaderboard(period text default 'weekly', result_limit integer default 25)
returns table(rank bigint, display_name text, level integer, weekly_xp bigint, lifetime_xp bigint, is_current_user boolean)
language sql
security definer
set search_path = public
as $$
  with totals as (
    select p.user_id, p.display_name,
      coalesce(sum(x.xp), 0)::bigint as lifetime_xp,
      coalesce(sum(x.xp) filter (where x.occurred_on >= date_trunc('week', current_date)::date), 0)::bigint as weekly_xp
    from public.public_profiles p
    left join public.xp_events x on x.user_id = p.user_id
    group by p.user_id, p.display_name
  ), ranked as (
    select *, rank() over (order by case when period = 'all-time' then lifetime_xp else weekly_xp end desc, display_name asc) as position
    from totals
  )
  select position, ranked.display_name, (floor(sqrt(lifetime_xp::numeric / 100)) + 1)::integer, weekly_xp, lifetime_xp, ranked.user_id = auth.uid()
  from ranked
  where auth.uid() is not null and (position <= least(greatest(result_limit, 1), 100) or ranked.user_id = auth.uid())
  order by position;
$$;

revoke all on function public.ensure_public_profile() from public, anon;
grant execute on function public.ensure_public_profile() to authenticated;
revoke all on function public.get_leaderboard(text, integer) from public, anon;
grant execute on function public.get_leaderboard(text, integer) to authenticated;
