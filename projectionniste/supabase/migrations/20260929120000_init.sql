-- Le Projectionniste : schéma initial
-- À exécuter une fois dans Supabase (SQL Editor → New query → Run).
--
-- Principe : chaque visiteur a un utilisateur Supabase (anonyme pour l'instant,
-- converti en vrai compte plus tard). Toutes les tables personnelles sont protégées
-- par RLS : on ne lit et n'écrit que ses propres lignes, sauf ce qui est public
-- (listes publiques, collection partagée).

-- ---------------------------------------------------------------------------
-- Utilitaires
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.new_share_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select substr(md5(random()::text || clock_timestamp()::text), 1, 10);
$$;

-- ---------------------------------------------------------------------------
-- Profils
-- ---------------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text check (char_length(display_name) <= 60),
  bio          text check (char_length(bio) <= 500),
  avatar_url   text,
  -- réglages : plateformes (ids TMDB), filtre « sur mes plateformes », thème…
  settings     jsonb not null default '{}'::jsonb,
  -- goûts appris à l'import Letterboxd : { mu, aff: { d, c, g } }
  taste        jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- un profil est créé automatiquement pour chaque nouvel utilisateur (anonyme compris)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

-- les profils sont publics (nom, bio, avatar) ; seul le propriétaire les modifie
create policy "profils lisibles par tous" on public.profiles
  for select to anon, authenticated using (true);
create policy "profil modifiable par son propriétaire" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- Films : cache des métadonnées TMDB utiles à l'affichage
-- ---------------------------------------------------------------------------

create table public.films (
  tmdb_id       integer primary key,
  title         text not null,
  original_title text,
  release_date  date,
  poster_path   text,
  backdrop_path text,
  genre_ids     integer[] not null default '{}',
  runtime       integer,
  updated_at    timestamptz not null default now()
);

alter table public.films enable row level security;

create policy "films lisibles par tous" on public.films
  for select to anon, authenticated using (true);
-- ajout seulement (pas de modification) : le serveur les rafraîchira plus tard avec la clé secrète
create policy "films ajoutables" on public.films
  for insert to authenticated with check (true);

-- ---------------------------------------------------------------------------
-- État de chaque film pour un utilisateur : vu, watchlist, favori, note, écarté
-- ---------------------------------------------------------------------------

create table public.user_films (
  user_id    uuid not null references auth.users (id) on delete cascade,
  tmdb_id    integer not null references public.films (tmdb_id),
  watched    boolean not null default false,
  watchlist  boolean not null default false,
  favorite   boolean not null default false,
  -- « pas pour moi » : exclu des recommandations
  hidden     boolean not null default false,
  rating     numeric(2, 1) check (rating between 0.5 and 5 and rating * 2 = floor(rating * 2)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, tmdb_id)
);

create index user_films_watchlist on public.user_films (user_id) where watchlist;
create index user_films_favorite on public.user_films (user_id) where favorite;

create trigger user_films_touch before update on public.user_films
  for each row execute function public.touch_updated_at();

alter table public.user_films enable row level security;

create policy "mes films" on public.user_films
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Journal : une ligne par visionnage (revisionnages compris), avec critique et étiquettes
-- ---------------------------------------------------------------------------

create table public.diary_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  tmdb_id     integer not null references public.films (tmdb_id),
  watched_on  date,
  rating      numeric(2, 1) check (rating between 0.5 and 5 and rating * 2 = floor(rating * 2)),
  rewatch     boolean not null default false,
  liked       boolean not null default false,
  review      text check (char_length(review) <= 20000),
  spoilers    boolean not null default false,
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index diary_user_date on public.diary_entries (user_id, watched_on desc nulls last);
create index diary_user_film on public.diary_entries (user_id, tmdb_id);
create index diary_tags on public.diary_entries using gin (tags);

create trigger diary_touch before update on public.diary_entries
  for each row execute function public.touch_updated_at();

alter table public.diary_entries enable row level security;

-- privé pour l'instant ; s'ouvrira aux abonnés quand les comptes et le social arriveront
create policy "mon journal" on public.diary_entries
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Top 5 du profil
-- ---------------------------------------------------------------------------

create table public.top_films (
  user_id  uuid not null references auth.users (id) on delete cascade,
  slot     smallint not null check (slot between 1 and 5),
  tmdb_id  integer not null references public.films (tmdb_id),
  primary key (user_id, slot)
);

alter table public.top_films enable row level security;

create policy "top 5 lisible par tous" on public.top_films
  for select to anon, authenticated using (true);
create policy "mon top 5" on public.top_films
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Collection : films possédés (plusieurs exemplaires possibles, pas de prix)
-- ---------------------------------------------------------------------------

create table public.collection_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  tmdb_id     integer not null references public.films (tmdb_id),
  format      text not null check (format in ('dvd', 'bluray', '4k', 'steelbook', 'collector', 'vhs', 'laserdisc', 'numerique')),
  edition     text check (char_length(edition) <= 120),
  condition   text check (condition in ('neuf', 'tres_bon', 'bon', 'use')),
  notes       text check (char_length(notes) <= 2000),
  acquired_on date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index collection_user on public.collection_items (user_id, created_at desc);

create trigger collection_touch before update on public.collection_items
  for each row execute function public.touch_updated_at();

alter table public.collection_items enable row level security;

create policy "ma collection" on public.collection_items
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- partage public de la collection (/c/<code>)
create table public.collection_shares (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  share_code   text not null unique default public.new_share_code(),
  enabled      boolean not null default false,
  title        text check (char_length(title) <= 120),
  description  text check (char_length(description) <= 1000),
  show_notes   boolean not null default false,
  show_condition boolean not null default true,
  view_count   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger collection_shares_touch before update on public.collection_shares
  for each row execute function public.touch_updated_at();

alter table public.collection_shares enable row level security;

create policy "mon partage" on public.collection_shares
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- lecture publique d'une collection partagée, sans exposer les tables
create or replace function public.get_public_collection(code text)
returns table (
  title text,
  description text,
  owner_name text,
  tmdb_id integer,
  film_title text,
  release_date date,
  poster_path text,
  format text,
  edition text,
  condition text,
  notes text
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.title, s.description, coalesce(p.display_name, p.username),
         c.tmdb_id, f.title, f.release_date, f.poster_path,
         c.format, c.edition,
         case when s.show_condition then c.condition end,
         case when s.show_notes then c.notes end
  from public.collection_shares s
  join public.profiles p on p.id = s.user_id
  join public.collection_items c on c.user_id = s.user_id
  join public.films f on f.tmdb_id = c.tmdb_id
  where s.share_code = code and s.enabled
  order by f.title;
$$;

create or replace function public.count_collection_view(code text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.collection_shares set view_count = view_count + 1 where share_code = code and enabled;
$$;

grant execute on function public.get_public_collection(text) to anon, authenticated;
grant execute on function public.count_collection_view(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Listes (classées ou non, publiques ou privées)
-- ---------------------------------------------------------------------------

create table public.lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 2000),
  ranked      boolean not null default false,
  is_public   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index lists_user on public.lists (user_id, updated_at desc);

create trigger lists_touch before update on public.lists
  for each row execute function public.touch_updated_at();

create table public.list_items (
  list_id   uuid not null references public.lists (id) on delete cascade,
  tmdb_id   integer not null references public.films (tmdb_id),
  position  integer not null,
  note      text check (char_length(note) <= 1000),
  added_at  timestamptz not null default now(),
  primary key (list_id, tmdb_id)
);

create index list_items_order on public.list_items (list_id, position);

alter table public.lists enable row level security;
alter table public.list_items enable row level security;

create policy "listes publiques lisibles par tous" on public.lists
  for select to anon, authenticated using (is_public or (select auth.uid()) = user_id);
create policy "mes listes" on public.lists
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "contenu des listes lisibles" on public.list_items
  for select to anon, authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and (l.is_public or l.user_id = (select auth.uid()))));
create policy "contenu de mes listes" on public.list_items
  for all to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())))
  with check (exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())));

-- met à jour la date de la liste quand son contenu change
create or replace function public.touch_list()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.lists set updated_at = now() where id = coalesce(new.list_id, old.list_id);
  return null;
end;
$$;

create trigger list_items_touch after insert or update or delete on public.list_items
  for each row execute function public.touch_list();

-- ---------------------------------------------------------------------------
-- Profils déjà existants (utilisateurs créés avant ce script, s'il y en a)
-- ---------------------------------------------------------------------------

insert into public.profiles (id) select id from auth.users on conflict do nothing;
