-- ---------------------------------------------------------------------------
-- Collection : le support (DVD, Blu-ray, 4K, VHS, LaserDisc) et l'édition
-- (standard, steelbook, coffret, mediabook, digibook, collector) sont deux choses.
-- « Numérique » n'est plus proposé (pas physique) ; les anciens exemplaires restent lisibles.
-- Ménage : collection_series (jamais utilisée) et la saga recopiée sur chaque exemplaire.
-- Script idempotent.
-- ---------------------------------------------------------------------------

alter table public.collection_items
  add column if not exists packaging text not null default 'standard'
    check (packaging in ('standard', 'steelbook', 'coffret', 'mediabook', 'digibook', 'collector')),
  -- vrai quand le support a été deviné pendant cette migration (« Steelbook » sans support connu)
  add column if not exists support_to_check boolean not null default false;

alter table public.collection_items drop constraint if exists collection_items_format_check;

update public.collection_items set packaging = 'steelbook', format = 'bluray', support_to_check = true where format = 'steelbook';
update public.collection_items set packaging = 'collector', format = 'bluray', support_to_check = true where format = 'collector';

alter table public.collection_items add constraint collection_items_format_check
  check (format in ('dvd', 'bluray', '4k', 'vhs', 'laserdisc', 'numerique'));

drop table if exists public.collection_series;
alter table public.collection_items drop column if exists saga_id, drop column if exists saga_name;

-- lecture publique : l'édition en plus
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
  packaging text,
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
         c.format, c.packaging, c.edition, c.publisher, c.edition_no, c.edition_of, c.sealed, c.director,
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
