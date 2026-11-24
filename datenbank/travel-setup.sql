-- Travel-App: Lieblingsorte der Familie.
-- Nutzt Anmeldung und Personen von DJNP (public.members, public.my_person()).
-- Alle Daten sieht und bearbeitet nur die Familie.
-- Wurde am 24.11.2026 im DJNP-Projekt ausgeführt (Migration travel_app_tables). Kann gefahrlos wiederholt werden.

create table if not exists public.travel_trips (
  id          text primary key,
  name        text not null check (length(name) between 1 and 120),
  date_from   date,
  date_to     date,
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  text
);

create table if not exists public.travel_places (
  id          text primary key,
  name        text not null check (length(name) between 1 and 200),
  cat         text not null default 'restaurant',
  cat_text    text,
  cat_group   text,
  city        text,
  country     text check (country is null or country ~ '^[A-Z]{2}$'),
  address     text,
  lat         double precision check (lat is null or lat between -90 and 90),
  lng         double precision check (lng is null or lng between -180 and 180),
  price       smallint not null default 0 check (price between 0 and 4),
  trip_id     text references public.travel_trips(id) on delete set null,
  dog         text not null default '' check (dog in ('', 'willkommen', 'erlaubt', 'draussen', 'ohne')),
  dog_note    text,
  loves       text[] not null default '{}',
  highlight   text,
  tip         text,
  priv        text,
  tel         text,
  res         text,
  web         text,
  dishes      jsonb not null default '[]'::jsonb,
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  text
);
create index if not exists travel_places_trip_idx on public.travel_places (trip_id);

create table if not exists public.travel_visits (
  id          text primary key,
  place_id    text not null references public.travel_places(id) on delete cascade,
  date        date not null,
  who         text[] not null default '{}',
  note        text,
  by          text,
  created_at  timestamptz not null default now()
);
create index if not exists travel_visits_place_idx on public.travel_visits (place_id);

create table if not exists public.travel_photos (
  id          text primary key,
  place_id    text not null references public.travel_places(id) on delete cascade,
  path        text not null unique,
  sort        integer not null default 0,
  by          text,
  created_at  timestamptz not null default now()
);
create index if not exists travel_photos_place_idx on public.travel_photos (place_id);

-- Mitteilungen: jede Person schaltet ihre eigenen Arten ein und aus
create table if not exists public.travel_notif (
  person        text primary key check (person in ('d','j','n','p')),
  eintraege     boolean not null default true,
  besuche       boolean not null default true,
  erinnerungen  boolean not null default true,
  updated_at    timestamptz not null default now()
);

-- Wer zuletzt geändert hat
create or replace function public.travel_touch()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := upper(coalesce(public.my_person(), new.updated_by));
  return new;
end $$;
revoke all on function public.travel_touch() from public, anon, authenticated;

drop trigger if exists travel_trips_touch on public.travel_trips;
create trigger travel_trips_touch before update on public.travel_trips
  for each row execute function public.travel_touch();
drop trigger if exists travel_places_touch on public.travel_places;
create trigger travel_places_touch before update on public.travel_places
  for each row execute function public.travel_touch();

-- Zugriffsregeln: nur angemeldete Familienmitglieder
alter table public.travel_trips  enable row level security;
alter table public.travel_places enable row level security;
alter table public.travel_visits enable row level security;
alter table public.travel_photos enable row level security;
alter table public.travel_notif  enable row level security;

grant select, insert, update, delete on public.travel_trips, public.travel_places, public.travel_visits, public.travel_photos, public.travel_notif to authenticated;
revoke all on public.travel_trips, public.travel_places, public.travel_visits, public.travel_photos, public.travel_notif from anon;

drop policy if exists "familie" on public.travel_trips;
create policy "familie" on public.travel_trips for all to authenticated
  using (public.my_person() is not null) with check (public.my_person() is not null);
drop policy if exists "familie" on public.travel_places;
create policy "familie" on public.travel_places for all to authenticated
  using (public.my_person() is not null) with check (public.my_person() is not null);
drop policy if exists "familie" on public.travel_visits;
create policy "familie" on public.travel_visits for all to authenticated
  using (public.my_person() is not null) with check (public.my_person() is not null);
drop policy if exists "familie" on public.travel_photos;
create policy "familie" on public.travel_photos for all to authenticated
  using (public.my_person() is not null) with check (public.my_person() is not null);
drop policy if exists "eigene Einstellungen" on public.travel_notif;
create policy "eigene Einstellungen" on public.travel_notif for all to authenticated
  using (person = public.my_person()) with check (person = public.my_person());

-- Fotos: privater Speicher "travel", nur für die Familie
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('travel', 'travel', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "travel lesen" on storage.objects;
create policy "travel lesen" on storage.objects for select to authenticated
  using (bucket_id = 'travel' and public.my_person() is not null);
drop policy if exists "travel hochladen" on storage.objects;
create policy "travel hochladen" on storage.objects for insert to authenticated
  with check (bucket_id = 'travel' and public.my_person() is not null);
drop policy if exists "travel loeschen" on storage.objects;
create policy "travel loeschen" on storage.objects for delete to authenticated
  using (bucket_id = 'travel' and public.my_person() is not null);

-- Änderungen live an alle Geräte
do $$
declare t text;
begin
  foreach t in array array['travel_trips','travel_places','travel_visits','travel_photos'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
