-- Cinémathèque : exemplaires enrichis (éditeur, numéro d'édition, scellé, prêt, photo),
-- envies (films à acquérir en physique), séries à compléter, photos d'exemplaires,
-- et lecture publique mise à jour.
-- Script idempotent : on peut le relancer sans risque.

-- ---------------------------------------------------------------------------
-- Exemplaires
-- ---------------------------------------------------------------------------
alter table public.collection_items
  add column if not exists publisher  text check (char_length(publisher) <= 80),
  add column if not exists edition_no integer check (edition_no > 0),
  add column if not exists edition_of integer check (edition_of > 0),
  add column if not exists sealed     boolean not null default false,
  add column if not exists lent_to    text check (char_length(lent_to) <= 80),
  add column if not exists lent_on    date,
  add column if not exists photo_path text check (char_length(photo_path) <= 300),
  add column if not exists director    text check (char_length(director) <= 120),
  add column if not exists director_id integer,
  add column if not exists saga_id     integer,
  add column if not exists saga_name   text check (char_length(saga_name) <= 160);

create index if not exists collection_user_film on public.collection_items (user_id, tmdb_id);

-- ---------------------------------------------------------------------------
-- Envies : films qu'on voudrait posséder en physique
-- ---------------------------------------------------------------------------
create table if not exists public.collection_wants (
  user_id    uuid not null references auth.users (id) on delete cascade,
  tmdb_id    integer not null references public.films (tmdb_id),
  created_at timestamptz not null default now(),
  primary key (user_id, tmdb_id)
);

alter table public.collection_wants enable row level security;

drop policy if exists "mes envies" on public.collection_wants;
create policy "mes envies" on public.collection_wants
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Séries à compléter (filmographie d'un cinéaste ou saga)
-- ---------------------------------------------------------------------------
create table if not exists public.collection_series (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('person', 'saga')),
  ref_id     integer not null,
  name       text not null check (char_length(name) <= 160),
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref_id)
);

alter table public.collection_series enable row level security;

drop policy if exists "mes séries" on public.collection_series;
create policy "mes séries" on public.collection_series
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Photos d'exemplaires (Supabase Storage). Lecture par lien direct, écriture
-- limitée au dossier de l'utilisateur (<user_id>/...).
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    execute $q$
      insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values ('collection-photos', 'collection-photos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
      on conflict (id) do update
        set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types
    $q$;
    execute 'drop policy if exists "photos : lecture des miennes" on storage.objects';
    execute 'drop policy if exists "photos : ajout dans mon dossier" on storage.objects';
    execute 'drop policy if exists "photos : modification dans mon dossier" on storage.objects';
    execute 'drop policy if exists "photos : suppression dans mon dossier" on storage.objects';
    execute $q$create policy "photos : lecture des miennes" on storage.objects for select to authenticated
      using (bucket_id = 'collection-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)$q$;
    execute $q$create policy "photos : ajout dans mon dossier" on storage.objects for insert to authenticated
      with check (bucket_id = 'collection-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)$q$;
    execute $q$create policy "photos : modification dans mon dossier" on storage.objects for update to authenticated
      using (bucket_id = 'collection-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)$q$;
    execute $q$create policy "photos : suppression dans mon dossier" on storage.objects for delete to authenticated
      using (bucket_id = 'collection-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)$q$;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Lecture publique d'une collection partagée (nouveaux champs)
-- Jamais exposés : films vus, notes, prêts, dates d'acquisition.
-- Les notes et les photos ne sortent que si le propriétaire l'a choisi.
-- ---------------------------------------------------------------------------
drop function if exists public.get_public_collection(text);

create function public.get_public_collection(code text)
returns table (
  title text,
  description text,
  owner_name text,
  tmdb_id integer,
  film_title text,
  release_date date,
  poster_path text,
  genre_ids integer[],
  format text,
  edition text,
  publisher text,
  edition_no integer,
  edition_of integer,
  sealed boolean,
  director text,
  condition text,
  notes text,
  photo_path text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.title, s.description, coalesce(p.display_name, p.username),
         c.tmdb_id, f.title, f.release_date, f.poster_path, f.genre_ids,
         c.format, c.edition, c.publisher, c.edition_no, c.edition_of, c.sealed, c.director,
         case when s.show_condition then c.condition end,
         case when s.show_notes then c.notes end,
         case when s.show_notes then c.photo_path end,
         c.created_at
  from public.collection_shares s
  join public.profiles p on p.id = s.user_id
  join public.collection_items c on c.user_id = s.user_id
  join public.films f on f.tmdb_id = c.tmdb_id
  where s.share_code = code and s.enabled
  order by c.created_at;
$$;

grant execute on function public.get_public_collection(text) to anon, authenticated;
