-- Run the push dispatcher every minute. The authentication value lives in Supabase Vault,
-- not in this repository. Provision the `zentaskra_push_cron_secret` Vault entry first.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname = 'zentaskra-background-push';
  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;

  perform cron.schedule(
    'zentaskra-background-push',
    '* * * * *',
    $schedule$
      select net.http_post(
        url := 'https://cvbvntockhjipiaqmnza.supabase.co/functions/v1/dispatch-push',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'zentaskra_push_cron_secret'
            limit 1
          )
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 15000
      );
    $schedule$
  );
end;
$$;
