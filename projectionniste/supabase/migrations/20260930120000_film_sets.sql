-- ---------------------------------------------------------------------------
-- Ensembles de films, rayons et cycles.
-- Un ensemble (la filmographie de Kubrick, la saga Alien, les Palmes d'or…) se suit de deux façons :
--   mode 'own'   → un RAYON de la collection (combien j'en possède),
--   mode 'watch' → un CYCLE du journal (combien j'en ai vu).
-- Chaque utilisateur a sa propre copie des ensembles qu'il suit : les films y sont rangés une fois
-- (pas d'appel TMDB à chaque affichage), personne d'autre ne peut les modifier.
-- La progression n'est jamais stockée : elle se calcule (set_progress).
-- Script idempotent.
-- ---------------------------------------------------------------------------

create table if not exists public.film_sets (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- identifiant stable de la définition : « dogme-95 », « personne-240-director », « saga-8091 »…
  key        text not null check (key ~ '^[a-z0-9-]{2,80}$'),
  source     text not null check (source in ('person', 'tmdb_collection', 'tmdb_company', 'editorial', 'list')),
  source_ref text check (char_length(source_ref) <= 80),
  rules      jsonb not null default '{}'::jsonb,
  title      text not null check (char_length(title) between 1 and 160),
  subtitle   text check (char_length(subtitle) <= 160),
  cover_path text check (char_length(cover_path) <= 300),
  synced_at  timestamptz,
  created_at timestamptz not null default now(),
  unique (owner_id, key)
);

create table if not exists public.film_set_items (
  set_id       uuid not null references public.film_sets (id) on delete cascade,
  tmdb_id      integer not null references public.films (tmdb_id),
  position     integer not null default 0,
  caption      text check (char_length(caption) <= 160),
  release_date date,
  -- retiré de la source (TMDB a changé) : on le garde pour l'historique, il ne compte plus
  removed_at   timestamptz,
  primary key (set_id, tmdb_id)
);

create table if not exists public.set_follows (
  set_id          uuid not null references public.film_sets (id) on delete cascade,
  mode            text not null check (mode in ('own', 'watch')),
  started_at      timestamptz not null default now(),
  archived_at     timestamptz,
  -- mémoire de la complétion : un nouveau film ensuite ne l'efface pas
  completed_at    timestamptz,
  completed_count integer,
  primary key (set_id, mode)
);

-- « ne pas compter ce film » (un caméo, un film introuvable…)
create table if not exists public.set_exclusions (
  set_id  uuid not null references public.film_sets (id) on delete cascade,
  tmdb_id integer not null,
  primary key (set_id, tmdb_id)
);

alter table public.film_sets enable row level security;
alter table public.film_set_items enable row level security;
alter table public.set_follows enable row level security;
alter table public.set_exclusions enable row level security;

drop policy if exists "mes ensembles" on public.film_sets;
create policy "mes ensembles" on public.film_sets
  for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

drop policy if exists "films de mes ensembles" on public.film_set_items;
create policy "films de mes ensembles" on public.film_set_items
  for all to authenticated
  using (exists (select 1 from public.film_sets s where s.id = set_id and s.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.film_sets s where s.id = set_id and s.owner_id = (select auth.uid())));

drop policy if exists "mes rayons et cycles" on public.set_follows;
create policy "mes rayons et cycles" on public.set_follows
  for all to authenticated
  using (exists (select 1 from public.film_sets s where s.id = set_id and s.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.film_sets s where s.id = set_id and s.owner_id = (select auth.uid())));

drop policy if exists "mes exclusions" on public.set_exclusions;
create policy "mes exclusions" on public.set_exclusions
  for all to authenticated
  using (exists (select 1 from public.film_sets s where s.id = set_id and s.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.film_sets s where s.id = set_id and s.owner_id = (select auth.uid())));

-- Progression de mes rayons et cycles : films sortis, non exclus, encore dans la source.
-- Possédé = au moins un exemplaire (plusieurs éditions comptent pour un film).
-- Vu = user_films.watched (le journal ne fait que dater les séances).
create or replace function public.set_progress()
returns table (set_id uuid, mode text, total integer, done integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select f.set_id, f.mode,
         count(*)::integer as total,
         count(*) filter (where
           (f.mode = 'own' and exists (select 1 from public.collection_items c where c.user_id = (select auth.uid()) and c.tmdb_id = i.tmdb_id))
           or (f.mode = 'watch' and exists (select 1 from public.user_films u where u.user_id = (select auth.uid()) and u.tmdb_id = i.tmdb_id and u.watched))
         )::integer as done
  from public.set_follows f
  join public.film_sets s on s.id = f.set_id and s.owner_id = (select auth.uid())
  join public.film_set_items i on i.set_id = f.set_id and i.removed_at is null
    and (i.release_date is null or i.release_date <= current_date)
  where not exists (select 1 from public.set_exclusions x where x.set_id = i.set_id and x.tmdb_id = i.tmdb_id)
  group by f.set_id, f.mode;
$$;

grant execute on function public.set_progress() to authenticated;

create index if not exists film_set_items_film on public.film_set_items (tmdb_id);
