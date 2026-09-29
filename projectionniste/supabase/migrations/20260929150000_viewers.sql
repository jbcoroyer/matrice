-- ---------------------------------------------------------------------------
-- « Qui l'a vu » : les membres qui ont vu un film, avec leur note.
-- Chacun peut masquer son activité (Paramètres → Profil).
-- ---------------------------------------------------------------------------

alter table public.profiles add column show_activity boolean not null default true;

-- my_profile renvoie aussi ce réglage
drop function public.my_profile();
create function public.my_profile()
returns table (id uuid, username text, display_name text, bio text, settings jsonb, taste jsonb, show_activity boolean, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.username, p.display_name, p.bio, p.settings, p.taste, p.show_activity, p.updated_at
  from public.profiles p
  where p.id = (select auth.uid());
$$;
revoke execute on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;

create index user_films_watched_film on public.user_films (tmdb_id) where watched;

-- membres qui ont vu le film (toi d'abord, puis les plus récents), avec le total et la note moyenne
create or replace function public.film_viewers(film integer, max_rows integer default 24)
returns table (
  user_id uuid,
  display_name text,
  username text,
  avatar_url text,
  rating numeric,
  favorite boolean,
  seen_at timestamptz,
  total bigint,
  avg_rating numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  with v as (
    select uf.user_id, p.display_name, p.username, p.avatar_url, uf.rating, uf.favorite, uf.updated_at
    from public.user_films uf
    join public.profiles p on p.id = uf.user_id
    where uf.tmdb_id = film
      and uf.watched
      and (p.show_activity or uf.user_id = (select auth.uid()))
  )
  select v.user_id, v.display_name, v.username, v.avatar_url, v.rating, v.favorite, v.updated_at,
         count(*) over (), round(avg(v.rating) over (), 2)
  from v
  order by (v.user_id = (select auth.uid())) desc, v.updated_at desc
  limit greatest(1, least(max_rows, 60));
$$;

revoke execute on function public.film_viewers(integer, integer) from public, anon;
grant execute on function public.film_viewers(integer, integer) to authenticated;
