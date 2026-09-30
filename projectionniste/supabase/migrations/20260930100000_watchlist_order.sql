-- ---------------------------------------------------------------------------
-- Watchlist : ordre d'ajout.
-- On garde la date à laquelle un film est entré dans la watchlist, pour l'afficher
-- du plus récemment ajouté au plus ancien (updated_at bouge à chaque changement).
-- ---------------------------------------------------------------------------

alter table public.user_films add column watchlisted_at timestamptz;

-- films déjà en watchlist : on part de leur dernière modification
update public.user_films set watchlisted_at = updated_at where watchlist;

create or replace function public.set_watchlisted_at()
returns trigger
language plpgsql
as $$
begin
  if new.watchlist then
    if tg_op = 'INSERT' or not old.watchlist or new.watchlisted_at is null then
      new.watchlisted_at := now();
    end if;
  else
    new.watchlisted_at := null;
  end if;
  return new;
end;
$$;

create trigger user_films_watchlisted before insert or update on public.user_films
  for each row execute function public.set_watchlisted_at();

create index user_films_watchlist_order on public.user_films (user_id, watchlisted_at desc) where watchlist;
