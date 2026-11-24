-- Wach-Halter (eingerichtet am 24.11.2026 in beiden Supabase-Projekten, Migration "wachhalter").
-- DJNP (mit Travel) und s1-tax fragen sich zweimal täglich gegenseitig über die öffentliche
-- Schnittstelle ab, damit Supabase sie im Gratis-Tarif nicht wegen Inaktivität pausiert.
-- Die Tabelle enthält nur einen Zeitstempel. Beim Wechsel auf Pro kann alles so bleiben.

create table if not exists public.keepalive (
  id         smallint primary key check (id = 1),
  pinged_at  timestamptz,
  pinged_by  text
);
insert into public.keepalive (id) values (1) on conflict (id) do nothing;
alter table public.keepalive enable row level security;
revoke all on public.keepalive from anon, authenticated;
grant select (id, pinged_at) on public.keepalive to anon;
grant update (pinged_at, pinged_by) on public.keepalive to anon;
drop policy if exists "wachhalter lesen" on public.keepalive;
create policy "wachhalter lesen" on public.keepalive for select to anon using (id = 1);
drop policy if exists "wachhalter stupsen" on public.keepalive;
create policy "wachhalter stupsen" on public.keepalive for update to anon using (id = 1) with check (id = 1);

create or replace function public.keepalive_ping(p_from text default null)
returns timestamptz language sql volatile security invoker set search_path = public
as $$
  update public.keepalive set pinged_at = now(), pinged_by = left(coalesce(p_from, '?'), 40)
  where id = 1 returning pinged_at
$$;
revoke all on function public.keepalive_ping(text) from public;
grant execute on function public.keepalive_ping(text) to anon;

-- Im DJNP-Projekt (hbohrdbqptfzhzqybbpc): täglich 03:17 und 15:17 UTC s1-tax anstupsen
--   select cron.schedule('wachhalter-s1-tax', '17 3,15 * * *', $job$
--     select net.http_post(url := 'https://iseuubmjgvckvcvxvfyk.supabase.co/rest/v1/rpc/keepalive_ping',
--       headers := '{"Content-Type": "application/json", "apikey": "<öffentlicher Schlüssel von s1-tax>"}'::jsonb,
--       body := '{"p_from": "djnp"}'::jsonb, timeout_milliseconds := 20000) $job$);
--
-- Im s1-tax-Projekt (iseuubmjgvckvcvxvfyk): täglich 04:43 und 16:43 UTC DJNP anstupsen
--   select cron.schedule('wachhalter-djnp', '43 4,16 * * *', $job$
--     select net.http_post(url := 'https://hbohrdbqptfzhzqybbpc.supabase.co/rest/v1/rpc/keepalive_ping',
--       headers := '{"Content-Type": "application/json", "apikey": "<öffentlicher Schlüssel von DJNP>"}'::jsonb,
--       body := '{"p_from": "s1-tax"}'::jsonb, timeout_milliseconds := 20000) $job$);
--
-- Prüfen, ob es läuft:  select * from public.keepalive;   (pinged_at sollte höchstens 12 Stunden alt sein)
