-- Un compte dont le profil a disparu le recrée tout seul à la connexion (au lieu de « Impossible de charger tes données »).
-- Relançable sans erreur.
drop policy if exists "profil créé par son propriétaire" on public.profiles;
create policy "profil créé par son propriétaire" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);

-- et on recrée dès maintenant les profils manquants
insert into public.profiles (id) select id from auth.users on conflict do nothing;
