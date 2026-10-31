-- Schedules server-side website checks every minute using Supabase Cron.
create extension if not exists pgcrypto;
create extension if not exists supabase_vault;
create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret(
  encode(gen_random_bytes(32), 'hex'),
  'uptime_cron_secret',
  'Private shared secret for scheduled calls to the uptime checker'
);

create or replace function public.verify_uptime_cron_secret(candidate text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from vault.decrypted_secrets
    where name = 'uptime_cron_secret'
      and decrypted_secret = candidate
  );
$$;

revoke all on function public.verify_uptime_cron_secret(text) from public, anon, authenticated;
grant execute on function public.verify_uptime_cron_secret(text) to service_role;

select cron.schedule(
  'uptime-check-every-minute',
  '* * * * *',
  $job$
    select net.http_post(
      url := 'https://ienoxjulgopijzovqoma.supabase.co/functions/v1/swift-function',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imllbm94anVsZ29waWp6b3Zxb21hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwOTc0MDQsImV4cCI6MjEwODY3MzQwNH0.JKVpYge8ekxCxK5rxs47jP4wjn6ZNPV7Wvg0k-YOe3I',
        'x-uptime-cron-secret',
        (select decrypted_secret from vault.decrypted_secrets where name = 'uptime_cron_secret')
      ),
      body := '{"scheduled": true}'::jsonb,
      timeout_milliseconds := 20000
    );
  $job$
);

select cron.schedule(
  'uptime-check-cleanup-daily',
  '17 4 * * *',
  $$delete from public.checks where checked_at < now() - interval '30 days'$$
);
