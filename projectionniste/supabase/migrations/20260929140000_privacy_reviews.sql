-- ---------------------------------------------------------------------------
-- 1. Confidentialité des profils
--    Seuls le nom, le pseudo, la bio et l'avatar sont publics. Les réglages
--    (plateformes…) et les goûts appris ne sont lisibles que par leur
--    propriétaire, via my_profile().
-- ---------------------------------------------------------------------------

revoke select on public.profiles from anon, authenticated;
grant select (id, username, display_name, bio, avatar_url, created_at) on public.profiles to anon, authenticated;

create or replace function public.my_profile()
returns table (id uuid, username text, display_name text, bio text, settings jsonb, taste jsonb, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.username, p.display_name, p.bio, p.settings, p.taste, p.updated_at
  from public.profiles p
  where p.id = (select auth.uid());
$$;

revoke execute on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;

-- un profil pour chaque compte (nécessaire aux liens ci-dessous)
insert into public.profiles (id) select id from auth.users on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 2. Critiques publiques, « j'aime » et commentaires
--    Une entrée du journal qui porte une critique est publique par défaut
--    (comme sur Letterboxd) ; le reste du journal reste privé.
-- ---------------------------------------------------------------------------

alter table public.diary_entries add column review_public boolean not null default true;

-- lien vers le profil de l'auteur (pour afficher son nom avec la critique)
alter table public.diary_entries
  add constraint diary_entries_profile_fk foreign key (user_id) references public.profiles (id) on delete cascade;

create index diary_public_reviews on public.diary_entries (tmdb_id, created_at desc)
  where review is not null and review_public;

create policy "critiques publiques lisibles par tous" on public.diary_entries
  for select to anon, authenticated using (review is not null and review_public);

-- vrai si la critique est visible par l'utilisateur courant (publique, ou la sienne)
create or replace function public.review_visible(entry uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.diary_entries d
    where d.id = entry
      and d.review is not null
      and (d.review_public or d.user_id = (select auth.uid()))
  );
$$;

grant execute on function public.review_visible(uuid) to anon, authenticated;

create table public.review_likes (
  entry_id   uuid not null references public.diary_entries (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (entry_id, user_id)
);

create index review_likes_user on public.review_likes (user_id);

alter table public.review_likes enable row level security;

create policy "j'aime visibles avec la critique" on public.review_likes
  for select to anon, authenticated using (public.review_visible(entry_id));
create policy "aimer une critique" on public.review_likes
  for insert to authenticated with check ((select auth.uid()) = user_id and public.review_visible(entry_id));
create policy "retirer mon j'aime" on public.review_likes
  for delete to authenticated using ((select auth.uid()) = user_id);

create table public.review_comments (
  id         uuid primary key default gen_random_uuid(),
  entry_id   uuid not null references public.diary_entries (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index review_comments_entry on public.review_comments (entry_id, created_at);

alter table public.review_comments enable row level security;

create policy "commentaires visibles avec la critique" on public.review_comments
  for select to anon, authenticated using (public.review_visible(entry_id));
create policy "commenter une critique" on public.review_comments
  for insert to authenticated with check ((select auth.uid()) = user_id and public.review_visible(entry_id));
-- l'auteur du commentaire, ou l'auteur de la critique, peut le supprimer
create policy "supprimer un commentaire" on public.review_comments
  for delete to authenticated using (
    (select auth.uid()) = user_id
    or exists (select 1 from public.diary_entries d where d.id = entry_id and d.user_id = (select auth.uid()))
  );
